const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

// Initialize Firebase Admin directly
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createAdminUser(email, password, displayName) {
  try {
    // Check if user already exists
    try {
      const existingUser = await admin.auth().getUserByEmail(email);
      console.log('📋 User already exists, updating claims...');
      
      // Update claims for existing user
      await admin.auth().setCustomUserClaims(existingUser.uid, {
        role: 'admin',
        admin: true,
        institutionType: 'Admin',
        institutionName: displayName || 'System Administrator'
      });
      
      console.log('✅ Admin claims updated for:', email);
      return { success: true, uid: existingUser.uid };
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }
    
    // Create new user
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName || 'System Administrator'
    });
    
    // Set admin claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      admin: true,
      institutionType: 'Admin',
      institutionName: displayName || 'System Administrator'
    });
    
    console.log('✅ Admin user created:', email);
    console.log('📋 User UID:', userRecord.uid);
    
    return { success: true, uid: userRecord.uid };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the function
createAdminUser('raynottadmin@gmail.com', 'Admin4Raynott@ConquersSky', 'System Administrator')
  .then(result => {
    if (result.success) {
      console.log('✅ Admin setup complete!');
    } else {
      console.error('❌ Failed to setup admin');
    }
  });