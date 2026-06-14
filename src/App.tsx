import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import Analytics from "./pages/Analytics";
import ShopNetwork from "./pages/ShopNetwork";
import ShopProducts from "./pages/ShopProducts";
import Customer from "./pages/Customer";
import CustomerProfile from "./pages/CustomerProfile";
import { useProfile } from "@/hooks/useData";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Marketplace from "./pages/Marketplace";
import NotFound from "./pages/NotFound";
import CreditBook from "./pages/CreditBook";
import ComboOffers from "./pages/ComboOffers";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 1000,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Guard component to ensure only users with role 'customer' can access customer routes
  function CustomerGuard() {
    const { data: profile, isLoading: profileLoading } = useProfile();
    if (profileLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
    // Allow access if profile not found yet (new signup) or if role is customer
    if (profile && profile.role !== 'customer') return <Navigate to="/" replace />;
    return <Customer />;
  }

  // Guard component for customer profile
  function CustomerProfileGuard() {
    const { data: profile, isLoading: profileLoading } = useProfile();
    if (profileLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
    if (profile && profile.role !== 'customer') return <Navigate to="/" replace />;
    return <CustomerProfile />;
  }

  // Guard component for root path to redirect customers to their dashboard
  function HomeGuard() {
    const { data: profile, isLoading: profileLoading } = useProfile();
    if (profileLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
    if (profile?.role === 'customer') return <Navigate to="/customer" replace />;
    return <Dashboard />;
  }

  // Auth page redirect — checks role to send customers to /customer
  function AuthRedirect() {
    const { data: profile, isLoading: profileLoading } = useProfile();
    if (profileLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
    if (profile?.role === 'customer') return <Navigate to="/customer" replace />;
    return <Navigate to="/" replace />;
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <>
      <AnimatedBackground />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/auth" element={user ? <AuthRedirect /> : <Auth />} />
          <Route path="/marketplace" element={<AppLayout><Marketplace /></AppLayout>} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<HomeGuard />} />
                    <Route path="/customer" element={<CustomerGuard />} />
                    <Route path="/customer/profile" element={<CustomerProfileGuard />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/sales" element={<Sales />} />
                    <Route path="/credit-book" element={<CreditBook />} />
                    <Route path="/combo-offers" element={<ComboOffers />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/network" element={<ShopNetwork />} />
                    <Route path="/shop/:id" element={<ShopProducts />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AnimatePresence>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
