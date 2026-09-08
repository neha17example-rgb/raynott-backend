// authMiddleware.js
const { admin, db } = require("../firebaseAdmin");

const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log("❌ No authorization header");
      return res.status(401).json({ success: false, error: "Unauthorized - No token" });
    }

    const token = authHeader.split(" ")[1];
    console.log("🔑 Token received:", token.substring(0, 20) + "...");

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log("✅ Token verified as Firebase ID token for:", decodedToken.email);
      
      const userSnapshot = await db.ref('users')
        .orderByChild('email')
        .equalTo(decodedToken.email)
        .once('value');
      
      let userData = null;
      userSnapshot.forEach((child) => {
        userData = { id: child.key, ...child.val() };
      });
      
      req.user = userData || decodedToken;
      req.uid = decodedToken.uid;
      next();
    } catch (firebaseError) {
      console.log("❌ Not a Firebase ID token, trying custom token...");
      
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        console.log("✅ Token verified as JWT for:", decoded.email);
        req.user = decoded;
        req.uid = decoded.uid;
        next();
      } catch (jwtError) {
        console.log("❌ Invalid token type");
        return res.status(401).json({ success: false, error: "Invalid token" });
      }
    }
  } catch (error) {
    console.error("❌ Auth Middleware Error:", error.message);
    res.status(401).json({ success: false, error: "Unauthorized - Invalid token" });
  }
};

const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log("❌ No authorization header");
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    console.log("🔑 Token received:", token.substring(0, 20) + "...");

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log("📋 Decoded Token:", decodedToken);

      // Check if user is admin - either from claims or database
      let isAdmin = false;
      
      // Check custom claims
      if (decodedToken.role === 'admin') {
        isAdmin = true;
      }
      
      // Check database as fallback
      if (!isAdmin) {
        const userSnapshot = await db.ref('users')
          .orderByChild('email')
          .equalTo(decodedToken.email)
          .once('value');
        
        let userData = null;
        userSnapshot.forEach((child) => {
          userData = { id: child.key, ...child.val() };
        });
        
        if (userData && userData.role === 'admin') {
          isAdmin = true;
        }
      }

      if (!isAdmin) {
        console.log("❌ User is not an admin");
        return res.status(403).json({ success: false, error: "Forbidden - Admin access required" });
      }

      req.user = decodedToken;
      next();
    } catch (error) {
      console.log("❌ Invalid token");
      return res.status(401).json({ success: false, error: "Invalid token" });
    }
  } catch (error) {
    console.error("⚠️ Auth Middleware Error:", error.message);
    res.status(401).json({ success: false, error: "Unauthorized" });
  }
};

// UPDATED: Verify Parent Middleware - Fixed admin.auth() issue
const verifyParent = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log("❌ No authorization header");
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    console.log("🔑 Parent Token received:", token.substring(0, 20) + "...");

    try {
      // Use admin.auth() - make sure admin is properly imported
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log("📋 Decoded Parent Token:", decodedToken.email);

      // Check if user is a parent - multiple ways
      let isParent = false;
      let parentData = null;
      
      // Method 1: Check custom claims
      if (decodedToken.role === 'parent') {
        isParent = true;
        console.log("✅ Parent role found in claims");
      }
      
      // Method 2: Check database (parents node)
      if (!isParent) {
        const parentSnapshot = await db.ref('parents')
          .orderByChild('email')
          .equalTo(decodedToken.email)
          .once('value');
        
        parentSnapshot.forEach((child) => {
          parentData = { id: child.key, ...child.val() };
        });
        
        if (parentData && parentData.role === 'parent') {
          isParent = true;
          console.log("✅ Parent role found in database (parents node)");
        }
      }
      
      // Method 3: Check users node as fallback
      if (!isParent) {
        const userSnapshot = await db.ref('users')
          .orderByChild('email')
          .equalTo(decodedToken.email)
          .once('value');
        
        let userData = null;
        userSnapshot.forEach((child) => {
          userData = { id: child.key, ...child.val() };
        });
        
        if (userData && userData.role === 'parent') {
          isParent = true;
          parentData = userData;
          console.log("✅ Parent role found in users node");
        }
      }

      if (!isParent) {
        console.log("❌ User is not a parent. Email:", decodedToken.email);
        return res.status(403).json({ 
          success: false, 
          error: "Forbidden - Parent access required" 
        });
      }

      // If parentData is still null, try to get it from parents node
      if (!parentData) {
        const parentSnapshot = await db.ref('parents')
          .orderByChild('email')
          .equalTo(decodedToken.email)
          .once('value');
        
        parentSnapshot.forEach((child) => {
          parentData = { id: child.key, ...child.val() };
        });
      }

      req.user = decodedToken;
      req.parentData = parentData || {
        email: decodedToken.email,
        parentName: decodedToken.parentName || 'Parent',
        institutionType: decodedToken.institutionType || 'Schools',
        role: 'parent',
        uid: decodedToken.uid
      };
      req.uid = decodedToken.uid;
      next();
    } catch (error) {
      console.log("❌ Invalid token:", error.message);
      return res.status(401).json({ 
        success: false, 
        error: "Invalid token: " + error.message 
      });
    }
  } catch (error) {
    console.error("⚠️ Auth Middleware Error:", error.message);
    res.status(401).json({ success: false, error: "Unauthorized" });
  }
};

module.exports = { verifyAdmin, verifyAuth, verifyParent };