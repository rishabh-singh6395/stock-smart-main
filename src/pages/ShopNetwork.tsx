import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, MapPin, Phone, Search, Package, Users, Filter, Send, Loader2, Map, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAllShopkeepers, useProducts, useProfile, useShopProducts, useCreateStockPurchaseRequest, useMyStockRequests, useIncomingStockRequests, useUpdateStockRequest } from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import LeafletMap from "@/components/ShopMap";
import GoogleMaps from "@/components/GoogleShopMap";
import { getGoogleMapsApiKey } from "@/pages/MapSettings";

export default function ShopNetwork() {
  const { data: shopkeepers = [], isLoading } = useAllShopkeepers();
  const { data: allProducts = [] } = useProducts();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [search, setSearch] = useState("");
  const [showMyAreaOnly, setShowMyAreaOnly] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapProvider, setMapProvider] = useState<'leaflet' | 'google'>(getGoogleMapsApiKey() ? 'google' : 'leaflet');
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showRequestsTab, setShowRequestsTab] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [requestQuantity, setRequestQuantity] = useState(1);
  const [proposedPrice, setProposedPrice] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const { data: shopProducts, isLoading: loadingShopProducts } = useShopProducts(selectedShop?.user_id || "");
  const createRequest = useCreateStockPurchaseRequest();
  const { data: myRequests = [] } = useMyStockRequests();
  const { data: incomingRequests = [] } = useIncomingStockRequests();
  const updateRequest = useUpdateStockRequest();
  const navigate = useNavigate();

  // Get selected product details
  const selectedProductDetails = shopProducts?.find((p: any) => p.id === selectedProduct);

  // Handle send request
  const handleSendRequest = async () => {
    if (!selectedShop || !selectedProductDetails) return;

    try {
      await createRequest.mutateAsync({
        to_shop: selectedShop,
        product_id: selectedProduct,
        product_name: selectedProductDetails.name,
        product_category: selectedProductDetails.category,
        quantity: requestQuantity,
        proposed_price: parseFloat(proposedPrice) || 0,
        notes: requestNotes,
      });
      toast.success("Request sent successfully!");
      setShowRequestDialog(false);
      setSelectedProduct("");
      setRequestQuantity(1);
      setProposedPrice("");
      setRequestNotes("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send request");
    }
  };

  // Handle accept/reject request
  const handleAcceptRequest = async (id: string) => {
    try {
      await updateRequest.mutateAsync({ id, status: "accepted" });
      toast.success("Request accepted!");
    } catch (error: any) {
      toast.error(error.message || "Failed to accept request");
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      await updateRequest.mutateAsync({ id, status: "rejected" });
      toast.success("Request rejected");
    } catch (error: any) {
      toast.error(error.message || "Failed to reject request");
    }
  };

  function extractPincode(addr?: string) {
    if (!addr) return null;
    const m = String(addr).match(/\b(\d{6})\b/);
    return m ? m[1] : null;
  }

  const myPincode = profile?.pincode || extractPincode(profile?.address);

  // Filter shopkeepers (exclude current user and customers)
  const allShops = shopkeepers.filter((s: any) => s.user_id !== user?.uid);

  // Filter by area if toggled
  const filteredByArea = showMyAreaOnly && myPincode
    ? allShops.filter((s: any) => {
      const shopPin = s.pincode || extractPincode(s.address);
      return shopPin === myPincode;
    })
    : allShops;

  // Filter by search
  const filtered = filteredByArea.filter((s: any) => {
    const q = search.toLowerCase();
    return (
      (s.shop_name || "").toLowerCase().includes(q) ||
      (s.owner_name || "").toLowerCase().includes(q) ||
      (s.address || "").toLowerCase().includes(q) ||
      (s.pincode || "").toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p>Loading shops...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="page-header flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Store className="h-7 w-7 text-primary" />
            Shop Network
          </h1>
          <p className="page-subtitle">
            Discover all shopkeepers on the platform. Connect and grow your network.
            {myPincode && <span className="text-xs ml-2 opacity-70">(Your Pincode: {myPincode})</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            <strong className="text-foreground">{filtered.length}</strong> shops found
          </span>
        </div>
        <Button variant="outline" onClick={() => setShowRequestsTab(true)} className="gap-2">
          <Send className="h-4 w-4" />
          My Requests
        </Button>
        <Button
          variant={showMap ? "default" : "outline"}
          onClick={() => setShowMap(!showMap)}
          className="gap-2"
        >
          <Map className="h-4 w-4" />
          {showMap ? "Hide Map" : "Show Map"}
        </Button>
      </div>

      {/* Map Section */}
      {showMap && filtered.some((s: any) => s.latitude && s.longitude) && (
        <div className="mb-6">
          {/* Map Provider Toggle */}
          <div className="flex items-center justify-end gap-2 mb-3">
            <span className="text-sm text-muted-foreground">Map:</span>
            <div className="flex gap-1">
              <Button
                variant={mapProvider === 'leaflet' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setMapProvider('leaflet')}
                className="gap-1"
              >
                <Map className="h-3 w-3" />
                OpenStreetMap
              </Button>
              <Button
                variant={mapProvider === 'google' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setMapProvider('google')}
                className="gap-1"
                disabled={!getGoogleMapsApiKey()}
              >
                <Globe className="h-3 w-3" />
                Google
              </Button>
            </div>
          </div>

          {mapProvider === 'leaflet' ? (
            <LeafletMap
              shops={filtered
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
                const originalShop = filtered.find((s: any) => s.id === shop.id);
                if (originalShop) {
                  setSelectedShop(originalShop);
                  setShowRequestDialog(true);
                }
              }}
              showUserLocation={!!profile?.latitude && !!profile?.longitude}
              userLatitude={profile?.latitude}
              userLongitude={profile?.longitude}
            />
          ) : (
            <GoogleMaps
              shops={filtered
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
                const originalShop = filtered.find((s: any) => s.id === shop.id);
                if (originalShop) {
                  setSelectedShop(originalShop);
                  setShowRequestDialog(true);
                }
              }}
              showUserLocation={!!profile?.latitude && !!profile?.longitude}
              userLatitude={profile?.latitude}
              userLongitude={profile?.longitude}
            />
          )}
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Click on a marker to view shop details or send a request
          </p>
        </div>
      )}

      {showMap && !filtered.some((s: any) => s.latitude && s.longitude) && (
        <div className="bg-muted/30 rounded-lg p-8 mb-6 text-center">
          <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No shops with coordinates found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Shopkeepers can set their location in their profile to appear on the map
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by shop name, owner, address or pincode..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={showMyAreaOnly ? "default" : "outline"}
            onClick={() => setShowMyAreaOnly(true)}
            disabled={!myPincode}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            My Area Only
          </Button>
          <Button
            variant={!showMyAreaOnly ? "default" : "outline"}
            onClick={() => setShowMyAreaOnly(false)}
          >
            All Shops
          </Button>
        </div>
      </div>

      {!myPincode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-6 text-sm text-amber-200 flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0" />
          Set your pincode in your <a href="/profile" className="underline font-medium">Profile</a> to filter shops by your area.
        </div>
      )}

      {/* Shops Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
            <Store className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No shops found</p>
            <p className="text-sm mt-1">
              {showMyAreaOnly
                ? "No shops in your area yet. Try switching to 'All Shops'."
                : search
                  ? `No results for "${search}".`
                  : "No shopkeepers have joined yet."}
            </p>
          </div>
        ) : (
          filtered.map((shop: any, index: number) => {
            const shopPin = shop.pincode || extractPincode(shop.address);
            const isSameArea = myPincode && shopPin === myPincode;

            return (
              <motion.div
                key={shop.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className={cn(
                  "flex flex-col h-full overflow-hidden transition-all hover:shadow-lg hover:border-primary/30",
                  isSameArea && "border-emerald-500/30 bg-emerald-500/5"
                )}>
                  <CardHeader className="pb-3 border-b bg-muted/20">
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
                  <CardContent className="flex-1 pt-4 flex flex-col gap-3">
                    {shop.address && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
                        <span className="line-clamp-2">{shop.address}</span>
                      </div>
                    )}
                    {shopPin && (
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="secondary" className="text-xs font-mono">
                          📍 {shopPin}
                        </Badge>
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

                    <div className="mt-auto pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                      <span>Joined {new Date(shop.created_at).toLocaleDateString()}</span>
                      {shop.is_active !== false && (
                        <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">
                          Active
                        </Badge>
                      )}
                    </div>

                    <Button
                      size="sm"
                      className="w-full mt-2 gap-2"
                      onClick={() => {
                        setSelectedShop(shop);
                        setShowRequestDialog(true);
                      }}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send Request
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 gap-2"
                      onClick={() => navigate(`/shop/${shop.user_id}`)}
                    >
                      <Package className="h-3.5 w-3.5" />
                      View Products
                    </Button>
                    {shop.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2 gap-2"
                        onClick={() => window.location.href = `tel:${shop.phone}`}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Contact Shop
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Send Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Stock Request</DialogTitle>
            <DialogDescription>
              Request stock from {selectedShop?.shop_name || selectedShop?.owner_name || "this shop"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Select Product from the shop */}
            <div>
              <Label>Select Product</Label>
              {loadingShopProducts ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading products...
                </div>
              ) : shopProducts && shopProducts.length > 0 ? (
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {shopProducts.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — ₹{p.price} ({p.quantity} in stock)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No products available from this shop.</p>
              )}
            </div>

            {selectedProductDetails && (
              <>
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p><strong>{selectedProductDetails.name}</strong></p>
                  <p className="text-muted-foreground">Category: {selectedProductDetails.category}</p>
                  <p className="text-muted-foreground">Available: {selectedProductDetails.quantity} units</p>
                  <p className="text-muted-foreground">Price: ₹{selectedProductDetails.price}/unit</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      max={selectedProductDetails.quantity}
                      value={requestQuantity}
                      onChange={e => setRequestQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label>Proposed Price (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder={`e.g. ${selectedProductDetails.price}`}
                      value={proposedPrice}
                      onChange={e => setProposedPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Notes (Optional)</Label>
                  <Input
                    placeholder="Any special instructions..."
                    value={requestNotes}
                    onChange={e => setRequestNotes(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSendRequest}
              disabled={!selectedProductDetails || createRequest.isPending}
              className="gap-2"
            >
              {createRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* My Requests Dialog */}
      <Dialog open={showRequestsTab} onOpenChange={setShowRequestsTab}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stock Requests</DialogTitle>
            <DialogDescription>
              Manage your sent and received stock requests
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="sent" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sent">
                Sent ({myRequests.length})
              </TabsTrigger>
              <TabsTrigger value="received">
                Received ({incomingRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sent" className="mt-4 space-y-3">
              {myRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Send className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No requests sent yet</p>
                </div>
              ) : myRequests.map((req: any) => (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{req.product_name}</p>
                        <p className="text-sm text-muted-foreground">To: {req.to_shop_name}</p>
                        <p className="text-sm">Qty: {req.quantity} • ₹{req.proposed_price}/unit</p>
                        {req.notes && <p className="text-xs text-muted-foreground mt-1">Note: {req.notes}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(req.request_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={
                        req.status === "pending" ? "outline" :
                        req.status === "accepted" ? "default" : "destructive"
                      }>
                        {req.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="received" className="mt-4 space-y-3">
              {incomingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No incoming requests</p>
                </div>
              ) : incomingRequests.map((req: any) => (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{req.product_name}</p>
                        <p className="text-sm text-muted-foreground">From: {req.from_shop_name}</p>
                        <p className="text-sm">Qty: {req.quantity} • ₹{req.proposed_price}/unit</p>
                        {req.notes && <p className="text-xs text-muted-foreground mt-1">Note: {req.notes}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(req.request_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={
                          req.status === "pending" ? "outline" :
                          req.status === "accepted" ? "default" : "destructive"
                        }>
                          {req.status}
                        </Badge>
                        {req.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleAcceptRequest(req.id)}>
                              Accept
                            </Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleRejectRequest(req.id)}>
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
