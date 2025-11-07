import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import InvoiceGenerator from "./pages/InvoiceGenerator";
import InvoiceList from "./pages/InvoiceList";
import InvoiceStatistics from "./pages/InvoiceStatistics";
import EmployeeManagement from "./pages/EmployeeManagement";
import BulkInvoiceGenerator from "./pages/BulkInvoiceGenerator";
import CompanySettings from "./pages/CompanySettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
          <Route path="/employees" element={<EmployeeManagement />} />
          <Route path="/company-settings" element={<CompanySettings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
