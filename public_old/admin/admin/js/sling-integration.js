/**
 * Sling Integration Helper Functions
 * 
 * This file provides utility functions for Sling API integration
 * within the JoJo's Shave Ice Admin interface
 */

// Default Sling configuration for JoJo's Shave Ice
const SLING_CONFIG = {
    organizationId: '536986',
    authToken: '49bada311f9b4392afa288dd6e7ad809'
};

/**
 * Gets the Sling integration data for a location
 * 
 * @param {Object} locationData - Location data object from Firestore
 * @returns {Object|null} Sling integration data or null if not configured
 */
function getSlingIntegrationData(locationData) {
    if (!locationData || !locationData.connections) {
        return null;
    }
    
    const slingData = locationData.connections.sling;
    if (!slingData || !slingData.locationId || !slingData.apiKey) {
        return null;
    }
    
    return slingData;
}

/**
 * Sets Sling integration data for a location document
 * 
 * @param {Object} locationData - Location data object to modify
 * @param {string} [organizationId=SLING_CONFIG.organizationId] - Sling organization ID
 * @param {string} [authToken=SLING_CONFIG.authToken] - Sling authentication token
 * @returns {Object} Updated location data object with Sling integration
 */
function setSlingIntegrationData(locationData, organizationId = SLING_CONFIG.organizationId, authToken = SLING_CONFIG.authToken) {
    if (!locationData) {
        return null;
    }
    
    // Ensure connections object exists
    if (!locationData.connections) {
        locationData.connections = {};
    }
    
    // Set the Sling integration data
    locationData.connections.sling = {
        locationId: organizationId,
        apiKey: authToken
    };
    
    return locationData;
}

/**
 * Updates all JoJo's Shave Ice locations with Sling integration data
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} [organizationId=SLING_CONFIG.organizationId] - Sling organization ID 
 * @param {string} [authToken=SLING_CONFIG.authToken] - Sling authentication token
 * @returns {Promise<number>} Promise resolving to number of locations updated
 */
async function updateAllLocationsWithSling(db, organizationId = SLING_CONFIG.organizationId, authToken = SLING_CONFIG.authToken) {
    try {
        // Get all locations from the locations collection
        const locationsSnapshot = await db.collection('locations').get();
        
        if (locationsSnapshot.empty) {
            console.log("No locations found in the database.");
            return 0;
        }
        
        const batch = db.batch();
        let updateCount = 0;
        
        // Loop through all locations
        locationsSnapshot.forEach(doc => {
            const locationData = doc.data();
            
            // Only update JoJo's Shave Ice locations
            if (locationData.groupName === "JoJo's Shave Ice") {
                console.log(`Updating location: ${locationData.locationName}`);
                
                // Update the location with Sling integration data
                const updatedLocation = setSlingIntegrationData(locationData, organizationId, authToken);
                
                // Update the location document
                batch.update(doc.ref, { 
                    connections: updatedLocation.connections,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                updateCount++;
            }
        });
        
        // Commit the batch
        if (updateCount > 0) {
            await batch.commit();
            console.log(`Successfully updated ${updateCount} JoJo's Shave Ice locations with Sling integration data.`);
        } else {
            console.log("No JoJo's Shave Ice locations found to update.");
        }
        
        return updateCount;
    } catch (error) {
        console.error("Error updating locations:", error);
        throw error;
    }
}

/**
 * Tests Sling API connection with provided credentials
 * 
 * @param {string} [organizationId=SLING_CONFIG.organizationId] - Sling organization ID
 * @param {string} [authToken=SLING_CONFIG.authToken] - Sling authentication token  
 * @returns {Promise<boolean>} Promise resolving to true if connection is successful
 */
async function testSlingConnection(organizationId = SLING_CONFIG.organizationId, authToken = SLING_CONFIG.authToken) {
    try {
        console.log("Testing Sling API connection...");
        
        // Create a test endpoint URL
        const testUrl = `https://api.getsling.com/v1/${organizationId}/test`;
        
        // Make the request
        const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log("Sling API connection successful!");
            return true;
        } else {
            // Even though we got an error, the API might still be valid
            // Sling might be blocking certain endpoints
            if (response.status === 404) {
                console.log("Endpoint not found, but authentication may still be valid. The Sling API might restrict access to certain endpoints.");
                return true;
            } else {
                console.error(`Sling API connection failed: ${response.status} - ${response.statusText}`);
                return false;
            }
        }
    } catch (error) {
        console.error(`Error testing Sling connection: ${error.message}`);
        return false;
    }
}

/**
 * Auto-populates Sling fields in the locations manager form for JoJo's Shave Ice locations
 */
function setupSlingFormAutoPopulation() {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', () => {
        // Hook into the business group select
        const businessGroupSelect = document.getElementById('businessGroup');
        if (!businessGroupSelect) return;
        
        // Original change handler that might already be defined
        const originalChangeHandler = businessGroupSelect.onchange;
        
        // Add our handler
        businessGroupSelect.onchange = function(event) {
            // Call original handler if exists
            if (originalChangeHandler) {
                originalChangeHandler.call(this, event);
            }
            
            updateSlingFieldsBasedOnGroup();
        };
        
        // Also add handler to the custom group name input
        const customGroupNameInput = document.getElementById('customGroupName');
        if (customGroupNameInput) {
            const originalInputHandler = customGroupNameInput.oninput;
            
            customGroupNameInput.oninput = function(event) {
                // Call original handler if exists
                if (originalInputHandler) {
                    originalInputHandler.call(this, event);
                }
                
                updateSlingFieldsBasedOnGroup();
            };
        }
        
        // Add initial check
        setTimeout(updateSlingFieldsBasedOnGroup, 500);
        
        console.log("Set up Sling auto-population for new locations.");
    });
}

/**
 * Updates Sling fields based on the selected business group
 */
function updateSlingFieldsBasedOnGroup() {
    const businessGroupSelect = document.getElementById('businessGroup');
    if (!businessGroupSelect) return;
    
    let businessGroup = businessGroupSelect.value;
    if (businessGroup === 'custom') {
        const customGroupNameInput = document.getElementById('customGroupName');
        if (customGroupNameInput) {
            businessGroup = customGroupNameInput.value.trim();
        }
    }
    
    // Get the Sling input fields
    const slingLocationIdInput = document.getElementById('slingLocationId');
    const slingApiKeyInput = document.getElementById('slingApiKey');
    
    // Only add Sling data for JoJo's Shave Ice group
    if (businessGroup === "JoJo's Shave Ice") {
        // Set the Sling integration data
        if (slingLocationIdInput) slingLocationIdInput.value = SLING_CONFIG.organizationId;
        if (slingApiKeyInput) slingApiKeyInput.value = SLING_CONFIG.authToken;
        
        console.log("Auto-populated Sling integration data for new JoJo's Shave Ice location.");
    } else {
        // Clear the fields for other business groups
        if (slingLocationIdInput) slingLocationIdInput.value = '';
        if (slingApiKeyInput) slingApiKeyInput.value = '';
    }
} 