import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen, Search, Plus, AlertTriangle, IndianRupee, Users, Clock,
  Phone, CreditCard, ChevronDown, ChevronUp, Download, CalendarDays, FileText
} from "lucide-react";
import {
  useCreditEntries, useAddCreditEntry, useUpdateCreditEntry,
  useAddCreditPayment, useCreditPayments, useProducts
} from "@/hooks/useData";
import type { CreditEntry } from "@/types/database";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";

// ═══════════ Payment History Sub-component ═══════════
function PaymentHistorySection({ creditId }: { creditId: string }) {
  const { data: payments = [], isLoading } = useCreditPayments(creditId);

  if (isLoading) return <p className="text-sm text-muted-foreground py-2">Loading payments...</p>;
  if (payments.length === 0) return <p className="text-sm text-muted-foreground py-2">No payments recorded yet.</p>;

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {payments.map((p) => (
        <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm font-medium text-green-400">+₹{p.amount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{p.notes || "Payment received"}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      ))}
    </div>
  );
}

// ═══════════ Customer History Dialog ═══════════
function CustomerHistoryDialog({ customerName, customerPhone, entries }: {
  customerName: string;
  customerPhone: string;
  entries: CreditEntry[];
}) {
  const customerEntries = entries.filter(
    (e) => e.customer_name === customerName && e.customer_phone === customerPhone
  );
  const totalCredit = customerEntries.reduce((s, e) => s + e.total_amount, 0);
  const totalPaid = customerEntries.reduce((s, e) => s + e.paid_amount, 0);
  const totalPending = customerEntries.reduce((s, e) => s + e.due_amount, 0);

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Credit History — {customerName}
        </DialogTitle>
      </DialogHeader>

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Phone className="h-3.5 w-3.5" /> {customerPhone}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-400">Total Credit</p>
          <p className="text-lg font-bold text-blue-300">₹{totalCredit.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-xs text-green-400">Total Paid</p>
          <p className="text-lg font-bold text-green-300">₹{totalPaid.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-400">Pending</p>
          <p className="text-lg font-bold text-amber-300">₹{totalPending.toLocaleString()}</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="space-y-3">
        {customerEntries.map((entry) => {
          const isOverdue = entry.payment_status !== "paid" && new Date(entry.due_date) < new Date();
          return (
            <div
              key={entry.id}
              className={`p-3 rounded-xl border ${
                isOverdue
                  ? "bg-red-500/5 border-red-500/30"
                  : entry.payment_status === "paid"
                  ? "bg-green-500/5 border-green-500/20"
                  : "bg-muted/50 border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-sm">{entry.items}</p>
                <StatusBadge status={entry.payment_status} dueDate={entry.due_date} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>₹{entry.total_amount.toLocaleString()} total · ₹{entry.due_amount.toLocaleString()} due</span>
                <span>{entry.credit_date} → {entry.due_date}</span>
              </div>
            </div>
          );
        })}
      </div>
    </DialogContent>
  );
}

// ═══════════ Status Badge Helper ═══════════
function StatusBadge({ status, dueDate }: { status: CreditEntry["payment_status"]; dueDate: string }) {
  const isOverdue = status !== "paid" && new Date(dueDate) < new Date();

  if (status === "paid") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-none text-[10px]">
        Paid
      </Badge>
    );
  }
  if (isOverdue) {
    return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/20 shadow-none text-[10px] animate-pulse">
        Overdue
      </Badge>
    );
  }
  if (status === "partially_paid") {
    return (
      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 shadow-none text-[10px]">
        Partial
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/20 shadow-none text-[10px]">
      Pending
    </Badge>
  );
}

// ═══════════ Main CreditBook Page ═══════════
export default function CreditBook() {
  const { data: entries = [], isLoading } = useCreditEntries();
  const { data: products = [] } = useProducts();
  const addCreditEntry = useAddCreditEntry();
  const updateCreditEntry = useUpdateCreditEntry();
  const addCreditPayment = useAddCreditPayment();

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CreditEntry | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ name: string; phone: string } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Add Credit Form
  const [creditForm, setCreditForm] = useState({
    customer_name: "",
    customer_phone: "",
    items: "",
    total_amount: "",
    paid_amount: "",
    due_date: "",
    notes: "",
  });

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({ amount: "", notes: "" });

  // ─── Computed Values ───
  const totalCreditGiven = entries.reduce((s, e) => s + e.total_amount, 0);
  const totalReceived = entries.reduce((s, e) => s + e.paid_amount, 0);
  const totalPending = entries.reduce((s, e) => s + e.due_amount, 0);
  const pendingCustomers = new Set(
    entries.filter((e) => e.payment_status !== "paid").map((e) => e.customer_phone)
  ).size;
  const overdueEntries = entries.filter(
    (e) => e.payment_status !== "paid" && new Date(e.due_date) < new Date()
  );

  // ─── Filtered Entries ───
  const filteredEntries = useMemo(() => {
    let result = entries;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.customer_name.toLowerCase().includes(q) ||
          e.customer_phone.includes(q) ||
          e.items.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      if (statusFilter === "overdue") {
        result = result.filter(
          (e) => e.payment_status !== "paid" && new Date(e.due_date) < new Date()
        );
      } else {
        result = result.filter((e) => e.payment_status === statusFilter);
      }
    }
    return result;
  }, [entries, searchQuery, statusFilter]);

  // ─── Reports Data ───
  const reportData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Monthly
    const monthlyEntries = entries.filter((e) => {
      const d = new Date(e.credit_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthlyTotal = monthlyEntries.reduce((s, e) => s + e.total_amount, 0);
    const monthlyCollected = monthlyEntries.reduce((s, e) => s + e.paid_amount, 0);

    // Customer-wise
    const customerMap = new Map<string, { name: string; phone: string; total: number; paid: number; pending: number; count: number }>();
    entries.forEach((e) => {
      const key = e.customer_phone;
      const existing = customerMap.get(key) || { name: e.customer_name, phone: e.customer_phone, total: 0, paid: 0, pending: 0, count: 0 };
      existing.total += e.total_amount;
      existing.paid += e.paid_amount;
      existing.pending += e.due_amount;
      existing.count += 1;
      customerMap.set(key, existing);
    });
    const customerReports = Array.from(customerMap.values()).sort((a, b) => b.pending - a.pending);

    return { monthlyEntries, monthlyTotal, monthlyCollected, customerReports };
  }, [entries]);

  // ─── Handlers ───
  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleAddCredit() {
    if (!creditForm.customer_name || !creditForm.customer_phone || !creditForm.items || !creditForm.total_amount || !creditForm.due_date) {
      toast.error("Please fill all required fields");
      return;
    }
    const totalAmount = Number(creditForm.total_amount);
    const paidAmount = Number(creditForm.paid_amount) || 0;
    if (totalAmount <= 0) {
      toast.error("Total amount must be greater than 0");
      return;
    }
    if (paidAmount > totalAmount) {
      toast.error("Paid amount cannot exceed total amount");
      return;
    }

    const dueAmount = totalAmount - paidAmount;
    let paymentStatus: CreditEntry["payment_status"] = "pending";
    if (dueAmount <= 0) paymentStatus = "paid";
    else if (paidAmount > 0) paymentStatus = "partially_paid";

    try {
      await addCreditEntry.mutateAsync({
        customer_name: creditForm.customer_name,
        customer_phone: creditForm.customer_phone,
        items: creditForm.items,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        due_amount: Math.max(0, dueAmount),
        credit_date: new Date().toISOString().split("T")[0],
        due_date: creditForm.due_date,
        payment_status: paymentStatus,
        notes: creditForm.notes,
      });
      toast.success("Credit entry added successfully!");
      setAddDialogOpen(false);
      setCreditForm({ customer_name: "", customer_phone: "", items: "", total_amount: "", paid_amount: "", due_date: "", notes: "" });
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleRecordPayment() {
    if (!selectedEntry || !paymentForm.amount) {
      toast.error("Please enter a valid amount");
      return;
    }
    const amount = Number(paymentForm.amount);
    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (amount > selectedEntry.due_amount) {
      toast.error(`Amount exceeds pending balance of ₹${selectedEntry.due_amount.toLocaleString()}`);
      return;
    }

    try {
      await addCreditPayment.mutateAsync({
        creditId: selectedEntry.id,
        amount,
        notes: paymentForm.notes,
      });
      toast.success("Payment recorded successfully!");
      setPaymentDialogOpen(false);
      setPaymentForm({ amount: "", notes: "" });
      setSelectedEntry(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function exportCSV() {
    const headers = ["Customer Name", "Phone", "Items", "Total Amount", "Paid", "Due", "Credit Date", "Due Date", "Status"];
    const rows = entries.map((e) => [
      e.customer_name, e.customer_phone, e.items,
      e.total_amount, e.paid_amount, e.due_amount,
      e.credit_date, e.due_date, e.payment_status,
    ]);
    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `credit_book_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Credit report exported!");
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading credit book...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, filter: "blur(5px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.98, filter: "blur(5px)" }}
      transition={{ duration: 0.4 }}
    >
      {/* ─── Page Header ─── */}
      <div className="page-header flex justify-between items-start">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Credit Book (Udhaar)
          </h1>
          <p className="page-subtitle">Track credit sales, pending payments, and customer credit history</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Credit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Credit Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer Name *</Label>
                    <Input
                      placeholder="e.g., Ramesh Kumar"
                      value={creditForm.customer_name}
                      onChange={(e) => setCreditForm((f) => ({ ...f, customer_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <Input
                      placeholder="e.g., 9876543210"
                      value={creditForm.customer_phone}
                      onChange={(e) => setCreditForm((f) => ({ ...f, customer_phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Items Purchased *</Label>
                  <Input
                    placeholder="e.g., Rice 5kg, Dal 2kg"
                    value={creditForm.items}
                    onChange={(e) => setCreditForm((f) => ({ ...f, items: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Total Amount (₹) *</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={creditForm.total_amount}
                      onChange={(e) => setCreditForm((f) => ({ ...f, total_amount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount Paid (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={creditForm.paid_amount}
                      onChange={(e) => setCreditForm((f) => ({ ...f, paid_amount: e.target.value }))}
                    />
                  </div>
                </div>
                {creditForm.total_amount && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground">
                      Remaining Due:{" "}
                      <span className="font-semibold text-amber-400">
                        ₹{Math.max(0, Number(creditForm.total_amount) - (Number(creditForm.paid_amount) || 0)).toLocaleString()}
                      </span>
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <Input
                    type="date"
                    value={creditForm.due_date}
                    onChange={(e) => setCreditForm((f) => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Any additional notes..."
                    value={creditForm.notes}
                    onChange={(e) => setCreditForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                  />
                </div>
                <Button onClick={handleAddCredit} className="w-full" disabled={addCreditEntry.isPending}>
                  {addCreditEntry.isPending ? "Saving..." : "Save Credit Entry"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ─── Overdue Alerts ─── */}
      <AnimatePresence>
        {overdueEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6"
          >
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-semibold text-red-400">
                      {overdueEntries.length} Overdue Payment{overdueEntries.length > 1 ? "s" : ""}
                    </p>
                    <div className="space-y-1">
                      {overdueEntries.slice(0, 3).map((e) => (
                        <p key={e.id} className="text-xs text-red-300/80">
                          Payment overdue for Customer: <strong>{e.customer_name}</strong> — ₹{e.due_amount.toLocaleString()} since {e.due_date}
                        </p>
                      ))}
                      {overdueEntries.length > 3 && (
                        <p className="text-xs text-red-300/60">
                          ... and {overdueEntries.length - 3} more overdue entries
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Dashboard Stats ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="stat-card relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-20" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))" }} />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-sm text-white/80">Total Credit Given</span>
            <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
              <IndianRupee className="h-4 w-4 text-indigo-300" />
            </div>
          </div>
          <p className="text-2xl font-bold font-display relative z-10">
            ₹<CountUp end={totalCreditGiven} duration={2} separator="," />
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stat-card relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-20" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(52,211,153,0.1))" }} />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-sm text-white/80">Amount Received</span>
            <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-emerald-300" />
            </div>
          </div>
          <p className="text-2xl font-bold font-display text-emerald-400 relative z-10">
            ₹<CountUp end={totalReceived} duration={2} separator="," />
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="stat-card relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-20" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.1))" }} />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-sm text-white/80">Pending Amount</span>
            <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-300" />
            </div>
          </div>
          <p className="text-2xl font-bold font-display text-amber-400 relative z-10">
            ₹<CountUp end={totalPending} duration={2} separator="," />
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="stat-card relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-20" style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(244,114,182,0.1))" }} />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-sm text-white/80">Pending Customers</span>
            <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-pink-300" />
            </div>
          </div>
          <p className="text-2xl font-bold font-display relative z-10">
            <CountUp end={pendingCustomers} duration={2} />
          </p>
        </motion.div>
      </div>

      {/* ─── Tabs: Credit Entries + Reports ─── */}
      <Tabs defaultValue="entries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="entries" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Credit Entries
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Reports
          </TabsTrigger>
        </TabsList>

        {/* ═══ Credit Entries Tab ═══ */}
        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  All Credit Entries
                </CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8 w-64"
                      placeholder="Search by name or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partially_paid">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEntries.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {entries.length === 0
                      ? "No credit entries yet. Click \"Add Credit\" to get started."
                      : "No entries match your search."}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Due</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => {
                        const isOverdue = entry.payment_status !== "paid" && new Date(entry.due_date) < new Date();
                        const isExpanded = expandedRows.has(entry.id);

                        return (
                          <>
                            <TableRow
                              key={entry.id}
                              className={`cursor-pointer transition-colors ${
                                isOverdue ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-muted/50"
                              }`}
                              onClick={() => toggleRow(entry.id)}
                            >
                              <TableCell className="font-medium">
                                <Dialog open={historyDialogOpen && selectedCustomer?.phone === entry.customer_phone} onOpenChange={(open) => {
                                  setHistoryDialogOpen(open);
                                  if (!open) setSelectedCustomer(null);
                                }}>
                                  <DialogTrigger asChild>
                                    <button
                                      className="text-primary hover:underline font-medium text-left"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCustomer({ name: entry.customer_name, phone: entry.customer_phone });
                                        setHistoryDialogOpen(true);
                                      }}
                                    >
                                      {entry.customer_name}
                                    </button>
                                  </DialogTrigger>
                                  {selectedCustomer && (
                                    <CustomerHistoryDialog
                                      customerName={selectedCustomer.name}
                                      customerPhone={selectedCustomer.phone}
                                      entries={entries}
                                    />
                                  )}
                                </Dialog>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{entry.customer_phone}</TableCell>
                              <TableCell className="max-w-[180px] truncate">{entry.items}</TableCell>
                              <TableCell className="text-right font-semibold">₹{entry.total_amount.toLocaleString()}</TableCell>
                              <TableCell className={`text-right font-semibold ${entry.due_amount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                                ₹{entry.due_amount.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <span className={`text-sm ${isOverdue ? "text-red-400 font-medium" : "text-muted-foreground"}`}>
                                  {entry.due_date}
                                </span>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={entry.payment_status} dueDate={entry.due_date} />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {entry.payment_status !== "paid" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEntry(entry);
                                        setPaymentDialogOpen(true);
                                      }}
                                    >
                                      <IndianRupee className="h-3 w-3 mr-1" />
                                      Collect
                                    </Button>
                                  )}
                                  <button
                                    className="p-1 rounded hover:bg-muted/70"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleRow(entry.id);
                                    }}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* Expandable Payment History */}
                            {isExpanded && (
                              <TableRow key={`${entry.id}-details`}>
                                <TableCell colSpan={8} className="bg-muted/30 p-4 border-t-0">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Details</p>
                                      <div className="space-y-1.5 text-sm">
                                        <p><span className="text-muted-foreground">Credit Date:</span> {entry.credit_date}</p>
                                        <p><span className="text-muted-foreground">Paid:</span> <span className="text-emerald-400">₹{entry.paid_amount.toLocaleString()}</span></p>
                                        <p><span className="text-muted-foreground">Remaining:</span> <span className="text-amber-400">₹{entry.due_amount.toLocaleString()}</span></p>
                                        {entry.notes && (
                                          <p><span className="text-muted-foreground">Notes:</span> {entry.notes}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Payment History</p>
                                      <PaymentHistorySection creditId={entry.id} />
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Reports Tab ═══ */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Report */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Monthly Credit Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Credit Given (This Month)</p>
                      <p className="text-xl font-bold mt-1">₹{reportData.monthlyTotal.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Collected (This Month)</p>
                      <p className="text-xl font-bold text-emerald-400 mt-1">₹{reportData.monthlyCollected.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-400">Net Pending (This Month)</p>
                    <p className="text-xl font-bold text-amber-300 mt-1">
                      ₹{(reportData.monthlyTotal - reportData.monthlyCollected).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reportData.monthlyEntries.length} credit entries this month
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Pending Payments Report */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  Pending Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {entries.filter((e) => e.payment_status !== "paid").length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">All payments are cleared! 🎉</p>
                  ) : (
                    entries
                      .filter((e) => e.payment_status !== "paid")
                      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                      .slice(0, 8)
                      .map((e) => {
                        const isOverdue = new Date(e.due_date) < new Date();
                        return (
                          <div
                            key={e.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              isOverdue ? "bg-red-500/5 border-red-500/20" : "bg-muted/50 border-border"
                            }`}
                          >
                            <div>
                              <p className="font-medium text-sm">{e.customer_name}</p>
                              <p className="text-xs text-muted-foreground">Due: {e.due_date}</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold text-sm ${isOverdue ? "text-red-400" : "text-amber-400"}`}>
                                ₹{e.due_amount.toLocaleString()}
                              </p>
                              <StatusBadge status={e.payment_status} dueDate={e.due_date} />
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Customer-wise Report */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Customer-wise Credit Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.customerReports.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">No credit data available.</p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead className="text-right">Entries</TableHead>
                          <TableHead className="text-right">Total Credit</TableHead>
                          <TableHead className="text-right">Total Paid</TableHead>
                          <TableHead className="text-right">Pending</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.customerReports.map((cr) => (
                          <TableRow key={cr.phone}>
                            <TableCell className="font-medium">{cr.name}</TableCell>
                            <TableCell className="text-muted-foreground">{cr.phone}</TableCell>
                            <TableCell className="text-right">{cr.count}</TableCell>
                            <TableCell className="text-right">₹{cr.total.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-emerald-400">₹{cr.paid.toLocaleString()}</TableCell>
                            <TableCell className={`text-right font-semibold ${cr.pending > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                              ₹{cr.pending.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Payment Collection Dialog ─── */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => { setPaymentDialogOpen(open); if (!open) { setSelectedEntry(null); setPaymentForm({ amount: "", notes: "" }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-400" />
              Collect Payment
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/50 border space-y-1">
                <p className="font-medium">{selectedEntry.customer_name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {selectedEntry.customer_phone}
                </p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span>Total: <strong>₹{selectedEntry.total_amount.toLocaleString()}</strong></span>
                  <span>Paid: <strong className="text-emerald-400">₹{selectedEntry.paid_amount.toLocaleString()}</strong></span>
                  <span>Due: <strong className="text-amber-400">₹{selectedEntry.due_amount.toLocaleString()}</strong></span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payment Amount (₹)</Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedEntry.due_amount}
                  placeholder={`Max: ₹${selectedEntry.due_amount.toLocaleString()}`}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                />
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setPaymentForm((f) => ({ ...f, amount: String(selectedEntry.due_amount) }))}
                  >
                    Full Amount
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setPaymentForm((f) => ({ ...f, amount: String(Math.round(selectedEntry.due_amount / 2)) }))}
                  >
                    Half
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Payment notes..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                />
              </div>
              <Button onClick={handleRecordPayment} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={addCreditPayment.isPending}>
                {addCreditPayment.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
