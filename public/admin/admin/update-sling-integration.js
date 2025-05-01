// Script to update all JoJo's Shave Ice locations with Sling integration data
// Run this script in the browser console on the locations-manager.html page

// Sling integration information
const slingData = {
  organizationId: "536986",
  authToken: "49bada311f9b4392afa288dd6e7ad809"
};

// Function to update all JoJo's Shave Ice locations
async function updateJojosLocationsWithSling() {
  try {
    // Get all locations from the locations collection
    const locationsSnapshot = await db.collection('locations').get();
    
    if (locationsSnapshot.empty) {
      console.log("No locations found in the database.");
      return;
    }
    
    const batch = db.batch();
    let updateCount = 0;
    
    // Loop through all locations
    locationsSnapshot.forEach(doc => {
      const locationData = doc.data();
      
      // Only update JoJo's Shave Ice locations
      if (locationData.groupName === "JoJo's Shave Ice") {
        console.log(`Updating location: ${locationData.locationName}`);
        
        // Create connections object if it doesn't exist
        const connections = locationData.connections || {};
        
        // Update the Sling integration data
        connections.sling = {
          locationId: slingData.organizationId,
          apiKey: slingData.authToken
        };
        
        // Update the location document
        batch.update(doc.ref, { 
          connections: connections,
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
  } catch (error) {
    console.error("Error updating locations:", error);
  }
}

// Function to add Sling integration to new locations
function setupSlingConfigForNewLocations() {
  // Hook into the form submission
  const addLocationForm = document.getElementById('add-location-form');
  if (!addLocationForm) {
    console.error("Add location form not found!");
    return;
  }
  
  // Save the original submit handler
  const originalSubmitHandler = addLocationForm.onsubmit;
  
  // Replace with our enhanced handler
  addLocationForm.onsubmit = function(event) {
    // Don't prevent the original handler from running
    if (originalSubmitHandler) {
      originalSubmitHandler(event);
    }
    
    // Get the business group select element
    const businessGroupSelect = document.getElementById('businessGroup');
    if (!businessGroupSelect) return;
    
    let businessGroup = businessGroupSelect.value;
    if (businessGroup === 'custom') {
      businessGroup = document.getElementById('customGroupName').value.trim();
    }
    
    // Only add Sling data for JoJo's Shave Ice group
    if (businessGroup === "JoJo's Shave Ice") {
      // Get the Sling input fields
      const slingLocationIdInput = document.getElementById('slingLocationId');
      const slingApiKeyInput = document.getElementById('slingApiKey');
      
      // Set the Sling integration data
      if (slingLocationIdInput) slingLocationIdInput.value = slingData.organizationId;
      if (slingApiKeyInput) slingApiKeyInput.value = slingData.authToken;
      
      console.log("Auto-populated Sling integration data for new JoJo's Shave Ice location.");
    }
  };
  
  console.log("Set up Sling auto-configuration for new locations.");
}

// Call this function from the browser console to update all locations
// updateJojosLocationsWithSling();

// Set up the auto-configuration for new locations
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(setupSlingConfigForNewLocations, 1000);
  console.log("Sling integration script loaded. To update all existing locations, call updateJojosLocationsWithSling() from the console.");
});

// Instructions for use:
/*
1. Open the locations-manager.html page in your browser
2. Open the browser console (F12 or Ctrl+Shift+J or Cmd+Option+J)
3. Copy and paste this script in the console
4. Call updateJojosLocationsWithSling() to update all existing locations
5. Any new locations created for JoJo's Shave Ice will automatically have Sling integration
*/ 