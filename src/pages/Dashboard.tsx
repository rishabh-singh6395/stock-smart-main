import { Package, AlertTriangle, TrendingUp, ShoppingBag, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProducts, useSales } from "@/hooks/useData";
import { motion, Variants } from "framer-motion";
import CountUp from "react-countup";
import Sparkline from "@/components/ui/sparkline";

function getExpiryDetails(expiryDate: string) {
  const diff = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  let status = "safe";
  if (diff < 0) status = "expired";
  else if (diff <= 3) status = "danger"; // <= 3 days
  else if (diff <= 7) status = "warning"; // <= 7 days
  else if (diff <= 30) status = "upcoming"; // <= 30 days
  return { status, daysLeft: diff };
}

export default function Dashboard() {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: sales = [], isLoading: loadingSales } = useSales();

  const totalProducts = products.length;
  const outOfStock = products.filter(p => p.quantity === 0).length;
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= 10).length;
  const expiringSoon = products.filter(p => {
    const { daysLeft } = getExpiryDetails(p.expiry_date);
    return daysLeft >= 0 && daysLeft <= 30;
  }).length;
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);

  const alertProducts = products.filter(p => {
    const { daysLeft } = getExpiryDetails(p.expiry_date);
    return (p.quantity > 0 && p.quantity <= 10) || p.quantity === 0 || daysLeft <= 7;
  }).sort((a, b) => {
    return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
  });

  if (loadingProducts || loadingSales) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading dashboard...</div>;
  }

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your store's performance</p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div variants={item} className="stat-card relative overflow-hidden group glow-on-hover">
          <div className="absolute inset-0 opacity-20" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12))' }} />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-sm text-white/80">Total Products</span>
            <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="flex items-end justify-between relative z-10">
            <p className="text-3xl font-bold font-display count-up">
              <CountUp end={totalProducts} duration={2} separator="," />
            </p>
            <div className="opacity-80">
              <Sparkline data={[5,8,6,10,9,12,14,13]} color="#ffffff" />
            </div>
          </div>
          <p className="text-xs text-white/60 mt-2 relative z-10">{outOfStock} out of stock</p>
        </motion.div>

        <motion.div variants={item} className="stat-card relative overflow-hidden group glow-on-hover" style={{ background: 'linear-gradient(135deg, rgba(250,204,21,0.12), rgba(245,158,11,0.08))' }}>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-sm text-white/80">Low Stock Alerts</span>
            <div className="h-9 w-9 rounded-lg bg-white/8 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
            </div>
          </div>
          <div className="flex items-end justify-between relative z-10">
            <p className="text-3xl font-bold font-display count-up">
              <CountUp end={lowStock} duration={2.5} />
            </p>
            <div className="opacity-80">
              <Sparkline data={[12,10,9,8,6,6,4,3]} color="#ffd66b" />
            </div>
          </div>
          <p className="text-xs text-white/60 mt-2 relative z-10">Items need restocking</p>
        </motion.div>

        <motion.div variants={item} className="stat-card relative overflow-hidden group glow-on-hover" style={{ background: 'linear-gradient(135deg, rgba(252,165,165,0.08), rgba(248,113,113,0.06))' }}>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-sm text-white/80">Expiring Soon</span>
            <div className="h-9 w-9 rounded-lg bg-white/8 flex items-center justify-center">
              <Clock className="h-4 w-4 text-rose-300" />
            </div>
          </div>
          <div className="flex items-end justify-between relative z-10">
            <p className="text-3xl font-bold font-display count-up">
              <CountUp end={expiringSoon} duration={2.5} />
            </p>
            <div className="opacity-80">
              <Sparkline data={[3,4,5,6,7,9,8,10]} color="#ff9aa2" />
            </div>
          </div>
          <p className="text-xs text-white/60 mt-2 relative z-10">Within 30 days</p>
        </motion.div>

        <motion.div variants={item} className="stat-card relative overflow-hidden group glow-on-hover" style={{ background: 'linear-gradient(135deg, rgba(134,239,172,0.08), rgba(16,185,129,0.06))' }}>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-sm text-white/80">Total Revenue</span>
            <div className="h-9 w-9 rounded-lg bg-white/8 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-200" />
            </div>
          </div>
          <div className="flex items-end justify-between relative z-10">
            <p className="text-3xl font-bold font-display count-up">
              ₹<CountUp end={totalRevenue} duration={3} separator="," decimals={0} />
            </p>
            <div className="opacity-80">
              <Sparkline data={[2000,3000,2800,4000,3500,5000,4800,6000]} color="#a7f3d0" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card className="h-full hover:shadow-md transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Stock & Expiry Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alertProducts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No alerts — your inventory looks great!</p>
                ) : (
                  alertProducts.map(product => {
                    const { status, daysLeft } = getExpiryDetails(product.expiry_date);

                    let bgClass = "bg-muted/50";
                    if (status === "expired") bgClass = "bg-destructive/10 border border-destructive/20";
                    else if (status === "danger") bgClass = "bg-rose-500/10 border border-rose-500/20";
                    else if (status === "warning") bgClass = "bg-amber-500/10 border border-amber-500/20";
                    else if (product.quantity === 0) bgClass = "bg-destructive/10 border border-destructive/20";
                    else if (product.quantity <= 10) bgClass = "bg-amber-500/10 border border-amber-500/20";

                    let expiryText = `Expires: ${product.expiry_date}`;
                    if (status === "expired") expiryText = "Batch expired!";
                    else if (status === "danger" || status === "warning") expiryText = `Batch expires in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}.`;

                    let textClass = "text-muted-foreground";
                    if (status === "expired") textClass = "text-destructive font-semibold";
                    else if (status === "danger") textClass = "text-rose-600 font-medium";
                    else if (status === "warning") textClass = "text-amber-600 font-medium";

                    return (
                      <div key={product.id} className={`flex items-center justify-between p-3 rounded-lg ${bgClass} transition-colors`}>
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className={`text-xs ${textClass}`}>
                            Qty: {product.quantity} · {expiryText}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {product.quantity === 0 && <Badge variant="destructive" className="text-[10px] shadow-none">Out of Stock</Badge>}
                          {product.quantity > 0 && product.quantity <= 10 && <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200/50 text-[10px] shadow-none">Low Stock</Badge>}
                          {status === "expired" && (
                            <Badge variant="destructive" className="text-[10px] shadow-none">Expired</Badge>
                          )}
                          {status === "danger" && (
                            <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-200/50 text-[10px] shadow-none">Near Expiry</Badge>
                          )}
                          {status === "warning" && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200/50 text-[10px] shadow-none">Expires Soon</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full hover:shadow-md transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Recent Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sales.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No sales recorded yet.</p>
                ) : (
                  sales.slice(0, 5).map(sale => (
                    <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{sale.product_name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {sale.quantity} · {sale.sale_date}</p>
                      </div>
                      <span className="font-semibold text-sm text-primary">₹{Number(sale.total)}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
