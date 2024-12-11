const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const cartRoutes = require('./routes/cartRoutes');
const bodyParser = require('body-parser');
const cors = require('cors');


dotenv.config();

const app = express();

app.use(cors());

// app.use(cors({
//   origin: 'http://localhost:5173' // Your frontend URL
// }));
// app.use(express.json());

// Set a custom timeout for the entire server (e.g., 5 minutes)
app.use((req, res, next) => {
  res.setTimeout(300000, () => { // Timeout in milliseconds (300000ms = 5 minutes)
    console.log('Request timed out');
    res.status(408).send('Request timed out');
  });
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB connected'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Middleware
app.use(bodyParser.json());

// Routes
app.use('/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);




// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
