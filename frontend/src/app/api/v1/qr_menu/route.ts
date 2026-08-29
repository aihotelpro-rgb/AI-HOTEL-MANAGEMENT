import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MENU_ITEMS = [
  {
    id: 1,
    name: "Murgh Malai Tikka & Mint Chutney",
    category: "Starters",
    price: 480.0,
    prep_time: "15-20 min",
    image_url: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600",
    portion_size: "Serves 1-2 (6 pcs)",
    spice_level: "Mild (🌶️)",
    calories: "380 kcal",
    allergens: ["Contains Dairy", "Contains Nuts"],
    description: "Tender chicken morsels marinated in rich cream, cashew paste, green cardamom, roasted in clay tandoor.",
    tags: ["Chef's Special", "Tandoori"]
  },
  {
    id: 2,
    name: "Paneer Tikka Shashlik",
    category: "Starters",
    price: 420.0,
    prep_time: "12-15 min",
    image_url: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600",
    portion_size: "Serves 1-2 (6 pcs)",
    spice_level: "Medium (🌶️🌶️)",
    calories: "340 kcal",
    allergens: ["Contains Dairy", "Jain Available"],
    description: "Cottage cheese cubes marinated in Kashmiri chili and ajwain, skewered with bell peppers and onions.",
    tags: ["Pure Veg", "Tandoori"]
  },
  {
    id: 3,
    name: "Royal Butter Chicken (Murgh Makhani)",
    category: "Indian Mains",
    price: 560.0,
    prep_time: "20-25 min",
    image_url: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600",
    portion_size: "Serves 2-3 (500g)",
    spice_level: "Medium (🌶️🌶️)",
    calories: "520 kcal",
    allergens: ["Contains Dairy", "Contains Nuts"],
    description: "Charcoal-grilled chicken simmered in a velvety tomato, honey, and churned butter gravy with kasuri methi.",
    tags: ["Royal Mughlai", "Mildly Spiced"]
  },
  {
    id: 4,
    name: "Dal Makhani Grand Palace",
    category: "Indian Mains",
    price: 380.0,
    prep_time: "15 min",
    image_url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600",
    portion_size: "Serves 2 (400g)",
    spice_level: "Mild (🌶️)",
    calories: "390 kcal",
    allergens: ["Contains Dairy", "Pure Veg"],
    description: "Slow-cooked black lentils simmered overnight for 24 hours with fresh cream, butter, and mild aromatic spices.",
    tags: ["Pure Veg", "Signature Dish"]
  },
  {
    id: 5,
    name: "Awadhi Dum Gosht Biryani",
    category: "Biryani & Rice",
    price: 640.0,
    prep_time: "20-25 min",
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600",
    portion_size: "Serves 1-2 (Pot)",
    spice_level: "Spicy (🌶️🌶️🌶️)",
    calories: "680 kcal",
    allergens: ["Contains Dairy", "Gluten-Free"],
    description: "Fragrant aged Basmati rice layered with succulent tender mutton, saffron, kewra water, served with Burani Raita.",
    tags: ["Chef's Recommendation", "Aromatic"]
  },
  {
    id: 6,
    name: "Tandoori Garlic & Butter Naan Basket",
    category: "Breads",
    price: 140.0,
    prep_time: "5-8 min",
    image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600",
    portion_size: "3 Assorted Breads",
    spice_level: "Mild (🌶️)",
    calories: "280 kcal",
    allergens: ["Contains Dairy", "Contains Gluten"],
    description: "Assortment of Garlic Naan, Butter Naan, and Laccha Paratha baked fresh in high-heat clay tandoor.",
    tags: ["Fresh from Tandoor"]
  },
  {
    id: 7,
    name: "Gulab Jamun with Kesar Pista Rabdi",
    category: "Desserts",
    price: 240.0,
    prep_time: "5 min",
    image_url: "https://images.unsplash.com/photo-1605197143984-690e2931f24d?w=600",
    portion_size: "Serves 1-2 (2 pcs)",
    spice_level: "Sweet",
    calories: "360 kcal",
    allergens: ["Contains Dairy", "Contains Nuts", "Pure Veg"],
    description: "Golden fried milk dumplings soaked in cardamom saffron syrup, paired with slow-reduced pistachio rabdi.",
    tags: ["Warm & Sweet", "Pure Veg"]
  },
  {
    id: 8,
    name: "Royal Saffron Masala Chai & Cookies",
    category: "Beverages",
    price: 160.0,
    prep_time: "5 min",
    image_url: "https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=600",
    portion_size: "2 Cups (Pot)",
    spice_level: "Aromatic",
    calories: "120 kcal",
    allergens: ["Contains Dairy"],
    description: "Assam black tea brewed with fresh ginger, crushed green cardamom, cinnamon, and Kashmiri saffron.",
    tags: ["Traditional", "Immunity Booster"]
  }
];

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET() {
  return NextResponse.json(MENU_ITEMS, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
