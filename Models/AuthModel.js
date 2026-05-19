const admin = require('firebase-admin');
const { auth } = require('../firebase');
const { signInWithEmailAndPassword } = require('firebase/auth');
const { db } = require('../firebaseAdmin'); // Import your existing db

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
      return user.customClaims && user.customClaims.admin === true;
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
    
    // Make sure claims are properly set
    if (!claims.admin) {
      console.log("❌ User is not an admin");
      await auth.signOut();
      return { success: false, error: "Not an admin user" };
    }
    
    // Get institution details from database
    const userRecord = await admin.auth().getUser(user.uid);
    
    return { 
      success: true, 
      token: await user.getIdToken(),
      user: {
        uid: user.uid,
        email: user.email,
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

      // Set custom claims to make this user an admin
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        admin: true,
        institutionType: institutionType,
        institutionName: institutionName,
        registeredAt: new Date().toISOString()
      });

      // Store additional institution details in Realtime Database using your existing db
      const institutionsRef = db.ref('institutions');
      
      await institutionsRef.child(userRecord.uid).set({
        institutionName: institutionName,
        institutionType: institutionType,
        email: email,
        createdAt: new Date().toISOString(),
        status: 'active',
        uid: userRecord.uid
      });

      console.log(`✅ Admin user created successfully: ${email}`);
      
      // Auto-login after registration (optional - remove if you want manual login)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      
      return { 
        success: true, 
        message: "Institution registered successfully",
        token: token,
        user: {
          uid: userRecord.uid,
          email: email,
          institutionName: institutionName,
          institutionType: institutionType
        }
      };
      
    } catch (error) {
      console.error("❌ Registration Error:", error);
      return { success: false, error: error.message };
    }
  }

  // Optional: Get institution details from Realtime Database
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

  // Optional: Update institution status
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

  // Optional: Get all institutions (admin only)
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