// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js';

// Firebase configuration
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
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// Constants
export const ROLES = {
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    STAFF: 'Staff'
};

// Firestore collections
export const COLLECTIONS = {
    EMPLOYEES: 'employees',
    LOCATIONS: 'locations',
    BASE_TASKS: 'baseTasks',
    TASKS: 'tasks',
    OVERRIDES: 'baseTaskOverrides'
};

// Login with email function
export async function loginWithEmail(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Query Firestore for employee data
        const employeesRef = collection(db, 'employees');
        const q = query(employeesRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            throw new Error('Employee not found');
        }

        return querySnapshot.docs[0].data();
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Login with passcode function
export async function loginWithPasscode(passcode) {
    try {
        // Query Firestore for employee with matching passcode
        const employeesRef = collection(db, 'employees');
        const q = query(employeesRef, where('passcode', '==', passcode));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            throw new Error('Invalid passcode');
        }

        return querySnapshot.docs[0].data();
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Initialize employee data function
export async function initializeEmployeeData() {
    try {
        const employeesRef = collection(db, 'employees');
        const querySnapshot = await getDocs(employeesRef);
        
        if (querySnapshot.empty) {
            // Create initial admin user
            const adminData = {
                email: 'admin@jojos.com',
                role: ROLES.ADMIN,
                passcode: '1234',
                assignedLocations: ['Waimea', 'CMP', 'Hanalei'],
                primaryLocation: 'Waimea',
                permissions: ['all']
            };
            
            await addDoc(employeesRef, adminData);
            console.log('Initial admin user created');
        }
    } catch (error) {
        console.error('Error initializing employee data:', error);
        throw error;
    }
}

// Initialize locations if they don't exist
export async function initializeLocations() {
    try {
        const locationsRef = collection(db, COLLECTIONS.LOCATIONS);
        const locationsSnapshot = await getDocs(locationsRef);
        
        if (locationsSnapshot.empty) {
            const locations = [
                {
                    id: 'waimea',
                    name: 'Waimea',
                    address: '65-1158 Mamalahoa Hwy, Kamuela, HI 96743',
                    phone: '808-885-8888',
                    operatingHours: {
                        monday: { open: '10:00', close: '20:00' },
                        tuesday: { open: '10:00', close: '20:00' },
                        wednesday: { open: '10:00', close: '20:00' },
                        thursday: { open: '10:00', close: '20:00' },
                        friday: { open: '10:00', close: '20:00' },
                        saturday: { open: '10:00', close: '20:00' },
                        sunday: { open: '10:00', close: '20:00' }
                    },
                    status: 'active',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                },
                {
                    id: 'cmp',
                    name: 'CMP',
                    address: '65-1158 Mamalahoa Hwy, Kamuela, HI 96743',
                    phone: '808-885-8888',
                    operatingHours: {
                        monday: { open: '10:00', close: '20:00' },
                        tuesday: { open: '10:00', close: '20:00' },
                        wednesday: { open: '10:00', close: '20:00' },
                        thursday: { open: '10:00', close: '20:00' },
                        friday: { open: '10:00', close: '20:00' },
                        saturday: { open: '10:00', close: '20:00' },
                        sunday: { open: '10:00', close: '20:00' }
                    },
                    status: 'active',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                },
                {
                    id: 'hanalei',
                    name: 'Hanalei',
                    address: '65-1158 Mamalahoa Hwy, Kamuela, HI 96743',
                    phone: '808-885-8888',
                    operatingHours: {
                        monday: { open: '10:00', close: '20:00' },
                        tuesday: { open: '10:00', close: '20:00' },
                        wednesday: { open: '10:00', close: '20:00' },
                        thursday: { open: '10:00', close: '20:00' },
                        friday: { open: '10:00', close: '20:00' },
                        saturday: { open: '10:00', close: '20:00' },
                        sunday: { open: '10:00', close: '20:00' }
                    },
                    status: 'active',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }
            ];

            for (const location of locations) {
                await addDoc(locationsRef, location);
            }
            console.log('Initial locations created');
        }
    } catch (error) {
        console.error('Error initializing locations:', error);
        throw error;
    }
}

// Export all necessary functions and constants
export { 
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp,
    loginWithEmail,
    loginWithPasscode,
    initializeEmployeeData,
    initializeLocations,
    ROLES,
    COLLECTIONS
}; 