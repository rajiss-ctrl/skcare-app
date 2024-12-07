// routes/flutterroute.js
const express = require('express');
const { initializePayment } = require('../controller/paymentController');

const router = express.Router();

// Define route for payment initialization
router.post('/payment', initializePayment);

module.exports = router;
