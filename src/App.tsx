import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";

// Public pages
import Home from "./pages/public/Home";
import About from "./pages/public/About";
import Services from "./pages/public/Services";
import ServiceDetail from "./pages/public/ServiceDetail";
import PublicEvents from "./pages/public/Events";
import EventDetail from "./pages/public/EventDetail";
import PublicInnovations from "./pages/public/Innovations";
import InnovationDetail from "./pages/public/InnovationDetail";
import PublicGallery from "./pages/public/Gallery";
import Careers from "./pages/public/Careers";
import Blog from "./pages/public/Blog";
import BlogPost from "./pages/public/BlogPost";
import Contact from "./pages/public/Contact";

// Backend pages
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

// Guard for backend routes only - redirects to profile setup if avatar is missing
const AvatarGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, avatarUrl, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <>{children}</>;
  
  if (!avatarUrl && window.location.pathname !== '/profile-setup' && window.location.pathname !== '/auth') {
    return <Navigate to="/profile-setup" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    {/* Public routes - no auth required */}
    <Route path="/" element={<Home />} />
    <Route path="/about" element={<About />} />
    <Route path="/services" element={<Services />} />
    <Route path="/services/:slug" element={<ServiceDetail />} />
    <Route path="/events" element={<PublicEvents />} />
    <Route path="/events/:slug" element={<EventDetail />} />
    <Route path="/innovations" element={<PublicInnovations />} />
    <Route path="/innovations/:slug" element={<InnovationDetail />} />
    <Route path="/gallery" element={<PublicGallery />} />
    <Route path="/careers" element={<Careers />} />
    <Route path="/blog" element={<Blog />} />
    <Route path="/blog/:slug" element={<BlogPost />} />
    <Route path="/contact" element={<Contact />} />

    {/* Auth */}
    <Route path="/auth" element={<Auth />} />
    <Route path="/apply" element={<Apply />} />
    <Route path="/profile-setup" element={<ProfileSetup />} />

    {/* Backend routes - wrapped in AvatarGuard */}
    <Route path="/dashboard" element={<AvatarGuard><Index /></AvatarGuard>} />
    <Route path="/generate-invoice" element={<AvatarGuard><InvoiceGenerator /></AvatarGuard>} />
    <Route path="/bulk-invoice" element={<AvatarGuard><BulkInvoiceGenerator /></AvatarGuard>} />
    <Route path="/invoices" element={<AvatarGuard><InvoiceList /></AvatarGuard>} />
    <Route path="/invoice-statistics" element={<AvatarGuard><InvoiceStatistics /></AvatarGuard>} />
    <Route path="/statistics" element={<AvatarGuard><InvoiceStatistics /></AvatarGuard>} />
    <Route path="/employees" element={<AvatarGuard><EmployeeManagement /></AvatarGuard>} />
    <Route path="/company-settings" element={<AvatarGuard><CompanySettings /></AvatarGuard>} />
    <Route path="/daily-tracker" element={<AvatarGuard><DailyTracker /></AvatarGuard>} />
    <Route path="/user-management" element={<AvatarGuard><UserManagement /></AvatarGuard>} />
    <Route path="/jobs" element={<AvatarGuard><Jobs /></AvatarGuard>} />
    <Route path="/applications" element={<AvatarGuard><Applications /></AvatarGuard>} />
    <Route path="/screening" element={<AvatarGuard><Screening /></AvatarGuard>} />
    <Route path="/interviews" element={<AvatarGuard><Interviews /></AvatarGuard>} />
    <Route path="/offers" element={<AvatarGuard><Offers /></AvatarGuard>} />
    <Route path="/inbox" element={<AvatarGuard><Inbox /></AvatarGuard>} />

    <Route path="*" element={<NotFound />} />
  </Routes>
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
