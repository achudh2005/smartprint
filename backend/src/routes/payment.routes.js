const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// Public customer checkout routes
router.post('/razorpay/order', paymentController.createRazorpayOrder);
router.post('/razorpay/verify', paymentController.verifyRazorpayPayment);
router.post('/razorpay/webhook', paymentController.handleRazorpayWebhook);

module.exports = router;
