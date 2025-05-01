// Cleanup script to remove redundant data from Firebase
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-admin-key.json'); // You'll need to create this

// Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupRedundantData() {
  console.log('Starting cleanup of redundant Firebase data...');

  try {
    // 1. Remove redundant fields from asana_config.settings
    const configRef = db.collection('asana_config').doc('settings');
    const configDoc = await configRef.get();
    
    if (configDoc.exists) {
      console.log('Cleaning up asana_config.settings...');
      
      // Remove redundant fields if they exist
      const updates = {};
      const data = configDoc.data();
      
      if ('workspaces' in data) {
        updates.workspaces = admin.firestore.FieldValue.delete();
        console.log('- Removing redundant workspaces field');
      }
      
      if ('sync_projects' in data) {
        updates.sync_projects = admin.firestore.FieldValue.delete();
        console.log('- Removing redundant sync_projects field');
      }
      
      if ('last_sync_projects' in data) {
        updates.last_sync_projects = admin.firestore.FieldValue.delete();
        console.log('- Removing redundant last_sync_projects field');
      }
      
      // Apply updates if there are any
      if (Object.keys(updates).length > 0) {
        await configRef.update(updates);
        console.log('✓ Removed redundant fields from asana_config.settings');
      } else {
        console.log('✓ No redundant fields found in asana_config.settings');
      }
    } else {
      console.log('! asana_config.settings document not found');
    }

    console.log('\nCleanup completed successfully!');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    // Terminate the Firebase Admin SDK
    admin.app().delete();
  }
}

// Run the cleanup
cleanupRedundantData(); 