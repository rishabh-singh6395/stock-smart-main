import {
  LayoutDashboard,
  Package,
  TrendingUp,
  BarChart3,
  Store,
  ShoppingBag,
  LogOut,
  User,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useData";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const shopkeeperItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Sales Tracking", url: "/sales", icon: TrendingUp },
  { title: "Credit Book", url: "/credit-book", icon: BookOpen },
  { title: "Combo Offers", url: "/combo-offers", icon: Sparkles },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Shop Network", url: "/network", icon: Store },
  { title: "Profile", url: "/profile", icon: User },
];

const customerItems = [
  { title: "Local Market", url: "/customer", icon: ShoppingBag },
  { title: "Browse Shops", url: "/network", icon: Store },
  { title: "My Profile", url: "/customer/profile", icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const isActive = (path: string) => location.pathname === path;

  // Determine role: use profile if loaded, otherwise infer from current URL path
  const isOnCustomerPage = location.pathname.startsWith('/customer');
  const userRole = profile?.role || (isOnCustomerPage ? 'customer' : 'shopkeeper');

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0 overflow-hidden">
            <img src="/logo.svg" alt="StockSmart" className="h-8 w-8 object-contain" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-display text-sm font-bold text-sidebar-primary-foreground tracking-tight">
                StockSmart
              </h2>
              <p className="text-[11px] text-sidebar-foreground/60">
                {userRole === 'customer' ? 'Customer Portal' : 'Inventory Manager'}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {user && userRole !== 'customer' && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-[11px] uppercase tracking-wider">
              Shopkeeper
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {shopkeeperItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <NavLink to={item.url} end={item.url === "/"} className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {userRole === 'customer' && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-[11px] uppercase tracking-wider">
              Customer
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {customerItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <NavLink to={item.url} className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Logout" onClick={signOut} className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
                <LogOut className="h-4 w-4" />
                {!collapsed && <span>Logout</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
