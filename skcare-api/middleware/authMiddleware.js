const firebaseAdmin = require('../firebaseConfig');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      console.error('No Authorization header found');
      return res.status(401).json({ error: 'Authorization token is required' });
    }
  
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      console.error('Token is missing in Authorization header');
      return res.status(401).json({ error: 'Invalid Authorization format' });
    }
  
    try {
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      console.log('Decoded Token:', decodedToken);
  
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };
      next();
    } catch (error) {
      console.error('Error verifying token:', error.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
    

module.exports = authMiddleware;
