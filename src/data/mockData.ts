export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  expiryDate: string;
  shop: string;
}

export interface Sale {
  id: string;
  productName: string;
  quantity: number;
  total: number;
  date: string;
}

export const categories = ["Dairy", "Snacks", "Beverages", "Grains", "Personal Care", "Household"];

export const mockProducts: Product[] = [
  { id: "1", name: "Amul Milk 1L", category: "Dairy", price: 60, quantity: 45, expiryDate: "2026-03-15", shop: "Fresh Mart" },
  { id: "2", name: "Parle-G Biscuits", category: "Snacks", price: 10, quantity: 200, expiryDate: "2026-08-20", shop: "Fresh Mart" },
  { id: "3", name: "Tata Tea 500g", category: "Beverages", price: 250, quantity: 30, expiryDate: "2027-01-10", shop: "Fresh Mart" },
  { id: "4", name: "Aashirvaad Atta 5kg", category: "Grains", price: 320, quantity: 15, expiryDate: "2026-06-30", shop: "Fresh Mart" },
  { id: "5", name: "Dove Soap 100g", category: "Personal Care", price: 55, quantity: 80, expiryDate: "2027-12-01", shop: "Fresh Mart" },
  { id: "6", name: "Surf Excel 1kg", category: "Household", price: 195, quantity: 25, expiryDate: "2027-06-15", shop: "Fresh Mart" },
  { id: "7", name: "Coca-Cola 2L", category: "Beverages", price: 90, quantity: 5, expiryDate: "2026-03-12", shop: "Corner Store" },
  { id: "8", name: "Maggi Noodles", category: "Snacks", price: 14, quantity: 150, expiryDate: "2026-11-05", shop: "Corner Store" },
  { id: "9", name: "Dettol Handwash", category: "Personal Care", price: 120, quantity: 0, expiryDate: "2027-03-20", shop: "Corner Store" },
  { id: "10", name: "Mother Dairy Curd", category: "Dairy", price: 30, quantity: 8, expiryDate: "2026-03-11", shop: "Daily Needs" },
];

export const mockSales: Sale[] = [
  { id: "s1", productName: "Amul Milk 1L", quantity: 5, total: 300, date: "2026-03-08" },
  { id: "s2", productName: "Parle-G Biscuits", quantity: 20, total: 200, date: "2026-03-08" },
  { id: "s3", productName: "Tata Tea 500g", quantity: 3, total: 750, date: "2026-03-07" },
  { id: "s4", productName: "Maggi Noodles", quantity: 10, total: 140, date: "2026-03-07" },
  { id: "s5", productName: "Dove Soap 100g", quantity: 8, total: 440, date: "2026-03-06" },
  { id: "s6", productName: "Coca-Cola 2L", quantity: 4, total: 360, date: "2026-03-06" },
];

export const monthlySalesData = [
  { month: "Oct", sales: 12400 },
  { month: "Nov", sales: 15800 },
  { month: "Dec", sales: 21200 },
  { month: "Jan", sales: 17600 },
  { month: "Feb", sales: 19300 },
  { month: "Mar", sales: 14200 },
];

export const categorySalesData = [
  { category: "Dairy", value: 3200 },
  { category: "Snacks", value: 4500 },
  { category: "Beverages", value: 2800 },
  { category: "Grains", value: 1900 },
  { category: "Personal Care", value: 2100 },
  { category: "Household", value: 1500 },
];
