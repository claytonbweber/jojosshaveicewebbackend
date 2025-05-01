import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCgEDfRBjbqqnwWc0TeR97V3RvfrvjJu1U",
  authDomain: "jojo-s-app-back-end.firebaseapp.com",
  projectId: "jojo-s-app-back-end",
  storageBucket: "jojo-s-app-back-end.firebasestorage.app",
  messagingSenderId: "344579778389",
  appId: "1:344579778389:web:6a17be1a1d13b82955f1dc",
  measurementId: "G-VBP44WBTCP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);