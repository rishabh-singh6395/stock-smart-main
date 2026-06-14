import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Sparkles, Plus, ShoppingCart, TrendingUp, Package, Percent,
  Trash2, Timer, Zap, BarChart3, AlertTriangle, Gift, Crown
} from "lucide-react";
import {
  useProducts, useSales,
  useComboOffers, useComboSales,
  useAddComboOffer, useUpdateComboOffer, useDeleteComboOffer, useSellCombo,
} from "@/hooks/useData";
import type { Product, ComboOffer } from "@/types/database";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";

// ═══════════ Product Classification Engine ═══════════
interface ClassifiedProduct {
  product: Product;
  tags: string[];
  dailySalesRate: number;
  daysToExpiry: number;
}

function classifyProducts(
  products: Product[],
  sales: any[]
): ClassifiedProduct[] {
  const now = new Date();

  // Calculate daily sales rate per product name
  const salesByProduct: Record<string, { total: number; earliestDate: Date }> = {};
  sales.forEach((s) => {
    const name = s.product_name;
    if (!salesByProduct[name]) {
      salesByProduct[name] = { total: 0, earliestDate: new Date(s.sale_date) };
    }
    salesByProduct[name].total += s.quantity;
    const d = new Date(s.sale_date);
    if (d < salesByProduct[name].earliestDate) salesByProduct[name].earliestDate = d;
  });

  // Median stock quantity for "overstocked" threshold
  const quantities = products.filter((p) => p.quantity > 0).map((p) => p.quantity);
  quantities.sort((a, b) => a - b);
  const medianQty = quantities.length > 0 ? quantities[Math.floor(quantities.length / 2)] : 20;
  const overstockThreshold = Math.max(medianQty * 2, 50);

  return products
    .filter((p) => p.quantity > 0)
    .map((p) => {
      const tags: string[] = [];
      const daysToExpiry = Math.ceil(
        (new Date(p.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Sales rate
      const salesData = salesByProduct[p.name];
      let dailySalesRate = 0;
      if (salesData) {
        const daysSinceFirst = Math.max(
          1,
          Math.ceil((now.getTime() - salesData.earliestDate.getTime()) / (1000 * 60 * 60 * 24))
        );
        dailySalesRate = salesData.total / daysSinceFirst;
      }

      // Classify
      if (daysToExpiry <= 5 && daysToExpiry >= 0) tags.push("near_expiry");
      if (daysToExpiry < 0) tags.push("expired");
      if (dailySalesRate >= 1) tags.push("fast_selling");
      if (dailySalesRate < 0.2 && salesData) tags.push("slow_selling");
      if (!salesData && p.quantity > 0) tags.push("slow_selling"); // never sold = slow
      if (p.quantity >= overstockThreshold) tags.push("overstocked");

      return { product: p, tags, dailySalesRate, daysToExpiry };
    });
}

// ═══════════ Combo Suggestion Engine ═══════════
interface ComboSuggestion {
  product1: Product;
  product2: Product;
  product3?: Product;
  reason: string;
  type: string;
  discount: number; // suggested discount %
}

function generateComboSuggestions(classified: ClassifiedProduct[]): ComboSuggestion[] {
  const suggestions: ComboSuggestion[] = [];
  const fast = classified.filter((c) => c.tags.includes("fast_selling"));
  const slow = classified.filter((c) => c.tags.includes("slow_selling"));
  const nearExpiry = classified.filter((c) => c.tags.includes("near_expiry"));
  const overstocked = classified.filter((c) => c.tags.includes("overstocked"));

  // Group by unique product names (avoid duplicates from batch entries)
  function uniqueByName(arr: ClassifiedProduct[]) {
    const seen = new Set<string>();
    return arr.filter((c) => {
      if (seen.has(c.product.name)) return false;
      seen.add(c.product.name);
      return true;
    });
  }

  const uFast = uniqueByName(fast);
  const uSlow = uniqueByName(slow);
  const uNearExpiry = uniqueByName(nearExpiry);
  const uOverstocked = uniqueByName(overstocked);

  // Fast + Slow combos
  uFast.forEach((f) => {
    uSlow.forEach((s) => {
      if (f.product.name !== s.product.name && suggestions.length < 12) {
        suggestions.push({
          product1: f.product,
          product2: s.product,
          reason: `Pair fast-selling "${f.product.name}" with slow-selling "${s.product.name}" to boost slow item sales`,
          type: "Fast + Slow",
          discount: 15,
        });
      }
    });
  });

  // Fast + Near Expiry combos
  uFast.forEach((f) => {
    uNearExpiry.forEach((ne) => {
      if (f.product.name !== ne.product.name && suggestions.length < 12) {
        suggestions.push({
          product1: f.product,
          product2: ne.product,
          reason: `Combine popular "${f.product.name}" with near-expiry "${ne.product.name}" (${ne.daysToExpiry}d left) to reduce waste`,
          type: "Fast + Near Expiry",
          discount: 25,
        });
      }
    });
  });

  // Overstocked + Popular
  uOverstocked.forEach((o) => {
    uFast.forEach((f) => {
      if (o.product.name !== f.product.name && suggestions.length < 12) {
        suggestions.push({
          product1: o.product,
          product2: f.product,
          reason: `Bundle overstocked "${o.product.name}" (${o.product.quantity} units) with popular "${f.product.name}"`,
          type: "Overstock + Popular",
          discount: 20,
        });
      }
    });
  });

  // BOGO — Near Expiry items
  uNearExpiry.forEach((ne) => {
    if (suggestions.length < 12 && ne.product.quantity >= 2) {
      suggestions.push({
        product1: ne.product,
        product2: ne.product,
        reason: `Buy 1 Get 1 on "${ne.product.name}" — expires in ${ne.daysToExpiry} days, ${ne.product.quantity} in stock`,
        type: "Buy 1 Get 1",
        discount: 50,
      });
    }
  });

  // Slow + Slow bundle
  for (let i = 0; i < uSlow.length && suggestions.length < 12; i++) {
    for (let j = i + 1; j < uSlow.length && suggestions.length < 12; j++) {
      suggestions.push({
        product1: uSlow[i].product,
        product2: uSlow[j].product,
        reason: `Discount bundle of slow-selling "${uSlow[i].product.name}" + "${uSlow[j].product.name}" to clear stock`,
        type: "Discount Bundle",
        discount: 20,
      });
    }
  }

  return suggestions.slice(0, 10);
}

// ═══════════ Tag Badge Helper ═══════════
function TagBadge({ tag }: { tag: string }) {
  const config: Record<string, { label: string; className: string }> = {
    fast_selling: { label: "Fast Selling", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    slow_selling: { label: "Slow Selling", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    near_expiry: { label: "Near Expiry", className: "bg-red-500/15 text-red-400 border-red-500/30" },
    overstocked: { label: "Overstocked", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    expired: { label: "Expired", className: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
  };
  const c = config[tag] || { label: tag, className: "bg-muted text-muted-foreground" };
  return <Badge className={`${c.className} shadow-none text-[10px]`}>{c.label}</Badge>;
}

// ═══════════ Combo Status Badge ═══════════
function ComboStatusBadge({ status, endDate }: { status: ComboOffer["status"]; endDate: string }) {
  const isExpired = status === "expired" || new Date(endDate) < new Date();
  if (isExpired) return <Badge className="bg-gray-500/15 text-gray-400 border-gray-500/30 shadow-none text-[10px]">Expired</Badge>;
  if (status === "active") return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-none text-[10px]">Active</Badge>;
  return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-none text-[10px]">Inactive</Badge>;
}

// ═══════════ Remaining Days Helper ═══════════
function RemainingDays({ endDate }: { endDate: string }) {
  const days = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return <span className="text-gray-400 text-xs">Expired</span>;
  if (days === 0) return <span className="text-red-400 text-xs font-medium">Last day!</span>;
  if (days <= 2) return <span className="text-amber-400 text-xs font-medium">{days}d left</span>;
  return <span className="text-muted-foreground text-xs">{days}d left</span>;
}

// ═══════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════
export default function ComboOffers() {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: sales = [], isLoading: loadingSales } = useSales();
  const { data: comboOffers = [], isLoading: loadingCombos } = useComboOffers();
  const { data: comboSales = [], isLoading: loadingComboSales } = useComboSales();
  const addComboOffer = useAddComboOffer();
  const updateComboOffer = useUpdateComboOffer();
  const deleteComboOffer = useDeleteComboOffer();
  const sellCombo = useSellCombo();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [comboForm, setComboForm] = useState({
    combo_name: "",
    product1: "",
    product2: "",
    product3: "",
    combo_price: "",
    discount_percentage: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    suggestion_reason: "",
  });

  // ─── Classified Products + AI Suggestions ───
  const classified = useMemo(() => classifyProducts(products, sales), [products, sales]);
  const suggestions = useMemo(() => generateComboSuggestions(classified), [classified]);

  // ─── Unique product names for selects ───
  const productNames = useMemo(() => {
    const names = new Set<string>();
    products.filter((p) => p.quantity > 0).forEach((p) => names.add(p.name));
    return Array.from(names).sort();
  }, [products]);

  // ─── Price lookup helper ───
  function getProductPrice(name: string): number {
    const p = products.find((pr) => pr.name === name && pr.quantity > 0);
    return p?.price || 0;
  }

  // ─── Dashboard stats ───
  const totalCombos = comboOffers.length;
  const activeCombos = comboOffers.filter((c) => c.status === "active" && new Date(c.end_date) >= new Date()).length;
  const totalComboSalesCount = comboSales.length;
  const comboRevenue = comboSales.reduce((s, cs) => s + cs.combo_price, 0);
  const discountSaved = comboSales.reduce((s, cs) => s + cs.discount_amount, 0);
  const productsSoldViaCombos = comboSales.reduce((s, cs) => s + (cs.products_sold ? cs.products_sold.split(",").length : 0), 0);

  const nearExpiryProductsSavedViaCombo = useMemo(() => {
    const nearExpiryNames = new Set(
      classified.filter((c) => c.tags.includes("near_expiry")).map((c) => c.product.name)
    );
    let count = 0;
    comboSales.forEach((cs) => {
      (cs.products_sold || "").split(",").forEach((pn) => {
        if (nearExpiryNames.has(pn.trim())) count++;
      });
    });
    return count;
  }, [classified, comboSales]);

  // ─── Auto-calculate price/discount when products selected ───
  function updatePricing(p1: string, p2: string, p3: string, discountStr: string) {
    const orig = getProductPrice(p1) + getProductPrice(p2) + (p3 ? getProductPrice(p3) : 0);
    const disc = Number(discountStr) || 0;
    const comboPrice = Math.round(orig * (1 - disc / 100));
    setComboForm((f) => ({ ...f, combo_price: String(comboPrice) }));
  }

  function handleProductSelect(field: "product1" | "product2" | "product3", value: string) {
    setComboForm((f) => {
      const next = { ...f, [field]: value };
      updatePricing(
        field === "product1" ? value : f.product1,
        field === "product2" ? value : f.product2,
        field === "product3" ? value : f.product3,
        f.discount_percentage
      );
      return next;
    });
  }

  function handleDiscountChange(disc: string) {
    setComboForm((f) => {
      const orig = getProductPrice(f.product1) + getProductPrice(f.product2) + (f.product3 ? getProductPrice(f.product3) : 0);
      const comboPrice = Math.round(orig * (1 - (Number(disc) || 0) / 100));
      return { ...f, discount_percentage: disc, combo_price: String(comboPrice) };
    });
  }

  // ─── Accept AI Suggestion ───
  function acceptSuggestion(s: ComboSuggestion) {
    const orig = s.product1.price + s.product2.price + (s.product3?.price || 0);
    const comboPrice = Math.round(orig * (1 - s.discount / 100));
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    setComboForm({
      combo_name: `${s.product1.name} + ${s.product2.name}${s.product3 ? " + " + s.product3.name : ""} Combo`,
      product1: s.product1.name,
      product2: s.product2.name,
      product3: s.product3?.name || "",
      combo_price: String(comboPrice),
      discount_percentage: String(s.discount),
      start_date: new Date().toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      suggestion_reason: s.reason,
    });
    setCreateDialogOpen(true);
  }

  // ─── Create Combo ───
  async function handleCreateCombo() {
    if (!comboForm.combo_name || !comboForm.product1 || !comboForm.product2 || !comboForm.combo_price || !comboForm.end_date) {
      toast.error("Please fill all required fields");
      return;
    }
    const orig = getProductPrice(comboForm.product1) + getProductPrice(comboForm.product2) + (comboForm.product3 ? getProductPrice(comboForm.product3) : 0);

    try {
      await addComboOffer.mutateAsync({
        combo_name: comboForm.combo_name,
        product1_name: comboForm.product1,
        product2_name: comboForm.product2,
        product3_name: comboForm.product3,
        original_total_price: orig,
        combo_price: Number(comboForm.combo_price),
        discount_percentage: Number(comboForm.discount_percentage) || Math.round(((orig - Number(comboForm.combo_price)) / orig) * 100),
        start_date: comboForm.start_date,
        end_date: comboForm.end_date,
        status: "active",
        suggestion_reason: comboForm.suggestion_reason || "Manually created",
      });
      toast.success("Combo offer created!");
      setCreateDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function resetForm() {
    setComboForm({ combo_name: "", product1: "", product2: "", product3: "", combo_price: "", discount_percentage: "", start_date: new Date().toISOString().split("T")[0], end_date: "", suggestion_reason: "" });
  }

  // ─── Toggle status ───
  async function toggleComboStatus(combo: ComboOffer) {
    try {
      await updateComboOffer.mutateAsync({
        id: combo.id,
        status: combo.status === "active" ? "inactive" : "active",
      });
      toast.success(`Combo ${combo.status === "active" ? "deactivated" : "activated"}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // ─── Sell combo ───
  async function handleSellCombo(combo: ComboOffer) {
    try {
      await sellCombo.mutateAsync(combo);
      toast.success(`Combo "${combo.combo_name}" sold! Stock updated.`);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // ─── Delete combo ───
  async function handleDeleteCombo(id: string) {
    try {
      await deleteComboOffer.mutateAsync(id);
      toast.success("Combo deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // ─── Loading ───
  if (loadingProducts || loadingSales || loadingCombos || loadingComboSales) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading combo offers...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, filter: "blur(5px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.98, filter: "blur(5px)" }}
      transition={{ duration: 0.4 }}
    >
      {/* ─── Header ─── */}
      <div className="page-header flex justify-between items-start">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            AI Combo Offers
          </h1>
          <p className="page-subtitle">Smart combo suggestions to boost sales and reduce waste</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Combo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Combo Offer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Combo Name *</Label>
                <Input placeholder="e.g., Tea + Biscuit Combo" value={comboForm.combo_name} onChange={(e) => setComboForm((f) => ({ ...f, combo_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Product 1 *</Label>
                <Select value={comboForm.product1} onValueChange={(v) => handleProductSelect("product1", v)}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {productNames.map((n) => (
                      <SelectItem key={n} value={n}>{n} (₹{getProductPrice(n)})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Product 2 *</Label>
                <Select value={comboForm.product2} onValueChange={(v) => handleProductSelect("product2", v)}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {productNames.filter((n) => n !== comboForm.product1).map((n) => (
                      <SelectItem key={n} value={n}>{n} (₹{getProductPrice(n)})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Product 3 (Optional)</Label>
                <Select value={comboForm.product3 || "__none__"} onValueChange={(v) => handleProductSelect("product3", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {productNames.filter((n) => n !== comboForm.product1 && n !== comboForm.product2).map((n) => (
                      <SelectItem key={n} value={n}>{n} (₹{getProductPrice(n)})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pricing Summary */}
              {comboForm.product1 && comboForm.product2 && (
                <div className="p-3 rounded-xl bg-muted/50 border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Original Total:</span>
                    <span className="line-through text-muted-foreground">
                      ₹{(getProductPrice(comboForm.product1) + getProductPrice(comboForm.product2) + (comboForm.product3 ? getProductPrice(comboForm.product3) : 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-primary">Combo Price:</span>
                    <span className="text-primary">₹{Number(comboForm.combo_price || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount %</Label>
                  <Input type="number" min="0" max="80" value={comboForm.discount_percentage} onChange={(e) => handleDiscountChange(e.target.value)} placeholder="e.g., 15" />
                </div>
                <div className="space-y-2">
                  <Label>Combo Price (₹)</Label>
                  <Input type="number" min="0" value={comboForm.combo_price} onChange={(e) => setComboForm((f) => ({ ...f, combo_price: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={comboForm.start_date} onChange={(e) => setComboForm((f) => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Input type="date" value={comboForm.end_date} onChange={(e) => setComboForm((f) => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              {comboForm.suggestion_reason && (
                <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                  <Sparkles className="h-3 w-3 inline mr-1" />
                  AI Suggestion: {comboForm.suggestion_reason}
                </div>
              )}
              <Button onClick={handleCreateCombo} className="w-full" disabled={addComboOffer.isPending}>
                {addComboOffer.isPending ? "Creating..." : "Create Combo Offer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ─── Dashboard Stats ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[
          { label: "Total Combos", value: totalCombos, icon: Gift, color: "rgba(139,92,246,0.15)", iconColor: "text-violet-300" },
          { label: "Active Combos", value: activeCombos, icon: Zap, color: "rgba(16,185,129,0.15)", iconColor: "text-emerald-300" },
          { label: "Combo Sales", value: totalComboSalesCount, icon: ShoppingCart, color: "rgba(59,130,246,0.15)", iconColor: "text-blue-300" },
          { label: "Combo Revenue", value: comboRevenue, icon: TrendingUp, color: "rgba(16,185,129,0.15)", iconColor: "text-emerald-300", prefix: "₹" },
          { label: "Products Sold", value: productsSoldViaCombos, icon: Package, color: "rgba(245,158,11,0.15)", iconColor: "text-amber-300" },
          { label: "Saved from Expiry", value: nearExpiryProductsSavedViaCombo, icon: AlertTriangle, color: "rgba(236,72,153,0.15)", iconColor: "text-pink-300" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="stat-card relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(135deg, ${stat.color}, transparent)` }} />
            <div className="flex items-center justify-between mb-1.5 relative z-10">
              <span className="text-xs text-white/70">{stat.label}</span>
              <stat.icon className={`h-3.5 w-3.5 ${stat.iconColor}`} />
            </div>
            <p className="text-xl font-bold font-display relative z-10">
              {stat.prefix || ""}<CountUp end={stat.value} duration={2} separator="," />
            </p>
          </motion.div>
        ))}
      </div>

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="suggestions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suggestions" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> AI Suggestions
          </TabsTrigger>
          <TabsTrigger value="combos" className="gap-1.5">
            <Gift className="h-3.5 w-3.5" /> My Combos
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Reports
          </TabsTrigger>
        </TabsList>

        {/* ═════ AI SUGGESTIONS TAB ═════ */}
        <TabsContent value="suggestions">
          {/* Product Classification Header */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-400" />
                Product Classification
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classified.filter((c) => c.tags.length > 0).length === 0 ? (
                <p className="text-muted-foreground text-sm">No products to classify yet. Add products and make some sales first.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-xs text-emerald-400 font-medium">Fast Selling</p>
                    <p className="text-2xl font-bold mt-1">{classified.filter((c) => c.tags.includes("fast_selling")).length}</p>
                    <div className="mt-2 space-y-0.5">
                      {classified.filter((c) => c.tags.includes("fast_selling")).slice(0, 3).map((c) => (
                        <p key={c.product.id} className="text-xs text-muted-foreground truncate">{c.product.name}</p>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <p className="text-xs text-amber-400 font-medium">Slow Selling</p>
                    <p className="text-2xl font-bold mt-1">{classified.filter((c) => c.tags.includes("slow_selling")).length}</p>
                    <div className="mt-2 space-y-0.5">
                      {classified.filter((c) => c.tags.includes("slow_selling")).slice(0, 3).map((c) => (
                        <p key={c.product.id} className="text-xs text-muted-foreground truncate">{c.product.name}</p>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                    <p className="text-xs text-red-400 font-medium">Near Expiry</p>
                    <p className="text-2xl font-bold mt-1">{classified.filter((c) => c.tags.includes("near_expiry")).length}</p>
                    <div className="mt-2 space-y-0.5">
                      {classified.filter((c) => c.tags.includes("near_expiry")).slice(0, 3).map((c) => (
                        <p key={c.product.id} className="text-xs text-muted-foreground truncate">{c.product.name} ({c.daysToExpiry}d)</p>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <p className="text-xs text-blue-400 font-medium">Overstocked</p>
                    <p className="text-2xl font-bold mt-1">{classified.filter((c) => c.tags.includes("overstocked")).length}</p>
                    <div className="mt-2 space-y-0.5">
                      {classified.filter((c) => c.tags.includes("overstocked")).slice(0, 3).map((c) => (
                        <p key={c.product.id} className="text-xs text-muted-foreground truncate">{c.product.name} ({c.product.quantity})</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Recommended Combos for Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suggestions.length === 0 ? (
                <div className="text-center py-10">
                  <Sparkles className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    Not enough data to generate suggestions yet. Add more products and sales to enable AI combos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {suggestions.map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative p-4 rounded-2xl border bg-gradient-to-br from-muted/50 to-transparent hover:border-primary/30 transition-all group"
                      >
                        {/* Discount badge */}
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-primary/20 text-primary border-primary/30 shadow-none text-xs font-bold">
                            -{s.discount}%
                          </Badge>
                        </div>

                        {/* Type label */}
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">{s.type}</p>

                        {/* Products */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-sm">{s.product1.name}</span>
                          <span className="text-muted-foreground text-xs">+</span>
                          <span className="font-semibold text-sm">{s.product2.name}</span>
                          {s.product3 && (
                            <>
                              <span className="text-muted-foreground text-xs">+</span>
                              <span className="font-semibold text-sm">{s.product3.name}</span>
                            </>
                          )}
                        </div>

                        {/* Pricing */}
                        <div className="flex items-center gap-3 mb-2 text-sm">
                          <span className="line-through text-muted-foreground">
                            ₹{(s.product1.price + s.product2.price + (s.product3?.price || 0)).toLocaleString()}
                          </span>
                          <span className="text-primary font-bold">
                            ₹{Math.round((s.product1.price + s.product2.price + (s.product3?.price || 0)) * (1 - s.discount / 100)).toLocaleString()}
                          </span>
                        </div>

                        {/* Reason */}
                        <p className="text-xs text-muted-foreground mb-3">{s.reason}</p>

                        {/* Accept button */}
                        <Button size="sm" className="w-full opacity-90 group-hover:opacity-100" onClick={() => acceptSuggestion(s)}>
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                          Accept & Create Combo
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═════ MY COMBOS TAB ═════ */}
        <TabsContent value="combos">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                My Combo Offers ({comboOffers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {comboOffers.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    No combos created yet. Use AI suggestions or create one manually!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {comboOffers.map((combo) => {
                    const isExpired = new Date(combo.end_date) < new Date();
                    const isActive = combo.status === "active" && !isExpired;
                    const salesForThisCombo = comboSales.filter((cs) => cs.combo_id === combo.id);

                    return (
                      <motion.div
                        key={combo.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`rounded-2xl border p-4 transition-all ${
                          isActive
                            ? "bg-gradient-to-br from-primary/5 to-emerald-500/5 border-primary/20 hover:shadow-lg hover:shadow-primary/5"
                            : "bg-muted/30 border-border opacity-70"
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-sm">{combo.combo_name}</h3>
                            <RemainingDays endDate={combo.end_date} />
                          </div>
                          <div className="flex items-center gap-2">
                            <ComboStatusBadge status={combo.status} endDate={combo.end_date} />
                          </div>
                        </div>

                        {/* Products */}
                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span>{combo.product1_name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span>{combo.product2_name}</span>
                          </div>
                          {combo.product3_name && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Package className="h-3 w-3 text-muted-foreground" />
                              <span>{combo.product3_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Pricing */}
                        <div className="flex items-center gap-3 mb-3">
                          <span className="line-through text-muted-foreground text-sm">₹{combo.original_total_price}</span>
                          <span className="text-primary font-bold">₹{combo.combo_price}</span>
                          <Badge className="bg-green-500/15 text-green-400 border-green-500/30 shadow-none text-[10px]">
                            -{combo.discount_percentage}%
                          </Badge>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                          <span>{salesForThisCombo.length} sold</span>
                          <span>₹{salesForThisCombo.reduce((s, c) => s + c.combo_price, 0).toLocaleString()} revenue</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <Button
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => handleSellCombo(combo)}
                              disabled={sellCombo.isPending}
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Sell Combo
                            </Button>
                          )}
                          <div className="flex items-center gap-1.5 ml-auto">
                            {!isExpired && (
                              <Switch
                                checked={combo.status === "active"}
                                onCheckedChange={() => toggleComboStatus(combo)}
                              />
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                              onClick={() => handleDeleteCombo(combo.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Suggestion reason */}
                        {combo.suggestion_reason && combo.suggestion_reason !== "Manually created" && (
                          <p className="text-[10px] text-blue-400/70 mt-2 flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5" />
                            {combo.suggestion_reason}
                          </p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═════ REPORTS TAB ═════ */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Combo Sales Report */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Combo Sales Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                {comboSales.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">No combo sales yet.</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {comboSales.slice(0, 20).map((cs) => (
                      <div key={cs.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                        <div>
                          <p className="font-medium text-sm">{cs.combo_name}</p>
                          <p className="text-xs text-muted-foreground">{cs.products_sold} · {cs.sale_date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm text-primary">₹{cs.combo_price}</p>
                          <p className="text-xs text-emerald-400">Saved ₹{cs.discount_amount}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Combo Performance Report */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Combo Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {comboOffers.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">No combos to analyze.</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {comboOffers.map((combo) => {
                      const sales = comboSales.filter((cs) => cs.combo_id === combo.id);
                      const revenue = sales.reduce((s, c) => s + c.combo_price, 0);
                      const discountGiven = sales.reduce((s, c) => s + c.discount_amount, 0);

                      return (
                        <div key={combo.id} className="p-3 rounded-lg bg-muted/50 border">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm">{combo.combo_name}</p>
                            <ComboStatusBadge status={combo.status} endDate={combo.end_date} />
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-lg font-bold">{sales.length}</p>
                              <p className="text-[10px] text-muted-foreground">Sales</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-primary">₹{revenue.toLocaleString()}</p>
                              <p className="text-[10px] text-muted-foreground">Revenue</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-amber-400">₹{discountGiven.toLocaleString()}</p>
                              <p className="text-[10px] text-muted-foreground">Discounts</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expiry Reduction Report */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-pink-400" />
                  Expiry Reduction via Combos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="p-4 rounded-xl bg-pink-500/5 border border-pink-500/20 text-center">
                    <p className="text-3xl font-bold text-pink-300">{nearExpiryProductsSavedViaCombo}</p>
                    <p className="text-xs text-muted-foreground mt-1">Near-Expiry Products Saved</p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                    <p className="text-3xl font-bold text-emerald-300">{discountSaved.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">₹ Total Discount Given</p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
                    <p className="text-3xl font-bold text-blue-300">{productsSoldViaCombos}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Products Moved via Combos</p>
                  </div>
                </div>

                {/* Near expiry products that are part of active combos */}
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Days to Expiry</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Sales Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classified
                        .filter((c) => c.tags.includes("near_expiry") || c.tags.includes("slow_selling"))
                        .slice(0, 10)
                        .map((c) => (
                          <TableRow key={c.product.id}>
                            <TableCell className="font-medium">{c.product.name}</TableCell>
                            <TableCell>
                              <span className={c.daysToExpiry <= 2 ? "text-red-400 font-medium" : c.daysToExpiry <= 5 ? "text-amber-400" : "text-muted-foreground"}>
                                {c.daysToExpiry < 0 ? "Expired" : `${c.daysToExpiry}d`}
                              </span>
                            </TableCell>
                            <TableCell>{c.product.quantity}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {c.tags.map((t) => <TagBadge key={t} tag={t} />)}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {c.dailySalesRate.toFixed(1)}/day
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
