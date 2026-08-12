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

  // PARENT REGISTRATION
static async parentRegister(parentData) {
  const { email, password, parentName, institutionType } = parentData;
  
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

    // Create the user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: parentName,
      emailVerified: false,
    });

    // Set custom claims as PARENT
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'parent',
      parentName: parentName,
      institutionType: institutionType,
      registeredAt: new Date().toISOString()
    });

    // Store parent data in Realtime Database
    const parentsRef = db.ref('parents');
    
    await parentsRef.child(userRecord.uid).set({
      parentName: parentName,
      institutionType: institutionType,
      email: email,
      createdAt: new Date().toISOString(),
      status: 'active',
      uid: userRecord.uid,
      role: 'parent'
    });

    console.log(`✅ Parent user created successfully: ${email}`);
    
    // Auto-login after registration
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    
    return { 
      success: true, 
      message: "Parent registration successful",
      token: token,
      parentData: {
        uid: userRecord.uid,
        email: email,
        parentName: parentName,
        institutionType: institutionType,
        role: 'parent'
      }
    };
    
  } catch (error) {
    console.error("❌ Parent Registration Error:", error);
    return { success: false, error: error.message };
  }
}

// PARENT LOGIN
static async parentLogin(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("✅ Parent Firebase auth success!");
    
    const user = userCredential.user;
    
    // Get the user's custom claims
    const idTokenResult = await user.getIdTokenResult();
    const claims = idTokenResult.claims;
    
    // Check if user has parent role
    if (claims.role !== 'parent') {
      console.log("❌ User is not a parent");
      await auth.signOut();
      return { success: false, error: "Invalid account type. Please use the institute login." };
    }
    
    // Get parent data from database
    const parentSnapshot = await db.ref('parents')
      .orderByChild('email')
      .equalTo(email)
      .once('value');
    
    let parentData = null;
    parentSnapshot.forEach((child) => {
      parentData = { id: child.key, ...child.val() };
    });
    
    if (!parentData) {
      return { success: false, error: "Parent data not found" };
    }
    
    return { 
      success: true, 
      token: await user.getIdToken(),
      parentData: {
        uid: user.uid,
        email: user.email,
        parentName: parentData.parentName,
        institutionType: parentData.institutionType,
        role: 'parent'
      }
    };
  } catch (error) {
    console.error("🔥 Parent Login Error:", error.message);
    return { success: false, error: error.message };
  }
}
  // GET PARENT DATA
  static async getParentData(uid) {
    try {
      const parentRef = db.ref(`parents/${uid}`);
      const snapshot = await parentRef.once('value');
      
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      } else {
        return { success: false, error: "Parent not found" };
      }
    } catch (error) {
      console.error("Error fetching parent:", error);
      return { success: false, error: error.message };
    }
  }

  // GET ALL PARENTS (Admin)
  static async getAllParents() {
    try {
      const parentsRef = db.ref('parents');
      const snapshot = await parentsRef.once('value');
      
      if (snapshot.exists()) {
        const parents = [];
        snapshot.forEach((child) => {
          parents.push({
            id: child.key,
            ...child.val()
          });
        });
        return { success: true, data: parents };
      } else {
        return { success: true, data: [] };
      }
    } catch (error) {
      console.error("Error fetching parents:", error);
      return { success: false, error: error.message };
    }
  }

  // UPDATE PARENT STATUS
  static async updateParentStatus(uid, status) {
    try {
      const parentRef = db.ref(`parents/${uid}/status`);
      await parentRef.set(status);
      
      return { success: true, message: "Parent status updated successfully" };
    } catch (error) {
      console.error("Error updating parent status:", error);
      return { success: false, error: error.message };
    }
  }

  // Existing methods...
  static async adminLogin(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Firebase auth success!");
      
      const user = userCredential.user;
      
      const idTokenResult = await user.getIdTokenResult();
      const claims = idTokenResult.claims;
      
      if (!claims.role) {
        console.log("❌ User has no role assigned");
        await auth.signOut();
        return { success: false, error: "User role not found" };
      }
      
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

      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: institutionName,
        emailVerified: false,
      });

      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: 'institute',
        institutionType: institutionType,
        institutionName: institutionName,
        registeredAt: new Date().toISOString()
      });

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

  static async createAdminUser(email, password, institutionName = 'System Admin') {
    try {
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

      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: institutionName,
        emailVerified: false,
      });

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