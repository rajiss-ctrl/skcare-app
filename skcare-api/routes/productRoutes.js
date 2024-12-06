const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig');
const Product = require('../models/Product');

const router = express.Router();

// Multer configuration (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to add a product
// Route to add a product
router.post('/add', upload.single('image'), async (req, res) => {
  console.log('Received file:', req.file);  // Debugging line
  const { name, description, price } = req.body;

  // Validate required fields
  if (!name || !description || !price || !req.file) {
    return res.status(400).json({ error: 'All fields are required and file must be provided' });
  }

  try {
    // Upload image buffer directly to Cloudinary
    const stream = cloudinary.uploader.upload_stream({
      resource_type: 'auto', // Auto-detect image type
      folder: 'products',    // Optional folder for the file
      public_id: `product_${Date.now()}`, // Optional: unique public ID
    }, async (error, result) => {
      if (error) {
        console.error('Cloudinary upload error:', error);
        return res.status(500).json({ error: 'Cloudinary upload failed', details: error });
      }

      console.log('Cloudinary result:', result);

      // Save product in the database with Cloudinary URL
      try {
        const newProduct = await Product.create({
          name,
          description,
          price,
          imageUrl: result.secure_url, // Use Cloudinary image URL
        });

        res.status(201).json(newProduct); // Send response only after successful DB entry
      } catch (dbError) {
        console.error('Database error:', dbError);
        res.status(500).json({ error: 'Failed to save product in database' });
      }
    });

    stream.end(req.file.buffer); // Ensure file buffer is piped to Cloudinary

  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Route to fetch products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

module.exports = router;
