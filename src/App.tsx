import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import InvoiceGenerator from "./pages/InvoiceGenerator";
import InvoiceList from "./pages/InvoiceList";
import InvoiceStatistics from "./pages/InvoiceStatistics";
import EmployeeManagement from "./pages/EmployeeManagement";
import BulkInvoiceGenerator from "./pages/BulkInvoiceGenerator";
import CompanySettings from "./pages/CompanySettings";
import DailyTracker from "./pages/DailyTracker";
import UserManagement from "./pages/UserManagement";
import Jobs from "./pages/Jobs";
import Apply from "./pages/Apply";
import Applications from "./pages/Applications";
import Screening from "./pages/Screening";
import Interviews from "./pages/Interviews";
import Offers from "./pages/Offers";
import Inbox from "./pages/Inbox";
import ProfileSetup from "./pages/ProfileSetup";

const queryClient = new QueryClient();

// Guard component that redirects to profile setup if avatar is missing
const AvatarGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, avatarUrl, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <>{children}</>;
  
  // If user is logged in but has no avatar, redirect to profile setup
  // (except if already on profile-setup or auth page)
  if (!avatarUrl && window.location.pathname !== '/profile-setup' && window.location.pathname !== '/auth') {
    return <Navigate to="/profile-setup" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => (
  <AvatarGuard>
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/profile-setup" element={<ProfileSetup />} />
      <Route path="/" element={<Index />} />
      <Route path="/generate-invoice" element={<InvoiceGenerator />} />
      <Route path="/bulk-invoice" element={<BulkInvoiceGenerator />} />
      <Route path="/invoices" element={<InvoiceList />} />
      <Route path="/invoice-statistics" element={<InvoiceStatistics />} />
      <Route path="/statistics" element={<InvoiceStatistics />} />
      <Route path="/employees" element={<EmployeeManagement />} />
      <Route path="/company-settings" element={<CompanySettings />} />
      <Route path="/daily-tracker" element={<DailyTracker />} />
      <Route path="/user-management" element={<UserManagement />} />
      <Route path="/jobs" element={<Jobs />} />
      <Route path="/apply" element={<Apply />} />
      <Route path="/applications" element={<Applications />} />
      <Route path="/screening" element={<Screening />} />
      <Route path="/interviews" element={<Interviews />} />
      <Route path="/offers" element={<Offers />} />
      <Route path="/inbox" element={<Inbox />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AvatarGuard>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="fdl-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
