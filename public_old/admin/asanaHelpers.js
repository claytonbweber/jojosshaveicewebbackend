/**
 * Helper functions for Asana API integration
 */

/**
 * Fetches tasks from Asana for a specific user/location
 * @param {string} asanaPAT - Asana Personal Access Token
 * @param {string} userId - Asana User ID
 * @returns {Promise<Object>} Object with tasks organized by shift type
 */
export const fetchAsanaTasks = async (asanaPAT, userId) => {
  try {
    // Base URL for Asana API
    const baseUrl = 'https://app.asana.com/api/1.0';
    
    // Fetch all projects for the user
    const projectsResponse = await fetch(`${baseUrl}/users/${userId}/projects`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${asanaPAT}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!projectsResponse.ok) {
      throw new Error(`Failed to fetch projects: ${projectsResponse.statusText}`);
    }
    
    const projectsData = await projectsResponse.json();
    const projects = projectsData.data || [];
    
    // Get tasks for all projects
    let allTasks = [];
    
    for (const project of projects) {
      const tasksResponse = await fetch(`${baseUrl}/projects/${project.gid}/tasks?opt_fields=name,notes,completed,custom_fields,due_at`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${asanaPAT}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!tasksResponse.ok) {
        console.warn(`Failed to fetch tasks for project ${project.name}: ${tasksResponse.statusText}`);
        continue;
      }
      
      const tasksData = await tasksResponse.json();
      const tasks = tasksData.data || [];
      
      allTasks = [...allTasks, ...tasks.map(task => ({
        ...task,
        projectName: project.name,
        projectId: project.gid,
      }))];
    }
    
    // Organize tasks by shift type (based on custom field)
    const organizedTasks = {
      opening: [],
      mid: [],
      closing: []
    };
    
    for (const task of allTasks) {
      // Check if task has custom fields and find the "Shift Section" field
      if (task.custom_fields && task.custom_fields.length > 0) {
        const shiftSectionField = task.custom_fields.find(field => 
          field.name === 'Shift Section' || field.name === 'Shift Type'
        );
        
        if (shiftSectionField && shiftSectionField.enum_value) {
          const shiftType = shiftSectionField.enum_value.name.toLowerCase();
          
          if (shiftType.includes('open')) {
            organizedTasks.opening.push(mapAsanaTaskToAppTask(task));
          } else if (shiftType.includes('mid')) {
            organizedTasks.mid.push(mapAsanaTaskToAppTask(task));
          } else if (shiftType.includes('clos')) {
            organizedTasks.closing.push(mapAsanaTaskToAppTask(task));
          }
        }
      }
    }
    
    return organizedTasks;
  } catch (error) {
    console.error('Error fetching Asana tasks:', error);
    throw error;
  }
};

/**
 * Maps an Asana task to the app's task format
 * @param {Object} asanaTask - Task from Asana API
 * @returns {Object} Task formatted for the app
 */
const mapAsanaTaskToAppTask = (asanaTask) => {
  // Find the task type custom field
  let taskType = 'CheckBox'; // Default task type
  
  if (asanaTask.custom_fields && asanaTask.custom_fields.length > 0) {
    const taskTypeField = asanaTask.custom_fields.find(field => 
      field.name === 'Task Type'
    );
    
    if (taskTypeField && taskTypeField.enum_value) {
      taskType = taskTypeField.enum_value.name;
    }
  }
  
  return {
    id: asanaTask.gid,
    name: asanaTask.name,
    notes: asanaTask.notes,
    completed: asanaTask.completed,
    type: taskType,
    dueAt: asanaTask.due_at,
    projectName: asanaTask.projectName,
    projectId: asanaTask.projectId,
    custom_fields: asanaTask.custom_fields,
  };
};

/**
 * Updates a task's completion status in Asana
 * @param {string} asanaPAT - Asana Personal Access Token
 * @param {string} taskId - Asana Task ID
 * @param {boolean} completed - New completion status
 * @returns {Promise<Object>} Updated task from Asana
 */
export const updateTaskCompletion = async (asanaPAT, taskId, completed) => {
  try {
    const response = await fetch(`https://app.asana.com/api/1.0/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${asanaPAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          completed
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update task: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating task completion:', error);
    throw error;
  }
}; 