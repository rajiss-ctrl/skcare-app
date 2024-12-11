const User = require("../models/Users");


// Get all users
const getUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

// Add to cart
const addToCart = async (req, res) => {
    const { uid, cartItems } = req.body;

    try {
        const user = await User.findOneAndUpdate(
            { uid },
            { cart: cartItems },
            { new: true, upsert: true }
        );

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: "Failed to update cart" });
    }
};

// Get user's cart
const getUserCart = async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.user.uid }, 'cart');

        if (!user || !user.cart) {
            return res.status(404).json({ message: 'Cart is empty or user not found' });
        }

        res.status(200).json(user.cart);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch user cart" });
    }
};

// Register user
const registerUser = async (req, res) => {
    console.log("Request Body:", req.body); // Add this to debug
    const { uid, email, displayName, photoURL } = req.body;
  
    try {
        const user = await User.findOneAndUpdate(
            { uid },
            { $setOnInsert: { email, displayName, photoURL } },
            { new: true, upsert: true }
        );
        res.status(200).json(user);
    } catch (error) {
        console.error("Error in registerUser:", error);
        res.status(500).json({ error: "Failed to register or update user" });
    }
};
  const updateUser = async (req, res) => {
    const { uid, phoneNumber, country, houseAddress, email, amount } = req.body;

    try {
        // Use findOneAndUpdate to update directly
        const updatedUser = await User.findOneAndUpdate(
            { uid },
            {
                $set: {
                    phoneNumber,
                    country,
                    houseAddress,
                    email,
                    amount,
                },
            },
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            message: 'User updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};



// Remove user
const removeUser = async (req, res) => {
    try {
        const result = await User.deleteOne({ _id: req.params.id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(200).json({ message: "User successfully removed" });
    } catch (error) {
        res.status(500).json({ error: "Failed to remove user" });
    }
};

module.exports = {
    getUsers,
    addToCart,
    getUserCart,
    registerUser,
    updateUser,
    removeUser,
};
