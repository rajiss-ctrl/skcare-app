const Joi = require('joi');

const cartItemSchema = Joi.object({
  productId: Joi.string().required(),
  name: Joi.string().required(),
  imageUrl: Joi.string().uri().required(),
  price: Joi.number().min(0).required(),
  cartQuantity: Joi.number().integer().min(1).required(),
});

const cartSchema = Joi.object({
  userId: Joi.string().required(),
  userEmail: Joi.string().email().required(),
  userName: Joi.string().allow(null).optional(),
  userPhone: Joi.string().allow(null).optional(),
  items: Joi.array().items(cartItemSchema).optional(),
});

module.exports = cartSchema;
