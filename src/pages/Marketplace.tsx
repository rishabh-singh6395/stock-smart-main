import { useState } from "react";
import { Search, ShoppingBag, Store, Tags, ChevronDown, ChevronRight, Percent, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMarketplaceListings } from "@/hooks/useData";
import { motion } from "framer-motion";

export default function Marketplace() {
  const { data: listings = [], isLoading } = useMarketplaceListings();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (name: string) => setExpanded(e => ({ ...e, [name]: !e[name] }));

  // Group listings by product name
  const groupedProducts = listings.reduce((acc: any, curr: any) => {
    if (curr.quantity <= 0) return acc; // Only available products

    const nameMatch = curr.name.trim();
    if (!acc[nameMatch]) {
      acc[nameMatch] = {
        name: nameMatch,
        category: curr.category,
        shops: [],
        minPrice: Number(curr.price),
        maxPrice: Number(curr.price),
      };
    }

    acc[nameMatch].shops.push({
      shopName: curr.shop_name,
      price: Number(curr.price),
      quantity: curr.quantity,
      id: curr.id,
      phone: curr.contact_phone,
    });

    if (Number(curr.price) < acc[nameMatch].minPrice) acc[nameMatch].minPrice = Number(curr.price);
    if (Number(curr.price) > acc[nameMatch].maxPrice) acc[nameMatch].maxPrice = Number(curr.price);

    return acc;
  }, {});

  const groupedArray = Object.values(groupedProducts) as any[];

  // Extract unique categories for filter
  const categories = Array.from(new Set(groupedArray.map(p => p.category)));

  const filtered = groupedArray.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ?? false;
    const matchCat = filterCategory === "all" || p.category?.toLowerCase() === filterCategory.toLowerCase();
    return matchSearch && matchCat;
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading marketplace...</div>;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
      transition={{ duration: 0.4 }}
    >
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <ShoppingBag className="h-7 w-7 text-primary" />
          Customer Marketplace
        </h1>
        <p className="page-subtitle">Browse products, compare prices across shops, and find the best deals near you.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search products by name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c as string} value={c as string}>{c as string}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No products available right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(product => {
            const isExpanded = expanded[product.name];
            const hasMultipleShops = product.shops.length > 1;
            const hasDiscount = product.minPrice < product.maxPrice;
            const discountPercent = hasDiscount ? Math.round(((product.maxPrice - product.minPrice) / product.maxPrice) * 100) : 0;
            // Sorting shops by price cheapest to most expensive
            const sortedShops = [...product.shops].sort((a, b) => a.price - b.price);

            return (
              <Card key={product.name} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 border-b bg-muted/20 relative">
                  {hasDiscount && (
                    <Badge variant="destructive" className="absolute top-4 right-4 bg-rose-500 shadow-sm flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      Save up to {discountPercent}%
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px] w-fit font-semibold uppercase tracking-wider">{product.category}</Badge>
                  <CardTitle className="text-xl mt-2 font-bold">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-4">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {hasMultipleShops ? "Starting from" : "Price"}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold font-display text-primary">₹{product.minPrice}</span>
                        {hasDiscount && <span className="text-sm text-muted-foreground line-through">₹{product.maxPrice}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-md w-fit font-medium mb-4">
                    <Store className="h-4 w-4" />
                    Available in {product.shops.length} {product.shops.length === 1 ? 'shop' : 'shops'}
                  </div>

                  <div className="mt-auto pt-2">
                    <Button
                      variant="outline"
                      className="w-full justify-between font-semibold shadow-sm"
                      onClick={() => toggleExpand(product.name)}
                    >
                      <span>{isExpanded ? "Hide Sellers" : "Compare Sellers"}</span>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>

                    {/* SHOPS EXPANDABLE LIST */}
                    {isExpanded && (
                      <div className="mt-3 space-y-2 bg-muted/30 p-2 rounded-lg border">
                        {sortedShops.map((shop, idx) => (
                          <div key={shop.id} className={`flex items-center justify-between p-2.5 rounded-md border ${idx === 0 && hasMultipleShops ? "bg-success/10 border-success/30" : "bg-background"}`}>
                            <div>
                              <div className="font-semibold text-sm flex items-center gap-1.5">
                                {shop.shopName}
                                {idx === 0 && hasMultipleShops && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Stock: {shop.quantity} • <a href={`tel:${shop.phone}`} className="hover:underline text-primary">{shop.phone}</a>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-foreground">₹{shop.price}</div>
                              {idx === 0 && hasMultipleShops && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1 pb-0.5 mt-1 bg-success/20 text-success-foreground border-success/30">
                                  Best Price
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </motion.div>
  );
}
