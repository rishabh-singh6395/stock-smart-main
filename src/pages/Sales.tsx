import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Plus, CreditCard, IndianRupee } from "lucide-react";
import { useSales, useProducts, useAddSale, useAddCreditSale } from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Sales() {
  const { data: sales = [], isLoading: loadingSales } = useSales();
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const addSale = useAddSale();
  const addCreditSale = useAddCreditSale();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"paid" | "credit">("paid");
  const [form, setForm] = useState({ productName: "", quantity: "", total: "" });
  const [creditForm, setCreditForm] = useState({
    customerName: "",
    customerPhone: "",
    amountPaid: "",
    dueDate: "",
    notes: "",
  });

  const groupedProducts = products.reduce((acc, p) => {
    if (!acc[p.name]) {
      acc[p.name] = { name: p.name, price: p.price, totalQuantity: 0 };
    }
    acc[p.name].totalQuantity += p.quantity;
    return acc;
  }, {} as Record<string, any>);

  const productList = Object.values(groupedProducts);

  const handleProductChange = (name: string) => {
    const p = groupedProducts[name];
    if (p && form.quantity) {
      setForm(f => ({ ...f, productName: name, total: String(p.price * Number(f.quantity)) }));
    } else {
      setForm(f => ({ ...f, productName: name }));
    }
  };

  const handleQuantityChange = (qty: string) => {
    const p = groupedProducts[form.productName];
    if (p && qty) {
      setForm(f => ({ ...f, quantity: qty, total: String(p.price * Number(qty)) }));
    } else {
      setForm(f => ({ ...f, quantity: qty }));
    }
  };

  function resetForms() {
    setForm({ productName: "", quantity: "", total: "" });
    setCreditForm({ customerName: "", customerPhone: "", amountPaid: "", dueDate: "", notes: "" });
    setPaymentMode("paid");
  }

  async function handleRecordSale() {
    if (!form.productName || !form.quantity || !form.total) {
      toast.error("Please fill in all fields");
      return;
    }
    const qty = Number(form.quantity);
    if (qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    const p = groupedProducts[form.productName];
    if (!p || p.totalQuantity < qty) {
      toast.error(`Not enough stock. Only ${p ? p.totalQuantity : 0} available.`);
      return;
    }

    // ─── Credit Sale ───
    if (paymentMode === "credit") {
      if (!creditForm.customerName || !creditForm.customerPhone || !creditForm.dueDate) {
        toast.error("Please fill customer name, phone number, and due date");
        return;
      }
      const amountPaid = Number(creditForm.amountPaid) || 0;
      if (amountPaid > Number(form.total)) {
        toast.error("Paid amount cannot exceed total price");
        return;
      }

      try {
        await addCreditSale.mutateAsync({
          productName: form.productName,
          quantityToSell: qty,
          total: Number(form.total),
          customerName: creditForm.customerName,
          customerPhone: creditForm.customerPhone,
          amountPaid,
          dueDate: creditForm.dueDate,
          notes: creditForm.notes,
        });
        toast.success("Credit sale recorded successfully!");
        setDialogOpen(false);
        resetForms();
      } catch (err: any) {
        toast.error(err.message);
      }
      return;
    }

    // ─── Regular Paid Sale ───
    try {
      await addSale.mutateAsync({
        productName: form.productName,
        quantityToSell: qty,
        total: Number(form.total)
      });
      toast.success("Sale recorded successfully!");
      setDialogOpen(false);
      resetForms();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const totalRevenue = sales.reduce((s, sale) => s + Number(sale.total), 0);
  const totalItems = sales.reduce((s, sale) => s + sale.quantity, 0);
  const isMutating = addSale.isPending || addCreditSale.isPending;

  if (loadingSales || loadingProducts) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading sales...</div>;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
      transition={{ duration: 0.4 }}
    >
      <div className="page-header flex justify-between items-start">
        <div>
          <h1 className="page-title">Sales Tracking</h1>
          <p className="page-subtitle">Track your daily sales and revenue</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForms(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Record New Sale</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Payment Mode Selector */}
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode("paid")}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      paymentMode === "paid"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <IndianRupee className="h-4 w-4" />
                    Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode("credit")}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      paymentMode === "credit"
                        ? "border-amber-500 bg-amber-500/10 text-amber-400"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    Credit (Udhaar)
                  </button>
                </div>
              </div>

              {/* Product Selection */}
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={form.productName} onValueChange={handleProductChange}>
                  <SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger>
                  <SelectContent>
                    {productList.map(p => (
                      <SelectItem key={p.name} value={p.name} disabled={p.totalQuantity === 0}>
                        {p.name} {p.totalQuantity === 0 ? "(Out of stock)" : `(${p.totalQuantity} in stock)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity to Sell</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={e => handleQuantityChange(e.target.value)}
                    placeholder="E.g., 2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Price (₹)</Label>
                  <Input
                    type="number"
                    value={form.total}
                    onChange={e => setForm(f => ({ ...f, total: e.target.value }))}
                  />
                </div>
              </div>

              {/* Credit Details (shown only when payment mode is credit) */}
              {paymentMode === "credit" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 pt-2 border-t border-dashed border-amber-500/30"
                >
                  <p className="text-xs text-amber-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="h-3 w-3" />
                    Credit Details
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer Name *</Label>
                      <Input
                        placeholder="e.g., Ramesh Kumar"
                        value={creditForm.customerName}
                        onChange={(e) => setCreditForm(f => ({ ...f, customerName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number *</Label>
                      <Input
                        placeholder="e.g., 9876543210"
                        value={creditForm.customerPhone}
                        onChange={(e) => setCreditForm(f => ({ ...f, customerPhone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount Paid Now (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={creditForm.amountPaid}
                        onChange={(e) => setCreditForm(f => ({ ...f, amountPaid: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date *</Label>
                      <Input
                        type="date"
                        value={creditForm.dueDate}
                        onChange={(e) => setCreditForm(f => ({ ...f, dueDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  {form.total && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                      Remaining Due:{" "}
                      <span className="font-semibold text-amber-400">
                        ₹{Math.max(0, Number(form.total) - (Number(creditForm.amountPaid) || 0)).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Any notes..."
                      value={creditForm.notes}
                      onChange={(e) => setCreditForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                    />
                  </div>
                </motion.div>
              )}

              <Button
                onClick={handleRecordSale}
                className={`w-full mt-4 ${paymentMode === "credit" ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                disabled={isMutating}
              >
                {isMutating ? "Processing..." : paymentMode === "credit" ? "Record Credit Sale" : "Complete Sale"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Total Transactions</p>
          <p className="text-3xl font-bold font-display mt-1">{sales.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Items Sold</p>
          <p className="text-3xl font-bold font-display mt-1">{totalItems}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-3xl font-bold font-display mt-1 text-primary">₹{totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Sales History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No sales recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map(sale => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.product_name}</TableCell>
                    <TableCell className="text-right">{sale.quantity}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">₹{Number(sale.total)}</TableCell>
                    <TableCell>
                      {(sale as any).payment_type === "credit" ? (
                        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-none text-[10px]">
                          Credit
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-none text-[10px]">
                          Paid
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(sale.created_at).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: 'numeric', minute: '2-digit', hour12: true
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
