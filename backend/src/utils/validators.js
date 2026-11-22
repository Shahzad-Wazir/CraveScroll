const { z } = require('zod');
const AppError = require('./AppError');

const FOOD_CATEGORIES = [
  'Street Food',
  'Main Course',
  'Snacks',
  'Dessert',
  'Beverages',
  'Healthy',
  'Fast Food',
  'Other',
];

const DIET_TYPES = ['Veg', 'Non-Veg', 'Vegan'];

const registerUserSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(80),
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

const registerPartnerSchema = z.object({
  name: z.string().trim().min(2, 'Business name is required').max(100),
  contactName: z.string().trim().min(2, 'Contact name is required').max(80),
  phone: z.string().trim().min(7, 'Valid phone number is required').max(20),
  whatsapp: z.string().trim().max(20).optional().or(z.literal('')),
  address: z.string().trim().min(5, 'Full address is required').max(250),
  bio: z.string().trim().max(250).optional().or(z.literal('')),
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

const updatePartnerSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  contactName: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().min(7).max(20).optional(),
  whatsapp: z.string().trim().max(20).optional().or(z.literal('')),
  address: z.string().trim().min(5).max(250).optional(),
  bio: z.string().trim().max(250).optional().or(z.literal('')),
  isOpen: z.boolean().optional(),
});


const registerDeliveryPartnerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(80),
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  phone: z.string().trim().min(7, 'Valid phone number is required').max(20),
  vehicleNumber: z.string().trim().max(30).optional().or(z.literal('')),
});

const createFoodSchema = z.object({
  name: z.string().trim().min(2, 'Dish name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional().default(''),
  price: z.coerce.number().min(0, 'Price cannot be negative').max(100000).optional().default(0),
  category: z.enum(FOOD_CATEGORIES).optional().default('Other'),
  dietType: z.enum(DIET_TYPES).optional().default('Veg'),
});

const updateFoodSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  price: z.coerce.number().min(0).max(100000).optional(),
  category: z.enum(FOOD_CATEGORIES).optional(),
  dietType: z.enum(DIET_TYPES).optional(),
  isAvailable: z.boolean().optional(),
});

const commentSchema = z.object({
  text: z.string().trim().min(1, 'Comment cannot be empty').max(500, 'Comment is too long (max 500 chars)'),
});

function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return next(new AppError(details[0]?.message || 'Validation failed', 400, details));
    }
    req.body = parsed.data;
    next();
  };
}

module.exports = {
  FOOD_CATEGORIES,
  DIET_TYPES,
  registerUserSchema,
  loginSchema,
  registerPartnerSchema,
  registerDeliveryPartnerSchema,
  updatePartnerSchema,
  createFoodSchema,
  updateFoodSchema,
  commentSchema,
  validate,
};
