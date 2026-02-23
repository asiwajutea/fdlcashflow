import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="fdl-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;