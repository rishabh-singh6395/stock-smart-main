// Firebase-compatible type definitions (replaces Supabase types)

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  expiry_date: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  // Marketplace denormalized fields
  shop_name?: string;
  contact_phone?: string;
  owner_name?: string;
  shop_address?: string;
  shop_pincode?: string;
}

export type ProductInsert = Omit<Product, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProductUpdate = Partial<Product>;

export interface Profile {
  id: string;
  user_id: string;
  owner_name: string;
  shop_name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  pincode: string | null;
  profile_picture_url: string | null;
  custom_fields: Record<string, unknown> | null;
  date_of_birth: string | null;
  gender: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  latitude?: number;
  longitude?: number;
}

export type ProfileInsert = Omit<Profile, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProfileUpdate = Partial<Profile>;

export interface Sale {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  total: number;
  sale_date: string;
  created_at: string;
}

export type SaleInsert = Omit<Sale, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type SaleUpdate = Partial<Sale>;

export interface EnhancedProfileData {
  owner_name?: string;
  phone?: string | null;
  email?: string | null;
  shop_name?: string;
  address?: string | null;
  pincode?: string | null;
  profile_picture_url?: string | null;
  custom_fields?: Record<string, unknown> | null;
  date_of_birth?: string | null;
  gender?: string | null;
  is_active?: boolean;
  role?: string | null;
  latitude?: number;
  longitude?: number;
}

// Shop-to-Shop Stock Transfer Types
export interface SurplusListing {
  id: string;
  shop_user_id: string;
  shop_name: string;
  product_id: string;
  product_name: string;
  product_category: string;
  quantity_available: number;
  unit_price: number;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransferRequest {
  id: string;
  requester_shop_user_id: string;
  requester_shop_name: string;
  supplier_shop_user_id: string;
  supplier_shop_name: string;
  product_id: string;
  product_name: string;
  product_category: string;
  requested_quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  request_date: string;
  updated_at: string;
  notes: string;
}

export type SurplusListingInsert = Omit<SurplusListing, 'id' | 'created_at' | 'updated_at'>;
export type SurplusListingUpdate = Partial<SurplusListing>;

export type TransferRequestInsert = Omit<TransferRequest, 'id' | 'updated_at'>;
export type TransferRequestUpdate = Partial<TransferRequest>;

// Stock Purchase Request (from Shop Network page)
export interface StockPurchaseRequest {
  id: string;
  from_shop_user_id: string;
  from_shop_name: string;
  to_shop_user_id: string;
  to_shop_name: string;
  product_id: string;
  product_name: string;
  product_category: string;
  quantity: number;
  proposed_price: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  notes: string;
  request_date: string;
  updated_at: string;
}

export type StockPurchaseRequestInsert = Omit<StockPurchaseRequest, 'id' | 'updated_at'>;
export type StockPurchaseRequestUpdate = Partial<StockPurchaseRequest>;

// Digital Credit Book (Udhaar System)
export interface CreditEntry {
  id: string;
  user_id: string;
  customer_name: string;
  customer_phone: string;
  items: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  credit_date: string;
  due_date: string;
  payment_status: 'pending' | 'partially_paid' | 'paid';
  notes: string;
  created_at: string;
  updated_at: string;
}

export type CreditEntryInsert = Omit<CreditEntry, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type CreditEntryUpdate = Partial<CreditEntry>;

export interface CreditPayment {
  id: string;
  credit_id: string;
  user_id: string;
  amount: number;
  payment_date: string;
  notes: string;
  created_at: string;
}

export type CreditPaymentInsert = Omit<CreditPayment, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// AI-Based Combo Offer System
export interface ComboOffer {
  id: string;
  user_id: string;
  combo_name: string;
  product1_name: string;
  product2_name: string;
  product3_name: string; // empty string if no 3rd product
  original_total_price: number;
  combo_price: number;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive' | 'expired';
  suggestion_reason: string; // AI reason (e.g. "Near expiry + Fast seller")
  created_at: string;
  updated_at: string;
}

export type ComboOfferInsert = Omit<ComboOffer, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ComboOfferUpdate = Partial<ComboOffer>;

export interface ComboSale {
  id: string;
  user_id: string;
  combo_id: string;
  combo_name: string;
  products_sold: string; // comma-separated product names
  combo_price: number;
  original_price: number;
  discount_amount: number;
  sale_date: string;
  created_at: string;
}

export type ComboSaleInsert = Omit<ComboSale, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
