import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMarketplaceListings, useProfile, useAllShopkeepers } from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Phone, AlertCircle, Loader2, Store, MapPin, Package, Search, Calendar, Tag, Box, Percent, Map, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LeafletMap from "@/components/ShopMap";
import GoogleMaps from "@/components/GoogleShopMap";
import { getGoogleMapsApiKey } from "@/pages/MapSettings";

export default function Customer() {
  const { data: listings = [], isLoading: listingsLoading, error: listingsError } = useMarketplaceListings();
  const { data: shopkeepers = [], isLoading: shopsLoading } = useAllShopkeepers();
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("products");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState("");
  const [showMap, setShowMap] = useState(true);
  const [mapProvider, setMapProvider] = useState<'leaflet' | 'google'>(getGoogleMapsApiKey() ? 'google' : 'leaflet');

  // Debug: show error details
  React.useEffect(() => {
    if (listingsError) {
      console.error("Listings error:", listingsError);
      setDebugInfo(`Listings Error: ${listingsError.message}`);
    }
    if (profileError) {
      console.error("Profile error:", profileError);
      setDebugInfo(`Profile Error: ${profileError.message}`);
    }
  }, [listingsError, profileError]);

  function extractPincode(addr?: string) {
    if (!addr) return null;
    const m = String(addr).match(/\b(\d{6})\b/);
    return m ? m[1] : null;
  }

  const pincode = profile?.pincode || extractPincode(profile?.address);

  // Filter shops by area if pincode is set
  const filteredShops = pincode
    ? shopkeepers.filter((s: any) => {
      const shopPin = s.pincode || extractPincode(s.address);
      return shopPin === pincode;
    })
    : shopkeepers;

  // Try to filter by pincode, but fall back to all listings if no pincode match
  const areaListings = pincode ? listings.filter((l: any) => (l.shop_pincode === pincode) || extractPincode(l.shop_address) === pincode) : [];
  // If no area-specific listings, show all listings
  const source = areaListings.length > 0 ? areaListings : listings;

  const filtered = source.filter((l: any) => {
    const q = search.toLowerCase();
    return l.name?.toLowerCase().includes(q) || l.shop_name?.toLowerCase().includes(q) || l.category?.toLowerCase().includes(q);
  });

  // Filter shops by search
  const searchedShops = filteredShops.filter((s: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.shop_name || "").toLowerCase().includes(q) ||
      (s.owner_name || "").toLowerCase().includes(q) ||
      (s.address || "").toLowerCase().includes(q)
    );
  });

  // Get shop details for a product
  function getShopForProduct(product: any) {
    return shopkeepers.find((s: any) => s.user_id === product.user_id);
  }

  // Calculate discount
  function calculateDiscount(originalPrice: number, product: any) {
    if (product.discount_type === "percentage" && product.discount_value) {
      return Math.round((originalPrice * product.discount_value) / 100);
    }
    if (product.discount_type === "fixed" && product.discount_value) {
      return product.discount_value;
    }
    return 0;
  }

  // Check if discount is active
  function isDiscountActive(product: any) {
    if (!product.discount_start_date || !product.discount_end_date) return false;
    const now = new Date();
    const start = new Date(product.discount_start_date);
    const end = new Date(product.discount_end_date);
    return now >= start && now <= end;
  }

  // Loading state
  if (listingsLoading || profileLoading || shopsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading marketplace...</p>
      </div>
    );
  }

  // Error state
  if (listingsError || profileError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 p-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Error Loading Data</h2>
        <p className="text-muted-foreground text-center">Failed to load marketplace data. Please try again.</p>
        {debugInfo && (
          <p className="text-xs text-red-500 max-w-md text-center bg-red-50 p-2 rounded">{debugInfo}</p>
        )}
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  // No profile - still show all products
  const showAllProducts = !profile;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto">
      <div className="page-header mb-4 flex items-center justify-between">
        <div>
          <h1 className="page-title">Local Market</h1>
          <p className="page-subtitle">
            Buy products from shopkeepers in your area
            {pincode ? ` (Pincode: ${pincode})` : ''}
            {showAllProducts && <span className="text-amber-500 ml-1"> - Set up profile for local results</span>}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => window.location.href = '/customer/profile'}>
            {profile ? 'Edit Profile' : 'Set Up Profile'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="shops" className="gap-2">
            <Store className="h-4 w-4" />
            Shops
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            Showing <strong>{filtered.length}</strong> products
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center py-12 border-dashed border rounded">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p>No products found{search ? ` for "${search}"` : ''} in your area.</p>
              </div>
            ) : filtered.map((l: any) => {
              const discount = calculateDiscount(Number(l.price), l);
              const hasDiscount = discount > 0 && isDiscountActive(l);

              return (
                <Card
                  key={l.id}
                  className={cn(
                    'p-0 overflow-hidden hover:shadow-lg transition-all cursor-pointer group',
                    l.quantity === 0 && 'opacity-60'
                  )}
                  onClick={() => setSelectedProduct(l)}
                >
                  {/* Product Image Area */}
                  <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center relative">
                    <Package className="h-12 w-12 text-primary/30 group-hover:scale-110 transition-transform" />
                    {hasDiscount && (
                      <Badge className="absolute top-2 right-2 bg-red-500 text-white gap-1">
                        <Percent className="h-3 w-3" />
                        {l.discount_type === "percentage" ? l.discount_value : Math.round((discount / Number(l.price)) * 100)}% OFF
                      </Badge>
                    )}
                    {l.quantity === 0 && (
                      <Badge className="absolute top-2 left-2 bg-destructive text-white">
                        Out of Stock
                      </Badge>
                    )}
                    {l.quantity > 0 && l.quantity <= 5 && (
                      <Badge className="absolute top-2 left-2 bg-amber-500 text-white">
                        Only {l.quantity} left
                      </Badge>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <Badge variant="secondary" className="text-xs mb-2">{l.category}</Badge>
                    <CardTitle className="text-base font-bold line-clamp-1">{l.name}</CardTitle>

                    <div className="mt-2 flex items-baseline gap-2">
                      {hasDiscount ? (
                        <>
                          <span className="text-xl font-bold text-primary">₹{Number(l.price) - discount}</span>
                          <span className="text-sm text-muted-foreground line-through">₹{l.price}</span>
                        </>
                      ) : (
                        <span className="text-xl font-bold text-primary">₹{l.price}</span>
                      )}
                    </div>

                    <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                      <Store className="h-3 w-3" />
                      <span className="truncate">{l.shop_name || "Local Shop"}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="shops" className="mt-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shops..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Showing <strong>{searchedShops.length}</strong> shops
              {pincode && <span className="ml-2">(in your area)</span>}
            </div>
            <Button
              variant={showMap ? "default" : "outline"}
              onClick={() => setShowMap(!showMap)}
              className="gap-2 h-8 text-xs"
            >
              <Map className="h-3.5 w-3.5" />
              {showMap ? "Hide Map" : "Show Map"}
            </Button>
          </div>

          {showMap && searchedShops.some((s: any) => s.latitude && s.longitude) && (
            <div className="mb-6">
              {/* Map Provider Toggle */}
              <div className="flex items-center justify-end gap-2 mb-3">
                <span className="text-sm text-muted-foreground">Map:</span>
                <div className="flex gap-1">
                  <Button
                    variant={mapProvider === 'leaflet' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setMapProvider('leaflet')}
                    className="gap-1 h-7 text-xs"
                  >
                    <Map className="h-3 w-3" />
                    OpenStreetMap
                  </Button>
                  <Button
                    variant={mapProvider === 'google' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setMapProvider('google')}
                    className="gap-1 h-7 text-xs"
                    disabled={!getGoogleMapsApiKey()}
                  >
                    <Globe className="h-3 w-3" />
                    Google
                  </Button>
                </div>
              </div>

              {mapProvider === 'leaflet' ? (
                <LeafletMap
                  shops={searchedShops
                    .filter((s: any) => s.latitude && s.longitude)
                    .map((s: any) => ({
                      id: s.id,
                      name: s.shop_name || "Unnamed Shop",
                      owner: s.owner_name,
                      address: s.address,
                      phone: s.phone,
                      latitude: s.latitude,
                      longitude: s.longitude,
                    }))}
                  height="400px"
                  onShopClick={(shop) => {
                    const originalShop = searchedShops.find((s: any) => s.id === shop.id);
                    if (originalShop) {
                       navigate(`/shop/${originalShop.user_id}`);
                    }
                  }}
                  showUserLocation={!!profile?.latitude && !!profile?.longitude}
                  userLatitude={profile?.latitude}
                  userLongitude={profile?.longitude}
                />
              ) : (
                <GoogleMaps
                  shops={searchedShops
                    .filter((s: any) => s.latitude && s.longitude)
                    .map((s: any) => ({
                      id: s.id,
                      name: s.shop_name || "Unnamed Shop",
                      owner: s.owner_name,
                      address: s.address,
                      phone: s.phone,
                      latitude: s.latitude,
                      longitude: s.longitude,
                    }))}
                  apiKey={getGoogleMapsApiKey()}
                  height="400px"
                  onShopClick={(shop) => {
                    const originalShop = searchedShops.find((s: any) => s.id === shop.id);
                    if (originalShop) {
                       navigate(`/shop/${originalShop.user_id}`);
                    }
                  }}
                  showUserLocation={!!profile?.latitude && !!profile?.longitude}
                  userLatitude={profile?.latitude}
                  userLongitude={profile?.longitude}
                />
              )}
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Click on a marker to view shop details and products
              </p>
            </div>
          )}

          {showMap && !searchedShops.some((s: any) => s.latitude && s.longitude) && (
            <div className="bg-muted/30 rounded-lg p-8 mb-6 text-center">
              <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">None of the shops currently have coordinates on the map.</p>
            </div>
          )}

          {!pincode && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 text-sm text-amber-200 flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              Set your pincode in your <a href="/customer/profile" className="underline font-medium">Profile</a> to see shops in your area.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchedShops.length === 0 ? (
              <div className="col-span-full text-center py-12 border-dashed border rounded">
                <Store className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p>No shops found{search ? ` for "${search}"` : ''}.</p>
              </div>
            ) : searchedShops.map((shop: any) => {
              const shopPin = shop.pincode || extractPincode(shop.address);
              const isSameArea = pincode && shopPin === pincode;

              return (
                <Card key={shop.id} className={cn(
                  "p-4 hover:shadow-md transition-shadow cursor-pointer",
                  isSameArea && "border-emerald-500/30 bg-emerald-500/5"
                )}
                  onClick={() => navigate(`/shop/${shop.user_id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold">
                            {shop.shop_name || "Unnamed Shop"}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            by {shop.owner_name || "Unknown"}
                          </p>
                        </div>
                      </div>
                      {isSameArea && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] shrink-0">
                          Your Area
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {shop.address && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
                        <span className="line-clamp-2">{shop.address}</span>
                      </div>
                    )}
                    {shop.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4 shrink-0 text-green-400" />
                        <a href={`tel:${shop.phone}`} className="hover:underline text-foreground font-medium">
                          {shop.phone}
                        </a>
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="w-full mt-3 gap-2"
                    >
                      <Package className="h-3.5 w-3.5" />
                      View Products
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold pr-8">{selectedProduct.name}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Product Image */}
                <div className="h-48 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center relative">
                  <Package className="h-20 w-20 text-primary/30" />
                  {isDiscountActive(selectedProduct) && (
                    <Badge className="absolute top-3 right-3 bg-red-500 text-white text-lg px-3 py-1">
                      <Percent className="h-4 w-4 mr-1" />
                      SALE
                    </Badge>
                  )}
                </div>

                {/* Price Section */}
                <div className="flex items-baseline gap-4">
                  {isDiscountActive(selectedProduct) ? (
                    <>
                      <span className="text-3xl font-bold text-primary">
                        ₹{Number(selectedProduct.price) - calculateDiscount(Number(selectedProduct.price), selectedProduct)}
                      </span>
                      <span className="text-xl text-muted-foreground line-through">₹{selectedProduct.price}</span>
                      <Badge variant="destructive" className="text-sm">
                        Save ₹{calculateDiscount(Number(selectedProduct.price), selectedProduct)}
                      </Badge>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-primary">₹{selectedProduct.price}</span>
                  )}
                </div>

                {/* Product Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-medium">{selectedProduct.category}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Box className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">In Stock:</span>
                    <span className={cn("font-medium", selectedProduct.quantity === 0 && "text-destructive")}>
                      {selectedProduct.quantity} units
                    </span>
                  </div>
                  {selectedProduct.expiry_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Expires:</span>
                      <span className="font-medium">{new Date(selectedProduct.expiry_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedProduct.brand && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Brand:</span>
                      <span className="font-medium">{selectedProduct.brand}</span>
                    </div>
                  )}
                </div>

                {/* Discount Info */}
                {isDiscountActive(selectedProduct) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700 font-medium">
                      <Percent className="h-4 w-4" />
                      Special Discount Available!
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      {selectedProduct.discount_type === "percentage"
                        ? `${selectedProduct.discount_value}% off on this product!`
                        : `₹${selectedProduct.discount_value} discount applied!`
                      }
                    </p>
                  </div>
                )}

                {/* Shop Details */}
                {(() => {
                  const shop = getShopForProduct(selectedProduct);
                  return shop ? (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <Store className="h-5 w-5" />
                        Shop Details
                      </h3>
                      <div className="grid gap-2 bg-muted/30 rounded-lg p-4">
                        <div className="font-medium">{shop.shop_name || "Local Shop"}</div>
                        {shop.owner_name && (
                          <div className="text-sm text-muted-foreground">
                            Owner: {shop.owner_name}
                          </div>
                        )}
                        {shop.address && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{shop.address}</span>
                          </div>
                        )}
                        {shop.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${shop.phone}`} className="hover:underline text-primary font-medium">
                              {shop.phone}
                            </a>
                          </div>
                        )}
                        <Button
                          className="mt-2"
                          onClick={() => {
                            setSelectedProduct(null);
                            navigate(`/shop/${selectedProduct.user_id}`);
                          }}
                        >
                          View All Shop Products
                        </Button>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
