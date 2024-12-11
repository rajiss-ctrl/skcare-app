const express = require('express');
const { getCart, updateCart } = require('../controller/cartController');
const router = express.Router();


router.get('/:userId', getCart);
router.post('/:userId', updateCart);


module.exports = router;
