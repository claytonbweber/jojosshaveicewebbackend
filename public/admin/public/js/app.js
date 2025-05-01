/**
 * JoJo's Shave Ice - Asana Task Monitor
 * Main application JavaScript
 */

// DOM Element references
const elements = {
  syncStatusIndicator: document.getElementById('sync-status-indicator'),
  syncStatusText: document.getElementById('sync-status-text'),
  navLinks: document.querySelectorAll('.nav-link'),
  viewSections: document.querySelectorAll('.view-section'),
  
  // Dashboard elements
  totalTasksCount: document.getElementById('total-tasks-count'),
  completedTasksCount: document.getElementById('completed-tasks-count'),
  activeTasksCount: document.getElementById('active-tasks-count'),
  todayTasksCount: document.getElementById('today-tasks-count'),
  recentChangesContainer: document.getElementById('recent-changes-container'),
  recentSyncsContainer: document.getElementById('recent-syncs-container'),
  refreshStatsBtn: document.getElementById('refresh-stats-btn'),
  
  // Projects elements
  projectsList: document.getElementById('projects-list'),
  syncProjectsBtn: document.getElementById('sync-projects-btn'),
  projectSearch: document.getElementById('project-search'),
  showCompletedProjects: document.getElementById('show-completed-projects'),
  showArchivedProjects: document.getElementById('show-archived-projects'),
  
  // Tasks elements
  tasksList: document.getElementById('tasks-list'),
  syncTasksBtn: document.getElementById('sync-tasks-btn'),
  taskSearch: document.getElementById('task-search'),
  projectFilter: document.getElementById('project-filter'),
  showCompletedTasks: document.getElementById('show-completed-tasks'),
  newTasksOnly: document.getElementById('new-tasks-only'),
  tasksPagination: document.getElementById('tasks-pagination'),
  
  // Changes elements
  changesList: document.getElementById('changes-list'),
  changeSearch: document.getElementById('change-search'),
  changeProjectFilter: document.getElementById('change-project-filter'),
  changeTypeFilter: document.getElementById('change-type-filter'),
  changesPagination: document.getElementById('changes-pagination'),
  
  // Settings elements
  apiConfigForm: document.getElementById('api-config-form'),
  personalAccessToken: document.getElementById('personal-access-token'),
  tokenToggleBtn: document.getElementById('token-toggle-btn'),
  syncFrequency: document.getElementById('sync-frequency'),
  initializeBtn: document.getElementById('initialize-btn')
};

// State for task filter
const state = {
  currentView: 'dashboard',
  projectsFilter: {
    searchText: '',
    showCompleted: false,
    showArchived: false
  },
  tasksFilter: {
    searchText: '',
    projectId: '',
    showCompleted: false,
    newOnly: false,
    page: 1,
    perPage: 25
  },
  changesFilter: {
    searchText: '',
    projectId: '',
    changeType: '',
    page: 1,
    perPage: 10
  }
};

// Cloud functions references
const initializeAsanaIntegration = firebase.functions().httpsCallable('initializeAsanaIntegration');
const manualSyncAll = firebase.functions().httpsCallable('manualSyncAll');

/**
 * Navigation and View Switching
 */
function setupNavigation() {
  elements.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Get the target view
      const targetView = link.getAttribute('data-bs-target');
      
      // Update active state in nav
      elements.navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Update view visibility
      elements.viewSections.forEach(section => {
        section.style.display = section.id === `${targetView}-view` ? 'block' : 'none';
      });
      
      // Update state
      state.currentView = targetView;
      
      // Load data for the selected view if needed
      switch (targetView) {
        case 'dashboard':
          loadDashboardData();
          break;
        case 'projects':
          loadProjects();
          break;
        case 'tasks':
          loadTasks();
          break;
        case 'changes':
          loadChangeLogs();
          break;
        case 'settings':
          loadSettings();
          break;
      }
    });
  });
}

/**
 * Dashboard Data
 */
async function loadDashboardData() {
  try {
    // Update task statistics
    await loadTaskStatistics();
    
    // Load recent changes
    await loadRecentChanges();
    
    // Load recent sync operations
    await loadRecentSyncOperations();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showToast('Error loading dashboard data', 'error');
  }
}

async function loadTaskStatistics() {
  try {
    // Get counts from Firestore
    const totalTasksSnapshot = await db.collection('asana_tasks').get();
    const completedTasksSnapshot = await db.collection('asana_tasks')
      .where('completed', '==', true)
      .get();
    
    const totalTasks = totalTasksSnapshot.size;
    const completedTasks = completedTasksSnapshot.size;
    const activeTasks = totalTasks - completedTasks;
    
    // Get today's due tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const todayTasksSnapshot = await db.collection('asana_tasks')
      .where('due_on', '==', todayStr)
      .where('completed', '==', false)
      .get();
    
    const todayTasks = todayTasksSnapshot.size;
    
    // Update the UI
    elements.totalTasksCount.textContent = totalTasks;
    elements.completedTasksCount.textContent = completedTasks;
    elements.activeTasksCount.textContent = activeTasks;
    elements.todayTasksCount.textContent = todayTasks;
  } catch (error) {
    console.error('Error loading task statistics:', error);
    throw error;
  }
}

async function loadRecentChanges() {
  try {
    const changesSnapshot = await db.collection('asana_change_logs')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();
    
    if (changesSnapshot.empty) {
      elements.recentChangesContainer.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-info-circle"></i>
          <p>No changes have been detected yet.</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    changesSnapshot.forEach(doc => {
      const change = doc.data();
      const timestamp = change.timestamp ? change.timestamp.toDate().toLocaleString() : 'Unknown';
      
      html += `
        <div class="log-entry ${getChangeTypeClass(change.changeType)}">
          <div class="d-flex justify-content-between align-items-start">
            <strong>${change.taskName}</strong>
            <span class="badge bg-${getChangeTypeBadgeColor(change.changeType)}">${formatChangeType(change.changeType)}</span>
          </div>
          <div>Project: ${change.projectName || 'Unknown'}</div>
          <div class="text-muted small">${timestamp}</div>
        </div>
      `;
    });
    
    elements.recentChangesContainer.innerHTML = html;
  } catch (error) {
    console.error('Error loading recent changes:', error);
    throw error;
  }
}

async function loadRecentSyncOperations() {
  try {
    const syncsSnapshot = await db.collection('asana_sync_logs')
      .orderBy('startTime', 'desc')
      .limit(5)
      .get();
    
    if (syncsSnapshot.empty) {
      elements.recentSyncsContainer.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-info-circle"></i>
          <p>No sync operations have been performed yet.</p>
        </div>
      `;
      return;
    }
    
    let html = `
      <div class="table-responsive">
        <table class="table table-striped">
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Project</th>
              <th>Status</th>
              <th>New Tasks</th>
              <th>Updated Tasks</th>
              <th>Total Tasks</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    syncsSnapshot.forEach(doc => {
      const log = doc.data();
      const startTime = log.startTime ? log.startTime.toDate().toLocaleString() : 'Unknown';
      
      html += `
        <tr>
          <td>${startTime}</td>
          <td>${log.projectName || 'All Projects'}</td>
          <td>
            <span class="badge bg-${log.status === 'completed' ? 'success' : 
                                 (log.status === 'running' ? 'info' : 'danger')}">
              ${log.status}
            </span>
          </td>
          <td>${log.newTasks || 0}</td>
          <td>${log.updatedTasks || 0}</td>
          <td>${log.totalTasks || 0}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    elements.recentSyncsContainer.innerHTML = html;
  } catch (error) {
    console.error('Error loading recent sync operations:', error);
    throw error;
  }
}

/**
 * Projects Data
 */
async function loadProjects() {
  try {
    // Start with the base query
    let query = db.collection('asana_projects');
    
    // Apply filters
    if (!state.projectsFilter.showArchived) {
      query = query.where('archived', '==', false);
    }
    
    if (!state.projectsFilter.showCompleted) {
      query = query.where('completed', '==', false);
    }
    
    // Execute the query
    const projectsSnapshot = await query.get();
    
    if (projectsSnapshot.empty) {
      elements.projectsList.innerHTML = `
        <tr>
          <td colspan="5" class="text-center">No projects found. Try adjusting your filters.</td>
        </tr>
      `;
      return;
    }
    
    // Get the projects data
    let projects = [];
    projectsSnapshot.forEach(doc => {
      projects.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Apply search filter if needed
    if (state.projectsFilter.searchText) {
      const searchText = state.projectsFilter.searchText.toLowerCase();
      projects = projects.filter(project => 
        project.name.toLowerCase().includes(searchText)
      );
    }
    
    // Sort by name
    projects.sort((a, b) => a.name.localeCompare(b.name));
    
    // Render the projects table
    if (projects.length === 0) {
      elements.projectsList.innerHTML = `
        <tr>
          <td colspan="5" class="text-center">No projects match your search.</td>
        </tr>
      `;
      return;
    }
    
    let html = '';
    projects.forEach(project => {
      const lastSyncTime = project.lastSyncTime ? 
        new Date(project.lastSyncTime.seconds * 1000).toLocaleString() : 'Never';
      
      html += `
        <tr>
          <td>${project.name}</td>
          <td>
            ${project.archived ? 
              '<span class="badge bg-secondary">Archived</span>' : 
              (project.completed ? 
                '<span class="badge bg-success">Completed</span>' : 
                '<span class="badge bg-primary">Active</span>')}
          </td>
          <td>${project.due_date || 'N/A'}</td>
          <td>${lastSyncTime}</td>
          <td>
            <button class="btn btn-sm btn-primary sync-project-btn" data-project-id="${project.id}">
              Sync
            </button>
          </td>
        </tr>
      `;
    });
    
    elements.projectsList.innerHTML = html;
    
    // Add event listeners to the sync buttons
    document.querySelectorAll('.sync-project-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const projectId = e.target.getAttribute('data-project-id');
        syncProject(projectId);
      });
    });
    
    // Also update the project filter dropdowns
    updateProjectDropdowns(projects);
  } catch (error) {
    console.error('Error loading projects:', error);
    elements.projectsList.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger">Error loading projects: ${error.message}</td>
      </tr>
    `;
  }
}

function updateProjectDropdowns(projects) {
  // Clear existing options, keeping the first one
  while (elements.projectFilter.options.length > 1) {
    elements.projectFilter.remove(1);
  }
  
  while (elements.changeProjectFilter.options.length > 1) {
    elements.changeProjectFilter.remove(1);
  }
  
  // Add new options
  projects.forEach(project => {
    if (project.archived || project.completed) return; // Only include active projects
    
    const option1 = document.createElement('option');
    option1.value = project.id;
    option1.textContent = project.name;
    elements.projectFilter.appendChild(option1);
    
    const option2 = document.createElement('option');
    option2.value = project.id;
    option2.textContent = project.name;
    elements.changeProjectFilter.appendChild(option2);
  });
}

/**
 * Tasks Data
 */
async function loadTasks() {
  try {
    // Start with the base query
    let query = db.collection('asana_tasks');
    
    // Apply filters
    if (state.tasksFilter.projectId) {
      query = query.where('projectId', '==', state.tasksFilter.projectId);
    }
    
    if (!state.tasksFilter.showCompleted) {
      query = query.where('completed', '==', false);
    }
    
    if (state.tasksFilter.newOnly) {
      query = query.where('isNew', '==', true);
    }
    
    // Add ordering
    query = query.orderBy('name');
    
    // Get total count for pagination first
    let totalQuery = db.collection('asana_tasks');
    if (state.tasksFilter.projectId) {
      totalQuery = totalQuery.where('projectId', '==', state.tasksFilter.projectId);
    }
    if (!state.tasksFilter.showCompleted) {
      totalQuery = totalQuery.where('completed', '==', false);
    }
    if (state.tasksFilter.newOnly) {
      totalQuery = totalQuery.where('isNew', '==', true);
    }
    const totalSnapshot = await totalQuery.get();
    const totalTasks = totalSnapshot.size;
    const totalPages = Math.ceil(totalTasks / state.tasksFilter.perPage);
    
    // Handle pagination - using limit instead of limit+offset
    if (state.tasksFilter.page > 1 && totalTasks > 0) {
      // Get all documents up to the start of the current page
      const previousPageCount = (state.tasksFilter.page - 1) * state.tasksFilter.perPage;
      const previousPagesSnapshot = await query.limit(previousPageCount).get();
      
      if (!previousPagesSnapshot.empty) {
        // Get the last document from previous pages
        const lastDoc = previousPagesSnapshot.docs[previousPagesSnapshot.docs.length - 1];
        // Continue query after that document
        query = query.startAfter(lastDoc);
      }
    }
    
    // Apply limit for current page
    query = query.limit(state.tasksFilter.perPage);
    
    // Execute the query
    const tasksSnapshot = await query.get();
    
    if (tasksSnapshot.empty) {
      elements.tasksList.innerHTML = `
        <tr>
          <td colspan="6" class="text-center">No tasks found. Try adjusting your filters.</td>
        </tr>
      `;
      elements.tasksPagination.innerHTML = '';
      return;
    }
    
    // Get the tasks data
    let tasks = [];
    tasksSnapshot.forEach(doc => {
      tasks.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Apply search filter if needed
    if (state.tasksFilter.searchText) {
      const searchText = state.tasksFilter.searchText.toLowerCase();
      tasks = tasks.filter(task => 
        task.name.toLowerCase().includes(searchText)
      );
    }
    
    // Render the tasks table
    if (tasks.length === 0) {
      elements.tasksList.innerHTML = `
        <tr>
          <td colspan="6" class="text-center">No tasks match your search.</td>
        </tr>
      `;
      elements.tasksPagination.innerHTML = '';
      return;
    }
    
    let html = '';
    tasks.forEach(task => {
      const rowClass = task.isNew ? 'new-task' : 
                      (task.isModified ? 'updated-task' : '') + 
                      (task.completed ? ' completed-task' : '');
      
      const dueDate = task.due_on || (task.due_at ? new Date(task.due_at).toLocaleDateString() : 'N/A');
      const lastUpdated = task.syncedAt ? new Date(task.syncedAt.seconds * 1000).toLocaleString() : 'N/A';
      
      html += `
        <tr class="task-row ${rowClass}">
          <td>${task.name}</td>
          <td>${task.projectName || 'Unknown'}</td>
          <td>${task.assignee ? task.assignee.name : 'Unassigned'}</td>
          <td>${dueDate}</td>
          <td>
            ${task.completed ? 
              '<span class="badge bg-success">Completed</span>' : 
              '<span class="badge bg-warning">Incomplete</span>'}
          </td>
          <td>${lastUpdated}</td>
        </tr>
      `;
    });
    
    elements.tasksList.innerHTML = html;
    
    // Update pagination
    updateTasksPagination(totalPages);
  } catch (error) {
    console.error('Error loading tasks:', error);
    elements.tasksList.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger">Error loading tasks: ${error.message}</td>
      </tr>
    `;
  }
}

function updateTasksPagination(totalPages) {
  if (totalPages <= 1) {
    elements.tasksPagination.innerHTML = '';
    return;
  }
  
  let paginationHtml = `
    <nav aria-label="Page navigation">
      <ul class="pagination">
        <li class="page-item ${state.tasksFilter.page === 1 ? 'disabled' : ''}">
          <a class="page-link" href="#" data-page="${state.tasksFilter.page - 1}" aria-label="Previous">
            <span aria-hidden="true">&laquo;</span>
          </a>
        </li>
  `;
  
  for (let i = 1; i <= totalPages; i++) {
    paginationHtml += `
      <li class="page-item ${state.tasksFilter.page === i ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>
    `;
  }
  
  paginationHtml += `
        <li class="page-item ${state.tasksFilter.page === totalPages ? 'disabled' : ''}">
          <a class="page-link" href="#" data-page="${state.tasksFilter.page + 1}" aria-label="Next">
            <span aria-hidden="true">&raquo;</span>
          </a>
        </li>
      </ul>
    </nav>
  `;
  
  elements.tasksPagination.innerHTML = paginationHtml;
  
  // Add event listeners to pagination links
  document.querySelectorAll('#tasks-pagination .page-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = parseInt(e.target.getAttribute('data-page') || e.target.parentElement.getAttribute('data-page'));
      state.tasksFilter.page = page;
      loadTasks();
    });
  });
}

/**
 * Change Logs
 */
async function loadChangeLogs() {
  try {
    // Start with the base query
    let query = db.collection('asana_change_logs')
      .orderBy('timestamp', 'desc');
    
    // Apply filters
    if (state.changesFilter.projectId) {
      query = query.where('projectId', '==', state.changesFilter.projectId);
    }
    
    if (state.changesFilter.changeType) {
      query = query.where('changeType', '==', state.changesFilter.changeType);
    }
    
    // Get total count for pagination first
    let totalQuery = db.collection('asana_change_logs');
    if (state.changesFilter.projectId) {
      totalQuery = totalQuery.where('projectId', '==', state.changesFilter.projectId);
    }
    if (state.changesFilter.changeType) {
      totalQuery = totalQuery.where('changeType', '==', state.changesFilter.changeType);
    }
    const totalSnapshot = await totalQuery.get();
    const totalChanges = totalSnapshot.size;
    const totalPages = Math.ceil(totalChanges / state.changesFilter.perPage);
    
    // Handle pagination - using limit instead of limit+offset
    if (state.changesFilter.page > 1 && totalChanges > 0) {
      // Get all documents up to the start of the current page
      const previousPageCount = (state.changesFilter.page - 1) * state.changesFilter.perPage;
      const previousPagesSnapshot = await query.limit(previousPageCount).get();
      
      if (!previousPagesSnapshot.empty) {
        // Get the last document from previous pages
        const lastDoc = previousPagesSnapshot.docs[previousPagesSnapshot.docs.length - 1];
        // Continue query after that document
        query = query.startAfter(lastDoc);
      }
    }
    
    // Apply limit for current page
    query = query.limit(state.changesFilter.perPage);
    
    // Execute the query
    const changesSnapshot = await query.get();
    
    if (changesSnapshot.empty) {
      elements.changesList.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-info-circle"></i>
          <p>No changes found. Try adjusting your filters or sync more tasks.</p>
        </div>
      `;
      elements.changesPagination.innerHTML = '';
      return;
    }
    
    // Get the changes data
    let changes = [];
    changesSnapshot.forEach(doc => {
      changes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Apply search filter if needed
    if (state.changesFilter.searchText) {
      const searchText = state.changesFilter.searchText.toLowerCase();
      changes = changes.filter(change => 
        (change.taskName && change.taskName.toLowerCase().includes(searchText)) ||
        (change.projectName && change.projectName.toLowerCase().includes(searchText))
      );
    }
    
    // Render the changes list
    if (changes.length === 0) {
      elements.changesList.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-search"></i>
          <p>No changes match your search.</p>
        </div>
      `;
      elements.changesPagination.innerHTML = '';
      return;
    }
    
    let html = '';
    changes.forEach(change => {
      const timestamp = change.timestamp ? new Date(change.timestamp.seconds * 1000).toLocaleString() : 'Unknown';
      
      html += `
        <div class="log-entry ${getChangeTypeClass(change.changeType)}">
          <div class="d-flex justify-content-between align-items-start">
            <h5>${change.taskName}</h5>
            <span class="badge bg-${getChangeTypeBadgeColor(change.changeType)}">${formatChangeType(change.changeType)}</span>
          </div>
          <div><strong>Project:</strong> ${change.projectName || 'Unknown'}</div>
          <div class="mt-2">
            ${getChangeDetails(change)}
          </div>
          <div class="text-muted small">${timestamp}</div>
        </div>
      `;
    });
    
    elements.changesList.innerHTML = html;
    
    // Update pagination
    updateChangesPagination(totalPages);
  } catch (error) {
    console.error('Error loading change logs:', error);
    elements.changesList.innerHTML = `
      <div class="alert alert-danger">
        Error loading change logs: ${error.message}
      </div>
    `;
  }
}

function updateChangesPagination(totalPages) {
  if (totalPages <= 1) {
    elements.changesPagination.innerHTML = '';
    return;
  }
  
  let paginationHtml = `
    <nav aria-label="Page navigation">
      <ul class="pagination">
        <li class="page-item ${state.changesFilter.page === 1 ? 'disabled' : ''}">
          <a class="page-link" href="#" data-page="${state.changesFilter.page - 1}" aria-label="Previous">
            <span aria-hidden="true">&laquo;</span>
          </a>
        </li>
  `;
  
  for (let i = 1; i <= totalPages; i++) {
    paginationHtml += `
      <li class="page-item ${state.changesFilter.page === i ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>
    `;
  }
  
  paginationHtml += `
        <li class="page-item ${state.changesFilter.page === totalPages ? 'disabled' : ''}">
          <a class="page-link" href="#" data-page="${state.changesFilter.page + 1}" aria-label="Next">
            <span aria-hidden="true">&raquo;</span>
          </a>
        </li>
      </ul>
    </nav>
  `;
  
  elements.changesPagination.innerHTML = paginationHtml;
  
  // Add event listeners to pagination links
  document.querySelectorAll('#changes-pagination .page-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = parseInt(e.target.getAttribute('data-page') || e.target.parentElement.getAttribute('data-page'));
      state.changesFilter.page = page;
      loadChangeLogs();
    });
  });
}

/**
 * Settings
 */
async function loadSettings() {
  try {
    // Load config from Firestore
    const configDoc = await db.collection('asana_config').doc('settings').get();
    
    if (configDoc.exists) {
      const config = configDoc.data();
      
      // Update the form fields
      elements.personalAccessToken.value = config.personalAccessToken || '';
      
      // Convert frequency string to number
      const frequencyMatch = config.syncFrequency ? config.syncFrequency.match(/\d+/) : null;
      const frequencyValue = frequencyMatch ? frequencyMatch[0] : '1';
      elements.syncFrequency.value = frequencyValue;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showToast('Error loading settings', 'error');
  }
}

/**
 * Action Functions
 */
async function syncProject(projectId) {
  try {
    updateSyncStatus('Syncing project...', true);
    
    // Call the Cloud Function to sync the project
    const result = await manualSyncAll({ projectIds: [projectId] });
    
    if (result.data.success) {
      showToast(`Project synced successfully. ${result.data.totalNewTasks} new tasks, ${result.data.totalUpdatedTasks} updated.`, 'success');
    } else {
      showToast(`Error syncing project: ${result.data.error}`, 'error');
    }
    
    // Refresh data based on current view
    if (state.currentView === 'projects') {
      loadProjects();
    } else if (state.currentView === 'tasks') {
      loadTasks();
    } else if (state.currentView === 'dashboard') {
      loadDashboardData();
    }
    
    updateSyncStatus('Last sync: ' + new Date().toLocaleTimeString(), false);
  } catch (error) {
    console.error('Error syncing project:', error);
    showToast(`Error syncing project: ${error.message}`, 'error');
    updateSyncStatus('Sync failed', false);
  }
}

async function syncAllProjects() {
  try {
    updateSyncStatus('Syncing all projects...', true);
    
    // Call the Cloud Function to sync all projects
    const result = await manualSyncAll({ onlyActive: true });
    
    if (result.data.success) {
      showToast(`All projects synced successfully. ${result.data.totalNewTasks} new tasks, ${result.data.totalUpdatedTasks} updated.`, 'success');
    } else {
      showToast(`Error syncing projects: ${result.data.error}`, 'error');
    }
    
    // Refresh data based on current view
    if (state.currentView === 'projects') {
      loadProjects();
    } else if (state.currentView === 'tasks') {
      loadTasks();
    } else if (state.currentView === 'dashboard') {
      loadDashboardData();
    }
    
    updateSyncStatus('Last sync: ' + new Date().toLocaleTimeString(), false);
  } catch (error) {
    console.error('Error syncing all projects:', error);
    showToast(`Error syncing all projects: ${error.message}`, 'error');
    updateSyncStatus('Sync failed', false);
  }
}

async function initializeIntegration() {
  try {
    const token = elements.personalAccessToken.value.trim();
    
    if (!token) {
      showToast('Please enter a Personal Access Token', 'error');
      return;
    }
    
    updateSyncStatus('Initializing integration...', true);
    elements.initializeBtn.disabled = true;
    
    // Call the Cloud Function to initialize the integration
    const result = await initializeAsanaIntegration({ token });
    
    if (result.data.success) {
      showToast(`Integration initialized successfully. Found ${result.data.workspaceCount} workspaces.`, 'success');
    } else {
      showToast(`Error initializing integration: ${result.data.error}`, 'error');
    }
    
    elements.initializeBtn.disabled = false;
    updateSyncStatus('Initialized at ' + new Date().toLocaleTimeString(), false);
  } catch (error) {
    console.error('Error initializing integration:', error);
    showToast(`Error initializing integration: ${error.message}`, 'error');
    elements.initializeBtn.disabled = false;
    updateSyncStatus('Initialization failed', false);
  }
}

async function saveSettings() {
  try {
    const token = elements.personalAccessToken.value.trim();
    const frequency = elements.syncFrequency.value;
    
    if (!token) {
      showToast('Please enter a Personal Access Token', 'error');
      return;
    }
    
    // Save to Firestore
    await db.collection('asana_config').doc('settings').set({
      personalAccessToken: token,
      syncFrequency: `every ${frequency} minutes`,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    showToast('Settings saved successfully', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast(`Error saving settings: ${error.message}`, 'error');
  }
}

/**
 * UI Helper Functions
 */
function updateSyncStatus(message, isActive) {
  elements.syncStatusText.textContent = message;
  elements.syncStatusIndicator.className = isActive ? 
    'status-indicator status-active' : 'status-indicator status-inactive';
}

function getChangeTypeClass(changeType) {
  switch (changeType) {
    case 'created': return 'log-success';
    case 'completed': return 'log-success';
    case 'updated': return 'log-warning';
    case 'reassigned': return 'log-info';
    case 'rescheduled': return 'log-info';
    default: return '';
  }
}

function getChangeTypeBadgeColor(changeType) {
  switch (changeType) {
    case 'created': return 'success';
    case 'completed': return 'success';
    case 'updated': return 'warning';
    case 'reassigned': return 'info';
    case 'rescheduled': return 'info';
    default: return 'secondary';
  }
}

function formatChangeType(changeType) {
  if (!changeType) return 'Unknown';
  return changeType.charAt(0).toUpperCase() + changeType.slice(1);
}

function getChangeDetails(change) {
  if (!change.previousState || !change.newState) {
    return '';
  }
  
  let details = '';
  
  switch (change.changeType) {
    case 'completed':
      details = 'Task was marked as completed';
      break;
    case 'reassigned':
      const prevAssignee = change.previousState.assignee ? change.previousState.assignee.name : 'Unassigned';
      const newAssignee = change.newState.assignee ? change.newState.assignee.name : 'Unassigned';
      details = `Reassigned from ${prevAssignee} to ${newAssignee}`;
      break;
    case 'rescheduled':
      const prevDue = change.previousState.due_on || 'No date';
      const newDue = change.newState.due_on || 'No date';
      details = `Due date changed from ${prevDue} to ${newDue}`;
      break;
    case 'created':
      details = 'New task created';
      break;
    default:
      details = 'Task was updated';
  }
  
  return details;
}

function showToast(message, type = 'info') {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast
  const toastId = 'toast-' + Date.now();
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type} border-0`;
  toast.id = toastId;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Initialize and show the toast
  const toastInstance = new bootstrap.Toast(toast);
  toastInstance.show();
  
  // Remove toast after it's hidden
  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
}

/**
 * Event Listeners
 */
function setupEventListeners() {
  // Dashboard
  elements.refreshStatsBtn.addEventListener('click', loadDashboardData);
  
  // Projects
  elements.syncProjectsBtn.addEventListener('click', syncAllProjects);
  elements.projectSearch.addEventListener('input', (e) => {
    state.projectsFilter.searchText = e.target.value;
    loadProjects();
  });
  elements.showCompletedProjects.addEventListener('change', (e) => {
    state.projectsFilter.showCompleted = e.target.checked;
    loadProjects();
  });
  elements.showArchivedProjects.addEventListener('change', (e) => {
    state.projectsFilter.showArchived = e.target.checked;
    loadProjects();
  });
  
  // Tasks
  elements.syncTasksBtn.addEventListener('click', syncAllProjects);
  elements.taskSearch.addEventListener('input', (e) => {
    state.tasksFilter.searchText = e.target.value;
    loadTasks();
  });
  elements.projectFilter.addEventListener('change', (e) => {
    state.tasksFilter.projectId = e.target.value;
    state.tasksFilter.page = 1; // Reset pagination
    loadTasks();
  });
  elements.showCompletedTasks.addEventListener('change', (e) => {
    state.tasksFilter.showCompleted = e.target.checked;
    state.tasksFilter.page = 1; // Reset pagination
    loadTasks();
  });
  elements.newTasksOnly.addEventListener('change', (e) => {
    state.tasksFilter.newOnly = e.target.checked;
    state.tasksFilter.page = 1; // Reset pagination
    loadTasks();
  });
  
  // Changes
  elements.changeSearch.addEventListener('input', (e) => {
    state.changesFilter.searchText = e.target.value;
    loadChangeLogs();
  });
  elements.changeProjectFilter.addEventListener('change', (e) => {
    state.changesFilter.projectId = e.target.value;
    state.changesFilter.page = 1; // Reset pagination
    loadChangeLogs();
  });
  elements.changeTypeFilter.addEventListener('change', (e) => {
    state.changesFilter.changeType = e.target.value;
    state.changesFilter.page = 1; // Reset pagination
    loadChangeLogs();
  });
  
  // Settings
  elements.apiConfigForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettings();
  });
  elements.tokenToggleBtn.addEventListener('click', () => {
    const inputType = elements.personalAccessToken.type;
    elements.personalAccessToken.type = inputType === 'password' ? 'text' : 'password';
    elements.tokenToggleBtn.textContent = inputType === 'password' ? 'Hide' : 'Show';
  });
  elements.initializeBtn.addEventListener('click', initializeIntegration);
  
  // Real-time listeners for updates
  setupRealtimeListeners();
}

function setupRealtimeListeners() {
  // Listen for changes in the change logs collection
  db.collection('asana_change_logs')
    .orderBy('timestamp', 'desc')
    .limit(1)
    .onSnapshot(snapshot => {
      if (!snapshot.empty && state.currentView === 'dashboard') {
        // Refresh changes section on the dashboard
        loadRecentChanges();
      }
    });
  
  // Listen for changes in the sync logs collection
  db.collection('asana_sync_logs')
    .orderBy('startTime', 'desc')
    .limit(1)
    .onSnapshot(snapshot => {
      if (!snapshot.empty && state.currentView === 'dashboard') {
        // Refresh sync logs section on the dashboard
        loadRecentSyncOperations();
      }
    });
}

/**
 * Initialize the Application
 */
function initApp() {
  // Setup navigation
  setupNavigation();
  
  // Setup all event listeners
  setupEventListeners();
  
  // Load initial data
  loadDashboardData();
  
  // Update initial sync status
  updateSyncStatus('Ready', false);
}

// Start the application
document.addEventListener('DOMContentLoaded', initApp); 