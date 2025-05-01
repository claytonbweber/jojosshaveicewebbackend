// Using Firebase Web SDK with the new modular syntax
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Initialize Firebase with the web config
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixAsanaConfig() {
  console.log('Checking asana_config collection...');
  
  try {
    // First check if the collection exists
    const snapshot = await getDocs(collection(db, 'asana_config'));
    const docs = snapshot.docs || [];
    console.log(`asana_config collection exists: ${docs.length > 0}`);
    console.log(`Found ${docs.length} documents in asana_config`);
    
    if (docs.length > 0) {
      // Check all documents to find potential configuration
      let settings = null;
      let token = null;
      let syncFrequency = 60;
      
      docs.forEach(document => {
        const docId = document.id;
        const data = document.data();
        console.log(`Document ID: ${docId}`);
        console.log('Data:', data);
        
        // Try to find token in any format
        if (data.personal_access_token) {
          token = data.personal_access_token;
          console.log('Found token as personal_access_token');
        } else if (data.pat) {
          token = data.pat;
          console.log('Found token as pat');
        } else if (data.token) {
          token = data.token;
          console.log('Found token as token');
        } else if (data.settings && data.settings.pat) {
          token = data.settings.pat;
          console.log('Found token in settings.pat');
          if (data.settings.sync_frequency) {
            syncFrequency = data.settings.sync_frequency;
          }
        }
        
        // If this is a settings document, save it
        if (docId === 'settings') {
          settings = data;
        }
      });
      
      if (token) {
        // We found a token, create proper settings document
        console.log(`Creating standardized settings document with token: ${token.substring(0, 4)}...`);
        
        const newSettings = {
          personal_access_token: token,
          sync_frequency: syncFrequency,
          updated_at: serverTimestamp(),
          active: true
        };
        
        await setDoc(doc(db, 'asana_config', 'settings'), newSettings, { merge: true });
        console.log('Successfully created standardized settings document!');
      } else {
        console.log('No token found in any document. Creating a sample settings document...');
        
        // Create a sample settings document with a placeholder token
        const sampleSettings = {
          personal_access_token: '1/1234567890abcdefghijklmn',
          sync_frequency: 60,
          updated_at: serverTimestamp(),
          active: true
        };
        
        await setDoc(doc(db, 'asana_config', 'settings'), sampleSettings);
        console.log('Created sample settings document with placeholder token');
      }
    } else {
      console.log('asana_config collection is empty. Creating a sample settings document...');
      
      // Create a sample settings document with a placeholder token
      const sampleSettings = {
        personal_access_token: '1/1234567890abcdefghijklmn',
        sync_frequency: 60,
        updated_at: serverTimestamp(),
        active: true
      };
      
      await setDoc(doc(db, 'asana_config', 'settings'), sampleSettings);
      console.log('Created sample settings document with placeholder token');
    }
    
    console.log('Done!');
  } catch (error) {
    console.error('Error fixing asana_config:', error);
  }
}

fixAsanaConfig(); 