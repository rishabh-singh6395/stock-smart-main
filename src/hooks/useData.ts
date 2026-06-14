import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, storage } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  query, where, orderBy, setDoc, Timestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type {
  Product, ProductInsert, ProductUpdate,
  Profile, ProfileUpdate, EnhancedProfileData,
  SurplusListing, TransferRequest, StockPurchaseRequest,
  CreditEntry, CreditPayment,
  ComboOffer, ComboSale
} from "@/types/database";

function extractPincodeFromAddress(addr?: string) {
  if (!addr) return null;
  const m = String(addr).match(/\b(\d{6})\b/);
  return m ? m[1] : null;
}

// Common query options for faster loads and better error handling
const QUERY_OPTIONS = {
  staleTime: 30_000,       // Cache data for 30 seconds before refetching
  retry: 2,                // Retry failed queries twice
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
};

// Handle Firestore errors
function handleFirestoreError(error: any): never {
  console.error('Firestore error:', error);

  // Check for missing index error (status 400)
  if (error.code === 'failed-precondition' || error.message?.includes('index')) {
    throw new Error('Database query requires an index. Please contact the administrator.');
  }

  // Check for permission denied
  if (error.code === 'permission-denied') {
    throw new Error('You do not have permission to access this data.');
  }

  // Check for network errors
  if (error.code === 'unavailable' || error.message?.includes('network')) {
    throw new Error('Network error. Please check your internet connection.');
  }

  throw error;
}

// Re-export types for backward compatibility
export type { Product, ProductInsert, ProductUpdate, Profile, EnhancedProfileData };
export type { SurplusListing, TransferRequest } from "@/types/database";
export type ProfileInsert = Partial<Profile> & { user_id: string };

export function useProducts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["products", user?.uid],
    queryFn: async () => {
      // Query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, "products"),
        where("user_id", "==", user!.uid)
      );
      const snapshot = await getDocs(q);
      // Sort by created_at in descending order locally
      const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      return products.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

export function useAllProducts() {
  return useQuery({
    queryKey: ["all-products"],
    queryFn: async () => {
      // Query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, "products"),
        where("quantity", ">", 0)
      );
      const snapshot = await getDocs(q);
      // Sort by quantity in descending order locally
      const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      return products.sort((a, b) => b.quantity - a.quantity);
    },
    ...QUERY_OPTIONS,
  });
}

export function useAllShopkeepers() {
  return useQuery({
    queryKey: ["all-shopkeepers"],
    queryFn: async () => {
      // Query without orderBy to avoid potential index issues
      const q = query(collection(db, "profiles"));
      const snapshot = await getDocs(q);
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Profile));
      // Filter shopkeepers and sort by created_at in descending order locally
      return all
        .filter(p => p.role === "shopkeeper" || p.role === null || !p.role)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    ...QUERY_OPTIONS,
  });
}

// Get products for a specific shop by user_id
export function useShopProducts(shopUserId: string) {
  return useQuery({
    queryKey: ["shop-products", shopUserId],
    queryFn: async () => {
      if (!shopUserId) return [];
      const q = query(
        collection(db, "products"),
        where("user_id", "==", shopUserId)
      );
      const snapshot = await getDocs(q);
      const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      // Filter to only show in-stock items and sort by created_at descending
      return products
        .filter(p => p.quantity > 0)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!shopUserId,
    ...QUERY_OPTIONS,
  });
}

export function useAddProduct() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (product: Omit<ProductInsert, "user_id">) => {
      const now = new Date().toISOString();
      const productData = {
        ...product,
        user_id: user!.uid,
        created_at: now,
        updated_at: now,
      };
      const docRef = await addDoc(collection(db, "products"), productData);
      // Return immediately with the data we already have — no need for a second read
      return { id: docRef.id, ...productData } as Product;
    },
    onMutate: async (newProduct) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: ["products", user?.uid] });
      const previousProducts = qc.getQueryData(["products", user?.uid]);
      return { previousProducts };
    },
    onSuccess: (data) => {
      // Optimistically add to cache immediately
      qc.setQueryData(["products", user?.uid], (old: Product[] | undefined) => {
        return old ? [data, ...old] : [data];
      });
      // Background refetch to sync with server
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousProducts) {
        qc.setQueryData(["products", user?.uid], context.previousProducts);
      }
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ProductUpdate & { id: string }) => {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "products", id), {
        ...updates,
        updated_at: now,
      });
      // Return the updates — no need for a second read
      return { id, ...updates, updated_at: now } as Product;
    },
    onSuccess: (data) => {
      // Optimistically update in cache
      qc.setQueriesData({ queryKey: ["products"] }, (old: Product[] | undefined) => {
        if (!old) return old;
        return old.map(p => p.id === data.id ? { ...p, ...data } : p);
      });
      // Background refetch
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Optimistically remove from cache before the Firestore call
      qc.setQueriesData({ queryKey: ["products"] }, (old: Product[] | undefined) => {
        if (!old) return old;
        return old.filter(p => p.id !== id);
      });
      await deleteDoc(doc(db, "products", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useSales() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sales", user?.uid],
    queryFn: async () => {
      // Query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, "sales"),
        where("user_id", "==", user!.uid)
      );
      const snapshot = await getDocs(q);
      // Sort by sale_date in descending order locally
      const sales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return sales.sort((a: any, b: any) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

export function useAddSale() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ productName, quantityToSell, total }: { productName: string, quantityToSell: number, total: number }) => {
      // 1. Fetch available batches - use simple query without composite index
      const q = query(
        collection(db, "products"),
        where("name", "==", productName),
        where("user_id", "==", user!.uid)
      );
      const snapshot = await getDocs(q);
      // Filter for available stock and sort by expiry date locally for FIFO
      const allBatches = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      const batches = allBatches
        .filter(b => b.quantity > 0)
        .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

      let remaining = quantityToSell;

      // 2. Reduce stock FIFO
      for (const batch of batches) {
        if (remaining <= 0) break;
        const deduct = Math.min(batch.quantity, remaining);
        await updateDoc(doc(db, "products", batch.id), {
          quantity: batch.quantity - deduct,
        });
        remaining -= deduct;
      }

      if (remaining > 0) {
        throw new Error(`Not enough stock. Missing ${remaining} items for ${productName}`);
      }

      // 3. Insert sale record
      await addDoc(collection(db, "sales"), {
        user_id: user!.uid,
        product_name: productName,
        quantity: quantityToSell,
        total: total,
        sale_date: new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
    }
  });
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.uid],
    queryFn: async () => {
      const q = query(
        collection(db, "profiles"),
        where("user_id", "==", user!.uid)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const d = snapshot.docs[0];
      return { id: d.id, ...d.data() } as Profile;
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

export function useMarketplaceListings() {
  return useQuery({
    queryKey: ["marketplace-listings"],
    queryFn: async () => {
      // Query without orderBy to avoid potential index issues
      const q = query(collection(db, "products"));
      const snapshot = await getDocs(q);
      // Sort by created_at in descending order locally
      const products = snapshot.docs.map(d => {
        const prod = { id: d.id, ...d.data() } as any;
        return {
          ...prod,
          shop_name: prod.shop_name || "Local Shop",
          contact_phone: prod.contact_phone || null,
          owner_name: prod.owner_name || null,
          shop_address: prod.shop_address || null,
          shop_pincode: prod.shop_pincode || null,
        };
      });
      return products.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    ...QUERY_OPTIONS,
  });
}

export function useUpsertProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (profile: EnhancedProfileData) => {
      if (!user) throw new Error("User not authenticated");

      // Build payload with only defined values
      const payload: Record<string, unknown> = {};

      // Only include defined values in the payload
      if (profile.owner_name !== undefined) payload.owner_name = profile.owner_name;
      if (profile.phone !== undefined) payload.phone = profile.phone;
      if (profile.email !== undefined) payload.email = profile.email;
      if (profile.shop_name !== undefined) payload.shop_name = profile.shop_name;
      if (profile.address !== undefined) payload.address = profile.address;
      if (profile.pincode !== undefined) payload.pincode = profile.pincode;
      if (profile.profile_picture_url !== undefined) payload.profile_picture_url = profile.profile_picture_url;
      if (profile.custom_fields !== undefined) payload.custom_fields = profile.custom_fields;
      if (profile.date_of_birth !== undefined) payload.date_of_birth = profile.date_of_birth;
      if (profile.gender !== undefined) payload.gender = profile.gender;
      if (profile.is_active !== undefined) payload.is_active = profile.is_active;
      if (profile.role !== undefined) payload.role = profile.role;
      if (profile.latitude !== undefined) payload.latitude = profile.latitude;
      if (profile.longitude !== undefined) payload.longitude = profile.longitude;

      // Auto-infer pincode from address when not explicitly provided
      if ((!payload.pincode || payload.pincode === null) && payload.address) {
        const inferred = extractPincodeFromAddress(payload.address as string);
        if (inferred) payload.pincode = inferred;
      }

      payload.user_id = user.uid;
      payload.updated_at = new Date().toISOString();

      // Check if profile already exists
      const q = query(
        collection(db, "profiles"),
        where("user_id", "==", user.uid)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Create new profile
        payload.created_at = new Date().toISOString();
        payload.is_active = true;
        const docRef = await addDoc(collection(db, "profiles"), payload);
        const newDoc = await getDoc(docRef);
        return { id: newDoc.id, ...newDoc.data() } as Profile;
      } else {
        // Update existing profile - only update fields that are in payload
        const existingDoc = snapshot.docs[0];
        await updateDoc(doc(db, "profiles", existingDoc.id), payload);
        const updated = await getDoc(doc(db, "profiles", existingDoc.id));
        return { id: updated.id, ...updated.data() } as Profile;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

/**
 * Upload a profile picture to Firebase Storage
 * Returns the public URL of the uploaded image
 */
export async function uploadProfilePicture(
  userId: string,
  file: File
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}

/**
 * Hook for uploading profile picture with loading state
 */
export function useUploadProfilePicture() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("User not authenticated");
      return uploadProfilePicture(user.uid, file);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

// ============ Shop-to-Shop Stock Transfer Hooks ============

/**
 * Get all surplus listings from other shops (excluding current user's)
 */
export function useSurplusListings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["surplus-listings"],
    queryFn: async () => {
      const q = query(
        collection(db, "surplus_listings"),
        where("is_active", "==", true)
      );
      const snapshot = await getDocs(q);
      const listings = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as SurplusListing))
        .filter(l => l.shop_user_id !== user?.uid)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return listings;
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Get my surplus listings
 */
export function useMySurplusListings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-surplus-listings", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(
        collection(db, "surplus_listings"),
        where("shop_user_id", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const listings = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as SurplusListing))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return listings;
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Get incoming transfer requests (requests sent TO my shop)
 */
export function useIncomingTransferRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["incoming-transfer-requests", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(
        collection(db, "transfer_requests"),
        where("supplier_shop_user_id", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as TransferRequest))
        .sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Get my outgoing transfer requests (requests I sent TO other shops)
 */
export function useMyTransferRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-transfer-requests", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(
        collection(db, "transfer_requests"),
        where("requester_shop_user_id", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as TransferRequest))
        .sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Add a new surplus listing
 */
export function useAddSurplusListing() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (listing: Omit<SurplusListing, "id" | "shop_user_id" | "shop_name" | "created_at" | "updated_at">) => {
      if (!user || !profile) throw new Error("User not authenticated");

      const now = new Date().toISOString();
      const data = {
        ...listing,
        shop_user_id: user.uid,
        shop_name: profile.shop_name || profile.owner_name || "My Shop",
        created_at: now,
        updated_at: now,
      };

      const docRef = await addDoc(collection(db, "surplus_listings"), data);
      return { id: docRef.id, ...data } as SurplusListing;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["surplus-listings"] });
      qc.invalidateQueries({ queryKey: ["my-surplus-listings"] });
    },
  });
}

/**
 * Update a surplus listing
 */
export function useUpdateSurplusListing() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SurplusListing> & { id: string }) => {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "surplus_listings", id), {
        ...updates,
        updated_at: now,
      });
      return { id, ...updates };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["surplus-listings"] });
      qc.invalidateQueries({ queryKey: ["my-surplus-listings"] });
    },
  });
}

/**
 * Delete a surplus listing
 */
export function useDeleteSurplusListing() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "surplus_listings", id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["surplus-listings"] });
      qc.invalidateQueries({ queryKey: ["my-surplus-listings"] });
    },
  });
}

/**
 * Create a transfer request
 */
export function useCreateTransferRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (request: {
      surplus_listing_id: string;
      requested_quantity: number;
      notes?: string;
    }) => {
      if (!user || !profile) throw new Error("User not authenticated");

      const listingDoc = await getDoc(doc(db, "surplus_listings", request.surplus_listing_id));
      const listing = listingDoc.data() as SurplusListing;

      const now = new Date().toISOString();
      const data = {
        requester_shop_user_id: user.uid,
        requester_shop_name: profile.shop_name || profile.owner_name || "My Shop",
        supplier_shop_user_id: listing.shop_user_id,
        supplier_shop_name: listing.shop_name,
        product_id: listing.product_id,
        product_name: listing.product_name,
        product_category: listing.product_category,
        requested_quantity: request.requested_quantity,
        status: "pending" as const,
        request_date: now,
        updated_at: now,
        notes: request.notes || "",
      };

      const docRef = await addDoc(collection(db, "transfer_requests"), data);
      return { id: docRef.id, ...data } as TransferRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-transfer-requests"] });
      qc.invalidateQueries({ queryKey: ["incoming-transfer-requests"] });
    },
  });
}

/**
 * Update transfer request status (approve/reject)
 */
export function useUpdateTransferRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: TransferRequest["status"]; notes?: string }) => {
      const now = new Date().toISOString();
      const updateData: any = { status, updated_at: now };
      if (notes !== undefined) updateData.notes = notes;

      await updateDoc(doc(db, "transfer_requests", id), updateData);
      return { id, status };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-transfer-requests"] });
      qc.invalidateQueries({ queryKey: ["incoming-transfer-requests"] });
    },
  });
}

/**
 * Get my stock purchase requests (sent to other shops)
 */
export function useMyStockRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-stock-requests", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(collection(db, "stock_purchase_requests"), where("from_shop_user_id", "==", user.uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockPurchaseRequest)).sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Get incoming stock purchase requests (received from other shops)
 */
export function useIncomingStockRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["incoming-stock-requests", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(collection(db, "stock_purchase_requests"), where("to_shop_user_id", "==", user.uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockPurchaseRequest)).sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Create a stock purchase request
 */
export function useCreateStockPurchaseRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (request: { to_shop: any; product_id: string; product_name: string; product_category: string; quantity: number; proposed_price: number; notes?: string }) => {
      if (!user || !profile) throw new Error("User not authenticated");
      const now = new Date().toISOString();
      const data = {
        from_shop_user_id: user.uid,
        from_shop_name: profile.shop_name || profile.owner_name || "My Shop",
        to_shop_user_id: request.to_shop.user_id,
        to_shop_name: request.to_shop.shop_name || request.to_shop.owner_name || "Shop",
        product_id: request.product_id,
        product_name: request.product_name,
        product_category: request.product_category,
        quantity: request.quantity,
        proposed_price: request.proposed_price,
        status: "pending" as const,
        notes: request.notes || "",
        request_date: now,
        updated_at: now,
      };
      const docRef = await addDoc(collection(db, "stock_purchase_requests"), data);
      return { id: docRef.id, ...data } as StockPurchaseRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-stock-requests"] });
      qc.invalidateQueries({ queryKey: ["incoming-stock-requests"] });
    },
  });
}

/**
 * Update stock purchase request status
 */
export function useUpdateStockRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: StockPurchaseRequest["status"]; notes?: string }) => {
      const now = new Date().toISOString();
      const updateData: any = { status, updated_at: now };
      if (notes !== undefined) updateData.notes = notes;
      await updateDoc(doc(db, "stock_purchase_requests", id), updateData);
      return { id, status };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-stock-requests"] });
      qc.invalidateQueries({ queryKey: ["incoming-stock-requests"] });
    },
  });
}

// ============ Digital Credit Book (Udhaar System) Hooks ============

/**
 * Get all credit entries for the current user
 */
export function useCreditEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["credit-entries", user?.uid],
    queryFn: async () => {
      const q = query(
        collection(db, "credit_entries"),
        where("user_id", "==", user!.uid)
      );
      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CreditEntry));
      return entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Add a new credit entry
 */
export function useAddCreditEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entry: Omit<CreditEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const data = {
        ...entry,
        user_id: user!.uid,
        created_at: now,
        updated_at: now,
      };
      const docRef = await addDoc(collection(db, "credit_entries"), data);
      return { id: docRef.id, ...data } as CreditEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-entries"] });
    },
  });
}

/**
 * Update a credit entry (e.g., mark as paid, update amounts)
 */
export function useUpdateCreditEntry() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreditEntry> & { id: string }) => {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "credit_entries", id), {
        ...updates,
        updated_at: now,
      });
      return { id, ...updates, updated_at: now } as CreditEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-entries"] });
    },
  });
}

/**
 * Get all payments for a specific credit entry
 */
export function useCreditPayments(creditId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["credit-payments", creditId],
    queryFn: async () => {
      const q = query(
        collection(db, "credit_payments"),
        where("credit_id", "==", creditId),
        where("user_id", "==", user!.uid)
      );
      const snapshot = await getDocs(q);
      const payments = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CreditPayment));
      return payments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user && !!creditId,
    ...QUERY_OPTIONS,
  });
}

/**
 * Add a payment to a credit entry and auto-update the credit status
 */
export function useAddCreditPayment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ creditId, amount, notes }: { creditId: string; amount: number; notes?: string }) => {
      const now = new Date().toISOString();

      // 1. Add payment record
      const paymentData = {
        credit_id: creditId,
        user_id: user!.uid,
        amount,
        payment_date: now.split("T")[0],
        notes: notes || "",
        created_at: now,
      };
      await addDoc(collection(db, "credit_payments"), paymentData);

      // 2. Update credit entry
      const creditDoc = await getDoc(doc(db, "credit_entries", creditId));
      if (!creditDoc.exists()) throw new Error("Credit entry not found");

      const credit = creditDoc.data() as CreditEntry;
      const newPaidAmount = credit.paid_amount + amount;
      const newDueAmount = credit.total_amount - newPaidAmount;
      let newStatus: CreditEntry['payment_status'] = 'partially_paid';
      if (newDueAmount <= 0) newStatus = 'paid';
      else if (newPaidAmount === 0) newStatus = 'pending';

      await updateDoc(doc(db, "credit_entries", creditId), {
        paid_amount: newPaidAmount,
        due_amount: Math.max(0, newDueAmount),
        payment_status: newStatus,
        updated_at: now,
      });

      return { creditId, amount, newPaidAmount, newDueAmount: Math.max(0, newDueAmount), newStatus };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-entries"] });
      qc.invalidateQueries({ queryKey: ["credit-payments"] });
    },
  });
}

/**
 * Record a sale as credit (udhaar): creates the sale + FIFO stock deduction + credit entry
 */
export function useAddCreditSale() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      productName,
      quantityToSell,
      total,
      customerName,
      customerPhone,
      amountPaid,
      dueDate,
      notes,
    }: {
      productName: string;
      quantityToSell: number;
      total: number;
      customerName: string;
      customerPhone: string;
      amountPaid: number;
      dueDate: string;
      notes: string;
    }) => {
      // 1. FIFO stock reduction (same logic as useAddSale)
      const q = query(
        collection(db, "products"),
        where("name", "==", productName),
        where("user_id", "==", user!.uid)
      );
      const snapshot = await getDocs(q);
      const allBatches = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      const batches = allBatches
        .filter(b => b.quantity > 0)
        .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

      let remaining = quantityToSell;
      for (const batch of batches) {
        if (remaining <= 0) break;
        const deduct = Math.min(batch.quantity, remaining);
        await updateDoc(doc(db, "products", batch.id), {
          quantity: batch.quantity - deduct,
        });
        remaining -= deduct;
      }

      if (remaining > 0) {
        throw new Error(`Not enough stock. Missing ${remaining} items for ${productName}`);
      }

      const now = new Date().toISOString();

      // 2. Record sale
      await addDoc(collection(db, "sales"), {
        user_id: user!.uid,
        product_name: productName,
        quantity: quantityToSell,
        total: total,
        sale_date: now.split("T")[0],
        created_at: now,
        payment_type: "credit",
      });

      // 3. Create credit entry
      const dueAmount = total - amountPaid;
      let paymentStatus: CreditEntry['payment_status'] = 'pending';
      if (dueAmount <= 0) paymentStatus = 'paid';
      else if (amountPaid > 0) paymentStatus = 'partially_paid';

      const creditData = {
        user_id: user!.uid,
        customer_name: customerName,
        customer_phone: customerPhone,
        items: `${productName} x${quantityToSell}`,
        total_amount: total,
        paid_amount: amountPaid,
        due_amount: Math.max(0, dueAmount),
        credit_date: now.split("T")[0],
        due_date: dueDate,
        payment_status: paymentStatus,
        notes: notes || "",
        created_at: now,
        updated_at: now,
      };
      const creditRef = await addDoc(collection(db, "credit_entries"), creditData);

      // 4. If partial payment was made, record it
      if (amountPaid > 0) {
        await addDoc(collection(db, "credit_payments"), {
          credit_id: creditRef.id,
          user_id: user!.uid,
          amount: amountPaid,
          payment_date: now.split("T")[0],
          notes: "Initial payment at time of sale",
          created_at: now,
        });
      }

      return { id: creditRef.id, ...creditData } as CreditEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["credit-entries"] });
      qc.invalidateQueries({ queryKey: ["credit-payments"] });
    },
  });
}

// ============ AI-Based Combo Offer Hooks ============

/**
 * Get all combo offers for the current user
 */
export function useComboOffers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["combo-offers", user?.uid],
    queryFn: async () => {
      const q = query(
        collection(db, "combo_offers"),
        where("user_id", "==", user!.uid)
      );
      const snapshot = await getDocs(q);
      const offers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ComboOffer));
      return offers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Get all combo sales for the current user
 */
export function useComboSales() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["combo-sales", user?.uid],
    queryFn: async () => {
      const q = query(
        collection(db, "combo_sales"),
        where("user_id", "==", user!.uid)
      );
      const snapshot = await getDocs(q);
      const sales = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ComboSale));
      return sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Add a new combo offer
 */
export function useAddComboOffer() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (offer: Omit<ComboOffer, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const data = { ...offer, user_id: user!.uid, created_at: now, updated_at: now };
      const docRef = await addDoc(collection(db, "combo_offers"), data);
      return { id: docRef.id, ...data } as ComboOffer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["combo-offers"] });
    },
  });
}

/**
 * Update a combo offer (activate, deactivate, edit)
 */
export function useUpdateComboOffer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ComboOffer> & { id: string }) => {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "combo_offers", id), { ...updates, updated_at: now });
      return { id, ...updates, updated_at: now } as ComboOffer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["combo-offers"] });
    },
  });
}

/**
 * Delete a combo offer
 */
export function useDeleteComboOffer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "combo_offers", id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["combo-offers"] });
    },
  });
}

/**
 * Sell a combo: FIFO stock deduction for each product + record combo sale
 */
export function useSellCombo() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (combo: ComboOffer) => {
      const productNames = [combo.product1_name, combo.product2_name];
      if (combo.product3_name) productNames.push(combo.product3_name);

      // FIFO stock deduction for each product (1 unit each)
      for (const productName of productNames) {
        const q = query(
          collection(db, "products"),
          where("name", "==", productName),
          where("user_id", "==", user!.uid)
        );
        const snapshot = await getDocs(q);
        const batches = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(b => b.quantity > 0)
          .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

        if (batches.length === 0 || batches[0].quantity < 1) {
          throw new Error(`Not enough stock for "${productName}". Combo sale cancelled.`);
        }
        await updateDoc(doc(db, "products", batches[0].id), {
          quantity: batches[0].quantity - 1,
        });
      }

      const now = new Date().toISOString();

      // Record combo sale
      const saleData = {
        user_id: user!.uid,
        combo_id: combo.id,
        combo_name: combo.combo_name,
        products_sold: productNames.join(", "),
        combo_price: combo.combo_price,
        original_price: combo.original_total_price,
        discount_amount: combo.original_total_price - combo.combo_price,
        sale_date: now.split("T")[0],
        created_at: now,
      };
      const docRef = await addDoc(collection(db, "combo_sales"), saleData);

      // Also record in main sales collection
      await addDoc(collection(db, "sales"), {
        user_id: user!.uid,
        product_name: `[COMBO] ${combo.combo_name}`,
        quantity: productNames.length,
        total: combo.combo_price,
        sale_date: now.split("T")[0],
        created_at: now,
        payment_type: "paid",
      });

      return { id: docRef.id, ...saleData } as ComboSale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["combo-offers"] });
      qc.invalidateQueries({ queryKey: ["combo-sales"] });
    },
  });
}
