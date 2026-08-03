// authMiddleware.js
const admin = require("../firebaseAdmin");
const { db } = require("../firebaseAdmin");

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
      // Try to verify as Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log("✅ Token verified as Firebase ID token for:", decodedToken.email);
      
      // Get user data from database
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
      
      // If it's not a Firebase ID token, try to verify as a custom token
      // You might have stored a JWT token instead
      try {
        // If you're using JWT instead of Firebase tokens
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

      // Check for 'admin' role
      if (!decodedToken.role || decodedToken.role !== 'admin') {
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

module.exports = { verifyAdmin, verifyAuth };