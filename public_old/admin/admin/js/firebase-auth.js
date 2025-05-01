// Firebase Authentication Helper
class FirebaseAuthHelper {
  constructor() {
    this.currentUser = null;
    this.authStateChanged = false;
  }

  async initializeAuth() {
    return new Promise((resolve, reject) => {
      firebase.auth().onAuthStateChanged((user) => {
        this.authStateChanged = true;
        this.currentUser = user;
        resolve(user);
      }, (error) => {
        reject(error);
      });
    });
  }

  async signInAnonymously() {
    try {
      const userCredential = await firebase.auth().signInAnonymously();
      this.currentUser = userCredential.user;
      console.log("Signed in anonymously with UID:", this.currentUser.uid);
      return this.currentUser;
    } catch (error) {
      console.error("Error signing in anonymously:", error);
      throw error;
    }
  }

  async signInWithEmailPassword(email, password) {
    try {
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      this.currentUser = userCredential.user;
      console.log("Signed in with email:", this.currentUser.email);
      return this.currentUser;
    } catch (error) {
      console.error("Error signing in with email/password:", error);
      throw error;
    }
  }

  async signOut() {
    try {
      await firebase.auth().signOut();
      this.currentUser = null;
      console.log("Signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  async getCurrentUserIdToken() {
    if (!this.currentUser) {
      throw new Error("No user is signed in");
    }
    try {
      return await this.currentUser.getIdToken(true);
    } catch (error) {
      console.error("Error getting ID token:", error);
      throw error;
    }
  }

  getCurrentUserId() {
    return this.currentUser ? this.currentUser.uid : null;
  }

  getCurrentUserEmail() {
    return this.currentUser ? this.currentUser.email : null;
  }
}

// Export a singleton instance
window.firebaseAuth = new FirebaseAuthHelper(); 