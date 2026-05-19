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
      res.json({ success: true, token: result.token });
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
  // Add to AuthController.js
static async getUserData(req, res) {
  try {
    const uid = req.user.uid; // From your auth middleware
    
    const result = await AuthModel.getInstitutionDetails(uid);
    
    if (result.success) {
      res.json({ 
        success: true, 
        institutionType: result.data.institutionType,
        institutionName: result.data.institutionName,
        email: result.data.email,
        uid: uid
      });
    } else {
      res.status(404).json({ success: false, error: "User data not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
}

module.exports = AuthController;