import { lazy, Suspense, useEffect, useState } from "react";
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
const PendingApproval = lazy(() => import("./pages/PendingApproval"));

// Employee skeleton pages
const MyInvoices = lazy(() => import("./pages/employee/MyInvoices"));
const ActivityReport = lazy(() => import("./pages/employee/ActivityReport"));
const EmpFinance = lazy(() => import("./pages/employee/Finance"));
const Suggestions = lazy(() => import("./pages/employee/Suggestions"));
const KnowledgeBase = lazy(() => import("./pages/employee/KnowledgeBase"));
const KBArticle = lazy(() => import("./pages/employee/KnowledgeBaseArticle"));
const EmployeeSupport = lazy(() => import("./pages/employee/EmployeeSupport"));
const MyContract = lazy(() => import("./pages/employee/MyContract"));
const ContractTemplates = lazy(() => import("./pages/admin/ContractTemplates"));
const EmailLogs = lazy(() => import("./pages/admin/EmailLogs"));

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
const CMSFormAnalytics = lazy(() => import("./pages/cms/CMSFormAnalytics"));
const EmployeeFormAnalytics = lazy(() => import("./pages/employee/FormAnalytics"));
const TeamReports = lazy(() => import("./pages/TeamReports"));
const OrgChart = lazy(() => import("./pages/OrgChart"));
const CMSSmsTemplates = lazy(() => import("./pages/cms/CMSSmsTemplates"));
const ChatPolicies = lazy(() => import("./pages/admin/ChatPolicies"));
const AIAssistant = lazy(() => import("./pages/admin/AIAssistant"));

import { CapabilityGuard } from "@/components/CapabilityGuard";

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
  const { user, avatarUrl, loading, role } = useAuth();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setPendingStatus(null); return; }
    if (role === 'candidate') { setPendingStatus(null); return; }
    import('@/integrations/supabase/client').then(({ supabase }) => {
      (supabase as any).from('profiles').select('approval_status').eq('id', user.id).maybeSingle()
        .then(({ data }: any) => setPendingStatus(data?.approval_status || null));
    });
  }, [user, role]);

  if (loading) return null;
  if (!user) return <>{children}</>;
  if (pendingStatus === 'pending' && role !== 'candidate' && window.location.pathname !== '/pending-approval') {
    return <Navigate to="/pending-approval" replace />;
  }
  if (!avatarUrl && role !== 'candidate' && window.location.pathname !== '/profile-setup' && window.location.pathname !== '/auth' && window.location.pathname !== '/pending-approval') {
    return <Navigate to="/profile-setup" replace />;
  }
  return <>{children}</>;
};

// Guard that blocks candidates from employee-only pages
const EmployeeGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (role === 'candidate') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Not Authorized</h2>
          <p className="text-muted-foreground text-sm">
            This page is for employees only. As a candidate, you don't have access to this section.
          </p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent transition-colors"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
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
      <Route path="/pending-approval" element={<PendingApproval />} />

      {/* Backend routes */}
      <Route path="/dashboard" element={<AvatarGuard><Index /></AvatarGuard>} />
      <Route path="/generate-invoice" element={<AvatarGuard><CapabilityGuard requires="generate_invoice"><InvoiceGenerator /></CapabilityGuard></AvatarGuard>} />
      <Route path="/bulk-invoice" element={<AvatarGuard><CapabilityGuard requires="bulk_invoice"><BulkInvoiceGenerator /></CapabilityGuard></AvatarGuard>} />
      <Route path="/invoices" element={<AvatarGuard><CapabilityGuard requires="view_invoices"><InvoiceList /></CapabilityGuard></AvatarGuard>} />
      <Route path="/invoice-statistics" element={<AvatarGuard><CapabilityGuard requires="view_statistics"><InvoiceStatistics /></CapabilityGuard></AvatarGuard>} />
      <Route path="/statistics" element={<AvatarGuard><CapabilityGuard requires="view_statistics"><InvoiceStatistics /></CapabilityGuard></AvatarGuard>} />
      <Route path="/employees" element={<AvatarGuard><CapabilityGuard requires="manage_employees"><EmployeeManagement /></CapabilityGuard></AvatarGuard>} />
      <Route path="/company-settings" element={<AvatarGuard><CapabilityGuard requires="manage_company_settings"><CompanySettings /></CapabilityGuard></AvatarGuard>} />
      <Route path="/daily-tracker" element={<AvatarGuard><CapabilityGuard requires="view_daily_tracker"><DailyTracker /></CapabilityGuard></AvatarGuard>} />
      <Route path="/user-management" element={<AvatarGuard><CapabilityGuard adminOnly><UserManagement /></CapabilityGuard></AvatarGuard>} />
      <Route path="/jobs" element={<AvatarGuard><Jobs /></AvatarGuard>} />
      <Route path="/applications" element={<AvatarGuard><CapabilityGuard requires="manage_recruitment"><Applications /></CapabilityGuard></AvatarGuard>} />
      <Route path="/screening" element={<AvatarGuard><Screening /></AvatarGuard>} />
      <Route path="/interviews" element={<AvatarGuard><Interviews /></AvatarGuard>} />
      <Route path="/offers" element={<AvatarGuard><Offers /></AvatarGuard>} />
      <Route path="/inbox" element={<AvatarGuard><Inbox /></AvatarGuard>} />

      {/* Employee skeleton routes */}
      <Route path="/my-invoices" element={<AvatarGuard><EmployeeGuard><MyInvoices /></EmployeeGuard></AvatarGuard>} />
      <Route path="/activity-report" element={<AvatarGuard><EmployeeGuard><ActivityReport /></EmployeeGuard></AvatarGuard>} />
      <Route path="/my-finance" element={<AvatarGuard><EmployeeGuard><EmpFinance /></EmployeeGuard></AvatarGuard>} />
      <Route path="/finance" element={<AvatarGuard><EmployeeGuard><EmpFinance /></EmployeeGuard></AvatarGuard>} />
      <Route path="/suggestions" element={<AvatarGuard><EmployeeGuard><Suggestions /></EmployeeGuard></AvatarGuard>} />
      <Route path="/knowledge-base" element={<AvatarGuard><EmployeeGuard><KnowledgeBase /></EmployeeGuard></AvatarGuard>} />
      <Route path="/knowledge-base/:slug" element={<AvatarGuard><EmployeeGuard><KBArticle /></EmployeeGuard></AvatarGuard>} />
      <Route path="/employee-support" element={<AvatarGuard><EmployeeGuard><EmployeeSupport /></EmployeeGuard></AvatarGuard>} />
      <Route path="/team-reports" element={<AvatarGuard><EmployeeGuard><TeamReports /></EmployeeGuard></AvatarGuard>} />

      {/* CMS routes */}
      <Route path="/cms" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSDashboard /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/services" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSServices /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/events" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSEvents /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/innovations" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSInnovations /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/blog" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSBlog /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/gallery" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSGallery /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/partners" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSPartners /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/testimonials" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSTestimonials /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/sections" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSSections /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/contacts" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSContacts /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/hero-slides" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSHeroSlides /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/team" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSTeamMembers /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/media" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSMediaLibrary /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/positions" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSPositions /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/departments" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSDepartments /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/projects" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSProjects /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/teams" element={<AvatarGuard><CapabilityGuard requires="manage_website_content"><CMSTeams /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/knowledge-base" element={<AvatarGuard><CapabilityGuard requires="manage_knowledge_base"><CMSKnowledgeBase /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/kb-categories" element={<AvatarGuard><CapabilityGuard requires="manage_knowledge_base"><CMSKBCategories /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/activity-forms" element={<AvatarGuard><CapabilityGuard requires="manage_activity_forms"><CMSActivityForms /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/activity-forms/:id" element={<AvatarGuard><CapabilityGuard requires="manage_activity_forms"><CMSActivityFormBuilder /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/activity-forms/:id/submissions" element={<AvatarGuard><CapabilityGuard requires="manage_activity_forms"><CMSFormSubmissions /></CapabilityGuard></AvatarGuard>} />
      <Route path="/cms/activity-forms/:id/analytics" element={<AvatarGuard><CapabilityGuard requires="manage_activity_forms"><CMSFormAnalytics /></CapabilityGuard></AvatarGuard>} />
      <Route path="/activity-report/:id/analytics" element={<AvatarGuard><EmployeeFormAnalytics /></AvatarGuard>} />
      <Route path="/org-chart" element={<AvatarGuard><OrgChart /></AvatarGuard>} />
      <Route path="/cms/sms-templates" element={<AvatarGuard><CapabilityGuard adminOnly><CMSSmsTemplates /></CapabilityGuard></AvatarGuard>} />
      <Route path="/admin/chat-policies" element={<AvatarGuard><CapabilityGuard adminOnly><ChatPolicies /></CapabilityGuard></AvatarGuard>} />
      <Route path="/admin/ai-assistant" element={<AvatarGuard><CapabilityGuard adminOnly><AIAssistant /></CapabilityGuard></AvatarGuard>} />
      <Route path="/admin/contract-templates" element={<AvatarGuard><CapabilityGuard adminOnly><ContractTemplates /></CapabilityGuard></AvatarGuard>} />
      <Route path="/admin/email-logs" element={<AvatarGuard><CapabilityGuard adminOnly><EmailLogs /></CapabilityGuard></AvatarGuard>} />
      <Route path="/my-contract" element={<AvatarGuard><MyContract /></AvatarGuard>} />



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