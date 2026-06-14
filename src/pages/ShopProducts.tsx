import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Search, Package, AlertCircle, Store, Phone, MapPin, ShoppingCart } from "lucide-react";
import { useShopProducts } from "@/hooks/useData";
import { useAllShopkeepers } from "@/hooks/useData";

export default function ShopProducts() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const shopId = id || "";

    const { data: shopkeepers = [] } = useAllShopkeepers();
    const { data: products = [], isLoading, error } = useShopProducts(shopId || "");

    const [search, setSearch] = useState("");

    // Find the shop details
    const shop = shopkeepers.find((s: any) => s.user_id === shopId || s.id === shopId);

    // Filter products by search
    const filteredProducts = products.filter((p: any) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            p.name?.toLowerCase().includes(q) ||
            p.category?.toLowerCase().includes(q)
        );
    });

    // Loading state
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Loading products...</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4 p-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <h2 className="text-xl font-semibold">Error Loading Products</h2>
                <p className="text-muted-foreground text-center">Failed to load shop products. Please try again.</p>
                <p className="text-xs text-red-500 max-w-md text-center bg-red-50 p-2 rounded">
                    {error.message}
                </p>
                <Button variant="outline" onClick={() => navigate("/network")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Shop Network
                </Button>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header with back button */}
            <div className="flex items-center gap-4 mb-6">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate("/network")}
                    className="shrink-0"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                    <h1 className="page-title text-xl truncate">
                        {shop?.shop_name || "Shop Products"}
                    </h1>
                    <p className="page-subtitle text-sm">
                        {products.length} products available
                    </p>
                </div>
            </div>

            {/* Shop Info Card */}
            {shop && (
                <Card className="mb-6">
                    <CardContent className="pt-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Store className="h-8 w-8 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="font-semibold text-lg">{shop.shop_name || "Unnamed Shop"}</h2>
                                <p className="text-sm text-muted-foreground">
                                    by {shop.owner_name || "Unknown"}
                                </p>
                                {shop.address && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                        <MapPin className="h-3 w-3" />
                                        <span className="truncate">{shop.address}</span>
                                    </div>
                                )}
                                {shop.phone && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                        <Phone className="h-3 w-3" />
                                        <a href={`tel:${shop.phone}`} className="hover:underline">
                                            {shop.phone}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search products..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-lg bg-muted/10">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">
                        {search ? "No products found" : "No products available"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {search
                            ? `No results for "${search}". Try a different search term.`
                            : "This shop hasn't added any products yet."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProducts.map((product: any, index: number) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                        >
                            <Card className="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                                <CardHeader className="pb-2 border-b bg-muted/20">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-base font-semibold line-clamp-2">
                                            {product.name}
                                        </CardTitle>
                                        {product.quantity <= 5 && product.quantity > 0 && (
                                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200 shrink-0">
                                                Low Stock
                                            </Badge>
                                        )}
                                    </div>
                                    <Badge variant="secondary" className="text-xs w-fit mt-1">
                                        {product.category}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="flex-1 pt-4 flex flex-col">
                                    <div className="flex items-baseline justify-between mb-2">
                                        <span className="text-2xl font-bold text-primary">
                                            ₹{Number(product.price).toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="text-sm text-muted-foreground mb-3">
                                        <div className="flex items-center gap-1">
                                            <Package className="h-3 w-3" />
                                            <span>Stock: {product.quantity}</span>
                                        </div>
                                        {product.expiry_date && (
                                            <div className="text-xs mt-1">
                                                Expires: {new Date(product.expiry_date).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>

                                    {product.quantity > 0 ? (
                                        <Button
                                            size="sm"
                                            className="mt-auto gap-2"
                                            variant="outline"
                                            disabled
                                        >
                                            <ShoppingCart className="h-3.5 w-3.5" />
                                            View Product
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            className="mt-auto"
                                            variant="secondary"
                                            disabled
                                        >
                                            Out of Stock
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Results count */}
            {filteredProducts.length > 0 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                    Showing {filteredProducts.length} of {products.length} products
                </p>
            )}
        </motion.div>
    );
}
