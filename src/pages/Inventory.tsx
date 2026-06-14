import { useState, Fragment, useRef, useEffect } from "react";
import { 
  Plus, Pencil, Trash2, Search, Package, PackageSearch, 
  AlertCircle, ChevronDown, ChevronRight, Layers, 
  Percent, IndianRupee, Calendar, Tag, Edit3, X, 
  Check, Clock, Sparkles, XCircle, Brain, Zap, Lightbulb, TrendingDown, ThumbsUp, ThumbsDown,
  Loader2, ShoppingCart, Weight, ImageIcon, Info, Leaf
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProducts, useAddProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/useData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const categories = ["Dairy", "Snacks", "Beverages", "Grains", "Personal Care", "Household", "Frozen", "Bakery", "Meat", "Fruits & Vegetables", "Condiments", "Canned Goods", "Confectionery", "Baby Care", "Health", "Other"];

// OpenFoodFacts category keywords → local categories mapping
const categoryKeywordMap: Record<string, string> = {
  milk: "Dairy", cheese: "Dairy", yogurt: "Dairy", butter: "Dairy", cream: "Dairy", curd: "Dairy", paneer: "Dairy", ghee: "Dairy", dairy: "Dairy", lait: "Dairy",
  chip: "Snacks", snack: "Snacks", biscuit: "Snacks", cookie: "Snacks", cracker: "Snacks", namkeen: "Snacks", wafer: "Snacks", popcorn: "Snacks", nuts: "Snacks", pretzel: "Snacks",
  juice: "Beverages", drink: "Beverages", water: "Beverages", soda: "Beverages", tea: "Beverages", coffee: "Beverages", beverage: "Beverages", cola: "Beverages", energy: "Beverages", lemonade: "Beverages",
  rice: "Grains", wheat: "Grains", flour: "Grains", cereal: "Grains", oat: "Grains", grain: "Grains", pasta: "Grains", noodle: "Grains", bread: "Bakery", atta: "Grains", dal: "Grains", lentil: "Grains", pulse: "Grains",
  soap: "Personal Care", shampoo: "Personal Care", toothpaste: "Personal Care", lotion: "Personal Care", skincare: "Personal Care", deodorant: "Personal Care", hygiene: "Personal Care", cosmetic: "Personal Care",
  detergent: "Household", cleaner: "Household", tissue: "Household", household: "Household", cleaning: "Household",
  frozen: "Frozen", ice: "Frozen",
  bakery: "Bakery", cake: "Bakery", pastry: "Bakery", muffin: "Bakery",
  meat: "Meat", chicken: "Meat", fish: "Meat", seafood: "Meat", mutton: "Meat", pork: "Meat", beef: "Meat", sausage: "Meat", ham: "Meat",
  fruit: "Fruits & Vegetables", vegetable: "Fruits & Vegetables", salad: "Fruits & Vegetables",
  sauce: "Condiments", ketchup: "Condiments", mayonnaise: "Condiments", mustard: "Condiments", spice: "Condiments", masala: "Condiments", pickle: "Condiments", chutney: "Condiments", vinegar: "Condiments", oil: "Condiments",
  canned: "Canned Goods", can: "Canned Goods", tin: "Canned Goods", preserved: "Canned Goods",
  chocolate: "Confectionery", candy: "Confectionery", sweet: "Confectionery", confectionery: "Confectionery", toffee: "Confectionery", gum: "Confectionery",
  baby: "Baby Care", infant: "Baby Care", diaper: "Baby Care",
  vitamin: "Health", supplement: "Health", medicine: "Health", protein: "Health", health: "Health", ayurvedic: "Health",
};

function mapToLocalCategory(offCategories: string): string {
  const lowerCats = offCategories.toLowerCase();
  for (const [keyword, localCat] of Object.entries(categoryKeywordMap)) {
    if (lowerCats.includes(keyword)) return localCat;
  }
  return "";
}

// Interface for scanned product info display
interface ScannedProductInfo {
  name: string;
  brand: string;
  category: string;
  imageUrl?: string;
  quantity?: string; // e.g. "500g", "1L"
  ingredients?: string;
  nutriscoreGrade?: string;
  novaGroup?: number;
  countries?: string;
  labels?: string;
  packaging?: string;
  allergens?: string;
  nutritionPer100g?: {
    energy?: number;
    fat?: number;
    carbs?: number;
    sugars?: number;
    protein?: number;
    salt?: number;
    fiber?: number;
  };
}

// Extended product type with discount fields (managed locally)
interface ProductWithDiscount {
  id: string;
  user_id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  expiry_date: string;
  created_at: string;
  updated_at: string;
  // Discount fields (stored locally)
  discount_type?: "percentage" | "fixed" | null;
  discount_value?: number;
  discount_start_date?: string;
  discount_end_date?: string;
  // local metadata
  brand?: string;
  barcode?: string;
  batch_details?: string;
}

function getExpiryStatus(expiryDate: string) {
  const diff = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "expired";
  if (diff <= 7) return "critical";
  if (diff <= 30) return "warning";
  return "safe";
}

function isDiscountActive(startDate?: string, endDate?: string): boolean {
  if (!startDate || !endDate) return false;
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  return now >= start && now <= end;
}

function calculateFinalPrice(price: number, discountType?: "percentage" | "fixed" | null, discountValue?: number): number {
  if (!discountType || !discountValue || discountValue <= 0) return price;
  if (discountType === "percentage") {
    return Math.max(0, price - (price * discountValue / 100));
  }
  return Math.max(0, price - discountValue);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// --- AI Discount Suggestion Engine ---
interface AIDiscountSuggestion {
  recommended_type: "percentage" | "fixed";
  recommended_value: number;
  confidence: number;       // 0-100
  reasoning: string;
  urgency: "low" | "medium" | "high" | "critical";
  factors: { label: string; impact: string; icon: "expiry" | "stock" | "value" }[];
}

function generateAIDiscountSuggestion(
  product: any,
  allProducts: any[]
): AIDiscountSuggestion | null {
  if (!product) return null;

  const daysToExpiry = Math.ceil(
    (new Date(product.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const quantity = product.quantity ?? 0;
  const price = product.price ?? 0;

  // Compute average stock for the same category
  const sameCategory = allProducts.filter(p => p.category === product.category);
  const avgStock = sameCategory.length
    ? sameCategory.reduce((s, p) => s + (p.quantity || 0), 0) / sameCategory.length
    : quantity;

  let baseDiscount = 0;
  let confidence = 0;
  let urgency: AIDiscountSuggestion["urgency"] = "low";
  const factors: AIDiscountSuggestion["factors"] = [];
  const reasonParts: string[] = [];

  // --- Factor 1: Expiry-based discount ---
  if (daysToExpiry < 0) {
    // Already expired
    baseDiscount += 50;
    confidence += 40;
    urgency = "critical";
    factors.push({ label: `Expired ${Math.abs(daysToExpiry)} day(s) ago`, impact: "+50%", icon: "expiry" });
    reasonParts.push("Product has expired — heavy clearance discount needed to recover value.");
  } else if (daysToExpiry <= 3) {
    baseDiscount += 40;
    confidence += 35;
    urgency = "critical";
    factors.push({ label: `Expires in ${daysToExpiry} day(s)`, impact: "+40%", icon: "expiry" });
    reasonParts.push("Expiring very soon — aggressive discount recommended to prevent total loss.");
  } else if (daysToExpiry <= 7) {
    baseDiscount += 25;
    confidence += 30;
    urgency = "high";
    factors.push({ label: `Expires in ${daysToExpiry} days`, impact: "+25%", icon: "expiry" });
    reasonParts.push("Expiring within a week — moderate-to-high discount to accelerate sales.");
  } else if (daysToExpiry <= 15) {
    baseDiscount += 15;
    confidence += 20;
    urgency = "medium";
    factors.push({ label: `Expires in ${daysToExpiry} days`, impact: "+15%", icon: "expiry" });
    reasonParts.push("Approaching expiry — a light discount can boost movement.");
  } else if (daysToExpiry <= 30) {
    baseDiscount += 10;
    confidence += 15;
    urgency = "medium";
    factors.push({ label: `Expires in ${daysToExpiry} days`, impact: "+10%", icon: "expiry" });
    reasonParts.push("Expiring within a month — small discount to encourage purchase.");
  } else {
    // Safe expiry
    confidence += 5;
    factors.push({ label: `Expires in ${daysToExpiry} days`, impact: "No impact", icon: "expiry" });
    reasonParts.push("Expiry is not a concern right now.");
  }

  // --- Factor 2: Stock-based discount ---
  if (quantity > avgStock * 2 && quantity > 20) {
    baseDiscount += 10;
    confidence += 20;
    if (urgency === "low") urgency = "medium";
    factors.push({ label: `Overstocked: ${quantity} units (avg ${Math.round(avgStock)})`, impact: "+10%", icon: "stock" });
    reasonParts.push("Stock is significantly above average — discount helps move excess inventory.");
  } else if (quantity > avgStock * 1.5 && quantity > 10) {
    baseDiscount += 5;
    confidence += 10;
    factors.push({ label: `High stock: ${quantity} units (avg ${Math.round(avgStock)})`, impact: "+5%", icon: "stock" });
    reasonParts.push("Stock is above average — slight discount can help balance inventory.");
  } else if (quantity <= 5 && quantity > 0) {
    baseDiscount = Math.max(0, baseDiscount - 5);
    confidence += 10;
    factors.push({ label: `Low stock: only ${quantity} units`, impact: "-5%", icon: "stock" });
    reasonParts.push("Low stock — reduce discount since scarcity adds natural demand.");
  } else {
    factors.push({ label: `Normal stock: ${quantity} units`, impact: "No impact", icon: "stock" });
  }

  // --- Factor 3: Price tier adjustment ---
  if (price > 500) {
    // High-value product — prefer fixed amount or smaller percentage
    confidence += 5;
    factors.push({ label: `Premium item: ₹${price}`, impact: "Capped", icon: "value" });
    reasonParts.push("High-value item — discount is percentage-capped to protect margins.");
    baseDiscount = Math.min(baseDiscount, 35); // cap at 35%
  } else if (price < 50) {
    factors.push({ label: `Budget item: ₹${price}`, impact: "No cap", icon: "value" });
  }

  // Clamp
  baseDiscount = Math.max(0, Math.min(60, Math.round(baseDiscount)));
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));

  if (baseDiscount === 0) {
    return {
      recommended_type: "percentage",
      recommended_value: 0,
      confidence,
      reasoning: "No discount needed at this time. Stock and expiry are within healthy parameters.",
      urgency: "low",
      factors,
    };
  }

  return {
    recommended_type: "percentage",
    recommended_value: baseDiscount,
    confidence,
    reasoning: reasonParts.join(" "),
    urgency,
    factors,
  };
}

export default function Inventory() {
  const { data: products = [], isLoading } = useProducts();
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  // Local state for discount management (extends products)
  const [productsWithDiscounts, setProductsWithDiscounts] = useState<Record<string, ProductWithDiscount>>({});
  
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDiscount, setFilterDiscount] = useState("all");
  
  // Product Edit Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    name: "", category: "", price: "", quantity: "", expiry_date: "", batch_details: "", brand: "", barcode: ""
  });

  // Discount Dialog
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountProductId, setDiscountProductId] = useState<string | null>(null);
  const [discountForm, setDiscountForm] = useState({
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    discount_start_date: "",
    discount_end_date: ""
  });

  // AI Suggestion state
  const [aiSuggestion, setAiSuggestion] = useState<AIDiscountSuggestion | null>(null);
  const [aiSuggestionDismissed, setAiSuggestionDismissed] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  // Scanner state (must be declared before any early returns to satisfy React hooks rules)
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Scanned product info state
  const [scannedProduct, setScannedProduct] = useState<ScannedProductInfo | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Cleanup camera stream
  function stopCamera() {
    try { codeReaderRef.current?.reset?.(); } catch (e) {}
    codeReaderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }

  async function handleBarcodeLookup(code: string) {
    setForm(f => ({ ...f, barcode: code }));
    setLookupLoading(true);
    setScannedProduct(null);
    toast.info(`Barcode scanned: ${code}. Looking up product...`);
    
    // Use Open Food Facts API v2 with specific fields for richer data
    try {
      const fields = [
        'product_name', 'generic_name', 'brands', 'categories', 'categories_tags',
        'quantity', 'image_front_url', 'image_front_small_url', 'image_url',
        'ingredients_text', 'ingredients_text_en',
        'nutriscore_grade', 'nova_group',
        'countries', 'labels', 'packaging',
        'allergens', 'allergens_tags',
        'nutriments',
        'serving_size', 'product_quantity',
        'stores', 'origins',
      ].join(',');

      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${code}?fields=${fields}`
      );
      const json = await res.json();

      if (json && json.status === 1 && json.product) {
        const prod = json.product;

        // ---------- Extract all available fields ----------
        const pname = prod.product_name || prod.generic_name || '';
        const brand = prod.brands || '';
        const allCategories = prod.categories || '';

        // Smart category mapping using keyword matching
        let inferredCategory = mapToLocalCategory(allCategories);
        if (!inferredCategory && prod.categories_tags?.length) {
          const tagsStr = prod.categories_tags.join(' ');
          inferredCategory = mapToLocalCategory(tagsStr);
        }
        // Fallback: use first raw category
        if (!inferredCategory && allCategories) {
          const firstCat = allCategories.split(',')[0]?.trim();
          // Check if it matches any local category
          const match = categories.find(c => firstCat?.toLowerCase().includes(c.toLowerCase()));
          inferredCategory = match || 'Other';
        }

        // Package quantity string (e.g. "500 g", "1 L")
        const packageQty = prod.quantity || '';

        // Build nutrition info
        const nutriments = prod.nutriments || {};
        const nutritionPer100g = {
          energy: nutriments['energy-kcal_100g'],
          fat: nutriments['fat_100g'],
          carbs: nutriments['carbohydrates_100g'],
          sugars: nutriments['sugars_100g'],
          protein: nutriments['proteins_100g'],
          salt: nutriments['salt_100g'],
          fiber: nutriments['fiber_100g'],
        };

        // Get ingredients
        const ingredients = prod.ingredients_text || prod.ingredients_text_en || '';

        // Get image URL
        const imageUrl = prod.image_front_url || prod.image_front_small_url || prod.image_url || '';

        // Allergens
        const allergens = prod.allergens || (prod.allergens_tags?.length
          ? prod.allergens_tags.map((t: string) => t.replace('en:', '')).join(', ')
          : '');

        // Build batch details with all extra info
        const batchParts: string[] = [];
        if (packageQty) batchParts.push(`Package: ${packageQty}`);
        if (prod.serving_size) batchParts.push(`Serving: ${prod.serving_size}`);
        if (ingredients) batchParts.push(`Ingredients: ${ingredients.substring(0, 200)}${ingredients.length > 200 ? '...' : ''}`);
        if (allergens) batchParts.push(`Allergens: ${allergens}`);
        if (prod.labels) batchParts.push(`Labels: ${prod.labels}`);
        if (prod.origins) batchParts.push(`Origin: ${prod.origins}`);
        if (prod.stores) batchParts.push(`Stores: ${prod.stores}`);
        if (prod.nutriscore_grade) batchParts.push(`Nutri-Score: ${prod.nutriscore_grade.toUpperCase()}`);
        if (prod.nova_group) batchParts.push(`NOVA Group: ${prod.nova_group}`);

        // Save scanned product info for the preview card
        setScannedProduct({
          name: pname,
          brand,
          category: inferredCategory || 'Other',
          imageUrl,
          quantity: packageQty,
          ingredients,
          nutriscoreGrade: prod.nutriscore_grade,
          novaGroup: prod.nova_group,
          countries: prod.countries,
          labels: prod.labels,
          packaging: prod.packaging,
          allergens,
          nutritionPer100g,
        });

        // ---------- Auto-fill ALL form fields ----------
        // Set default quantity to 1 unit (user can adjust)
        // Set default expiry to 6 months from now (user should update)
        const defaultExpiry = new Date();
        defaultExpiry.setMonth(defaultExpiry.getMonth() + 6);
        const expiryStr = defaultExpiry.toISOString().split('T')[0];

        setForm(f => ({
          ...f,
          name: pname || f.name,
          brand: brand || f.brand,
          category: inferredCategory || f.category || 'Other',
          price: f.price || '', // Price not available from OFF, user must enter
          quantity: f.quantity || '1', // Default 1 unit
          expiry_date: f.expiry_date || expiryStr, // Default 6 months
          batch_details: batchParts.join(' | ') || f.batch_details,
        }));

        toast.success(
          `✅ Product found: ${pname || 'Unknown'}${brand ? ` by ${brand}` : ''}`,
          { duration: 4000 }
        );

        // Auto-scroll the dialog to show the Save button after form is filled
        setTimeout(() => {
          saveButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 400);
      } else {
        toast.warning('No product found in Open Food Facts database. Fill the details manually.', { duration: 4000 });
      }
    } catch (err: any) {
      console.error('Barcode lookup error:', err);
      toast.warning('Could not look up barcode. Please fill details manually.');
    } finally {
      setLookupLoading(false);
    }
  }

  // Start scanning when dialog opens
  useEffect(() => {
    if (!scannerOpen) {
      stopCamera();
      setScanError(null);
      setManualBarcode("");
      return;
    }

    let active = true;

    const startScanner = async () => {
      setScanError(null);
      setScanning(false);

      // Small delay so the video element is rendered in DOM
      await new Promise(r => setTimeout(r, 500));

      if (!videoRef.current) {
        setScanError('Video element not ready. Please try again.');
        return;
      }

      try {
        // Request camera permission explicitly first
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('autoplay', 'true');
          try { await videoRef.current.play(); } catch(e) { console.warn('Video play error:', e); }
        }

        setScanning(true);

        // Import ZXing and create reader with all barcode formats
        const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library');
        
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.ITF,
          BarcodeFormat.QR_CODE,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.PDF_417,
          BarcodeFormat.CODABAR,
          BarcodeFormat.AZTEC,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        
        const reader = new BrowserMultiFormatReader(hints);
        codeReaderRef.current = reader;

        // Use decodeFromStream to decode from the already-acquired stream
        // This avoids the conflict of decodeFromVideoDevice opening a second camera stream
        reader.decodeFromStream(stream, videoRef.current, (result, err) => {
          if (!active) return;
          if (result) {
            const code = result.getText();
            if (code) {
              console.log('Barcode detected:', code);
              stopCamera();
              if (active) {
                setScannerOpen(false);
                handleBarcodeLookup(code);
              }
            }
          }
          // Ignore NotFoundException — it fires every frame when no barcode is visible
        });
      } catch (err: any) {
        if (!active) return;
        console.error('Scanner initialization error:', err);
        setScanning(false);
        if (err.name === 'NotAllowedError') {
          setScanError('Camera permission denied. Please allow camera access in your browser settings and try again.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setScanError('No camera found. Please connect a camera or use "Enter barcode manually" below.');
        } else if (err.name === 'NotReadableError') {
          setScanError('Camera is in use by another application. Close other apps using the camera and try again.');
        } else {
          setScanError(`Scanner error: ${err.message || 'Unknown error'}. Try entering the barcode manually below.`);
        }
      }
    };

    startScanner();

    return () => {
      active = false;
      stopCamera();
    };
  }, [scannerOpen]);

  // Merge products with local discount data
  const getProductWithDiscount = (product: any): ProductWithDiscount => {
    return productsWithDiscounts[product.id] || { ...product };
  };

  // Group products into batches
  const groupedProducts = products.reduce((acc, p) => {
    const productWithDiscount = getProductWithDiscount(p);
    const key = p.name;
    if (!acc[key]) {
      acc[key] = {
        name: p.name,
        category: p.category,
        price: p.price,
        totalQuantity: 0,
        batches: [],
        discount_type: productWithDiscount.discount_type,
        discount_value: productWithDiscount.discount_value,
        discount_start_date: productWithDiscount.discount_start_date,
        discount_end_date: productWithDiscount.discount_end_date,
      };
    }
    acc[key].totalQuantity += p.quantity;
    acc[key].batches.push({ ...p, ...productsWithDiscounts[p.id] });
    return acc;
  }, {} as Record<string, any>);

  const groupedArray = Object.values(groupedProducts);

  const filtered = groupedArray.filter((g: any) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || g.category === filterCategory;
    
    // Filter by discount status
    const hasActiveDiscount = isDiscountActive(g.discount_start_date, g.discount_end_date);
    if (filterDiscount === "active" && !hasActiveDiscount) return false;
    if (filterDiscount === "inactive" && hasActiveDiscount) return false;
    
    return matchSearch && matchCat;
  });

  const toggleExpand = (name: string) => {
    setExpanded(e => ({ ...e, [name]: !e[name] }));
  };

  function openAdd() {
    setEditId(null);
    setForm({ name: "", category: "", price: "", quantity: "", expiry_date: "", batch_details: "", brand: "", barcode: "" });
    setScannedProduct(null);
    setLookupLoading(false);
    setDialogOpen(true);
  }

  function openAddBatch(productGroup: any) {
    setEditId(null);
    setForm({
      name: productGroup.name,
      category: productGroup.category,
      price: String(productGroup.price),
      quantity: "",
      expiry_date: "",
      batch_details: "",
      brand: "",
      barcode: ""
    });
    setDialogOpen(true);
  }

  function getGroupExpiryStatus(totalQuantity: number, batches: any[]) {
    if (totalQuantity === 0) return "out-of-stock";
    const activeBatches = batches.filter((b: any) => b.quantity > 0);
    if (activeBatches.some((b: any) => getExpiryStatus(b.expiry_date) === "expired")) return "expired";
    if (activeBatches.some((b: any) => getExpiryStatus(b.expiry_date) === "critical")) return "critical";
    if (activeBatches.some((b: any) => getExpiryStatus(b.expiry_date) === "warning")) return "warning";
    return "safe";
  }

  async function handleSave() {
    if (!form.name || !form.category || !form.price || !form.quantity || !form.expiry_date) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      if (editId) {
        // Update product with batch details if provided
        const updateData: any = {
          id: editId, 
          name: form.name, 
          category: form.category,
          price: Number(form.price), 
          quantity: Number(form.quantity), 
          expiry_date: form.expiry_date,
        };
        
        // Update local discount/batch details
        setProductsWithDiscounts(prev => ({
          ...prev,
          [editId]: {
            ...prev[editId] || {},
            ...updateData,
            batch_details: form.batch_details
          }
        }));
        
        await updateProduct.mutateAsync(updateData);
        toast.success("Product updated");
      } else {
        const created = await addProduct.mutateAsync({
          name: form.name,
          category: form.category,
          price: Number(form.price),
          quantity: Number(form.quantity),
          expiry_date: form.expiry_date,
        });

        // Persist brand / barcode locally in productsWithDiscounts for display
        if (created && created.id) {
          setProductsWithDiscounts(prev => ({
            ...prev,
            [created.id]: {
              ...(created as any),
              ...prev[created.id],
              batch_details: form.batch_details || prev[created.id]?.batch_details || "",
              brand: form.brand || prev[created.id]?.brand || "",
              barcode: form.barcode || prev[created.id]?.barcode || "",
            }
          }));
        }

        toast.success("Product added");
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProduct.mutateAsync(id);
      // Clean up discount data
      setProductsWithDiscounts(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      toast.success("Product removed");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // Delete all batches for a product group
  async function deleteGroup(productGroup: any) {
    const ok = window.confirm(`Delete all batches of "${productGroup.name}"? This cannot be undone.`);
    if (!ok) return;
    try {
      for (const b of productGroup.batches) {
        await deleteProduct.mutateAsync(b.id);
        setProductsWithDiscounts(prev => {
          const newState = { ...prev };
          delete newState[b.id];
          return newState;
        });
      }
      toast.success(`Deleted ${productGroup.batches.length} batches`);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // Open edit dialog for a specific batch
  function openEdit(batch: any) {
    if (!batch) return;
    setEditId(batch.id);
    setForm({
      name: batch.name || "",
      category: batch.category || "",
      price: String(batch.price || ""),
      quantity: String(batch.quantity || ""),
      expiry_date: batch.expiry_date || "",
      batch_details: batch.batch_details || productsWithDiscounts[batch.id]?.batch_details || "",
      brand: productsWithDiscounts[batch.id]?.brand || batch.brand || "",
      barcode: productsWithDiscounts[batch.id]?.barcode || batch.barcode || "",
    });
    setScannedProduct(null);
    setLookupLoading(false);
    setDialogOpen(true);
  }

  // Open discount dialog and prefill with any existing discount values
  function openDiscountDialog(id: string | undefined, batch?: any) {
    if (!id) return;
    setDiscountProductId(id);
    const existing = productsWithDiscounts[id] || {};
    setDiscountForm({
      discount_type: existing.discount_type || "percentage",
      discount_value: existing.discount_value != null ? String(existing.discount_value) : "",
      discount_start_date: existing.discount_start_date || "",
      discount_end_date: existing.discount_end_date || "",
    });
    setDiscountDialogOpen(true);

    // Generate AI discount suggestion with a brief "thinking" animation
    setAiSuggestion(null);
    setAiSuggestionDismissed(false);
    setAiThinking(true);
    const product = batch || products.find(p => p.id === id);
    setTimeout(() => {
      const suggestion = generateAIDiscountSuggestion(product, products);
      setAiSuggestion(suggestion);
      setAiThinking(false);
    }, 800); // small delay for UX effect
  }

  // Accept AI suggestion and fill the form
  function acceptAISuggestion() {
    if (!aiSuggestion) return;
    const today = new Date();
    const endDate = new Date();
    // Set end date based on urgency
    if (aiSuggestion.urgency === "critical") endDate.setDate(today.getDate() + 3);
    else if (aiSuggestion.urgency === "high") endDate.setDate(today.getDate() + 7);
    else if (aiSuggestion.urgency === "medium") endDate.setDate(today.getDate() + 14);
    else endDate.setDate(today.getDate() + 30);

    setDiscountForm({
      discount_type: aiSuggestion.recommended_type,
      discount_value: String(aiSuggestion.recommended_value),
      discount_start_date: today.toISOString().split('T')[0],
      discount_end_date: endDate.toISOString().split('T')[0],
    });
    setAiSuggestionDismissed(true);
    toast.success('AI suggestion applied! Review & confirm below.');
  }

  // Apply discount to the selected product/batch (stored locally)
  function applyDiscount() {
    if (!discountProductId) {
      toast.error('No product selected for discount');
      return;
    }
    const valueNum = Number(discountForm.discount_value || 0);
    setProductsWithDiscounts(prev => ({
      ...prev,
      [discountProductId]: {
        ...prev[discountProductId],
        discount_type: discountForm.discount_type,
        discount_value: valueNum,
        discount_start_date: discountForm.discount_start_date || undefined,
        discount_end_date: discountForm.discount_end_date || undefined,
      }
    }));
    setDiscountDialogOpen(false);
    toast.success('Discount applied locally');
  }

  // Remove discount metadata for a specific product/batch
  function removeDiscount(id?: string) {
    if (!id) return;
    setProductsWithDiscounts(prev => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id].discount_type;
        delete next[id].discount_value;
        delete next[id].discount_start_date;
        delete next[id].discount_end_date;
      }
      return next;
    });
    toast.success('Discount removed');
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading inventory...</div>;

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
        transition={{ duration: 0.4 }}
        className="max-w-7xl mx-auto"
      >
        <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Inventory Management
            </h1>
            <p className="page-subtitle">Manage your products, apply discounts & track stock</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAdd} className="shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4 mr-2" />Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Edit3 className="h-5 w-5" />
                    {editId ? "Edit Product Details" : "Add New Product"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label className="text-sm font-medium">Product Name *</Label>
                    <Input 
                      value={form.name} 
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                      placeholder="Enter product name"
                      className="mt-1"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setScannedProduct(null); setScannerOpen(true); }}>
                        <PackageSearch className="h-3.5 w-3.5" />
                        Scan Barcode
                      </Button>
                      {lookupLoading && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          Looking up product...
                        </span>
                      )}
                      {form.barcode && !lookupLoading && (
                        <Badge variant="secondary" className="font-mono text-xs">
                          <Check className="h-3 w-3 mr-1 text-green-500" />
                          {form.barcode}
                        </Badge>
                      )}
                    </div>

                    {/* Scanned Product Preview Card */}
                    <AnimatePresence>
                      {scannedProduct && !lookupLoading && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.97 }}
                          transition={{ duration: 0.3 }}
                          className="mt-3"
                        >
                          <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent p-3 space-y-2.5">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                                <Check className="h-3.5 w-3.5" />
                                Product Found — Details Auto-Filled
                              </span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setScannedProduct(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            {/* Product Info Row */}
                            <div className="flex gap-3">
                              {/* Image */}
                              {scannedProduct.imageUrl && (
                                <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-white/10 border border-border/50">
                                  <img 
                                    src={scannedProduct.imageUrl} 
                                    alt={scannedProduct.name} 
                                    className="w-full h-full object-contain"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0 space-y-1">
                                <p className="font-medium text-sm truncate">{scannedProduct.name}</p>
                                {scannedProduct.brand && (
                                  <p className="text-xs text-muted-foreground">by {scannedProduct.brand}</p>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                  {scannedProduct.category && (
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                      <Tag className="h-2.5 w-2.5 mr-1" />
                                      {scannedProduct.category}
                                    </Badge>
                                  )}
                                  {scannedProduct.quantity && (
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                      <Weight className="h-2.5 w-2.5 mr-1" />
                                      {scannedProduct.quantity}
                                    </Badge>
                                  )}
                                  {scannedProduct.nutriscoreGrade && (
                                    <Badge 
                                      className={cn(
                                        "text-[10px] h-5 px-1.5 font-bold uppercase",
                                        scannedProduct.nutriscoreGrade === 'a' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                        scannedProduct.nutriscoreGrade === 'b' ? 'bg-lime-500/20 text-lime-400 border-lime-500/30' :
                                        scannedProduct.nutriscoreGrade === 'c' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                        scannedProduct.nutriscoreGrade === 'd' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                        'bg-red-500/20 text-red-400 border-red-500/30'
                                      )}
                                      variant="outline"
                                    >
                                      <Leaf className="h-2.5 w-2.5 mr-1" />
                                      Nutri-Score {scannedProduct.nutriscoreGrade.toUpperCase()}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Nutrition Quick View */}
                            {scannedProduct.nutritionPer100g && (
                              Object.values(scannedProduct.nutritionPer100g).some(v => v != null) && (
                                <div className="bg-background/50 rounded-lg p-2">
                                  <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Nutrition per 100g</p>
                                  <div className="grid grid-cols-4 gap-1.5 text-center">
                                    {scannedProduct.nutritionPer100g.energy != null && (
                                      <div className="bg-amber-500/10 rounded px-1.5 py-1">
                                        <p className="text-[10px] font-bold text-amber-400">{Math.round(scannedProduct.nutritionPer100g.energy)}</p>
                                        <p className="text-[9px] text-muted-foreground">kcal</p>
                                      </div>
                                    )}
                                    {scannedProduct.nutritionPer100g.protein != null && (
                                      <div className="bg-blue-500/10 rounded px-1.5 py-1">
                                        <p className="text-[10px] font-bold text-blue-400">{scannedProduct.nutritionPer100g.protein.toFixed(1)}g</p>
                                        <p className="text-[9px] text-muted-foreground">Protein</p>
                                      </div>
                                    )}
                                    {scannedProduct.nutritionPer100g.carbs != null && (
                                      <div className="bg-purple-500/10 rounded px-1.5 py-1">
                                        <p className="text-[10px] font-bold text-purple-400">{scannedProduct.nutritionPer100g.carbs.toFixed(1)}g</p>
                                        <p className="text-[9px] text-muted-foreground">Carbs</p>
                                      </div>
                                    )}
                                    {scannedProduct.nutritionPer100g.fat != null && (
                                      <div className="bg-rose-500/10 rounded px-1.5 py-1">
                                        <p className="text-[10px] font-bold text-rose-400">{scannedProduct.nutritionPer100g.fat.toFixed(1)}g</p>
                                        <p className="text-[9px] text-muted-foreground">Fat</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            )}

                            {/* Allergens Warning */}
                            {scannedProduct.allergens && (
                              <div className="flex items-start gap-1.5 bg-amber-500/10 rounded-lg px-2.5 py-1.5">
                                <AlertCircle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-300">
                                  <span className="font-semibold">Allergens:</span> {scannedProduct.allergens}
                                </p>
                              </div>
                            )}

                            {/* Note */}
                            <p className="text-[10px] text-muted-foreground italic flex items-start gap-1">
                              <Info className="h-3 w-3 shrink-0 mt-0.5" />
                              Price and expiry must be set manually. Quantity defaults to 1 unit. All fields are editable below.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Brand</Label>
                    <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Brand (auto-filled from scan)" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Category *</Label>
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Price (₹) *</Label>
                      <Input 
                        type="number" 
                        value={form.price} 
                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Quantity *</Label>
                      <Input 
                        type="number" 
                        value={form.quantity} 
                        onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                        placeholder="0"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Expiry Date *</Label>
                    <Input 
                      type="date" 
                      value={form.expiry_date} 
                      onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Batch Details</Label>
                    <Textarea 
                      value={form.batch_details} 
                      onChange={e => setForm(f => ({ ...f, batch_details: e.target.value }))}
                      placeholder="Add batch number, supplier info, or notes..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                  <Button 
                    ref={saveButtonRef}
                    onClick={handleSave} 
                    className="w-full" 
                    disabled={addProduct.isPending || updateProduct.isPending}
                  >
                    {editId ? "Update Product" : "Add Product"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {/* Barcode Scanner Dialog */}
            <Dialog open={scannerOpen} onOpenChange={(open) => {
              if (!open) stopCamera();
              setScannerOpen(open);
            }}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <PackageSearch className="h-5 w-5 text-primary" />
                    Scan Barcode
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <p className="text-sm text-muted-foreground">
                    Point your camera at a barcode to scan it. Supports EAN-13, EAN-8, UPC, Code 128, QR Code, and more.
                  </p>

                  {/* Camera Preview */}
                  <div className="relative w-full rounded-lg overflow-hidden bg-black/90" style={{ aspectRatio: '16/10' }}>
                    <video 
                      ref={videoRef} 
                      className="w-full h-full object-cover"
                      playsInline 
                      autoPlay 
                      muted
                    />
                    
                    {/* Scanning overlay */}
                    {scanning && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Scan line animation */}
                        <div className="absolute left-[10%] right-[10%] top-[15%] bottom-[15%] border-2 border-primary/50 rounded-md">
                          <div className="absolute left-0 right-0 h-0.5 bg-primary animate-[scanline_2s_ease-in-out_infinite]" 
                               style={{ 
                                 animation: 'scanline 2s ease-in-out infinite',
                               }}
                          />
                        </div>
                        {/* Corner markers */}
                        <div className="absolute top-[15%] left-[10%] w-5 h-5 border-t-3 border-l-3 border-primary rounded-tl-sm" />
                        <div className="absolute top-[15%] right-[10%] w-5 h-5 border-t-3 border-r-3 border-primary rounded-tr-sm" />
                        <div className="absolute bottom-[15%] left-[10%] w-5 h-5 border-b-3 border-l-3 border-primary rounded-bl-sm" />
                        <div className="absolute bottom-[15%] right-[10%] w-5 h-5 border-b-3 border-r-3 border-primary rounded-br-sm" />
                        
                        <div className="absolute bottom-3 left-0 right-0 text-center">
                          <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                            Scanning... Hold steady
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Not scanning / no camera */}
                    {!scanning && !scanError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="text-center text-white">
                          <div className="h-10 w-10 mx-auto mb-2 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                          <p className="text-sm">Starting camera...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Error Display */}
                  {scanError && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{scanError}</span>
                    </div>
                  )}

                  {/* Manual Barcode Entry */}
                  <div className="border rounded-lg p-3 bg-muted/30">
                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Or enter barcode manually:
                    </Label>
                    <div className="flex gap-2">
                      <Input 
                        value={manualBarcode}
                        onChange={e => setManualBarcode(e.target.value)}
                        placeholder="e.g. 8901234567890"
                        className="flex-1 font-mono"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && manualBarcode.trim()) {
                            stopCamera();
                            setScannerOpen(false);
                            handleBarcodeLookup(manualBarcode.trim());
                          }
                        }}
                      />
                      <Button 
                        disabled={!manualBarcode.trim()}
                        onClick={() => {
                          if (manualBarcode.trim()) {
                            stopCamera();
                            setScannerOpen(false);
                            handleBarcodeLookup(manualBarcode.trim());
                          }
                        }}
                      >
                        Look Up
                      </Button>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {
                      stopCamera();
                      setScannerOpen(false);
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Scan line animation keyframes */}
            <style>{`
              @keyframes scanline {
                0%, 100% { top: 0; }
                50% { top: calc(100% - 2px); }
              }
            `}</style>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              className="pl-9 bg-background/80 backdrop-blur" 
              placeholder="Search products by name..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-48 bg-background/80 backdrop-blur">
              <Tag className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDiscount} onValueChange={setFilterDiscount}>
            <SelectTrigger className="w-full sm:w-48 bg-background/80 backdrop-blur">
              <Percent className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="active">With Active Discount</SelectItem>
              <SelectItem value="inactive">Without Active Discount</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Discount Dialog */}
        <Dialog open={discountDialogOpen} onOpenChange={(open) => {
          setDiscountDialogOpen(open);
          if (!open) { setAiSuggestion(null); setAiSuggestionDismissed(false); setAiThinking(false); }
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Apply Discount
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">

              {/* ===== AI SUGGESTION CARD ===== */}
              <AnimatePresence>
                {(aiThinking || (aiSuggestion && !aiSuggestionDismissed)) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.97 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <div className={cn(
                      "relative rounded-xl border overflow-hidden",
                      aiSuggestion?.urgency === "critical" ? "border-red-500/40 bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent" :
                      aiSuggestion?.urgency === "high" ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent" :
                      aiSuggestion?.urgency === "medium" ? "border-blue-500/40 bg-gradient-to-br from-blue-500/10 via-sky-500/5 to-transparent" :
                      "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-transparent"
                    )}>
                      {/* Glowing header bar */}
                      <div className={cn(
                        "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold",
                        aiSuggestion?.urgency === "critical" ? "bg-red-500/15 text-red-400" :
                        aiSuggestion?.urgency === "high" ? "bg-amber-500/15 text-amber-400" :
                        aiSuggestion?.urgency === "medium" ? "bg-blue-500/15 text-blue-400" :
                        "bg-emerald-500/15 text-emerald-400"
                      )}>
                        <Brain className="h-4 w-4" />
                        <span>AI Discount Suggestion</span>
                        {aiSuggestion?.urgency && aiSuggestion.urgency !== "low" && (
                          <Badge className={cn("ml-auto text-[10px] uppercase tracking-wider",
                            aiSuggestion.urgency === "critical" ? "bg-red-500 text-white" :
                            aiSuggestion.urgency === "high" ? "bg-amber-500 text-white" :
                            "bg-blue-500 text-white"
                          )}>
                            {aiSuggestion.urgency === "critical" ? "⚡ Urgent" :
                             aiSuggestion.urgency === "high" ? "🔥 High Priority" :
                             "📊 Recommended"}
                          </Badge>
                        )}
                      </div>

                      <div className="px-4 py-3 space-y-3">
                        {/* AI Thinking State */}
                        {aiThinking && (
                          <div className="flex items-center gap-3 py-4">
                            <div className="relative">
                              <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                              <Brain className="h-4 w-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Analyzing product data...</p>
                              <p className="text-xs text-muted-foreground">Checking stock levels, expiry, and market patterns</p>
                            </div>
                          </div>
                        )}

                        {/* Suggestion Content */}
                        {aiSuggestion && !aiThinking && (
                          <>
                            {/* Big recommendation number */}
                            {aiSuggestion.recommended_value > 0 ? (
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "flex items-center justify-center h-16 w-16 rounded-2xl text-2xl font-bold shrink-0",
                                  aiSuggestion.urgency === "critical" ? "bg-red-500/20 text-red-400" :
                                  aiSuggestion.urgency === "high" ? "bg-amber-500/20 text-amber-400" :
                                  aiSuggestion.urgency === "medium" ? "bg-blue-500/20 text-blue-400" :
                                  "bg-emerald-500/20 text-emerald-400"
                                )}>
                                  {aiSuggestion.recommended_value}%
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Suggested {aiSuggestion.recommended_type === "percentage" ? "Percentage" : "Fixed"} Discount</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                    {aiSuggestion.reasoning}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 py-2">
                                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-500/20 text-emerald-400">
                                  <Check className="h-6 w-6" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-emerald-400">No discount needed</p>
                                  <p className="text-xs text-muted-foreground">{aiSuggestion.reasoning}</p>
                                </div>
                              </div>
                            )}

                            {/* Confidence bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">AI Confidence</span>
                                <span className="font-medium">{aiSuggestion.confidence}%</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${aiSuggestion.confidence}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                  className={cn("h-full rounded-full",
                                    aiSuggestion.confidence >= 60 ? "bg-emerald-500" :
                                    aiSuggestion.confidence >= 30 ? "bg-amber-500" :
                                    "bg-red-500"
                                  )}
                                />
                              </div>
                            </div>

                            {/* Analysis factors */}
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Analysis Factors</p>
                              {aiSuggestion.factors.map((f, i) => (
                                <div key={i} className="flex items-center justify-between text-xs bg-background/50 rounded-lg px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    {f.icon === "expiry" && <Calendar className="h-3.5 w-3.5 text-rose-400" />}
                                    {f.icon === "stock" && <Layers className="h-3.5 w-3.5 text-blue-400" />}
                                    {f.icon === "value" && <IndianRupee className="h-3.5 w-3.5 text-emerald-400" />}
                                    <span>{f.label}</span>
                                  </div>
                                  <Badge variant="outline" className={cn("text-[10px] font-mono",
                                    f.impact.startsWith("+") ? "text-amber-400 border-amber-500/30" :
                                    f.impact.startsWith("-") ? "text-emerald-400 border-emerald-500/30" :
                                    "text-muted-foreground"
                                  )}>
                                    {f.impact}
                                  </Badge>
                                </div>
                              ))}
                            </div>

                            {/* Accept / Dismiss buttons */}
                            {aiSuggestion.recommended_value > 0 && (
                              <div className="flex gap-2 pt-1">
                                <Button
                                  onClick={acceptAISuggestion}
                                  className={cn("flex-1 gap-2",
                                    aiSuggestion.urgency === "critical" ? "bg-red-500 hover:bg-red-600" :
                                    aiSuggestion.urgency === "high" ? "bg-amber-500 hover:bg-amber-600" :
                                    "bg-primary hover:bg-primary/90"
                                  )}
                                  size="sm"
                                >
                                  <ThumbsUp className="h-3.5 w-3.5" />
                                  Accept Suggestion
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setAiSuggestionDismissed(true)}
                                  className="gap-2"
                                  size="sm"
                                >
                                  <ThumbsDown className="h-3.5 w-3.5" />
                                  Ignore
                                </Button>
                              </div>
                            )}

                            {aiSuggestion.recommended_value === 0 && (
                              <Button
                                variant="outline"
                                onClick={() => setAiSuggestionDismissed(true)}
                                className="w-full text-xs"
                                size="sm"
                              >
                                Got it, set discount manually
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Separator between AI and manual form */}
              {aiSuggestionDismissed && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex-1 h-px bg-border" />
                  <span>Set your discount manually</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Discount Type</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant={discountForm.discount_type === "percentage" ? "default" : "outline"}
                    onClick={() => setDiscountForm(f => ({ ...f, discount_type: "percentage" }))}
                    className="flex-1"
                  >
                    <Percent className="h-4 w-4 mr-2" />
                    Percentage
                  </Button>
                  <Button
                    variant={discountForm.discount_type === "fixed" ? "default" : "outline"}
                    onClick={() => setDiscountForm(f => ({ ...f, discount_type: "fixed" }))}
                    className="flex-1"
                  >
                    <IndianRupee className="h-4 w-4 mr-2" />
                    Fixed Amount
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">
                  {discountForm.discount_type === "percentage" ? "Discount Percentage" : "Discount Amount (₹)"}
                </Label>
                <Input 
                  type="number"
                  value={discountForm.discount_value}
                  onChange={e => setDiscountForm(f => ({ ...f, discount_value: e.target.value }))}
                  placeholder={discountForm.discount_type === "percentage" ? "10" : "20"}
                  className="mt-1"
                  min="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Start Date</Label>
                  <Input 
                    type="date" 
                    value={discountForm.discount_start_date}
                    onChange={e => setDiscountForm(f => ({ ...f, discount_start_date: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">End Date</Label>
                  <Input 
                    type="date" 
                    value={discountForm.discount_end_date}
                    onChange={e => setDiscountForm(f => ({ ...f, discount_end_date: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
              <Button onClick={applyDiscount} className="w-full bg-amber-500 hover:bg-amber-600">
                <Tag className="h-4 w-4 mr-2" />
                Apply Discount
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-xl border border-dashed border-border animate-in fade-in zoom-in duration-300">
            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <PackageSearch className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">No products found</h3>
            <p className="mt-2 mb-6 text-muted-foreground max-w-sm">
              Get started by adding your first product to manage your inventory effectively!
            </p>
            <Button onClick={openAdd} size="lg" className="rounded-full shadow-sm">
              <Plus className="h-5 w-5 mr-2" />
              Add New Product
            </Button>
          </div>
        ) : (() => {
          // Flatten all batches from grouped products and categorize by expiry
          const allBatches = filtered.flatMap((g: any) => g.batches);
          
          const expiredItems = allBatches.filter((b: any) => getExpiryStatus(b.expiry_date) === "expired");
          const criticalItems = allBatches.filter((b: any) => getExpiryStatus(b.expiry_date) === "critical");
          const warningItems = allBatches.filter((b: any) => getExpiryStatus(b.expiry_date) === "warning");
          const safeItems = allBatches.filter((b: any) => getExpiryStatus(b.expiry_date) === "safe");

          const sections = [
            { 
              key: "expired", label: "Expired", items: expiredItems, 
              color: "bg-red-500/10 border-red-500/30 text-red-400",
              badgeColor: "bg-red-500 text-white",
              icon: <XCircle className="h-5 w-5 text-red-500" />,
            },
            { 
              key: "critical", label: "Expiring Soon (Within 7 Days)", items: criticalItems,
              color: "bg-rose-500/10 border-rose-500/30 text-rose-400",
              badgeColor: "bg-rose-500 text-white",
              icon: <AlertCircle className="h-5 w-5 text-rose-500" />,
            },
            { 
              key: "warning", label: "Expiring This Month (Within 30 Days)", items: warningItems,
              color: "bg-amber-500/10 border-amber-500/30 text-amber-400",
              badgeColor: "bg-amber-500 text-white",
              icon: <Clock className="h-5 w-5 text-amber-500" />,
            },
            { 
              key: "safe", label: "Safe (More Than 30 Days)", items: safeItems,
              color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
              badgeColor: "bg-emerald-500 text-white",
              icon: <Check className="h-5 w-5 text-emerald-500" />,
            },
          ];

          return (
            <div className="space-y-8">
              {sections.map((section) => (
                section.items.length > 0 && (
                  <div key={section.key}>
                    {/* Section Header */}
                    <div className={cn("flex items-center gap-3 px-4 py-3 rounded-lg border mb-4", section.color)}>
                      {section.icon}
                      <h2 className="text-base font-semibold">{section.label}</h2>
                      <Badge className={cn("ml-auto text-xs", section.badgeColor)}>
                        {section.items.length} {section.items.length === 1 ? "item" : "items"}
                      </Badge>
                    </div>

                    {/* Product Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {section.items.map((batch: any, idx: number) => {
                        const batchDiscount = productsWithDiscounts[batch.id];
                        const hasBatchActiveDiscount = isDiscountActive(batchDiscount?.discount_start_date, batchDiscount?.discount_end_date);
                        const batchFinalPrice = calculateFinalPrice(batch.price, batchDiscount?.discount_type, batchDiscount?.discount_value);
                        const bStatus = getExpiryStatus(batch.expiry_date);
                        const daysLeft = Math.ceil((new Date(batch.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                        return (
                          <motion.div
                            key={batch.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: idx * 0.04 }}
                          >
                            <div className={cn(
                              "glass p-4 rounded-xl shadow-md relative overflow-hidden transition-transform hover:scale-[1.01]",
                              hasBatchActiveDiscount && "ring-amber-400/20 ring-1",
                              bStatus === "expired" && "border-red-500/30",
                              bStatus === "critical" && "border-rose-500/30",
                            )}>
                              {/* Product Name + Category */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  <div className={cn("p-2.5 rounded-lg", 
                                    bStatus === "expired" ? "bg-red-500/10 text-red-500" : 
                                    bStatus === "critical" ? "bg-rose-500/10 text-rose-500" : 
                                    bStatus === "warning" ? "bg-amber-500/10 text-amber-500" : 
                                    "bg-primary/10 text-primary"
                                  )}>
                                    <Package className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-medium text-base">{batch.name}</h3>
                                      {hasBatchActiveDiscount && (
                                        <Badge className="bg-amber-500 text-white text-[10px]">DISCOUNT</Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{batch.category}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={cn("text-sm", hasBatchActiveDiscount && "line-through text-muted-foreground")}>
                                    ₹{Number(batch.price).toLocaleString('en-IN')}
                                  </div>
                                  {hasBatchActiveDiscount && (
                                    <div className="text-lg font-bold text-green-500">₹{batchFinalPrice.toLocaleString('en-IN')}</div>
                                  )}
                                </div>
                              </div>

                              {/* Expiry + Stock Info */}
                              <div className="mt-3 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm">
                                    Expires: <span className="font-medium">{formatDate(batch.expiry_date)}</span>
                                  </span>
                                </div>
                                <Badge variant="outline" className={cn("text-xs font-mono",
                                  bStatus === "expired" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                  bStatus === "critical" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                                  bStatus === "warning" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                )}>
                                  {bStatus === "expired" ? "Expired" :
                                   bStatus === "critical" ? `${daysLeft}d left` :
                                   bStatus === "warning" ? `${daysLeft}d left` :
                                   `${daysLeft}d left`}
                                </Badge>
                              </div>

                              {/* Quantity */}
                              <div className="mt-2">
                                <span className={cn("px-2 py-1 rounded-md text-sm font-semibold",
                                  batch.quantity === 0 ? "bg-red-100 text-red-700" :
                                  batch.quantity <= 10 ? "bg-amber-100 text-amber-700" :
                                  "bg-green-50 text-green-700"
                                )}>
                                  {batch.quantity} in stock
                                </span>
                              </div>

                              {/* Action Buttons */}
                              <div className="mt-3 pt-3 border-t flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(batch)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500" onClick={() => openDiscountDialog(batch.id, batch)}>
                                      <Percent className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Apply Discount</TooltipContent>
                                </Tooltip>
                                {hasBatchActiveDiscount && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeDiscount(batch.id)}>
                                        <XCircle className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Remove Discount</TooltipContent>
                                  </Tooltip>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(batch.id)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )
              ))}
            </div>
          );
        })()}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold">{products.length}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Stock</p>
                  <p className="text-2xl font-bold">{products.reduce((acc, p) => acc + p.quantity, 0)}</p>
                </div>
                <Layers className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Discounts</p>
                  <p className="text-2xl font-bold">
                    {Object.values(productsWithDiscounts).filter(p => 
                      isDiscountActive(p.discount_start_date, p.discount_end_date)
                    ).length}
                  </p>
                </div>
                <Percent className="h-8 w-8 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold">
                    {products.filter(p => getExpiryStatus(p.expiry_date) === "critical").length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
