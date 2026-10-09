// Mock data for the Owner/Manager prototype UI.
// Mirrors the tables in CUCCU_POS_Master_Organized.sql; replaced by Supabase queries later.

export type Role = "Owner" | "Manager" | "Cashier";

export interface Sale {
  orderNo: string;
  items: number;
  cashier: string;
  time: string;
  method: "GCash" | "Maya" | "Bank Transfer" | "QR Ph" | "Cash";
  total: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: "Coffee" | "Milk Tea" | "Frappe" | "Others";
  description: string;
  inStock: boolean;
  recipe: { ingredient: string; deduction: string }[];
  preparation: string[];
}

export interface StockItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  reorderAt: number;
  unitCost: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  updated: string;
}

export interface Payment {
  orderNo: string;
  amount: number;
  method: "GCash" | "Maya" | "Bank Transfer" | "QR Ph";
  ref: string;
  status: "Pending" | "Verified" | "Rejected";
}

export interface StaffUser {
  name: string;
  email: string;
  role: Role;
}

export interface Alert {
  item: string;
  detail: string;
  level: "Low Stock" | "Out of Stock";
  time: string;
}

export const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const dashboard = {
  todaySales: 4286.4,
  cogs: 1184.72,
  lowStock: 4,
  totalOrders: 4,
  totalOrdersDelta: 33,
  itemsSold: 12,
  itemsSoldDelta: 20,
  avgOrderValue: 1071.6,
  avgOrderDelta: 9,
};

export const recentSales: Sale[] = [
  { orderNo: "1007", items: 3, cashier: "Rez", time: "2:14 PM", method: "GCash", total: 285 },
  { orderNo: "1006", items: 2, cashier: "Sean", time: "1:48 PM", method: "Maya", total: 190 },
  { orderNo: "1005", items: 4, cashier: "Rez", time: "12:05 PM", method: "Cash", total: 390 },
  { orderNo: "1004", items: 1, cashier: "Lenard", time: "11:32 AM", method: "QR Ph", total: 110 },
  { orderNo: "1003", items: 5, cashier: "Sean", time: "10:57 AM", method: "Bank Transfer", total: 512.4 },
  { orderNo: "1002", items: 2, cashier: "Rez", time: "10:12 AM", method: "GCash", total: 175 },
];

export const menuItems: MenuItem[] = [
  {
    id: "iced-americano",
    name: "Iced Americano",
    price: 80,
    category: "Coffee",
    description: "Pure espresso with chilled water.",
    inStock: true,
    recipe: [
      { ingredient: "Espresso Shot", deduction: "-1 portion" },
      { ingredient: "Water", deduction: "-1 portion" },
      { ingredient: "Ice", deduction: "-1 cup" },
    ],
    preparation: [
      "Brew a shot of espresso.",
      "Add ice to a cup.",
      "Pour the espresso over the ice.",
      "Stir and serve.",
    ],
  },
  {
    id: "classic-milk-tea",
    name: "Classic Milk Tea",
    price: 95,
    category: "Milk Tea",
    description: "Smooth and creamy milk tea.",
    inStock: true,
    recipe: [
      { ingredient: "Black Tea", deduction: "-1 portion" },
      { ingredient: "Milk", deduction: "-150 ml" },
      { ingredient: "Tapioca Pearls", deduction: "-2 scoops" },
    ],
    preparation: ["Brew black tea.", "Mix with milk and sugar.", "Add pearls.", "Serve chilled."],
  },
  {
    id: "java-chip-frappe",
    name: "Java Chip Frappe",
    price: 110,
    category: "Frappe",
    description: "Blended coffee with chocolate chips.",
    inStock: true,
    recipe: [
      { ingredient: "Espresso Shot", deduction: "-2 portions" },
      { ingredient: "Chocolate Chips", deduction: "-30 g" },
      { ingredient: "Ice", deduction: "-1 cup" },
    ],
    preparation: ["Brew double espresso.", "Blend with ice and chips.", "Top with whipped cream."],
  },
  {
    id: "spanish-latte",
    name: "Spanish Latte",
    price: 100,
    category: "Coffee",
    description: "Espresso with condensed milk.",
    inStock: true,
    recipe: [
      { ingredient: "Espresso Shot", deduction: "-1 portion" },
      { ingredient: "Condensed Milk", deduction: "-20 ml" },
      { ingredient: "Fresh Milk", deduction: "-150 ml" },
    ],
    preparation: ["Brew espresso.", "Stir in condensed milk.", "Add steamed milk."],
  },
  {
    id: "wintermelon-milk-tea",
    name: "Wintermelon Milk Tea",
    price: 95,
    category: "Milk Tea",
    description: "Refreshing wintermelon flavor.",
    inStock: true,
    recipe: [
      { ingredient: "Wintermelon Syrup", deduction: "-30 ml" },
      { ingredient: "Milk", deduction: "-150 ml" },
      { ingredient: "Tapioca Pearls", deduction: "-2 scoops" },
    ],
    preparation: ["Mix syrup with tea.", "Add milk and ice.", "Top with pearls."],
  },
  {
    id: "caramel-frappe",
    name: "Caramel Frappe",
    price: 110,
    category: "Frappe",
    description: "Rich caramel flavor with whipped cream.",
    inStock: false,
    recipe: [
      { ingredient: "Espresso Shot", deduction: "-1 portion" },
      { ingredient: "Caramel Syrup", deduction: "-25 ml" },
      { ingredient: "Ice", deduction: "-1 cup" },
    ],
    preparation: ["Blend espresso with ice.", "Add caramel drizzle.", "Top with whipped cream."],
  },
  {
    id: "matcha-milk-tea",
    name: "Matcha Milk Tea",
    price: 105,
    category: "Milk Tea",
    description: "Premium matcha with fresh milk.",
    inStock: true,
    recipe: [
      { ingredient: "Matcha Powder", deduction: "-10 g" },
      { ingredient: "Fresh Milk", deduction: "-150 ml" },
      { ingredient: "Sugar Syrup", deduction: "-15 ml" },
    ],
    preparation: ["Whisk matcha.", "Add milk and syrup.", "Serve over ice."],
  },
  {
    id: "cookies-cream-frappe",
    name: "Cookies & Cream Frappe",
    price: 115,
    category: "Frappe",
    description: "Blended cookies and cream goodness.",
    inStock: true,
    recipe: [
      { ingredient: "Crushed Cookies", deduction: "-40 g" },
      { ingredient: "Fresh Milk", deduction: "-150 ml" },
      { ingredient: "Ice", deduction: "-1 cup" },
    ],
    preparation: ["Blend cookies with milk.", "Add ice and blend.", "Garnish with cookie crumbs."],
  },
  {
    id: "taro-milk-tea",
    name: "Taro Milk Tea",
    price: 95,
    category: "Others",
    description: "Creamy taro with a nutty finish.",
    inStock: true,
    recipe: [
      { ingredient: "Taro Powder", deduction: "-25 g" },
      { ingredient: "Milk", deduction: "-150 ml" },
    ],
    preparation: ["Dissolve taro powder.", "Mix with milk.", "Serve chilled."],
  },
];

export const stockItems: StockItem[] = [
  { id: "STK-001", name: "Espresso Beans", category: "Coffee", stock: 12, unit: "kg", reorderAt: 5, unitCost: 850, status: "In Stock", updated: "Today 9:02 AM" },
  { id: "STK-002", name: "Fresh Milk", category: "Dairy", stock: 8, unit: "L", reorderAt: 10, unitCost: 95, status: "Low Stock", updated: "Today 8:47 AM" },
  { id: "STK-003", name: "Tapioca Pearls", category: "Toppings", stock: 0, unit: "kg", reorderAt: 3, unitCost: 120, status: "Out of Stock", updated: "Yesterday" },
  { id: "STK-004", name: "Chocolate Chips", category: "Toppings", stock: 6, unit: "kg", reorderAt: 2, unitCost: 320, status: "In Stock", updated: "Today 9:15 AM" },
  { id: "STK-005", name: "Caramel Syrup", category: "Syrups", stock: 2, unit: "bottles", reorderAt: 4, unitCost: 280, status: "Low Stock", updated: "Today 7:58 AM" },
  { id: "STK-006", name: "Matcha Powder", category: "Tea", stock: 4, unit: "packs", reorderAt: 2, unitCost: 450, status: "In Stock", updated: "Yesterday" },
  { id: "STK-007", name: "Wintermelon Syrup", category: "Syrups", stock: 1, unit: "bottles", reorderAt: 3, unitCost: 260, status: "Low Stock", updated: "Today 8:12 AM" },
  { id: "STK-008", name: "Paper Cups 12oz", category: "Packaging", stock: 480, unit: "pcs", reorderAt: 200, unitCost: 4, status: "In Stock", updated: "Today 9:30 AM" },
];

export const payments: Payment[] = [
  { orderNo: "1001", amount: 345.5, method: "GCash", ref: "801923481", status: "Pending" },
  { orderNo: "1002", amount: 180.0, method: "Maya", ref: "912830491", status: "Verified" },
  { orderNo: "1003", amount: 520.0, method: "Bank Transfer", ref: "001928340", status: "Rejected" },
  { orderNo: "1004", amount: 125.5, method: "GCash", ref: "772391023", status: "Verified" },
  { orderNo: "1005", amount: 278.0, method: "QR Ph", ref: "110293849", status: "Pending" },
  { orderNo: "1006", amount: 450.0, method: "Maya", ref: "883920194", status: "Verified" },
  { orderNo: "1007", amount: 632.0, method: "GCash", ref: "554920193", status: "Rejected" },
];

export const staff: StaffUser[] = [
  { name: "Clark Alimorong", email: "Clark_@gmail.com", role: "Manager" },
  { name: "Gian Baldovino", email: "Boss_gian@gmail.com", role: "Owner" },
  { name: "Reziah Calayag", email: "Reziah@gmail.com", role: "Owner" },
  { name: "Sean Villangca", email: "Sean@gmail.com", role: "Manager" },
  { name: "Lenard Montoya", email: "Leyy@gmail.com", role: "Manager" },
  { name: "Alex Cruz", email: "alex.c@gmail.com", role: "Cashier" },
];

export const alerts: Alert[] = [
  { item: "Tapioca Pearls", detail: "Out of stock since yesterday", level: "Out of Stock", time: "2h ago" },
  { item: "Fresh Milk", detail: "8 L left · reorder at 10 L", level: "Low Stock", time: "3h ago" },
  { item: "Wintermelon Syrup", detail: "1 bottle left · reorder at 3", level: "Low Stock", time: "5h ago" },
  { item: "Caramel Syrup", detail: "2 bottles left · reorder at 4", level: "Low Stock", time: "6h ago" },
];

export const activity = [
  "Rez adjusted Fresh Milk (+12 L)",
  "Sean recorded expense: Ice delivery",
  "Order #1007 verified (GCash)",
  "Clark added Cookies & Cream Frappe",
];

export const finance = {
  gross: 4286.4,
  cogs: 1850.0,
  opex: 1251.68,
  net: 1184.72,
};

export const monthlyTrend = [42, 58, 51, 66, 74, 69, 82, 90, 86, 95, 102, 118];
