// Firebase configuration
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

// Get references to Firebase services
const db = firebase.firestore();
const functions = firebase.functions(); 