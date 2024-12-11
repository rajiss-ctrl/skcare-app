const firebaseAdmin = require('../firebaseConfig');

const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Authorization token is required' });
    }

    try {
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);

        req.user = {
            uid: decodedToken.uid,
            displayName: decodedToken.name || "Anonymous",
            photoURL: decodedToken.picture || null,
        };

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = authMiddleware;
