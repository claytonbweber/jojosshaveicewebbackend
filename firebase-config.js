// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { collection, query, where, limit, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';

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
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// Employee roles
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

// Initialize employee data structure
export async function initializeEmployeeData() {
    try {
        // Check if employees collection exists
        const employeesRef = collection(db, COLLECTIONS.EMPLOYEES);
        const q = query(employeesRef, limit(1));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            // Create initial admin user in Firebase Auth
            const adminEmail = 'admin@jojos.com';
            const adminPassword = 'admin1234';
            
            try {
                // Create the admin user in Firebase Authentication
                const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
                const adminUid = userCredential.user.uid;

                // Create initial admin user in Firestore
                const adminUser = {
                    name: 'Admin User',
                    phone: '',
                    email: adminEmail,
                    role: ROLES.ADMIN,
                    passcode: '1234',
                    assignedLocations: [], // All locations accessible
                    primaryLocation: null,
                    permissions: ['all'],
                    uid: adminUid, // Link to Firebase Auth user
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };

                // Create the admin user in Firestore
                await addDoc(employeesRef, adminUser);
                console.log('Initial admin user created in both Auth and Firestore');
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    console.log('Admin user already exists in Auth');
                } else {
                    console.error('Error creating admin user:', error);
                }
            }
        }

        // Initialize locations if they don't exist
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
        console.error('Error initializing data:', error);
    }
}

// Authentication functions
export async function loginWithEmail(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Get employee data
        const employeesRef = collection(db, COLLECTIONS.EMPLOYEES);
        const q = query(employeesRef, where('email', '==', email), limit(1));
        const employeeSnapshot = await getDocs(q);

        if (!employeeSnapshot.empty) {
            const employeeData = employeeSnapshot.docs[0].data();
            const employeeId = employeeSnapshot.docs[0].id;
            
            // Get assigned locations
            const locationsRef = collection(db, COLLECTIONS.LOCATIONS);
            const locationsQuery = query(locationsRef, where('id', 'in', employeeData.assignedLocations || []));
            const locationsSnapshot = await getDocs(locationsQuery);
            const locations = locationsSnapshot.docs.map(doc => doc.data());

            return {
                uid: user.uid,
                id: employeeId,
                ...employeeData,
                locations: locations
            };
        }
        throw new Error('Employee data not found');
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

export async function loginWithPasscode(passcode) {
    try {
        const employeesRef = collection(db, COLLECTIONS.EMPLOYEES);
        const q = query(employeesRef, where('passcode', '==', passcode), limit(1));
        const employeeSnapshot = await getDocs(q);

        if (!employeeSnapshot.empty) {
            const employeeData = employeeSnapshot.docs[0].data();
            const employeeId = employeeSnapshot.docs[0].id;
            
            // Get assigned locations
            const locationsRef = collection(db, COLLECTIONS.LOCATIONS);
            const locationsQuery = query(locationsRef, where('id', 'in', employeeData.assignedLocations || []));
            const locationsSnapshot = await getDocs(locationsQuery);
            const locations = locationsSnapshot.docs.map(doc => doc.data());

            return {
                id: employeeId,
                ...employeeData,
                locations: locations
            };
        }
        throw new Error('Invalid passcode');
    } catch (error) {
        console.error('Passcode login error:', error);
        throw error;
    }
}

// Export the initialized Firebase instances
export { app, db, auth, analytics }; 