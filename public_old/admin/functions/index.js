const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Utility to sleep between API calls
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches tasks from Asana API for a specific project
 * @param {string} projectId - The Asana project ID
 * @param {string} token - Asana API token
 */
async function fetchTasksFromAsana(projectId, token) {
  try {
    const response = await axios.get(`https://app.asana.com/api/1.0/projects/${projectId}/tasks`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: {
        limit: 100,
        opt_fields: 'name,assignee,completed,due_on,due_at,notes,html_notes,modified_at,created_at,completed_at,tags,projects,memberships,parent,workspace'
      }
    });
    
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching tasks for project ${projectId}:`, error.message);
    throw error;
  }
}

/**
 * Syncs a single project's tasks to Firestore
 */
async function syncSingleProject(projectId, token) {
  console.log(`Starting sync for project ${projectId}`);
  
  // Get project details before starting
  let projectName = 'Unknown Project';
  try {
    const projectDoc = await db.collection('asana_projects').doc(projectId).get();
    if (projectDoc.exists) {
      projectName = projectDoc.data().name || 'Unknown Project';
    }
  } catch (err) {
    console.warn(`Could not get project name for ${projectId}:`, err.message);
  }
  
  // Create a log entry for this sync
  const logRef = await db.collection('asana_sync_logs').add({
    projectId,
    projectName,
    startTime: admin.firestore.FieldValue.serverTimestamp(),
    status: 'running',
    taskDetails: [] // Will store details about each processed task
  });
  
  try {
    // Fetch tasks from Asana
    console.log(`Fetching tasks for project ${projectId} (${projectName})`);
    const tasks = await fetchTasksFromAsana(projectId, token);
    
    // Counters for the sync operation
    let newTasks = 0;
    let updatedTasks = 0;
    let failedTasks = 0;
    const taskDetails = [];
    
    // Process each task
    for (const task of tasks) {
      const taskRef = db.collection('asana_tasks').doc(task.gid);
      let actionResult = {
        taskId: task.gid,
        taskName: task.name,
        action: 'unknown',
        status: 'pending'
      };
      
      try {
        const existingTask = await taskRef.get();
        
        if (!existingTask.exists) {
          // New task
          actionResult.action = 'created';
          
          await taskRef.set({
            ...task,
            projectId,
            projectName,
            syncedAt: admin.firestore.FieldValue.serverTimestamp(),
            isNew: true,
            changeHistory: [{
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              changeType: 'created'
            }]
          });
          
          newTasks++;
          actionResult.status = 'success';
        } else {
          // Compare with existing task to detect changes
          const oldTask = existingTask.data();
          
          // Check for meaningful changes
          const hasCompletionChanged = oldTask.completed !== task.completed;
          const hasAssigneeChanged = 
            (!oldTask.assignee && task.assignee) || 
            (oldTask.assignee && !task.assignee) ||
            (oldTask.assignee && task.assignee && oldTask.assignee.gid !== task.assignee.gid);
          const hasDueDateChanged = oldTask.due_on !== task.due_on;
          
          if (hasCompletionChanged || hasAssigneeChanged || hasDueDateChanged) {
            // Determine change type
            let changeType = 'updated';
            if (hasCompletionChanged && task.completed) changeType = 'completed';
            else if (hasAssigneeChanged) changeType = 'reassigned';
            else if (hasDueDateChanged) changeType = 'rescheduled';
            
            actionResult.action = changeType;
            
            // Update the task with change history
            const changeHistory = oldTask.changeHistory || [];
            changeHistory.push({
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              changeType,
              fromValue: {
                completed: oldTask.completed,
                assignee: oldTask.assignee,
                due_on: oldTask.due_on
              }
            });
            
            await taskRef.update({
              ...task,
              projectId,
              projectName,
              syncedAt: admin.firestore.FieldValue.serverTimestamp(),
              isModified: true,
              lastChangeType: changeType,
              changeHistory
            });
            
            updatedTasks++;
            actionResult.status = 'success';
          } else {
            // Just update the syncedAt timestamp if no meaningful changes
            await taskRef.update({
              syncedAt: admin.firestore.FieldValue.serverTimestamp(),
              isModified: false,
              projectName // Ensure project name is always updated
            });
            
            actionResult.action = 'no-change';
            actionResult.status = 'success';
          }
        }
      } catch (taskError) {
        console.error(`Error processing task ${task.gid} (${task.name}):`, taskError);
        failedTasks++;
        actionResult.status = 'failed';
        actionResult.error = taskError.message;
      }
      
      // Add this task's result to the details array
      taskDetails.push(actionResult);
      
      // Update the log entry periodically with progress
      if (taskDetails.length % 10 === 0 || taskDetails.length === tasks.length) {
        try {
          await logRef.update({
            newTasks,
            updatedTasks,
            failedTasks,
            taskDetails: taskDetails.slice(0, 50), // Limit to 50 to avoid document size limits
            totalTasks: tasks.length,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          });
        } catch (logError) {
          console.warn('Error updating sync log with progress:', logError);
        }
      }
    }
    
    // Update the log entry with final stats
    await logRef.update({
      endTime: admin.firestore.FieldValue.serverTimestamp(),
      status: 'completed',
      newTasks,
      updatedTasks,
      failedTasks,
      totalTasks: tasks.length,
      taskDetails: taskDetails.slice(0, 50) // Limit to 50 most recent to avoid document size limits
    });
    
    // Update the project's last sync time
    await db.collection('asana_projects').doc(projectId).update({
      lastSyncTime: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Completed sync for project ${projectId} (${projectName}): ${newTasks} new, ${updatedTasks} updated, ${failedTasks} failed`);
    return { newTasks, updatedTasks, failedTasks, totalTasks: tasks.length };
  } catch (error) {
    console.error(`Error syncing project ${projectId} (${projectName}):`, error);
    
    // Update the log entry with error
    await logRef.update({
      endTime: admin.firestore.FieldValue.serverTimestamp(),
      status: 'failed',
      error: error.message,
      errorStack: error.stack
    });
    
    throw error;
  }
}

/**
 * Scheduled Cloud Function to sync all projects every minute
 */
exports.syncAllProjects = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    console.log('Starting scheduled sync of all projects');
    
    try {
      // Get Asana configuration
      const configDoc = await db.collection('asana_config').doc('settings').get();
      if (!configDoc.exists) {
        console.error('Asana configuration not found');
        return null;
      }
      
      const config = configDoc.data();
      const token = config.personalAccessToken;
      
      // Get all active projects
      const projectsSnapshot = await db.collection('asana_projects')
        .where('archived', '==', false)
        .where('completed', '==', false)
        .get();
      
      if (projectsSnapshot.empty) {
        console.log('No active projects found to sync');
        return null;
      }
      
      // Process projects in parallel (Asana API can handle it with paid account)
      const projects = projectsSnapshot.docs.map(doc => doc.id);
      console.log(`Found ${projects.length} projects to sync`);
      
      const syncPromises = projects.map(projectId => 
        syncSingleProject(projectId, token)
      );
      
      const results = await Promise.all(syncPromises);
      const totalNewTasks = results.reduce((sum, result) => sum + result.newTasks, 0);
      const totalUpdatedTasks = results.reduce((sum, result) => sum + result.updatedTasks, 0);
      
      console.log(`Sync completed. Total: ${totalNewTasks} new, ${totalUpdatedTasks} updated tasks`);
      return null;
    } catch (error) {
      console.error('Error in syncAllProjects:', error);
      return null;
    }
  });

/**
 * HTTP Callable Function to manually sync all projects
 */
exports.manualSyncAll = functions.https.onCall(async (data, context) => {
  try {
    // Get Asana configuration
    const configDoc = await db.collection('asana_config').doc('settings').get();
    if (!configDoc.exists) {
      throw new Error('Asana configuration not found');
    }
    
    const config = configDoc.data();
    const token = config.personalAccessToken;
    
    // Get projects based on filter
    let projectsQuery = db.collection('asana_projects');
    
    // Apply filters if provided
    if (data && data.onlyActive) {
      projectsQuery = projectsQuery
        .where('archived', '==', false)
        .where('completed', '==', false);
    }
    
    const projectsSnapshot = await projectsQuery.get();
    
    if (projectsSnapshot.empty) {
      return { success: true, message: 'No projects found to sync' };
    }
    
    // Process projects one by one with a slight delay
    const projects = projectsSnapshot.docs.map(doc => doc.id);
    console.log(`Manual sync of ${projects.length} projects`);
    
    let totalNewTasks = 0;
    let totalUpdatedTasks = 0;
    
    for (const projectId of projects) {
      try {
        const result = await syncSingleProject(projectId, token);
        totalNewTasks += result.newTasks;
        totalUpdatedTasks += result.updatedTasks;
        
        // Small delay between projects
        await sleep(1000);
      } catch (error) {
        console.error(`Error syncing project ${projectId}:`, error);
        // Continue with other projects even if one fails
      }
    }
    
    return { 
      success: true, 
      projectsProcessed: projects.length,
      totalNewTasks,
      totalUpdatedTasks
    };
  } catch (error) {
    console.error('Error in manualSyncAll:', error);
    return { 
      success: false, 
      error: error.message
    };
  }
});

/**
 * HTTP Callable Function to fetch initial Asana workspace and project data
 */
exports.initializeAsanaIntegration = functions.https.onCall(async (data, context) => {
  try {
    const { token } = data;
    if (!token) {
      throw new Error('Personal Access Token is required');
    }
    
    // Store token in config
    await db.collection('asana_config').doc('settings').set({
      personalAccessToken: token,
      syncEnabled: true,
      syncFrequency: 'every 1 minutes',
      lastFullSyncTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Fetch workspaces
    const workspacesResponse = await axios.get('https://app.asana.com/api/1.0/workspaces', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const workspaces = workspacesResponse.data.data;
    
    // Store workspaces
    for (const workspace of workspaces) {
      await db.collection('asana_workspaces').doc(workspace.gid).set({
        ...workspace,
        syncedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Fetch projects for each workspace
      const projectsResponse = await axios.get(
        `https://app.asana.com/api/1.0/workspaces/${workspace.gid}/projects`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: {
            opt_fields: 'name,owner,created_at,modified_at,public,archived,completed,color,due_date,notes'
          }
        }
      );
      
      const projects = projectsResponse.data.data;
      
      // Store projects
      for (const project of projects) {
        await db.collection('asana_projects').doc(project.gid).set({
          ...project,
          workspaceId: workspace.gid,
          workspaceName: workspace.name,
          syncedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    
    return {
      success: true,
      workspaceCount: workspaces.length,
      message: 'Asana integration initialized successfully'
    };
  } catch (error) {
    console.error('Error initializing Asana integration:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * Create a Firestore document that tracks changes between syncs
 */
exports.createChangeLog = functions.firestore
  .document('asana_tasks/{taskId}')
  .onUpdate((change, context) => {
    const taskId = context.params.taskId;
    const newValue = change.after.data();
    const previousValue = change.before.data();
    
    // Only create log entries for tasks that were modified
    if (!newValue.isModified) {
      return null;
    }
    
    // Create a change log entry
    return db.collection('asana_change_logs').add({
      taskId,
      taskName: newValue.name,
      projectId: newValue.projectId,
      projectName: newValue.projectName,
      changeType: newValue.lastChangeType || 'updated',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      previousState: {
        completed: previousValue.completed,
        assignee: previousValue.assignee,
        due_on: previousValue.due_on
      },
      newState: {
        completed: newValue.completed,
        assignee: newValue.assignee,
        due_on: newValue.due_on
      }
    });
  });

/**
 * Generate task analytics data
 */
exports.generateTaskAnalytics = functions.https.onCall(async (data, context) => {
  try {
    // Ensure the user is authenticated
    if (!context.auth) {
      throw new Error('Unauthorized access');
    }
    
    // Get parameters
    const days = data.days || 30; // Default to 30 days
    const projectId = data.projectId || null; // Optional project filter
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Prepare query to get tasks
    let query = db.collection('asana_tasks');
    
    // Filter by project if specified
    if (projectId) {
      query = query.where('projectId', '==', projectId);
    }
    
    // Execute query
    const tasksSnapshot = await query.get();
    
    // Process task data
    const tasks = [];
    tasksSnapshot.forEach(doc => {
      tasks.push(doc.data());
    });
    
    // Generate daily completion data
    const dailyData = {};
    const projectData = {};
    const statusData = {
      completed: 0,
      incomplete: 0,
      overdue: 0
    };
    
    // Prepare daily data structure
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyData[dateStr] = {
        date: dateStr,
        completed: 0,
        created: 0,
        updated: 0
      };
    }
    
    // Process tasks
    tasks.forEach(task => {
      // Count by status
      if (task.completed) {
        statusData.completed++;
      } else if (task.due_on && new Date(task.due_on) < new Date()) {
        statusData.overdue++;
      } else {
        statusData.incomplete++;
      }
      
      // Count by project
      if (task.projectName) {
        if (!projectData[task.projectId]) {
          projectData[task.projectId] = {
            id: task.projectId,
            name: task.projectName,
            total: 0,
            completed: 0
          };
        }
        
        projectData[task.projectId].total++;
        if (task.completed) {
          projectData[task.projectId].completed++;
        }
      }
      
      // Daily data - created
      if (task.createdAt && task.createdAt.toDate) {
        const createdDate = task.createdAt.toDate();
        if (createdDate >= startDate && createdDate <= endDate) {
          const dateStr = createdDate.toISOString().split('T')[0];
          if (dailyData[dateStr]) {
            dailyData[dateStr].created++;
          }
        }
      }
      
      // Daily data - completed
      if (task.completed && task.completedAt && task.completedAt.toDate) {
        const completedDate = task.completedAt.toDate();
        if (completedDate >= startDate && completedDate <= endDate) {
          const dateStr = completedDate.toISOString().split('T')[0];
          if (dailyData[dateStr]) {
            dailyData[dateStr].completed++;
          }
        }
      }
      
      // Daily data - updated
      if (task.syncedAt && task.syncedAt.toDate) {
        const updatedDate = task.syncedAt.toDate();
        if (updatedDate >= startDate && updatedDate <= endDate) {
          const dateStr = updatedDate.toISOString().split('T')[0];
          if (dailyData[dateStr]) {
            dailyData[dateStr].updated++;
          }
        }
      }
    });
    
    // Convert daily data to array
    const dailyArray = Object.values(dailyData);
    
    // Convert project data to array
    const projectArray = Object.values(projectData);
    
    // Generate trend summary
    const totalTasks = tasks.length;
    const completedTasks = statusData.completed;
    const overdueTasks = statusData.overdue;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Calculate velocity (average tasks completed per day)
    const totalCompletedInRange = dailyArray.reduce((sum, day) => sum + day.completed, 0);
    const velocity = Math.round((totalCompletedInRange / days) * 10) / 10; // Round to 1 decimal place
    
    // Create analytics document
    const analyticsData = {
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      timeRange: days,
      projectId: projectId || 'all',
      summary: {
        totalTasks,
        completedTasks,
        overdueTasks,
        incompleteTasks: statusData.incomplete,
        completionRate,
        velocity
      },
      dailyData: dailyArray,
      projectData: projectArray.sort((a, b) => b.total - a.total),
      statusData: [
        { status: 'Completed', count: statusData.completed },
        { status: 'Overdue', count: statusData.overdue },
        { status: 'In Progress', count: statusData.incomplete }
      ]
    };
    
    // Save to Firestore
    const analyticsRef = db.collection('asana_analytics').doc();
    await analyticsRef.set(analyticsData);
    
    // Return the analytics data
    return {
      id: analyticsRef.id,
      ...analyticsData
    };
  } catch (error) {
    console.error('Error generating task analytics:', error);
    throw new functions.https.HttpsError('internal', `Error generating analytics: ${error.message}`);
  }
}); 