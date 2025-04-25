/**
 * offlineSync.js
 * Handles offline synchronization for the JoJo's Shave Ice app.
 * Downloads data on login, queues changes when offline, and syncs when back online.
 */

// Initialize IndexedDB for local storage
const DB_NAME = 'JoJosShaveIceDB';
const DB_VERSION = 1;
const TASKS_STORE = 'tasks';
const OVERRIDES_STORE = 'baseTaskOverrides';
const QUEUE_STORE = 'offlineQueue';

let db;

function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(TASKS_STORE)) {
                db.createObjectStore(TASKS_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(OVERRIDES_STORE)) {
                db.createObjectStore(OVERRIDES_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(QUEUE_STORE)) {
                db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Download data from Firestore and store locally
async function downloadData(firestoreDb, currentLocationDocId) {
    try {
        // Fetch base tasks
        const baseTasksSnapshot = await firestoreDb.collection('baseTasks').get();
        const baseTasks = [];
        baseTasksSnapshot.forEach(doc => {
            baseTasks.push({ id: doc.id, ...doc.data() });
        });

        // Fetch overrides for the current location
        const overridesSnapshot = await firestoreDb.collection('locations').doc(currentLocationDocId).collection('baseTaskOverrides').get();
        const overrides = [];
        overridesSnapshot.forEach(doc => {
            overrides.push({ id: doc.id, ...doc.data(), locationId: currentLocationDocId });
        });

        // Fetch location-specific tasks
        const locationTasksSnapshot = await firestoreDb.collection('locations').doc(currentLocationDocId).collection('tasks').get();
        const locationTasks = [];
        locationTasksSnapshot.forEach(doc => {
            locationTasks.push({ id: doc.id, ...doc.data(), locationId: currentLocationDocId });
        });

        // Store in IndexedDB
        await storeData(TASKS_STORE, locationTasks);
        await storeData(OVERRIDES_STORE, overrides);
        localStorage.setItem('baseTasks', JSON.stringify(baseTasks));

        console.log('Data downloaded and stored locally');
        return { baseTasks, overrides, locationTasks };
    } catch (error) {
        console.error('Error downloading data:', error);
        throw error;
    }
}

// Store data in IndexedDB
function storeData(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        // Clear existing data
        store.clear();

        // Add new data
        data.forEach(item => {
            store.put(item);
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);
    });
}

// Load data from local storage
async function loadLocalData() {
    const baseTasks = JSON.parse(localStorage.getItem('baseTasks') || '[]');
    const overrides = await loadFromIndexedDB(OVERRIDES_STORE);
    const locationTasks = await loadFromIndexedDB(TASKS_STORE);
    return { baseTasks, overrides, locationTasks };
}

// Load data from IndexedDB
function loadFromIndexedDB(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// Queue an offline operation
function queueOperation(operation) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(QUEUE_STORE);
        const request = store.add(operation);

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// Sync queued operations when back online
async function syncOfflineOperations(firestoreDb, currentLocationDocId) {
    if (!navigator.onLine) return;

    const queuedOps = await loadFromIndexedDB(QUEUE_STORE);
    if (queuedOps.length === 0) return;

    for (const op of queuedOps) {
        try {
            switch (op.action) {
                case 'createTask':
                    await firestoreDb.collection('locations').doc(currentLocationDocId).collection('tasks').doc(op.task.id).set(op.task);
                    break;
                case 'updateTask':
                    await firestoreDb.collection('locations').doc(currentLocationDocId).collection('tasks').doc(op.taskId).update(op.data);
                    break;
                case 'deleteTask':
                    await firestoreDb.collection('locations').doc(currentLocationDocId).collection('tasks').doc(op.taskId).delete();
                    break;
                case 'updateOverride':
                    await firestoreDb.collection('locations').doc(currentLocationDocId).collection('baseTaskOverrides').doc(op.baseTaskId).update(op.data);
                    break;
            }
            // Remove the operation from the queue
            await removeFromQueue(op.id);
        } catch (error) {
            console.error(`Error syncing operation ${op.id}:`, error);
        }
    }

    // Refresh local data after sync
    await downloadData(firestoreDb, currentLocationDocId);
}

// Remove an operation from the queue
function removeFromQueue(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(QUEUE_STORE);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

// Initialize offline sync
async function initOfflineSync(firestoreDb, currentLocationDocId) {
    await openIndexedDB();

    // Download data if online
    let data;
    if (navigator.onLine) {
        data = await downloadData(firestoreDb, currentLocationDocId);
    } else {
        data = await loadLocalData();
    }

    // Set up online/offline listeners
    window.addEventListener('online', () => syncOfflineOperations(firestoreDb, currentLocationDocId));
    window.addEventListener('offline', () => console.log('App is offline. Changes will be queued.'));

    return data;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initOfflineSync,
        queueOperation,
        loadLocalData
    };
} else {
    window.OfflineSync = {
        initOfflineSync,
        queueOperation,
        loadLocalData
    };
}