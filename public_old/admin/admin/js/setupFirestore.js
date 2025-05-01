// Firebase Firestore Setup Script
// This script works with a hierarchical location structure:
// locations (collection) > groups (documents) > stores (subcollection) > location documents

// Firebase configuration for "jojo-s-app-back-end" project
const firebaseConfig = {
    apiKey: "AIzaSyCgEDfRBjbqqnwWc0TeR97V3RvfrvjJu1U",
    authDomain: "jojo-s-app-back-end.firebaseapp.com",
    projectId: "jojo-s-app-back-end",
    storageBucket: "jojo-s-app-back-end.appspot.com",
    messagingSenderId: "344579778389",
    appId: "1:344579778389:web:6a17be1a1d13b82955f1dc",
    measurementId: "G-VBP44WBTCP"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM elements
const setupStatusDiv = document.getElementById('setup-status');
const locationsList = document.getElementById('locations-list');

// Add status message
function addStatus(message, isError = false) {
    const statusItem = document.createElement('div');
    statusItem.className = isError ? 'alert alert-danger' : 'alert alert-info';
    statusItem.textContent = message;
    setupStatusDiv.appendChild(statusItem);
    console.log(message);
}

// Create sample tasks for a location
async function createSampleTasks(groupId, locationId, locationName) {
    try {
        // First check if tasks already exist for this location
        const existingTasks = await db.collection('tasks')
            .where('groupId', '==', groupId)
            .where('locationId', '==', locationId)
            .get();
        
        if (!existingTasks.empty) {
            addStatus(`Tasks already exist for ${locationName}. Skipping task creation.`);
            return {
                success: true,
                message: `Tasks already exist for ${locationName}`,
                tasksCount: existingTasks.size
            };
        }

        // Create tasks if none exist
        const batch = db.batch();
        let taskCount = 0;
        
        // Opening Tasks
        const openingTasks = [
            { 
                name: "Check refrigerator temperature", 
                details: "Ensure refrigerator temperature is between 34°F and 40°F", 
                category: "Opening Tasks", 
                type: "numeric" 
            },
            { 
                name: "Turn on all equipment", 
                details: "Turn on freezers, ice shavers, and refrigerators", 
                category: "Opening Tasks", 
                type: "checkbox" 
            },
            { 
                name: "Sanitize work surfaces", 
                details: "Clean all counter surfaces with approved sanitizer", 
                category: "Opening Tasks", 
                type: "checkbox" 
            },
            { 
                name: "Stock cups and utensils", 
                details: "Ensure adequate supply of cups, spoons, and napkins at serving stations", 
                category: "Opening Tasks", 
                type: "checkbox" 
            },
            { 
                name: "Check syrup inventory", 
                details: "Verify all syrups are stocked and note any low inventory", 
                category: "Opening Tasks", 
                type: "single-selection", 
                options: "All stocked,Some flavors low,Critical - need immediate restock" 
            }
        ];
        
        // Midday Tasks
        const middayTasks = [
            { 
                name: "Clean ice shaver", 
                details: "Remove any ice buildup and clean the blade housing", 
                category: "Midday Tasks", 
                type: "checkbox" 
            },
            { 
                name: "Restock cups and utensils", 
                details: "Check and refill serving stations with cups, spoons, and napkins", 
                category: "Midday Tasks", 
                type: "checkbox" 
            },
            { 
                name: "Check and empty trash", 
                details: "Empty trash bins if more than 3/4 full", 
                category: "Midday Tasks", 
                type: "single-selection", 
                options: "Empty,1/4 Full,1/2 Full,3/4 Full,Full - Emptied" 
            }
        ];
        
        // Closing Tasks
        const closingTasks = [
            { 
                name: "Clean all equipment", 
                details: "Thoroughly clean ice shavers, dispensers, and other equipment", 
                category: "Closing Tasks", 
                type: "checkbox" 
            },
            { 
                name: "Inventory check", 
                details: "Count remaining inventory of cups, syrups, and supplies", 
                category: "Closing Tasks", 
                type: "short-answer" 
            },
            { 
                name: "Rate equipment condition",
                details: "Evaluate the overall condition of equipment after cleaning",
                category: "Closing Tasks",
                type: "rating"
            }
        ];
        
        // Cleaning Tasks
        const cleaningTasks = [
            { 
                name: "Deep clean freezers", 
                details: "Remove all items, defrost if necessary, clean inside with approved cleaner", 
                category: "Day's Cleaning", 
                type: "cleaning", 
                cleaningTime: "Evening (Closing)",
                cleaningDays: ["Monday", "Thursday"]
            }
        ];
        
        // Combine all tasks
        const allTasks = [
            ...openingTasks, 
            ...middayTasks, 
            ...closingTasks, 
            ...cleaningTasks
        ];
        
        // Add tasks to batch
        let order = 0;
        allTasks.forEach(task => {
            task.order = order++;
            task.groupId = groupId;
            task.locationId = locationId;
            
            // Create a new document reference
            const taskRef = db.collection('tasks').doc();
            batch.set(taskRef, {
                ...task,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: 'system'
            });
            taskCount++;
        });
        
        // Commit the batch
        await batch.commit();
        addStatus(`Created ${taskCount} tasks for ${locationName}`);
        
        return {
            success: true,
            message: `Created ${taskCount} tasks for ${locationName}`,
            tasksCount: taskCount
        };
    } catch (error) {
        addStatus(`Error creating tasks: ${error.message}`, true);
        return {
            success: false,
            message: error.message
        };
    }
}

// Check Firestore connection and database structure
async function checkFirestoreConnection() {
    try {
        addStatus("Connecting to Firestore database...");
        
        // Try to access the locations collection
        const locationsSnapshot = await db.collection('locations').get();
        
        if (locationsSnapshot.empty) {
            addStatus("Connected to Firestore, but found no documents in the 'locations' collection", true);
            return false;
        }
        
        // Count different types of documents
        let businessGroups = 0;
        let directLocations = 0;
        
        locationsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.groupName) {
                businessGroups++;
            } else if (data.locationName) {
                directLocations++;
            }
        });
        
        if (businessGroups > 0) {
            addStatus(`Connected to Firestore. Found ${businessGroups} business group(s) in the 'locations' collection.`);
        } else if (directLocations > 0) {
            addStatus(`Connected to Firestore. Found ${directLocations} direct location(s) in the 'locations' collection.`);
        } else {
            addStatus(`Connected to Firestore. Found ${locationsSnapshot.size} document(s) in the 'locations' collection, but they don't appear to be business groups or locations.`);
        }
        
        return true;
    } catch (error) {
        addStatus(`Firestore connection error: ${error.message}`, true);
        console.error("Firestore connection error:", error);
        return false;
    }
}

// Alternative structure: Create all locations directly in the locations collection
async function createDirectLocationStructure() {
    try {
        const batch = db.batch();
        
        // Create CIAB Waimea
        const cmpWaimea = db.collection('locations').doc('ciab-waimea');
        batch.set(cmpWaimea, {
            locationName: 'Waimea',
            groupName: 'Chicken in a Barrel',
            groupCode: 'CIAB',
            locationCode: 'WM',
            address: '9400 Kaumualii Hwy, Waimea, HI 96796',
            locationEmail: 'waimea@example.com',
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create CIAB Coconut Marketplace
        const ciabCMP = db.collection('locations').doc('ciab-coconut-marketplace');
        batch.set(ciabCMP, {
            locationName: 'Coconut Marketplace',
            groupName: 'Chicken in a Barrel',
            groupCode: 'CIAB',
            locationCode: 'CMP',
            address: '4-484 Kuhio Hwy, Kapaa, HI 96746',
            locationEmail: 'cmp@example.com',
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create JoJo's Waimea
        const jojoWaimea = db.collection('locations').doc('jojo-waimea');
        batch.set(jojoWaimea, {
            locationName: 'Waimea',
            groupName: 'JoJos Shave Ice',
            groupCode: 'JOJO',
            locationCode: 'JWM',
            address: '9400 Kaumualii Hwy, Waimea, HI 96796',
            locationEmail: 'jojo-waimea@example.com',
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create JoJo's Coconut Marketplace
        const jojoCMP = db.collection('locations').doc('jojo-coconut-marketplace');
        batch.set(jojoCMP, {
            locationName: 'Coconut Marketplace',
            groupName: 'JoJos Shave Ice',
            groupCode: 'JOJO',
            locationCode: 'JCMP',
            address: '4-484 Kuhio Hwy, Kapaa, HI 96746',
            locationEmail: 'jojo-cmp@example.com',
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create JoJo's Hanalei
        const jojoHanalei = db.collection('locations').doc('jojo-hanalei');
        batch.set(jojoHanalei, {
            locationName: 'Hanalei',
            groupName: 'JoJos Shave Ice',
            groupCode: 'JOJO',
            locationCode: 'JHN',
            address: '5-5190 Kuhio Hwy, Hanalei, HI 96714',
            locationEmail: 'jojo-hanalei@example.com',
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Commit the batch
        await batch.commit();
        addStatus("Created locations with group information directly in the locations collection");
        
        // Reload the page to display the new structure
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } catch (error) {
        addStatus(`Error initializing location structure: ${error.message}`, true);
    }
}

// Get task counts for all locations
async function getTaskCounts() {
    try {
        const snapshot = await db.collection('tasks').get();
        const taskCounts = {};
        
        snapshot.forEach(doc => {
            const task = doc.data();
            // Check for both groupId+locationId pattern and just locationId pattern
            if (task.locationId) {
                const key = task.groupId ? `${task.groupId}:${task.locationId}` : task.locationId;
                if (!taskCounts[key]) {
                    taskCounts[key] = 0;
                }
                taskCounts[key]++;
            }
        });
        
        return taskCounts;
    } catch (error) {
        console.error("Error counting tasks:", error);
        return {};
    }
}

// Load and display locations - Simplified version to handle permissions issues
async function loadLocations() {
    try {
        // Check Firestore connection
        const isConnected = await checkFirestoreConnection();
        if (!isConnected) {
            locationsList.innerHTML = `
                <div class="alert alert-warning">
                    <p>Could not connect to Firestore or no documents found in the 'locations' collection.</p>
                    <p>You can initialize a flat structure of locations by clicking the button below:</p>
                    <button id="init-flat-structure" class="btn btn-primary mt-3">Create Sample Locations</button>
                </div>`;
                
            // Add event listener to the init button
            document.getElementById('init-flat-structure').addEventListener('click', createDirectLocationStructure);
            return;
        }
        
        try {
            // Get all locations directly from the locations collection
            const locationsSnapshot = await db.collection('locations').get();
            
            // If no locations, show initialization option
            if (locationsSnapshot.empty) {
                locationsList.innerHTML = `
                    <div class="alert alert-warning">
                        <p>No locations found in the 'locations' collection.</p>
                        <button id="init-flat-structure" class="btn btn-primary">Create Sample Locations</button>
                    </div>`;
                    
                // Add event listener to the init button
                document.getElementById('init-flat-structure').addEventListener('click', createDirectLocationStructure);
                return;
            }
            
            // Get task counts for all locations
            const taskCounts = await getTaskCounts();
            
            // Group locations by business group
            const groupedLocations = {};
            
            locationsSnapshot.forEach(doc => {
                const location = doc.data();
                const locationId = doc.id;
                
                // Skip if this is a group document without locationName
                if (!location.locationName) {
                    return;
                }
                
                const groupName = location.groupName || 'Ungrouped Locations';
                const groupCode = location.groupCode || '';
                
                if (!groupedLocations[groupName]) {
                    groupedLocations[groupName] = {
                        code: groupCode,
                        locations: []
                    };
                }
                
                groupedLocations[groupName].locations.push({
                    id: locationId,
                    data: location
                });
            });
            
            // If no valid locations found
            if (Object.keys(groupedLocations).length === 0) {
                locationsList.innerHTML = `
                    <div class="alert alert-warning">
                        <p>No valid locations found with locationName field in the 'locations' collection.</p>
                        <button id="init-flat-structure" class="btn btn-primary">Create Sample Locations</button>
                    </div>`;
                    
                // Add event listener to the init button
                document.getElementById('init-flat-structure').addEventListener('click', createDirectLocationStructure);
                return;
            }
            
            // Build the accordion UI for groups and their locations
            let accordionHtml = '<div class="accordion" id="groupsAccordion">';
            let groupIndex = 0;
            
            for (const groupName in groupedLocations) {
                const group = groupedLocations[groupName];
                const groupId = group.code || groupName.toLowerCase().replace(/\s+/g, '-');
                
                // Add group header to accordion
                accordionHtml += `
                    <div class="accordion-item">
                        <h2 class="accordion-header" id="heading-${groupIndex}">
                            <button class="accordion-button ${groupIndex > 0 ? 'collapsed' : ''}" type="button" 
                                data-bs-toggle="collapse" data-bs-target="#collapse-${groupIndex}" 
                                aria-expanded="${groupIndex === 0 ? 'true' : 'false'}" aria-controls="collapse-${groupIndex}">
                                ${groupName} 
                                ${group.code ? `<span class="badge bg-secondary ms-2">${group.code}</span>` : ''}
                                <span class="badge bg-info ms-2">${group.locations.length} locations</span>
                            </button>
                        </h2>
                        <div id="collapse-${groupIndex}" class="accordion-collapse collapse ${groupIndex === 0 ? 'show' : ''}" 
                            aria-labelledby="heading-${groupIndex}" data-bs-parent="#groupsAccordion">
                            <div class="accordion-body">
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Location</th>
                                                <th>Address</th>
                                                <th>Status</th>
                                                <th>Tasks</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                `;
                
                // Add each location to the table
                if (group.locations.length === 0) {
                    accordionHtml += `
                        <tr>
                            <td colspan="5" class="text-center">
                                <em>No locations found for this group</em>
                            </td>
                        </tr>
                    `;
                } else {
                    group.locations.forEach(location => {
                        const locationData = location.data;
                        const locationId = location.id;
                        
                        // Determine task count (try both patterns)
                        let taskCount = 0;
                        const groupTaskKey = `${groupId}:${locationId}`;
                        if (taskCounts[groupTaskKey]) {
                            taskCount = taskCounts[groupTaskKey];
                        } else if (taskCounts[locationId]) {
                            taskCount = taskCounts[locationId];
                        }
                        
                        // Format task badge
                        const taskBadge = taskCount > 0 ?
                            `<span class="badge bg-info">${taskCount} tasks</span>` :
                            '<span class="badge bg-warning">No tasks</span>';
                        
                        accordionHtml += `
                            <tr>
                                <td>${locationData.locationName || 'Unnamed'}</td>
                                <td><small>${locationData.address || 'No address'}</small></td>
                                <td>${locationData.active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
                                <td>${taskBadge}</td>
                                <td>
                                    <button class="btn btn-sm ${taskCount > 0 ? 'btn-success' : 'btn-primary'} setup-tasks" 
                                        data-group-id="${groupId}" 
                                        data-location-id="${locationId}" 
                                        data-name="${locationData.locationName || 'Unnamed Location'}">
                                        ${taskCount > 0 ? 'Update Tasks' : 'Setup Tasks'}
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                }
                
                // Close the group accordion
                accordionHtml += `
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                groupIndex++;
            }
            
            accordionHtml += '</div>';
            locationsList.innerHTML = accordionHtml;
            
            // Add event listeners to setup task buttons
            document.querySelectorAll('.setup-tasks').forEach(button => {
                button.addEventListener('click', async function() {
                    const groupId = this.getAttribute('data-group-id');
                    const locationId = this.getAttribute('data-location-id');
                    const locationName = this.getAttribute('data-name');
                    
                    try {
                        button.disabled = true;
                        button.textContent = 'Setting up...';
                        
                        const result = await createSampleTasks(groupId, locationId, locationName);
                        
                        if (result.success) {
                            button.textContent = 'Done!';
                            button.classList.remove('btn-primary', 'btn-warning');
                            button.classList.add('btn-success');
                            
                            // Update task count badge
                            const row = button.closest('tr');
                            const taskCell = row.querySelector('td:nth-child(4)');
                            if (taskCell) {
                                taskCell.innerHTML = `<span class="badge bg-info">${result.tasksCount} tasks</span>`;
                            }
                            
                            setTimeout(() => {
                                button.textContent = 'Update Tasks';
                                button.disabled = false;
                            }, 2000);
                        } else {
                            button.textContent = 'Error';
                            button.classList.remove('btn-primary', 'btn-success');
                            button.classList.add('btn-danger');
                            
                            setTimeout(() => {
                                button.textContent = 'Retry Setup';
                                button.disabled = false;
                                button.classList.remove('btn-danger');
                                button.classList.add('btn-warning');
                            }, 2000);
                        }
                    } catch (error) {
                        console.error("Error setting up tasks:", error);
                        button.textContent = 'Error';
                        button.classList.remove('btn-primary', 'btn-success');
                        button.classList.add('btn-danger');
                        
                        setTimeout(() => {
                            button.textContent = 'Retry Setup';
                            button.disabled = false;
                            button.classList.remove('btn-danger');
                            button.classList.add('btn-warning');
                        }, 2000);
                    }
                });
            });
        } catch (error) {
            if (error.message.includes("permission") || error.code === "permission-denied") {
                addStatus(`Permission error: ${error.message}. Trying simplified approach...`, true);
                
                // Offer to create a simplified structure
                locationsList.innerHTML = `
                    <div class="alert alert-warning">
                        <p><strong>Permission Error:</strong> ${error.message}</p>
                        <p>Your Firestore security rules may be preventing access to subcollections.</p>
                        <p>You have two options:</p>
                        <ol>
                            <li>Update your Firestore security rules to allow access to subcollections</li>
                            <li>Create a simplified structure with all locations in the main collection</li>
                        </ol>
                        <button id="init-flat-structure" class="btn btn-primary mt-3">Create Simplified Structure</button>
                    </div>`;
                    
                // Add event listener to the init button
                document.getElementById('init-flat-structure').addEventListener('click', createDirectLocationStructure);
            } else {
                addStatus(`Error loading locations: ${error.message}`, true);
                console.error("Detailed error:", error);
                locationsList.innerHTML = `
                    <div class="alert alert-danger">
                        <p>Error loading locations: ${error.message}</p>
                        <p>Check browser console for more details and verify your Firebase configuration.</p>
                    </div>`;
            }
        }
    } catch (error) {
        addStatus(`Error loading locations: ${error.message}`, true);
        console.error("Detailed error:", error);
        locationsList.innerHTML = `
            <div class="alert alert-danger">
                <p>Error loading locations: ${error.message}</p>
                <p>Check browser console for more details and verify your Firebase configuration.</p>
            </div>`;
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Show a welcome message
    addStatus("Welcome to the JoJo's Shave Ice Task Setup. Initializing...");
    
    // Load locations
    loadLocations()
        .then(() => {
            // Show completion message
            addStatus("Setup page loaded. Check above for any connection issues.");
        })
        .catch(error => {
            addStatus(`Error loading data: ${error.message}`, true);
        });
}); 