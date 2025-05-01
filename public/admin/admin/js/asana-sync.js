/**
 * Asana Integration - Sync Utilities
 * 
 * This file provides utility functions for synchronizing Asana data
 * with Firestore using the schema defined in asana-schema.js.
 */

/**
 * Asana API utility class for syncing data
 */
class AsanaSync {
  constructor(db) {
    this.db = db;
    this.config = null;
    this.personalAccessToken = null; // Store PAT directly when passed
  }

  /**
   * Initialize the Asana client with configuration from Firestore
   * @param {string} directPAT - Optional direct Personal Access Token to use instead of from Firestore
   */
  async initialize(directPAT = null) {
    try {
      if (directPAT) {
        // Use the directly provided PAT
        this.personalAccessToken = directPAT;
        console.log("Using directly provided Personal Access Token");
        return true;
      }
      
      // Get the configuration from Firestore
      const configDoc = await this.db.collection('asana_config').doc('settings').get();
      
      if (!configDoc.exists) {
        console.error('Asana configuration does not exist in Firestore');
        return false;
      }
      
      this.config = configDoc.data();
      
      if (!this.config.personalAccessToken) {
        console.error('Asana Personal Access Token not found in configuration');
        return false;
      }
      
      this.personalAccessToken = this.config.personalAccessToken;
      console.log("Successfully loaded Personal Access Token from Firestore");
      return true;
    } catch (error) {
      console.error('Error initializing Asana sync:', error);
      return false;
    }
  }

  /**
   * Make an authenticated request to the Asana API
   * 
   * @param {string} endpoint - API endpoint (without base URL)
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response data
   */
  async makeAsanaRequest(endpoint, options = {}) {
    // Use directly provided PAT or initialize from Firestore
    if (!this.personalAccessToken) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Asana API client');
      }
    }
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.personalAccessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
    
    const url = `https://app.asana.com/api/1.0${endpoint}`;
    const fetchOptions = { ...defaultOptions, ...options };
    
    try {
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = `Asana API error: ${response.status} - ${JSON.stringify(errorData)}`;
        } catch (e) {
          // If parsing JSON fails, use the default message
        }
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error making Asana request to ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get all workspaces for the authenticated user
   * 
   * @returns {Promise<Array>} - List of workspaces
   */
  async getWorkspaces() {
    const response = await this.makeAsanaRequest('/workspaces');
    return response.data;
  }

  /**
   * Get a single workspace by ID
   * 
   * @param {string} workspaceGid - Workspace GID
   * @returns {Promise<Object>} - Workspace data
   */
  async getWorkspace(workspaceGid) {
    const response = await this.makeAsanaRequest(`/workspaces/${workspaceGid}`);
    return response.data;
  }

  /**
   * Get all teams in a workspace
   * 
   * @param {string} workspaceGid - Workspace GID
   * @returns {Promise<Array>} - List of teams
   */
  async getTeams(workspaceGid) {
    const response = await this.makeAsanaRequest(`/organizations/${workspaceGid}/teams`);
    return response.data;
  }

  /**
   * Get all projects in a workspace or team
   * 
   * @param {string} workspaceGid - Workspace GID
   * @param {string} teamGid - Optional team GID to filter by
   * @returns {Promise<Array>} - List of projects
   */
  async getProjects(workspaceGid, teamGid = null) {
    let endpoint = teamGid 
      ? `/teams/${teamGid}/projects` 
      : `/workspaces/${workspaceGid}/projects`;
    
    const response = await this.makeAsanaRequest(endpoint);
    return response.data;
  }

  /**
   * Get all sections in a project
   * 
   * @param {string} projectGid - Project GID
   * @returns {Promise<Array>} - List of sections
   */
  async getSections(projectGid) {
    const response = await this.makeAsanaRequest(`/projects/${projectGid}/sections`);
    return response.data;
  }

  /**
   * Get all users in a workspace
   * 
   * @param {string} workspaceGid - Workspace GID
   * @returns {Promise<Array>} - List of users
   */
  async getUsers(workspaceGid) {
    const response = await this.makeAsanaRequest(`/workspaces/${workspaceGid}/users`);
    return response.data;
  }

  /**
   * Search tasks in a workspace
   * 
   * @param {string} workspaceGid - Workspace GID
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - List of tasks
   */
  async searchTasks(workspaceGid, options = {}) {
    const defaultOptions = {
      completed: false,
      limit: 100,
      opt_fields: 'name,assignee,completed,due_on,due_at,notes,html_notes,tags,projects,parent,created_at,modified_at,completed_at,followers'
    };
    
    const queryParams = new URLSearchParams({
      ...defaultOptions,
      ...options
    }).toString();
    
    const response = await this.makeAsanaRequest(`/workspaces/${workspaceGid}/tasks/search?${queryParams}`);
    return response.data;
  }

  /**
   * Get a single task by ID with full details
   * 
   * @param {string} taskGid - Task GID
   * @returns {Promise<Object>} - Task data
   */
  async getTask(taskGid) {
    const response = await this.makeAsanaRequest(`/tasks/${taskGid}?opt_expand=tags,projects,parent,followers`);
    return response.data;
  }

  /**
   * Convert an Asana task to our Firestore schema
   * 
   * @param {Object} asanaTask - Task data from Asana API
   * @param {string} workspaceGid - Workspace GID
   * @returns {Object} - Task formatted for Firestore
   */
  convertTaskToFirestoreFormat(asanaTask, workspaceGid) {
    // Extract project GIDs
    const projectGids = asanaTask.projects ? asanaTask.projects.map(p => p.gid) : [];
    
    // Create project memberships
    const projectMemberships = asanaTask.memberships 
      ? asanaTask.memberships.map(m => ({
          projectGid: m.project.gid,
          sectionGid: m.section ? m.section.gid : null
        }))
      : [];
    
    // Extract tag GIDs
    const tags = asanaTask.tags ? asanaTask.tags.map(t => t.gid) : [];
    
    // Extract follower GIDs
    const followers = asanaTask.followers ? asanaTask.followers.map(f => f.gid) : [];
    
    return {
      gid: asanaTask.gid,
      name: asanaTask.name,
      notes: asanaTask.notes || '',
      htmlNotes: asanaTask.html_notes || '',
      resourceType: 'task',
      workspaceGid: workspaceGid,
      
      // Ownership & Assignment
      assigneeGid: asanaTask.assignee ? asanaTask.assignee.gid : null,
      assigneeStatus: asanaTask.assignee_status || null,
      ownerGid: null, // Asana doesn't typically expose this
      
      // Organization
      projectGids: projectGids,
      projectMemberships: projectMemberships,
      parentTaskGid: asanaTask.parent ? asanaTask.parent.gid : null,
      
      // Tagging & Categorization
      tags: tags,
      
      // Dates & Times
      dueDate: asanaTask.due_on || null,
      dueAt: asanaTask.due_at ? new Date(asanaTask.due_at) : null,
      startDate: asanaTask.start_on || null,
      startAt: asanaTask.start_at ? new Date(asanaTask.start_at) : null,
      createdAt: asanaTask.created_at ? new Date(asanaTask.created_at) : firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      modifiedAt: asanaTask.modified_at ? new Date(asanaTask.modified_at) : null,
      completedAt: asanaTask.completed_at ? new Date(asanaTask.completed_at) : null,
      
      // Status & Progress
      completed: asanaTask.completed || false,
      
      // Collaboration
      followers: followers,
      
      // Custom Fields
      customFields: asanaTask.custom_fields || [],
      
      // URLs & External References
      permalinkUrl: asanaTask.permalink_url || '',
      
      // Syncing Metadata
      lastSyncTimestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
  }

  /**
   * Synchronize tasks from a workspace to Firestore
   * 
   * @param {string} workspaceGid - Workspace GID to sync
   * @returns {Promise<Object>} - Sync results
   */
  async syncWorkspaceTasks(workspaceGid) {
    if (!workspaceGid) {
      throw new Error('Workspace GID is required');
    }
    
    // Create a sync log entry
    const syncLogRef = await this.db.collection('asana_sync_logs').add({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      operation: 'full_sync',
      status: 'in_progress',
      workspaceGid: workspaceGid,
      startTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
      totalProcessed: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: []
    });
    
    try {
      // Get tasks from Asana
      const tasks = await this.searchTasks(workspaceGid, {
        limit: 100, // Changed from 1000 to 100 (Asana API limit)
        opt_expand: 'tags,projects,parent,followers'
      });
      
      // Create a batch for efficient writing
      let batch = this.db.batch();
      let batchCount = 0;
      let stats = {
        totalProcessed: 0,
        created: 0,
        updated: 0,
        errors: []
      };
      
      // Process each task
      for (const task of tasks) {
        try {
          const firestoreTask = this.convertTaskToFirestoreFormat(task, workspaceGid);
          const taskRef = this.db.collection('asana_tasks').doc(task.gid);
          
          // Check if task exists
          const existingTask = await taskRef.get();
          
          if (existingTask.exists) {
            batch.update(taskRef, firestoreTask);
            stats.updated++;
          } else {
            batch.set(taskRef, firestoreTask);
            stats.created++;
          }
          
          batchCount++;
          stats.totalProcessed++;
          
          // Commit in batches of 500
          if (batchCount >= 500) {
            await batch.commit();
            batch = this.db.batch();
            batchCount = 0;
          }
        } catch (error) {
          console.error(`Error processing task ${task.gid}:`, error);
          stats.errors.push({
            taskGid: task.gid,
            error: error.message
          });
        }
      }
      
      // Commit any remaining batches
      if (batchCount > 0) {
        await batch.commit();
      }
      
      // Update the workspace's last sync timestamp
      await this.db.collection('asana_workspaces').doc(workspaceGid).update({
        lastSyncTimestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update the config's last full sync timestamp
      await this.db.collection('asana_config').doc('settings').update({
        lastFullSyncTimestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update the sync log
      await syncLogRef.update({
        status: 'success',
        endTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        totalProcessed: stats.totalProcessed,
        created: stats.created,
        updated: stats.updated,
        errors: stats.errors
      });
      
      return stats;
    } catch (error) {
      console.error('Error synchronizing workspace tasks:', error);
      
      // Update the sync log with error
      await syncLogRef.update({
        status: 'failure',
        endTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        errors: [{ error: error.message }]
      });
      
      throw error;
    }
  }

  /**
   * Set up the initial collections and configuration
   * 
   * @param {string} personalAccessToken - Asana Personal Access Token
   * @returns {Promise<Object>} - Setup results
   */
  async setupAsanaIntegration(personalAccessToken) {
    try {
      // Set the PAT directly for immediate use
      this.personalAccessToken = personalAccessToken;
      
      // Create the configuration
      const configData = {
        version: '1.0.0',
        personalAccessToken: personalAccessToken,
        defaultWorkspaceId: '',
        syncEnabled: true,
        syncFrequency: 'daily',
        lastFullSyncTimestamp: null,
        webhookEnabled: false,
        webhookSecret: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Log the configuration (without showing the actual token)
      console.log("Setting up Asana integration with config:", {
        ...configData,
        personalAccessToken: "********" // Hide the actual token in logs
      });
      
      await this.db.collection('asana_config').doc('settings').set(configData);
      
      // Get all workspaces
      const workspaces = await this.getWorkspaces();
      
      // Add workspaces to Firestore
      const batch = this.db.batch();
      
      for (const workspace of workspaces) {
        const workspaceRef = this.db.collection('asana_workspaces').doc(workspace.gid);
        batch.set(workspaceRef, {
          gid: workspace.gid,
          name: workspace.name,
          isOrganization: !!workspace.is_organization,
          domain: workspace.domain || '',
          emailDomains: workspace.email_domains || [],
          status: 'active',
          lastSyncTimestamp: null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      await batch.commit();
      
      // Update the default workspace if there is at least one
      if (workspaces.length > 0) {
        await this.db.collection('asana_config').doc('settings').update({
          defaultWorkspaceId: workspaces[0].gid
        });
      }
      
      return {
        success: true,
        workspaceCount: workspaces.length,
        workspaces: workspaces
      };
    } catch (error) {
      console.error('Error setting up Asana integration:', error);
      throw error;
    }
  }

  /**
   * Test the Asana API connection with the provided Personal Access Token
   * 
   * @param {string} personalAccessToken - Asana Personal Access Token to test
   * @returns {Promise<Object>} - Test results
   */
  async testConnection(personalAccessToken) {
    try {
      // Set the PAT directly for immediate use
      this.personalAccessToken = personalAccessToken;
      
      // Attempt to fetch user info (me) to validate the token
      const response = await this.makeAsanaRequest('/users/me');
      
      return {
        success: true,
        userData: response.data,
        message: `Successfully connected as ${response.data.name}`
      };
    } catch (error) {
      console.error('Asana API connection test failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Connection failed: Invalid Personal Access Token or network issue'
      };
    }
  }
}

// Make available globally
window.AsanaSync = AsanaSync; 