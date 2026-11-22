require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./db');
const userModel = require('../models/user.model');
const foodPartnerModel = require('../models/foodpartner.model');
const foodModel = require('../models/food.model');
const likeModel = require('../models/likes.model');
const saveModel = require('../models/save.model');
const commentModel = require('../models/comment.model');
const followModel = require('../models/follow.model');
const { orderModel } = require('../models/order.model');
const deliveryPartnerModel = require('../models/deliveryPartner.model');

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD;
if (!DEMO_PASSWORD) {
  console.error('FATAL: Set SEED_DEMO_PASSWORD in your local backend/.env before running npm run seed.');
  process.exit(1);
}
const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BACKEND_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

// 6 real vertical HD food videos served locally from backend/public/demo-videos/

const CATEGORY_THUMBS = {
  'Main Course': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&auto=format&fit=crop&q=75',
  'Street Food': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop&q=75',
  Snacks: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&auto=format&fit=crop&q=75',
  Dessert: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&auto=format&fit=crop&q=75',
  Beverages: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&auto=format&fit=crop&q=75',
  Healthy: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&auto=format&fit=crop&q=75',
  'Fast Food': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=75',
  Other: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&auto=format&fit=crop&q=75',
};

const DEMO_VIDEOS = [
  `${BASE_URL}/demo-videos/reel-1.mp4`,
  `${BASE_URL}/demo-videos/reel-2.mp4`,
  `${BASE_URL}/demo-videos/reel-3.mp4`,
  `${BASE_URL}/demo-videos/reel-4.mp4`,
  `${BASE_URL}/demo-videos/reel-5.mp4`,
  `${BASE_URL}/demo-videos/reel-6.mp4`,
];

// 56 unique dishes across all 8 categories and 3 diet types
const DISH_CATALOG = [
  // Spice Route Kitchen (index 0)
  { p: 0, name: 'Smoky Tandoori Paneer Wrap', price: 169, category: 'Main Course', dietType: 'Veg', desc: 'Charcoal-roasted paneer cubes tossed in mint mayo and pickled onions inside flaky roomali roti.' },
  { p: 0, name: 'Hyderabadi Chicken Dum Biryani', price: 279, category: 'Main Course', dietType: 'Non-Veg', desc: 'Slow-cooked saffron basmati rice layered with spiced tender chicken and mirchi ka salan.' },
  { p: 0, name: 'Butter Garlic Naan & Dal Makhani', price: 229, category: 'Main Course', dietType: 'Veg', desc: 'Overnight-simmered creamy black lentils paired with blistered butter garlic naan.' },
  { p: 0, name: 'Awadhi Mutton Galouti Kebab', price: 329, category: 'Snacks', dietType: 'Non-Veg', desc: 'Melt-in-mouth minced mutton patties infused with saffron and cardamom on ulte tawe ka paratha.' },
  { p: 0, name: 'Paneer Lababdar Rice Bowl', price: 219, category: 'Main Course', dietType: 'Veg', desc: 'Rich tomato-cashew gravy with grated cottage cheese over fragrant jeera rice.' },
  { p: 0, name: 'Smoked Amritsari Kulcha Thali', price: 199, category: 'Main Course', dietType: 'Veg', desc: 'Crisp stuffed potato-paneer kulcha topped with white butter, pindi chole, and onion chutney.' },
  { p: 0, name: 'Kesar Badam Thandai Cooler', price: 119, category: 'Beverages', dietType: 'Veg', desc: 'Chilled saffron-almond milk spiced with fennel, cardamom, and rose petals.' },
  { p: 0, name: 'Lucknowi Veg Subz Biryani', price: 209, category: 'Main Course', dietType: 'Vegan', desc: 'Aromatic long-grain basmati slow-steamed with caramelized onions, saffron, and seasonal veggies.' },
  { p: 0, name: 'Kadhai Chicken Combo', price: 289, category: 'Main Course', dietType: 'Non-Veg', desc: 'Wok-tossed chicken with crushed coriander seeds, bell peppers, and two butter rotis.' },
  { p: 0, name: 'Punjabi Sarson Da Saag Bowl', price: 215, category: 'Main Course', dietType: 'Veg', desc: 'Traditional winter mustard greens finished with desi ghee and hot makki di roti.' },

  // Bombay Chaat Co. (index 1)
  { p: 1, name: 'Extra Butter Mumbai Pav Bhaji', price: 149, category: 'Street Food', dietType: 'Veg', desc: 'Tawa-mashed spiced vegetable bhaji topped with melting Amul butter and toasted masala pav.' },
  { p: 1, name: 'Crispy Sev Puri & Dahi Chaat', price: 99, category: 'Street Food', dietType: 'Veg', desc: 'Crunchy puris loaded with spiced potatoes, chilled sweet curd, tamarind chutney, and fine sev.' },
  { p: 1, name: 'Classic Vada Pav with Dry Garlic Chutney', price: 59, category: 'Street Food', dietType: 'Vegan', desc: 'Piping hot spiced potato fritter tucked inside soft ladi pav with fiery peanut-garlic chutney.' },
  { p: 1, name: 'Banarasi Tamatar Chaat', price: 109, category: 'Street Food', dietType: 'Veg', desc: 'Tangy roasted tomato chaat garnished with namakpara, roasted cumin, and ginger juliennes.' },
  { p: 1, name: 'Delhi Style Raj Kachori', price: 139, category: 'Street Food', dietType: 'Veg', desc: 'Giant crispy kachori stuffed with moong sprouts, bhalla, pomegranate, and chilled sweet dahi.' },
  { p: 1, name: 'Peri-Peri Loaded Masala Fries', price: 129, category: 'Snacks', dietType: 'Veg', desc: 'Double-fried crispy potato fries dusted with fiery peri-peri seasoning and cheddar drizzle.' },
  { p: 1, name: 'Chilled Kala Khatta Masala Soda', price: 69, category: 'Beverages', dietType: 'Vegan', desc: 'Fizzy lime soda swirled with tangy jamun syrup, black salt, and roasted jeera.' },
  { p: 1, name: 'Tawa Cheese Masala Frankie', price: 135, category: 'Street Food', dietType: 'Veg', desc: 'Griddled wrap stuffed with schezwan spiced aloo tikki, grated cheese, and crunchy cabbage.' },
  { p: 1, name: 'Jhalmuri Street Crunch', price: 75, category: 'Snacks', dietType: 'Vegan', desc: 'Puffed rice tossed in pungent mustard oil, green chilies, roasted peanuts, and raw mango.' },
  { p: 1, name: 'Samosa Chole Platter', price: 115, category: 'Street Food', dietType: 'Veg', desc: 'Two crushed Punjabi samosas smothered in spicy chickpeas, mint chutney, and sweet tamarind.' },

  // Sweet Cravings Patisserie (index 2)
  { p: 2, name: 'Molten Belgian Chocolate Waffle', price: 219, category: 'Dessert', dietType: 'Veg', desc: 'Crisp golden waffle drizzled with warm dark Belgian chocolate, roasted hazelnuts, and gelato.' },
  { p: 2, name: 'Iced Caramel Espresso Tonic', price: 159, category: 'Beverages', dietType: 'Vegan', desc: 'Double-shot single-origin espresso poured over chilled tonic water with a citrus twist.' },
  { p: 2, name: 'Biscoff Cheesecake Jar', price: 249, category: 'Dessert', dietType: 'Veg', desc: 'Velvety no-bake cream cheese layered over caramelized Lotus Biscoff crumble.' },
  { p: 2, name: 'Warm Nutella Stuffed Churros', price: 189, category: 'Dessert', dietType: 'Veg', desc: 'Cinnamon-sugar dusted Spanish churros served with a thick warm hazelnut chocolate dip.' },
  { p: 2, name: 'Saffron Pistachio Rasmalai Tres Leches', price: 229, category: 'Dessert', dietType: 'Veg', desc: 'Sponge cake soaked in cardamom-saffron milk, topped with whipped cream and roasted pistachios.' },
  { p: 2, name: 'Cold Brew Hazelnut Frappe', price: 179, category: 'Beverages', dietType: 'Veg', desc: '18-hour steeped cold brew blended with roasted hazelnut syrup and chilled milk.' },
  { p: 2, name: 'Gooey Dark Choco Lava Cake', price: 139, category: 'Dessert', dietType: 'Veg', desc: 'Fresh-baked dark chocolate cake with an oozing molten fudge center.' },
  { p: 2, name: 'Mango Passionfruit Boba Tea', price: 169, category: 'Beverages', dietType: 'Vegan', desc: 'Alphonso mango iced tea with popping passionfruit pearls.' },
  { p: 2, name: 'Tiramisu Espresso Cup', price: 239, category: 'Dessert', dietType: 'Veg', desc: 'Savoiardi biscuits dipped in espresso layered with mascarpone cream and Dutch cocoa.' },

  // Tandoor & Coal House (index 3)
  { p: 3, name: 'Afghani Malai Chicken Tikka', price: 299, category: 'Snacks', dietType: 'Non-Veg', desc: 'Juicy boneless chicken marinated in cashew cream, white pepper, and cardamom, roasted on charcoal.' },
  { p: 3, name: 'Achari Soya Chaap Skewers', price: 189, category: 'Snacks', dietType: 'Veg', desc: 'Tender soya chaap coated in tangy mustard-pickle spices and charred in a clay tandoor.' },
  { p: 3, name: 'Mutton Seekh Kebab Roll', price: 249, category: 'Fast Food', dietType: 'Non-Veg', desc: 'Juicy spiced mutton seekh kebab rolled in egg-glazed paratha with mint chutney.' },
  { p: 3, name: 'Tandoori Stuffed Mushroom', price: 219, category: 'Snacks', dietType: 'Veg', desc: 'Button mushrooms stuffed with spiced cheddar and herbs, blistered over glowing coals.' },
  { p: 3, name: 'Smoky Butter Chicken Kulcha', price: 269, category: 'Main Course', dietType: 'Non-Veg', desc: 'Pulled tandoori chicken in velvety makhani gravy served alongside crispy butter kulcha.' },
  { p: 3, name: 'Chargrilled Peri-Peri Wings', price: 239, category: 'Fast Food', dietType: 'Non-Veg', desc: 'Six flame-grilled chicken wings glazed in smoky African bird-eye chili sauce.' },
  { p: 3, name: 'Mint Chaas Clay Kulhad', price: 59, category: 'Beverages', dietType: 'Veg', desc: 'Frothy spiced buttermilk with crushed mint, ginger, and roasted cumin served in a clay cup.' },
  { p: 3, name: 'Angara Paneer Tikka Platter', price: 249, category: 'Snacks', dietType: 'Veg', desc: 'Smoky red-marinated paneer, bell peppers, and onions served sizzling on a cast-iron plate.' },
  { p: 3, name: 'Double Smash Chicken Burger', price: 229, category: 'Fast Food', dietType: 'Non-Veg', desc: 'Two seared chicken patties, melted cheddar, house chipotle sauce, and pickles in a brioche bun.' },

  // Wok & Roll Street (index 4)
  { p: 4, name: 'Kurkure Tandoori Momos', price: 159, category: 'Street Food', dietType: 'Veg', desc: 'Crunchy cornflake-crusted dumplings tossed in smoky tandoori marinade with fiery red chutney.' },
  { p: 4, name: 'Chilli Garlic Hakka Noodles', price: 169, category: 'Fast Food', dietType: 'Vegan', desc: 'High-flame wok-tossed noodles with burnt garlic, bok choy, bell peppers, and chili oil.' },
  { p: 4, name: 'Crispy Honey Chilli Potato', price: 149, category: 'Snacks', dietType: 'Vegan', desc: 'Golden potato fingers glazed in sweet-spicy sesame honey chili sauce.' },
  { p: 4, name: 'Steamed Darjeeling Chicken Momos', price: 139, category: 'Street Food', dietType: 'Non-Veg', desc: 'Thin-wrapped juicy chicken dumplings steamed fresh and served with roasted tomato achar.' },
  { p: 4, name: 'Schezwan Paneer Fried Rice', price: 189, category: 'Main Course', dietType: 'Veg', desc: 'Smoky wok-fried rice loaded with crispy paneer cubes and homemade Sichuan chili paste.' },
  { p: 4, name: 'Dragon Chicken Lollipop', price: 249, category: 'Snacks', dietType: 'Non-Veg', desc: 'Crispy chicken drumettes tossed in glossy sweet-spicy garlic soy glaze.' },
  { p: 4, name: 'Thai Red Curry Jasmine Bowl', price: 259, category: 'Main Course', dietType: 'Vegan', desc: 'Fragrant coconut red curry with tofu, bamboo shoots, basil, and steamed jasmine rice.' },
  { p: 4, name: 'Korean Gochujang Ramen Bowl', price: 239, category: 'Main Course', dietType: 'Veg', desc: 'Chewy ramen noodles in fiery miso-gochujang broth topped with sweet corn, nori, and bok choy.' },
  { p: 4, name: 'Crispy Veg Spring Rolls', price: 129, category: 'Snacks', dietType: 'Vegan', desc: 'Golden shatteringly crisp rolls stuffed with julienned veggies and glass noodles.' },

  // Green Bowl Bistro (index 5)
  { p: 5, name: 'Mediterranean Quinoa Power Bowl', price: 249, category: 'Healthy', dietType: 'Vegan', desc: 'Protein-packed quinoa, roasted chickpeas, avocado, cherry tomatoes, and lemon-tahini dressing.' },
  { p: 5, name: 'Grilled Herb Chicken Caesar Salad', price: 269, category: 'Healthy', dietType: 'Non-Veg', desc: 'Crisp romaine lettuce, herb-seared chicken breast, sourdough croutons, and parmesan shavings.' },
  { p: 5, name: 'Avocado Sourdough Smash Toast', price: 219, category: 'Healthy', dietType: 'Vegan', desc: 'Artisanal toasted sourdough topped with smashed Haas avocado, chili flakes, and microgreens.' },
  { p: 5, name: 'High-Protein Paneer Tikka Salad', price: 229, category: 'Healthy', dietType: 'Veg', desc: 'Charred paneer, roasted bell peppers, cucumber, baby spinach, and Greek yogurt mint dressing.' },
  { p: 5, name: 'Berry Chia Overnight Oats', price: 179, category: 'Healthy', dietType: 'Vegan', desc: 'Almond milk soaked rolled oats layered with chia seeds, blueberries, and toasted granola.' },
  { p: 5, name: 'Cold-Pressed ABC Detox Juice', price: 129, category: 'Beverages', dietType: 'Vegan', desc: 'Freshly cold-pressed apple, beetroot, carrot, and ginger with zero added sugar.' },
  { p: 5, name: 'Pesto Grilled Veggie Panini', price: 199, category: 'Fast Food', dietType: 'Veg', desc: 'Basil pesto, roasted zucchini, sun-dried tomatoes, and mozzarella pressed hot on ciabatta.' },
  { p: 5, name: 'Matcha Oat Milk Iced Latte', price: 189, category: 'Beverages', dietType: 'Vegan', desc: 'Ceremonial-grade Japanese matcha whisked over creamy oat milk and ice.' },
  { p: 5, name: 'Chef Special Surprise Tasting Box', price: 349, category: 'Other', dietType: 'Veg', desc: 'Curated weekly tasting box featuring 3 mini chef signatures and a seasonal dip.' },
];

async function seed() {
  await connectDB();

  const demoUserEmails = ['aarav@cravescroll.dev', 'priya@cravescroll.dev', 'kabir@cravescroll.dev'];
  const demoPartnerEmails = [
    'spice@cravescroll.dev',
    'chaat@cravescroll.dev',
    'sweets@cravescroll.dev',
    'tandoor@cravescroll.dev',
    'wok@cravescroll.dev',
    'greenbowl@cravescroll.dev',
  ];

  console.log('Resetting existing CraveScroll demo data...');

  const existingPartners = await foodPartnerModel.find({ email: { $in: demoPartnerEmails } }).select('_id');
  const oldPartnerIds = existingPartners.map((p) => p._id);
  if (oldPartnerIds.length) {
    const oldFoods = await foodModel.find({ foodPartner: { $in: oldPartnerIds } }).select('_id');
    const oldFoodIds = oldFoods.map((f) => f._id);
    if (oldFoodIds.length) {
      await Promise.all([
        foodModel.deleteMany({ _id: { $in: oldFoodIds } }),
        likeModel.deleteMany({ food: { $in: oldFoodIds } }),
        saveModel.deleteMany({ food: { $in: oldFoodIds } }),
        commentModel.deleteMany({ food: { $in: oldFoodIds } }),
      ]);
    }
    await followModel.deleteMany({ foodPartner: { $in: oldPartnerIds } });
  }

  await Promise.all([
    userModel.deleteMany({ email: { $in: demoUserEmails } }),
    foodPartnerModel.deleteMany({ email: { $in: demoPartnerEmails } }),
  ]);

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [aarav, priya, kabir] = await userModel.create([
    { fullName: 'Aarav Sharma', email: 'aarav@cravescroll.dev', password: hashedPassword },
    { fullName: 'Priya Verma', email: 'priya@cravescroll.dev', password: hashedPassword },
    { fullName: 'Kabir Mehta', email: 'kabir@cravescroll.dev', password: hashedPassword },
  ]);

  const partners = await foodPartnerModel.create([
    {
      name: 'Spice Route Kitchen',
      coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&auto=format&fit=crop&q=75',
      cuisines: ['North Indian', 'Biryani', 'Tandoor'],
      rating: 4.7,
      reviewCount: 2340,
      deliveryTime: '25–35 mins',
      distanceKm: 1.8,
      contactName: 'Rohan Malhotra',
      phone: '+91 98765 43210',
      whatsapp: '+919876543210',
      address: 'Boring Road Crossing, Patna, Bihar',
      bio: 'Charcoal-grilled tandoori wraps, smoky biryani, and rich North Indian curries.',
      avatar: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=70',
      email: 'spice@cravescroll.dev',
      password: hashedPassword,
      followersCount: 2,
    },
    {
      name: 'Bombay Chaat Co.',
      coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&auto=format&fit=crop&q=75',
      cuisines: ['Street Food', 'Chaat', 'Snacks'],
      rating: 4.6,
      reviewCount: 1890,
      deliveryTime: '20–30 mins',
      distanceKm: 2.1,
      contactName: 'Sneha Kulkarni',
      phone: '+91 91234 56789',
      whatsapp: '+919123456789',
      address: 'Kankarbagh Main Road, Patna, Bihar',
      bio: 'Crispy street-style chaat, butter pav bhaji, and chilled masala soda.',
      avatar: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=300&auto=format&fit=crop&q=70',
      email: 'chaat@cravescroll.dev',
      password: hashedPassword,
      followersCount: 2,
    },
    {
      name: 'Sweet Cravings Patisserie',
      coverImage: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=900&auto=format&fit=crop&q=75',
      cuisines: ['Desserts', 'Waffles', 'Coffee'],
      rating: 4.8,
      reviewCount: 1420,
      deliveryTime: '20–25 mins',
      distanceKm: 1.4,
      contactName: 'Meera Kapoor',
      phone: '+91 99887 76655',
      whatsapp: '+919988776655',
      address: 'Fraser Road, Patna, Bihar',
      bio: 'Warm Belgian waffles, molten lava cakes, and artisanal cold brews.',
      avatar: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=300&auto=format&fit=crop&q=70',
      email: 'sweets@cravescroll.dev',
      password: hashedPassword,
      followersCount: 1,
    },
    {
      name: 'Tandoor & Coal House',
      coverImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=75',
      cuisines: ['Burgers', 'Kebabs', 'Fast Food'],
      rating: 4.5,
      reviewCount: 2150,
      deliveryTime: '30–40 mins',
      distanceKm: 2.6,
      contactName: 'Vikram Singh',
      phone: '+91 98111 22334',
      whatsapp: '+919811122334',
      address: 'Bailey Road, Patna, Bihar',
      bio: 'Live charcoal kebabs, smoky tikkas, and flame-grilled burgers.',
      avatar: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=70',
      email: 'tandoor@cravescroll.dev',
      password: hashedPassword,
      followersCount: 1,
    },
    {
      name: 'Wok & Roll Street',
      coverImage: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=900&auto=format&fit=crop&q=75',
      cuisines: ['Chinese', 'Momos', 'Ramen'],
      rating: 4.6,
      reviewCount: 1640,
      deliveryTime: '25–30 mins',
      distanceKm: 2.2,
      contactName: 'Tenzin Dorjee',
      phone: '+91 97001 55667',
      whatsapp: '+919700155667',
      address: 'Dakbunglow Chauraha, Patna, Bihar',
      bio: 'Steaming Darjeeling momos, fiery ramen bowls, and high-flame wok noodles.',
      avatar: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=300&auto=format&fit=crop&q=70',
      email: 'wok@cravescroll.dev',
      password: hashedPassword,
      followersCount: 1,
    },
    {
      name: 'Green Bowl Bistro',
      coverImage: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&auto=format&fit=crop&q=75',
      cuisines: ['Healthy', 'Salads', 'Beverages'],
      rating: 4.7,
      reviewCount: 980,
      deliveryTime: '20–30 mins',
      distanceKm: 1.9,
      contactName: 'Ananya Roy',
      phone: '+91 96543 21098',
      whatsapp: '+919654321098',
      address: 'Patliputra Colony, Patna, Bihar',
      bio: 'Macro-balanced grain bowls, sourdough toasts, and cold-pressed juices.',
      avatar: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=300&auto=format&fit=crop&q=70',
      email: 'greenbowl@cravescroll.dev',
      password: hashedPassword,
      followersCount: 1,
    },
  ]);

  const now = Date.now();
  const foodDocs = DISH_CATALOG.map((dish, idx) => ({
    name: dish.name,
    description: dish.desc,
    price: dish.price,
    category: dish.category,
    dietType: dish.dietType,
    video: DEMO_VIDEOS[idx % DEMO_VIDEOS.length],
    thumbnail: CATEGORY_THUMBS[dish.category] || CATEGORY_THUMBS.Other,
    isAvailable: true,
    rating: Number((4.3 + (idx % 6) * 0.1).toFixed(1)),
    foodPartner: partners[dish.p]._id,
    likeCount: 0,
    savesCount: 0,
    commentsCount: 0,
    // Stagger timestamps so feed ordering & pagination feel natural
    createdAt: new Date(now - idx * 3600 * 1000),
    updatedAt: new Date(now - idx * 3600 * 1000),
  }));

  const reels = await foodModel.insertMany(foodDocs);

  // Seed realistic likes, saves, follows & comments and sync exact counters
  const users = [aarav, priya, kabir];
  const likeDocs = [];
  const saveDocs = [];
  const commentDocs = [];

  const sampleComments = [
    'Tried this last night—absolutely 10/10 flavor!',
    'Portion size is super generous for the price.',
    'Best spot in Patna for late evening cravings!',
    'Saving this for the weekend with friends.',
    'The aroma and spice balance here is unbeatable.',
    'Ordered via WhatsApp, arrived piping hot!',
  ];

  reels.forEach((reel, i) => {
    const likeUsers = users.slice(0, (i % 3) + 1);
    likeUsers.forEach((u) => likeDocs.push({ user: u._id, food: reel._id }));

    if (i % 2 === 0) {
      saveDocs.push({ user: aarav._id, food: reel._id });
    }
    if (i % 3 === 0) {
      saveDocs.push({ user: priya._id, food: reel._id });
    }
    if (i < 18) {
      const commenter = users[i % users.length];
      commentDocs.push({
        food: reel._id,
        authorId: commenter._id,
        authorRole: 'user',
        authorName: commenter.fullName,
        text: sampleComments[i % sampleComments.length],
      });
    }
  });

  await Promise.all([
    likeModel.insertMany(likeDocs),
    saveModel.insertMany(saveDocs),
    commentModel.insertMany(commentDocs),
    followModel.insertMany([
      { user: aarav._id, foodPartner: partners[0]._id },
      { user: aarav._id, foodPartner: partners[1]._id },
      { user: aarav._id, foodPartner: partners[4]._id },
      { user: priya._id, foodPartner: partners[0]._id },
      { user: priya._id, foodPartner: partners[2]._id },
      { user: priya._id, foodPartner: partners[5]._id },
      { user: kabir._id, foodPartner: partners[1]._id },
      { user: kabir._id, foodPartner: partners[3]._id },
    ]),
  ]);

  // Compute exact counters directly from inserted engagement collections
  const likeMap = new Map();
  likeDocs.forEach((l) => likeMap.set(l.food.toString(), (likeMap.get(l.food.toString()) || 0) + 1));
  const saveMap = new Map();
  saveDocs.forEach((s) => saveMap.set(s.food.toString(), (saveMap.get(s.food.toString()) || 0) + 1));
  const commentMap = new Map();
  commentDocs.forEach((c) => commentMap.set(c.food.toString(), (commentMap.get(c.food.toString()) || 0) + 1));

  await foodModel.bulkWrite(
    reels.map((r) => ({
      updateOne: {
        filter: { _id: r._id },
        update: {
          $set: {
            likeCount: likeMap.get(r._id.toString()) || 0,
            savesCount: saveMap.get(r._id.toString()) || 0,
            commentsCount: commentMap.get(r._id.toString()) || 0,
          },
        },
      },
    }))
  );



  await deliveryPartnerModel.deleteMany({ email: 'rider@cravescroll.dev' });
  const demoRider = await deliveryPartnerModel.create({
    fullName: 'Vikash Kumar',
    email: 'rider@cravescroll.dev',
    password: hashedPassword,
    phone: '+91 90001 44556',
    vehicleNumber: 'BR-01-CS-4022',
    isAvailable: true,
  });

  // Seed sample Ongoing & Past orders for Aarav so Live Order Tracking works immediately
  await orderModel.deleteMany({ orderNumber: { $in: ['CS78452', 'CS76210', 'CS-7845-2A1F', 'CS-7621-0B9E'] } });
  await orderModel.create([
    {
      orderNumber: 'CS-7845-2A1F',
      user: aarav._id,
      deliveryPartner: demoRider._id,
      foodPartner: partners[0]._id,
      items: [
        { food: reels[0]._id, name: reels[0].name, thumbnail: reels[0].thumbnail, price: reels[0].price, quantity: 1, dietType: reels[0].dietType },
        { food: reels[1]._id, name: reels[1].name, thumbnail: reels[1].thumbnail, price: reels[1].price, quantity: 1, dietType: reels[1].dietType },
      ],
      itemTotal: reels[0].price + reels[1].price,
      deliveryFee: 39,
      taxes: Math.round((reels[0].price + reels[1].price) * 0.05),
      totalAmount: reels[0].price + reels[1].price + 39 + Math.round((reels[0].price + reels[1].price) * 0.05),
      deliveryAddress: 'Boring Road, Patna, Bihar - 800001',
      paymentMethod: 'UPI',
      status: 'Out for Delivery',
      estimatedMinutes: 12,
      statusHistory: [
        { status: 'Order Placed', timestamp: new Date(now - 22 * 60000), note: 'Order confirmed by Spice Route Kitchen' },
        { status: 'Preparing', timestamp: new Date(now - 16 * 60000), note: 'Chef is preparing your fresh dishes' },
        { status: 'Out for Delivery', timestamp: new Date(now - 5 * 60000), note: 'Delivery partner is on the way' },
      ],
    },
    {
      orderNumber: 'CS-7621-0B9E',
      user: aarav._id,
      deliveryPartner: demoRider._id,
      foodPartner: partners[1]._id,
      items: [
        { food: reels[10]._id, name: reels[10].name, thumbnail: reels[10].thumbnail, price: reels[10].price, quantity: 2, dietType: reels[10].dietType },
      ],
      itemTotal: reels[10].price * 2,
      deliveryFee: 39,
      taxes: Math.round(reels[10].price * 2 * 0.05),
      totalAmount: reels[10].price * 2 + 39 + Math.round(reels[10].price * 2 * 0.05),
      deliveryAddress: 'Boring Road, Patna, Bihar - 800001',
      paymentMethod: 'UPI',
      status: 'Delivered',
      estimatedMinutes: 0,
      statusHistory: [
        { status: 'Order Placed', timestamp: new Date(now - 26 * 3600000), note: 'Order confirmed' },
        { status: 'Preparing', timestamp: new Date(now - 25.8 * 3600000), note: 'Preparing food' },
        { status: 'Out for Delivery', timestamp: new Date(now - 25.5 * 3600000), note: 'Picked up by rider' },
        { status: 'Delivered', timestamp: new Date(now - 25.2 * 3600000), note: 'Delivered safely' },
      ],
    },
  ]);

  console.log('\nCraveScroll demo data seeded successfully!');
  console.log('-----------------------------------------');
  console.log(`Seeded: ${users.length} users, ${partners.length} food partners, ${reels.length} reels`);
  console.log(`Videos served locally from: ${BASE_URL}/demo-videos/reel-1.mp4 .. reel-6.mp4`);
  console.log('Demo accounts seeded using SEED_DEMO_PASSWORD from your local .env.\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
