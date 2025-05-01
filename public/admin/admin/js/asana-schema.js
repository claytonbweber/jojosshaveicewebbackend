/**
 * Asana Integration - Database Schema Design
 * 
 * This file outlines the Firestore schema for storing and managing Asana task data.
 * The schema is designed to efficiently support syncing and querying all tasks 
 * from an Asana workspace while maintaining the relationships between tasks,
 * projects, teams, and users.
 */

// Schema versioning to support future migrations
const SCHEMA_VERSION = '1.0.0';

/**
 * Firestore Collections Structure
 * 
 * asana_config - Configuration for the Asana integration
 * asana_workspaces - Information about connected Asana workspaces
 * asana_teams - Teams in the workspace
 * asana_projects - Projects in the workspace
 * asana_sections - Sections within projects
 * asana_users - Users in the workspace
 * asana_tasks - All tasks in the workspace
 * asana_tags - All tags in the workspace
 * asana_task_history - Historical snapshots of task changes (optional for auditing)
 * asana_sync_logs - Logs of sync operations
 */

/**
 * Collection: asana_config
 * Purpose: Stores configuration information for the Asana integration
 * 
 * Document ID: 'settings'
 */
const asanaConfigSchema = {
    version: SCHEMA_VERSION,
    personalAccessToken: 'string', // Encrypted token
    defaultWorkspaceId: 'string',
    syncEnabled: true,
    syncFrequency: 'hourly', // 'hourly', 'daily', 'realtime'
    lastFullSyncTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
    webhookEnabled: false,
    webhookSecret: 'string',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
};

/**
 * Collection: asana_workspaces
 * Purpose: Stores information about connected Asana workspaces
 * 
 * Document ID: {workspace_gid}
 */
const asanaWorkspaceSchema = {
    gid: 'string', // Asana's unique workspace ID
    name: 'string',
    isOrganization: true,
    defaultTeamGid: 'string', // Default team to use for tasks without a team
    domain: 'string',
    emailDomains: [],
    status: 'active', // 'active', 'archived', 'deleted'
    lastSyncTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
};

/**
 * Collection: asana_teams
 * Purpose: Stores information about teams in the workspace
 * 
 * Document ID: {team_gid}
 */
const asanaTeamSchema = {
    gid: 'string', // Asana's unique team ID
    name: 'string',
    workspaceGid: 'string', // Reference to parent workspace
    description: 'string',
    status: 'active', // 'active', 'archived', 'deleted'
    htmlDescription: 'string',
    projectCount: 0,
    memberCount: 0,
    lastSyncTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
};

/**
 * Collection: asana_projects
 * Purpose: Stores information about projects in the workspace
 * 
 * Document ID: {project_gid}
 */
const asanaProjectSchema = {
    gid: 'string', // Asana's unique project ID
    name: 'string',
    workspaceGid: 'string', // Reference to parent workspace
    teamGid: 'string', // Reference to parent team
    ownerGid: 'string', // Reference to project owner
    status: 'active', // 'active', 'archived', 'deleted'
    description: 'string',
    htmlDescription: 'string',
    color: 'string',
    dueDate: null, // timestamp
    startDate: null, // timestamp
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    modifiedAt: null, // timestamp from Asana
    lastSyncTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
    isPublic: true,
    isTemplate: false,
    taskCount: 0,
    projectBrief: null, // Project brief content
    customFields: [], // Array of custom field values specific to this project
    defaultView: 'list', // 'list', 'board', 'calendar', 'timeline'
    followers: [] // Array of user GIDs
};

/**
 * Collection: asana_sections
 * Purpose: Stores information about sections within projects
 * 
 * Document ID: {section_gid}
 */
const asanaSectionSchema = {
    gid: 'string', // Asana's unique section ID
    name: 'string',
    projectGid: 'string', // Reference to parent project
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    taskCount: 0
};

/**
 * Collection: asana_users
 * Purpose: Stores information about users in the workspace
 * 
 * Document ID: {user_gid}
 */
const asanaUserSchema = {
    gid: 'string', // Asana's unique user ID
    name: 'string',
    email: 'string',
    workspaceGids: [], // Array of workspace GIDs this user belongs to
    teams: [], // Array of team GIDs this user belongs to
    photo: null, // URL to profile photo
    role: 'member', // 'guest', 'member', 'admin', etc.
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastSyncTimestamp: firebase.firestore.FieldValue.serverTimestamp()
};

/**
 * Collection: asana_tasks
 * Purpose: Stores all tasks in the workspace
 * 
 * Document ID: {task_gid}
 * This is the central collection that stores all task data
 */
const asanaTaskSchema = {
    // Core Task Information
    gid: 'string', // Asana's unique task ID
    name: 'string', // Task title
    notes: 'string', // Task description
    htmlNotes: 'string', // HTML formatted description
    resourceType: 'task',
    workspaceGid: 'string', // Reference to workspace
    
    // Ownership & Assignment
    assigneeGid: null, // GID of assigned user
    assigneeStatus: null, // 'inbox', 'today', 'upcoming', 'later'
    ownerGid: null, // GID of task creator
    
    // Organization
    projectGids: [], // Array of project GIDs this task belongs to
    projectMemberships: [
        // Example: [{ projectGid: 'string', sectionGid: 'string' }]
    ],
    parentTaskGid: null, // For subtasks
    
    // Tagging & Categorization
    tags: [], // Array of tag GIDs
    
    // Dates & Times
    dueDate: null, // YYYY-MM-DD string
    dueTime: null, // HH:MM:SS string
    dueAt: null, // Timestamp
    startDate: null, // YYYY-MM-DD string
    startTime: null, // HH:MM:SS string
    startAt: null, // Timestamp
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    modifiedAt: null, // Last modified timestamp from Asana
    completedAt: null, // Completion timestamp
    
    // Status & Progress
    completed: false,
    
    // Collaboration
    followers: [], // Array of user GIDs
    hearted: false,
    hearts: [], // Users who hearted this task
    liked: false,
    likes: [], // Users who liked this task
    numHearts: 0,
    numLikes: 0,
    
    // Custom Fields
    customFields: [], // Array of custom field values
    
    // URLs & External References
    permalinkUrl: 'string',
    
    // Syncing Metadata
    lastSyncTimestamp: firebase.firestore.FieldValue.serverTimestamp()
};

/**
 * Collection: asana_tags
 * Purpose: Stores information about tags in the workspace
 * 
 * Document ID: {tag_gid}
 */
const asanaTagSchema = {
    gid: 'string', // Asana's unique tag ID
    name: 'string',
    workspaceGid: 'string', // Reference to parent workspace
    color: null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
};

/**
 * Collection: asana_task_history
 * Purpose: Stores historical snapshots of task changes for auditing
 * 
 * Document ID: Auto-generated
 */
const asanaTaskHistorySchema = {
    taskGid: 'string', // Reference to the task
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    changeType: 'update', // 'create', 'update', 'delete'
    changedBy: 'string', // User who made the change
    previousState: {}, // Previous state of the task (for relevant fields)
    newState: {}, // New state of the task (for relevant fields)
    changedFields: [] // Array of field names that were changed
};

/**
 * Collection: asana_sync_logs
 * Purpose: Logs of sync operations for debugging and monitoring
 * 
 * Document ID: Auto-generated
 */
const asanaSyncLogSchema = {
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    operation: 'full_sync', // 'full_sync', 'incremental_sync', 'webhook'
    status: 'success', // 'success', 'partial_failure', 'failure'
    workspaceGid: 'string',
    startTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
    endTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
    totalProcessed: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [],
    details: {}
};

/**
 * Indexes to create for efficient querying
 * 
 * These indexes should be created in Firestore to support common queries
 */
const requiredIndexes = [
    {
        collection: 'asana_tasks',
        fields: [
            { fieldPath: 'workspaceGid', order: 'ASCENDING' },
            { fieldPath: 'completed', order: 'ASCENDING' },
            { fieldPath: 'dueDate', order: 'ASCENDING' }
        ]
    },
    {
        collection: 'asana_tasks',
        fields: [
            { fieldPath: 'workspaceGid', order: 'ASCENDING' },
            { fieldPath: 'assigneeGid', order: 'ASCENDING' },
            { fieldPath: 'completed', order: 'ASCENDING' }
        ]
    },
    {
        collection: 'asana_tasks',
        fields: [
            { fieldPath: 'projectGids', order: 'ARRAY_CONTAINS' },
            { fieldPath: 'completed', order: 'ASCENDING' },
            { fieldPath: 'updatedAt', order: 'DESCENDING' }
        ]
    },
    {
        collection: 'asana_tasks',
        fields: [
            { fieldPath: 'parentTaskGid', order: 'ASCENDING' },
            { fieldPath: 'completed', order: 'ASCENDING' },
            { fieldPath: 'createdAt', order: 'ASCENDING' }
        ]
    }
];

// Export all schema definitions
const asanaSchemas = {
    version: SCHEMA_VERSION,
    collections: {
        asana_config: asanaConfigSchema,
        asana_workspaces: asanaWorkspaceSchema,
        asana_teams: asanaTeamSchema,
        asana_projects: asanaProjectSchema,
        asana_sections: asanaSectionSchema,
        asana_users: asanaUserSchema,
        asana_tasks: asanaTaskSchema,
        asana_tags: asanaTagSchema,
        asana_task_history: asanaTaskHistorySchema,
        asana_sync_logs: asanaSyncLogSchema
    },
    indexes: requiredIndexes
};

// Make available globally
window.asanaSchemas = asanaSchemas; 