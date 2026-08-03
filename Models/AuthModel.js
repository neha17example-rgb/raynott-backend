const admin = require('firebase-admin');
const { auth } = require('../firebase');
const { signInWithEmailAndPassword } = require('firebase/auth');
const { db } = require('../firebaseAdmin');

class AuthModel {
  static async verifyToken(idToken) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return { success: true, decodedToken };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async isAdmin(uid) {
    try {
      const user = await admin.auth().getUser(uid);
      return user.customClaims && user.customClaims.role === 'admin';
    } catch (error) {
      return false;
    }
  }

  static async adminLogin(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Firebase auth success!");
      
      const user = userCredential.user;
      
      // Get the user's custom claims
      const idTokenResult = await user.getIdTokenResult();
      const claims = idTokenResult.claims;
      
      // Check if user has any role
      if (!claims.role) {
        console.log("❌ User has no role assigned");
        await auth.signOut();
        return { success: false, error: "User role not found" };
      }
      
      // Get institution details from database
      const userRecord = await admin.auth().getUser(user.uid);
      
      return { 
        success: true, 
        token: await user.getIdToken(),
        user: {
          uid: user.uid,
          email: user.email,
          role: userRecord.customClaims?.role || 'institute',
          institutionType: userRecord.customClaims?.institutionType,
          institutionName: userRecord.customClaims?.institutionName
        }
      };
    } catch (error) {
      console.error("🔥 Firebase Error:", error.message);
      return { success: false, error: error.message };
    }
  }

  static async adminRegister(institutionData) {
    const { email, password, institutionName, institutionType } = institutionData;
    
    try {
      // Check if user already exists in Firebase Auth
      try {
        const existingUser = await admin.auth().getUserByEmail(email);
        if (existingUser) {
          return { success: false, error: "Email already registered" };
        }
      } catch (error) {
        // User doesn't exist, continue with creation
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }

      // Create the user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: institutionName,
        emailVerified: false,
      });

      // Set custom claims - ALL registered users are 'institute' by default
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: 'institute', // Set as 'institute' instead of 'admin'
        institutionType: institutionType,
        institutionName: institutionName,
        registeredAt: new Date().toISOString()
      });

      // Store additional institution details in Realtime Database
      const institutionsRef = db.ref('institutions');
      
      await institutionsRef.child(userRecord.uid).set({
        institutionName: institutionName,
        institutionType: institutionType,
        email: email,
        createdAt: new Date().toISOString(),
        status: 'active',
        uid: userRecord.uid,
        role: 'institute'
      });

      console.log(`✅ Institute user created successfully: ${email}`);
      
      // Auto-login after registration
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      
      return { 
        success: true, 
        message: "Institution registered successfully",
        token: token,
        user: {
          uid: userRecord.uid,
          email: email,
          role: 'institute',
          institutionName: institutionName,
          institutionType: institutionType
        }
      };
      
    } catch (error) {
      console.error("❌ Registration Error:", error);
      return { success: false, error: error.message };
    }
  }

  // NEW: Method to create admin users (for super admin)
  static async createAdminUser(email, password, institutionName = 'System Admin') {
    try {
      // Check if user already exists
      try {
        const existingUser = await admin.auth().getUserByEmail(email);
        if (existingUser) {
          return { success: false, error: "Email already registered" };
        }
      } catch (error) {
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }

      // Create the user
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: institutionName,
        emailVerified: false,
      });

      // Set custom claims as ADMIN
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: 'admin',
        institutionType: 'Admin',
        institutionName: institutionName,
        registeredAt: new Date().toISOString()
      });

      console.log(`✅ Admin user created successfully: ${email}`);
      
      return { 
        success: true, 
        message: "Admin user created successfully",
        user: {
          uid: userRecord.uid,
          email: email,
          role: 'admin'
        }
      };
      
    } catch (error) {
      console.error("❌ Admin Creation Error:", error);
      return { success: false, error: error.message };
    }
  }

  static async getInstitutionDetails(uid) {
    try {
      const institutionRef = db.ref(`institutions/${uid}`);
      const snapshot = await institutionRef.once('value');
      
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      } else {
        return { success: false, error: "Institution not found" };
      }
    } catch (error) {
      console.error("Error fetching institution:", error);
      return { success: false, error: error.message };
    }
  }

  static async updateInstitutionStatus(uid, status) {
    try {
      const institutionRef = db.ref(`institutions/${uid}/status`);
      await institutionRef.set(status);
      
      return { success: true, message: "Status updated successfully" };
    } catch (error) {
      console.error("Error updating status:", error);
      return { success: false, error: error.message };
    }
  }

  static async getAllInstitutions() {
    try {
      const institutionsRef = db.ref('institutions');
      const snapshot = await institutionsRef.once('value');
      
      if (snapshot.exists()) {
        const institutions = [];
        snapshot.forEach((child) => {
          institutions.push({
            id: child.key,
            ...child.val()
          });
        });
        return { success: true, data: institutions };
      } else {
        return { success: true, data: [] };
      }
    } catch (error) {
      console.error("Error fetching institutions:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = AuthModel;