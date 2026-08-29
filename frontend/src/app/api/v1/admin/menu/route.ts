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
