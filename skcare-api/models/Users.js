const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true },
    email: { type: String, required: true, match: /.+\@.+\..+/ },
    displayName: String,
    photoURL: String,
    phoneNumber: String,
    country: String,
    houseAddress: String,
    postalCode: String,
    city: String,
    region: String,
    amount: Number,
    cart: [{ productId: String, quantity: Number }],
});

module.exports = mongoose.model('User', userSchema);
