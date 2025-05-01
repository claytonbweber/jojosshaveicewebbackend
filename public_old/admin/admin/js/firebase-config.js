// Firebase configuration for JoJo's Shave Ice Asana Integration
const firebaseConfig = {
  apiKey: "AIzaSyA1234example5678firebaseApiKey",
  authDomain: "jojos-shave-ice.firebaseapp.com",
  projectId: "jojos-shave-ice",
  storageBucket: "jojos-shave-ice.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456ghi789"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Enable persistence to work offline
db.enablePersistence()
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.error('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.error('The current browser does not support all of the features required to enable persistence.');
    }
  });

// Export the db for use in other scripts
window.db = db; 