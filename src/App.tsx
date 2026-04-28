import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

// Eagerly loaded — landing page
import Home from "./pages/public/Home";

// Prefetched on idle — high-traffic public pages
const About = lazy(() => import("./pages/public/About"));
const Services = lazy(() => import("./pages/public/Services"));
const Contact = lazy(() => import("./pages/public/Contact"));
const Careers = lazy(() => import("./pages/public/Careers"));

// Lazy loaded on demand — detail & other public pages
const ServiceDetail = lazy(() => import("./pages/public/ServiceDetail"));
const PublicEvents = lazy(() => import("./pages/public/Events"));
const EventDetail = lazy(() => import("./pages/public/EventDetail"));
const PublicInnovations = lazy(() => import("./pages/public/Innovations"));
const InnovationDetail = lazy(() => import("./pages/public/InnovationDetail"));
const PublicGallery = lazy(() => import("./pages/public/Gallery"));
const Blog = lazy(() => import("./pages/public/Blog"));
const BlogPost = lazy(() => import("./pages/public/BlogPost"));

// Backend pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const InvoiceGenerator = lazy(() => import("./pages/InvoiceGenerator"));
const InvoiceList = lazy(() => import("./pages/InvoiceList"));
const InvoiceStatistics = lazy(() => import("./pages/InvoiceStatistics"));
const EmployeeManagement = lazy(() => import("./pages/EmployeeManagement"));
const BulkInvoiceGenerator = lazy(() => import("./pages/BulkInvoiceGenerator"));
const CompanySettings = lazy(() => import("./pages/CompanySettings"));
const DailyTracker = lazy(() => import("./pages/DailyTracker"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Jobs = lazy(() => import("./pages/Jobs"));
const Apply = lazy(() => import("./pages/Apply"));
const Applications = lazy(() => import("./pages/Applications"));
const Screening = lazy(() => import("./pages/Screening"));
const Interviews = lazy(() => import("./pages/Interviews"));
const Offers = lazy(() => import("./pages/Offers"));
const Inbox = lazy(() => import("./pages/Inbox"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const Profile = lazy(() => import("./pages/Profile"));

// Employee skeleton pages
const MyInvoices = lazy(() => import("./pages/employee/MyInvoices"));
const ActivityReport = lazy(() => import("./pages/employee/ActivityReport"));
const EmpFinance = lazy(() => import("./pages/employee/Finance"));
const Suggestions = lazy(() => import("./pages/employee/Suggestions"));
const KnowledgeBase = lazy(() => import("./pages/employee/KnowledgeBase"));
const KBArticle = lazy(() => import("./pages/employee/KnowledgeBaseArticle"));
const EmployeeSupport = lazy(() => import("./pages/employee/EmployeeSupport"));

// CMS pages
const CMSDashboard = lazy(() => import("./pages/cms/CMSDashboard"));
const CMSServices = lazy(() => import("./pages/cms/CMSServices"));
const CMSEvents = lazy(() => import("./pages/cms/CMSEvents"));
const CMSInnovations = lazy(() => import("./pages/cms/CMSInnovations"));
const CMSBlog = lazy(() => import("./pages/cms/CMSBlog"));
const CMSGallery = lazy(() => import("./pages/cms/CMSGallery"));
const CMSPartners = lazy(() => import("./pages/cms/CMSPartners"));
const CMSTestimonials = lazy(() => import("./pages/cms/CMSTestimonials"));
const CMSSections = lazy(() => import("./pages/cms/CMSSections"));
const CMSContacts = lazy(() => import("./pages/cms/CMSContacts"));
const CMSHeroSlides = lazy(() => import("./pages/cms/CMSHeroSlides"));
const CMSTeamMembers = lazy(() => import("./pages/cms/CMSTeamMembers"));
const CMSMediaLibrary = lazy(() => import("./pages/cms/CMSMediaLibrary"));
const CMSPositions = lazy(() => import("./pages/cms/CMSPositions"));
const CMSDepartments = lazy(() => import("./pages/cms/CMSDepartments"));
const CMSProjects = lazy(() => import("./pages/cms/CMSProjects"));
const CMSTeams = lazy(() => import("./pages/cms/CMSTeams"));
const CMSKnowledgeBase = lazy(() => import("./pages/cms/CMSKnowledgeBase"));
const CMSKBCategories = lazy(() => import("./pages/cms/CMSKBCategories"));
const CMSActivityForms = lazy(() => import("./pages/cms/CMSActivityForms"));
const CMSActivityFormBuilder = lazy(() => import("./pages/cms/CMSActivityFormBuilder"));
const CMSFormSubmissions = lazy(() => import("./pages/cms/CMSFormSubmissions"));

// Prefetch high-traffic pages after initial render
const prefetchRoutes = () => {
  const prefetch = () => {
    import("./pages/public/About");
    import("./pages/public/Services");
    import("./pages/public/Contact");
    import("./pages/public/Careers");
  };
  if ("requestIdleCallback" in window) {
    requestIdleCallback(prefetch);
  } else {
    setTimeout(prefetch, 2000);
  }
};

// Trigger prefetch once on module load
if (typeof window !== "undefined") {
  window.addEventListener("load", prefetchRoutes, { once: true });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000
    }
  }
});

const LoadingFallback = () =>
<div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>;


// Guard for backend routes only
const AvatarGuard = ({ children }: {children: React.ReactNode;}) => {
  const { user, avatarUrl, loading } = useAuth();
  if (loading) return null;
  if (!user) return <>{children}</>;
  if (!avatarUrl && window.location.pathname !== '/profile-setup' && window.location.pathname !== '/auth') {
    return <Navigate to="/profile-setup" replace />;
  }
  return <>{children}</>;
};

const AppRoutes = () =>
<Suspense fallback={<LoadingFallback />}>
    <Routes>
      {/* Public routes */}
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
      <Route path="/profile" element={<AvatarGuard><Profile /></AvatarGuard>} />

      {/* Backend routes */}
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

      {/* Employee skeleton routes */}
      <Route path="/my-invoices" element={<AvatarGuard><MyInvoices /></AvatarGuard>} />
      <Route path="/activity-report" element={<AvatarGuard><ActivityReport /></AvatarGuard>} />
      <Route path="/my-finance" element={<AvatarGuard><EmpFinance /></AvatarGuard>} />
      <Route path="/suggestions" element={<AvatarGuard><Suggestions /></AvatarGuard>} />
      <Route path="/knowledge-base" element={<AvatarGuard><KnowledgeBase /></AvatarGuard>} />
      <Route path="/knowledge-base/:slug" element={<AvatarGuard><KBArticle /></AvatarGuard>} />
      <Route path="/employee-support" element={<AvatarGuard><EmployeeSupport /></AvatarGuard>} />

      {/* CMS routes */}
      <Route path="/cms" element={<AvatarGuard><CMSDashboard /></AvatarGuard>} />
      <Route path="/cms/services" element={<AvatarGuard><CMSServices /></AvatarGuard>} />
      <Route path="/cms/events" element={<AvatarGuard><CMSEvents /></AvatarGuard>} />
      <Route path="/cms/innovations" element={<AvatarGuard><CMSInnovations /></AvatarGuard>} />
      <Route path="/cms/blog" element={<AvatarGuard><CMSBlog /></AvatarGuard>} />
      <Route path="/cms/gallery" element={<AvatarGuard><CMSGallery /></AvatarGuard>} />
      <Route path="/cms/partners" element={<AvatarGuard><CMSPartners /></AvatarGuard>} />
      <Route path="/cms/testimonials" element={<AvatarGuard><CMSTestimonials /></AvatarGuard>} />
      <Route path="/cms/sections" element={<AvatarGuard><CMSSections /></AvatarGuard>} />
      <Route path="/cms/contacts" element={<AvatarGuard><CMSContacts /></AvatarGuard>} />
      <Route path="/cms/hero-slides" element={<AvatarGuard><CMSHeroSlides /></AvatarGuard>} />
      <Route path="/cms/team" element={<AvatarGuard><CMSTeamMembers /></AvatarGuard>} />
      <Route path="/cms/media" element={<AvatarGuard><CMSMediaLibrary /></AvatarGuard>} />
      <Route path="/cms/positions" element={<AvatarGuard><CMSPositions /></AvatarGuard>} />
      <Route path="/cms/departments" element={<AvatarGuard><CMSDepartments /></AvatarGuard>} />
      <Route path="/cms/projects" element={<AvatarGuard><CMSProjects /></AvatarGuard>} />
      <Route path="/cms/teams" element={<AvatarGuard><CMSTeams /></AvatarGuard>} />
      <Route path="/cms/knowledge-base" element={<AvatarGuard><CMSKnowledgeBase /></AvatarGuard>} />
      <Route path="/cms/kb-categories" element={<AvatarGuard><CMSKBCategories /></AvatarGuard>} />
      <Route path="/cms/activity-forms" element={<AvatarGuard><CMSActivityForms /></AvatarGuard>} />
      <Route path="/cms/activity-forms/:id" element={<AvatarGuard><CMSActivityFormBuilder /></AvatarGuard>} />
      <Route path="/cms/activity-forms/:id/submissions" element={<AvatarGuard><CMSFormSubmissions /></AvatarGuard>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>;


const App = () =>
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
  </QueryClientProvider>;


export default App;