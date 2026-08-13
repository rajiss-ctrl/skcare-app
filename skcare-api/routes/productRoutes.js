// routes/productRoutes.js
const express        = require('express');
const cloudinary     = require('../config/cloudinaryConfig');
const Product        = require('../models/Product');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole    = require('../middleware/requireRole');
const {
  handleValidationErrors,
  addProductRules,
  mongoIdParam,
} = require('../middleware/validate');
const multer = require('multer');

const router = express.Router();

// Memory storage — buffer is piped directly to Cloudinary, never touches disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Upload a buffer to Cloudinary and return the secure URL.
 */
const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder:        'skcare/products',
        transformation: [
          { width: 800, height: 800, crop: 'limit' }, // resize large images
          { quality: 'auto', fetch_format: 'auto' },  // serve WebP/AVIF where supported
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /products
 * Public — list active products.
 * Supports: ?category=skin&page=1&limit=20&search=serum
 */
router.get('/', async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const skip   = (page - 1) * limit;

    const filter = { isActive: true };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: products,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /products/:id
 * Public — fetch a single product by id.
 */
router.get(
  '/:id',
  mongoIdParam('id'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const product = await Product.findOne({ _id: req.params.id, isActive: true }).lean();
      if (!product) {
        return res.status(404).json({ message: 'Product not found.' });
      }
      return res.status(200).json({ product });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /products
 * staff+ — upload a new product with an image.
 * Staff and admin can add products. superadmin can too.
 */
router.post(
  '/',
  authMiddleware,
  requireRole.staff,
  upload.single('image'),
  addProductRules,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'A product image is required.' });
      }

      const imageUrl = await uploadToCloudinary(req.file.buffer);

      const product = await Product.create({
        name:        req.body.name,
        description: req.body.description,
        price:       parseFloat(req.body.price),
        stock:       parseInt(req.body.stock || 0, 10),
        trackStock:  req.body.trackStock === 'true',
        category:    req.body.category,
        imageUrl,
      });

      return res.status(201).json({ product });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /products/:id
 * staff+ — update product details (without re-uploading image).
 */
router.put(
  '/:id',
  authMiddleware,
  requireRole.staff,
  mongoIdParam('id'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const allowedFields = ['name', 'description', 'price', 'stock', 'category', 'isActive'];
      const updates = {};
      allowedFields.forEach((f) => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No updatable fields provided.' });
      }

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!product) {
        return res.status(404).json({ message: 'Product not found.' });
      }

      return res.status(200).json({ product });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /products/:id/image
 * staff+ — replace a product's image.
 */
router.patch(
  '/:id/image',
  authMiddleware,
  requireRole.staff,
  mongoIdParam('id'),
  handleValidationErrors,
  upload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'An image file is required.' });
      }

      const imageUrl = await uploadToCloudinary(req.file.buffer);

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: { imageUrl } },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({ message: 'Product not found.' });
      }

      return res.status(200).json({ product });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /products/:id
 * superadmin only — soft-delete (isActive = false).
 * Staff and admin cannot delete products — only deactivate via PUT if needed.
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole.superadmin,
  mongoIdParam('id'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: { isActive: false } },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({ message: 'Product not found.' });
      }

      return res.status(200).json({ message: 'Product deactivated successfully.' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
