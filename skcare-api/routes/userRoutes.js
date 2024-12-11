const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
    getUsers,
    addToCart,
    getUserCart,
    registerUser,
    removeUser,
    updateUser,
} = require('../controller/userController');

const router = express.Router();

router.get('/', getUsers);
router.post('/cart', authMiddleware, addToCart);
router.get('/cart', authMiddleware, getUserCart);
router.post('/', registerUser);
router.put('/update', authMiddleware, updateUser); // Updated endpoint
router.delete('/:id', removeUser);

module.exports = router;
