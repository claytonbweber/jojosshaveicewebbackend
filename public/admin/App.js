import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { fetchAsanaTasks, updateTaskCompletion } from './asanaHelpers';

const Stack = createStackNavigator();

function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Admin backdoor - triple tap on title to go to admin screen
  const [tapCount, setTapCount] = useState(0);
  
  const handleTitlePress = () => {
    setTapCount(prevCount => {
      const newCount = prevCount + 1;
      if (newCount >= 3) {
        navigation.navigate('Admin');
        return 0;
      }
      return newCount;
    });
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      // Query Firestore for the location with matching email
      const locationsRef = collection(db, 'locations');
      const q = query(locationsRef, where('locationEmail', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert('Error', 'Location not found');
        setLoading(false);
        return;
      }

      // Get the first matching location
      const locationData = querySnapshot.docs[0].data();
      
      // Check if password matches
      if (locationData.locationPassword !== password) {
        Alert.alert('Error', 'Invalid password');
        setLoading(false);
        return;
      }

      // If credentials are valid, store location data and navigate to tasks screen
      await AsyncStorage.setItem('locationData', JSON.stringify(locationData));
      
      // Navigate to the tasks screen
      navigation.navigate('TodaysList', {
        locationName: locationData.locationName,
        asanaPAT: locationData.asanaPAT
      });
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleTitlePress}>
        <Text style={styles.title}>JoJo's Shave Ice</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="Email (e.g., location@jojosshaveice.com)"
        placeholderTextColor="#87CEEB"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#87CEEB"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function AdminScreen({ navigation }) {
  const [initializing, setInitializing] = useState(false);
  
  const initializeLocations = async () => {
    const locations = [
      {
        locationName: 'CMP',
        locationEmail: 'cmp@jojosshaveice.com',
        locationPassword: 'makanalani123',
        asanaUserId: 'placeholder_cmp_user_id',
        asanaUserEmail: 'cmp@jojosshaveice.com',
        asanaPAT: 'placeholder_cmp_pat',
        active: true,
        notes: ''
      },
      {
        locationName: 'Waimea',
        locationEmail: 'waimea@jojosshaveice.com',
        locationPassword: 'makanalani123',
        asanaUserId: 'placeholder_waimea_user_id',
        asanaUserEmail: 'waimea@jojosshaveice.com',
        asanaPAT: 'placeholder_waimea_pat',
        active: true,
        notes: ''
      },
      {
        locationName: 'Hanalei',
        locationEmail: 'hanalei@jojosshaveice.com',
        locationPassword: 'makanalani123',
        asanaUserId: 'placeholder_hanalei_user_id',
        asanaUserEmail: 'hanalei@jojosshaveice.com',
        asanaPAT: 'placeholder_hanalei_pat',
        active: true,
        notes: ''
      }
    ];
    
    setInitializing(true);
    try {
      for (const location of locations) {
        await setDoc(doc(db, 'locations', location.locationName), location);
        console.log(`Added location: ${location.locationName}`);
      }
      Alert.alert('Success', 'All locations added successfully');
    } catch (error) {
      console.error('Error initializing locations:', error);
      Alert.alert('Error', 'Failed to initialize locations: ' + error.message);
    } finally {
      setInitializing(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Panel</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={initializeLocations}
        disabled={initializing}
      >
        {initializing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Initialize Locations</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.button, { marginTop: 20, backgroundColor: '#87CEEB' }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

function TasksScreen({ route }) {
  const { locationName, asanaPAT } = route.params;
  const [tasks, setTasks] = useState({
    opening: [],
    mid: [],
    closing: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        // Get locationData from AsyncStorage to get asanaUserId
        const locationDataStr = await AsyncStorage.getItem('locationData');
        if (!locationDataStr) {
          throw new Error('Location data not found');
        }
        
        const locationData = JSON.parse(locationDataStr);
        
        if (!locationData.asanaUserId || !asanaPAT) {
          // If Asana data is not available, use dummy data for demo purposes
          const dummyTasks = {
            opening: [
              { id: '1', name: 'Open store', type: 'CheckBox', completed: false },
              { id: '2', name: 'Turn on equipment', type: 'CheckBox', completed: false },
              { id: '3', name: 'Check inventory', type: 'Value', completed: false }
            ],
            mid: [
              { id: '4', name: 'Restock supplies', type: 'CheckBox', completed: false },
              { id: '5', name: 'Clean area', type: 'CheckBox', completed: false }
            ],
            closing: [
              { id: '6', name: 'Close register', type: 'Value', completed: false },
              { id: '7', name: 'Clean equipment', type: 'CheckBox', completed: false },
              { id: '8', name: 'Lock up', type: 'CheckBox', completed: false }
            ]
          };
          
          setTasks(dummyTasks);
        } else {
          // Call fetchAsanaTasks with the actual Asana data
          const asanaTasks = await fetchAsanaTasks(asanaPAT, locationData.asanaUserId);
          setTasks(asanaTasks);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
        Alert.alert('Error', 'Failed to load tasks. Using sample data instead.');
        
        // Use dummy data as fallback
        const dummyTasks = {
          opening: [
            { id: '1', name: 'Open store', type: 'CheckBox', completed: false },
            { id: '2', name: 'Turn on equipment', type: 'CheckBox', completed: false },
            { id: '3', name: 'Check inventory', type: 'Value', completed: false }
          ],
          mid: [
            { id: '4', name: 'Restock supplies', type: 'CheckBox', completed: false },
            { id: '5', name: 'Clean area', type: 'CheckBox', completed: false }
          ],
          closing: [
            { id: '6', name: 'Close register', type: 'Value', completed: false },
            { id: '7', name: 'Clean equipment', type: 'CheckBox', completed: false },
            { id: '8', name: 'Lock up', type: 'CheckBox', completed: false }
          ]
        };
        
        setTasks(dummyTasks);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [asanaPAT]);

  const renderTaskItem = (task) => {
    // This would render different UI components based on task.type
    // For now, we'll just render a simple checkbox
    return (
      <View key={task.id} style={styles.taskItem}>
        <TouchableOpacity
          style={[styles.checkbox, task.completed && styles.checkboxChecked]}
          onPress={() => toggleTaskCompletion(task.id)}
        />
        <Text style={styles.taskText}>{task.name}</Text>
      </View>
    );
  };

  const toggleTaskCompletion = async (taskId) => {
    // Update task completion status
    // This is a simple implementation - in a real app you'd update Asana
    setTasks(prevTasks => {
      const newTasks = { ...prevTasks };
      
      // Find the task and its current completion status
      let foundTask = null;
      let foundSection = null;
      
      for (const section in newTasks) {
        const task = newTasks[section].find(task => task.id === taskId);
        if (task) {
          foundTask = task;
          foundSection = section;
          break;
        }
      }
      
      if (foundTask && foundSection) {
        // Update the task locally
        newTasks[foundSection] = newTasks[foundSection].map(task => 
          task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        
        // Try to update in Asana asynchronously
        if (asanaPAT) {
          updateTaskCompletion(asanaPAT, taskId, !foundTask.completed)
            .catch(error => {
              console.error('Error updating task in Asana:', error);
              // You could revert the local change here if needed
            });
        }
      }
      
      return newTasks;
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#87CEEB" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.locationTitle}>{locationName}</Text>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Opening Tasks</Text>
          {tasks.opening.map(renderTaskItem)}
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Mid-Day Tasks</Text>
          {tasks.mid.map(renderTaskItem)}
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Closing Tasks</Text>
          {tasks.closing.map(renderTaskItem)}
        </View>
      </View>
    </ScrollView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TodaysList" component={TasksScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Admin" component={AdminScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFD60A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#FFD60A',
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#87CEEB',
    marginBottom: 40,
  },
  locationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#87CEEB',
    marginBottom: 20,
  },
  input: {
    width: '80%',
    height: 50,
    backgroundColor: '#2F2F2F',
    color: '#FFFFFF',
    borderColor: '#87CEEB',
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#FF4040',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionContainer: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#87CEEB',
    marginBottom: 10,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#87CEEB',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#87CEEB',
  },
  taskText: {
    fontSize: 16,
    color: '#2F2F2F',
  },
});