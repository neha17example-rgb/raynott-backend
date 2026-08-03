const AuthModel = require('../Models/AuthModel');

class AuthController {
  static async loginAdmin(req, res) {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: "Email and password are required" 
      });
    }

    const result = await AuthModel.adminLogin(email, password);
    
    if (result.success) {
      // Return user data along with token
      res.json({ 
        success: true, 
        token: result.token,
        user: {
          uid: result.user.uid,
          email: result.user.email,
          role: result.user.role || 'institute',
          institutionType: result.user.institutionType || 'N/A',
          institutionName: result.user.institutionName || 'N/A'
        }
      });
    } else {
      res.status(401).json({ success: false, error: result.error });
    }
  }

  static async registerAdmin(req, res) {
    const { email, password, institutionName, institutionType } = req.body;
    
    // Validation
    if (!email || !password || !institutionName || !institutionType) {
      return res.status(400).json({ 
        success: false, 
        error: "All fields are required: email, password, institutionName, institutionType" 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: "Password must be at least 6 characters long" 
      });
    }

    const validTypes = ['Schools', 'Colleges', 'PU College', 'Coaching/Tuition', 'All Teachers'];
    if (!validTypes.includes(institutionType)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid institution type" 
      });
    }

    const result = await AuthModel.adminRegister({
      email,
      password,
      institutionName,
      institutionType
    });
    
    if (result.success) {
      res.status(201).json({ 
        success: true, 
        message: result.message,
        token: result.token,
        user: result.user
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  }

  static async getUserData(req, res) {
    try {
      const uid = req.user.uid;
      
      // Get user from Firebase Auth
      const admin = require('firebase-admin');
      const userRecord = await admin.auth().getUser(uid);
      const claims = userRecord.customClaims || {};
      
      res.json({ 
        success: true, 
        role: claims.role || 'institute',
        institutionType: claims.institutionType || 'N/A',
        institutionName: claims.institutionName || 'N/A',
        email: userRecord.email,
        uid: uid
      });
    } catch (error) {
      console.error('Error getting user data:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = AuthController;