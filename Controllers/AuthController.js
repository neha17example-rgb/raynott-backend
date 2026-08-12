const AuthModel = require('../Models/AuthModel');

class AuthController {
  // Existing methods...
  
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

 // PARENT LOGIN
static async loginParent(req, res) {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: "Email and password are required" 
    });
  }

  const result = await AuthModel.parentLogin(email, password);
  
  if (result.success) {
    res.json({ 
      success: true, 
      token: result.token,
      parentData: result.parentData
    });
  } else {
    res.status(401).json({ success: false, error: result.error });
  }
}

// PARENT REGISTRATION
static async registerParent(req, res) {
  const { email, password, parentName, institutionType } = req.body;
  
  // Validation
  if (!email || !password || !parentName || !institutionType) {
    return res.status(400).json({ 
      success: false, 
      error: "All fields are required: email, password, parentName, institutionType" 
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

  const result = await AuthModel.parentRegister({
    email,
    password,
    parentName,
    institutionType
  });
  
  if (result.success) {
    res.status(201).json({ 
      success: true, 
      message: result.message,
      token: result.token,
      parentData: result.parentData
    });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
}
 

  // GET PARENT DATA
  static async getParentData(req, res) {
    try {
      const uid = req.user.uid || req.uid;
      
      const result = await AuthModel.getParentData(uid);
      
      if (result.success) {
        res.json({ 
          success: true, 
          parentData: result.data
        });
      } else {
        res.status(404).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error getting parent data:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ADMIN: GET ALL PARENTS
  static async getAllParents(req, res) {
    try {
      const result = await AuthModel.getAllParents();
      
      if (result.success) {
        res.json({ success: true, parents: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error getting all parents:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async registerAdmin(req, res) {
    const { email, password, institutionName, institutionType } = req.body;
    
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