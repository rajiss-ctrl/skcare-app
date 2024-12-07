const Flutterwave = require('flutterwave-node-v3');
const flw = new Flutterwave(process.env.TEST_FLW_PUBLIC_KEY, process.env.TEST_FLW_SECRET_KEY);
// controllers/paymentController.js
const axios = require('axios');

// Flutterwave keys (use environment variables in production)


// Payment initialization controller function
exports.initializePayment = async (req, res) => {
    const { amount, email, phone, currency } = req.body;

    const payload = {
        tx_ref: `tx-${Date.now()}`,
        amount,
        currency: currency || 'USD',
        redirect_url: 'http://localhost:5173/payment-success',
        customer: {
            email,
            phonenumber: phone,
        },
        payment_options: 'card',
    };

    try {
        const response = await axios.post(
            'https://api.flutterwave.com/v3/payments',
            payload,
            {
                headers: {
                    Authorization: `Bearer ${f0x595832F8FC6BF59c85C527fEC3740A1b7a361269}`,
                },
            }
        );
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.response?.data || 'An error occurred' });
    }
};
