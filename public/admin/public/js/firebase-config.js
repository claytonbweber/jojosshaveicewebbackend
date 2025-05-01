// Firebase configuration for JoJo's Shave Ice Asana Integration
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