const express = require('express');
const { getCart, updateCart } = require('../controller/cartController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();


router.get('/:userId',authMiddleware, getCart);
router.post('/:userId',authMiddleware, updateCart);


module.exports = router;
