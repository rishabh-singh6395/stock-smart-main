import { Bell, AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useProducts } from "@/hooks/useData";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function NotificationsPanel() {
  const { data: products = [] } = useProducts();

  const nearExpiry = products.filter((p: any) => {
    const d = new Date(p.expiry_date);
    const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff <= 7 && diff >= 0;
  });

  const lowStock = products.filter((p: any) => p.quantity > 0 && p.quantity <= 10);

  const count = nearExpiry.length + lowStock.length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <Badge className="absolute -top-1 -right-1 text-[10px]">{count}</Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[360px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Notifications
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div>
            <h4 className="text-sm font-medium">Near expiry</h4>
            {nearExpiry.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">No products near expiry.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {nearExpiry.map((p: any) => (
                  <li key={p.id} className="flex items-start gap-3">
                    <div className="p-2 bg-amber-50 rounded-md text-amber-600">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">Expires: {format(new Date(p.expiry_date), 'dd MMM yyyy')}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-sm font-medium">Low stock</h4>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">All stocks healthy.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {lowStock.map((p: any) => (
                  <li key={p.id} className="flex items-start gap-3">
                    <div className="p-2 bg-amber-50 rounded-md text-amber-600">●</div>
                    <div>
                      <div className="font-medium">{p.name} — {p.quantity} left</div>
                      <div className="text-xs text-muted-foreground">Category: {p.category}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default NotificationsPanel;
