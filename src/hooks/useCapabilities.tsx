import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const ALL_CAPABILITIES = [
  { id: 'view_dashboard', label: 'View Dashboard', description: 'Access the main dashboard' },
  { id: 'enter_weekly_data', label: 'Enter Weekly Data', description: 'Submit weekly records' },
  { id: 'view_weekly_history', label: 'View Weekly History', description: 'View historical records' },
  { id: 'manage_rates', label: 'Manage Rates', description: 'Edit rate configurations' },
  { id: 'generate_invoice', label: 'Generate Invoice', description: 'Create payslips' },
  { id: 'view_invoices', label: 'View Invoices', description: 'View invoice list' },
  { id: 'manage_employees', label: 'Manage Employees', description: 'Add/edit employees' },
  { id: 'view_daily_tracker', label: 'View Daily Tracker', description: 'Access daily tracker' },
  { id: 'add_transactions', label: 'Add Transactions', description: 'Add income/expense entries' },
  { id: 'view_statistics', label: 'View Statistics', description: 'View invoice statistics' },
  { id: 'manage_company_settings', label: 'Manage Company Settings', description: 'Edit company info' },
  { id: 'bulk_invoice', label: 'Bulk Invoice', description: 'Generate bulk invoices' },
  { id: 'manage_users', label: 'Manage Users', description: 'Admin: manage other users' },
  { id: 'manage_recruitment', label: 'Manage Recruitment', description: 'Admin: manage job postings and review applications' },
  { id: 'review_applications', label: 'Review Applications', description: 'View and process applications' },
  { id: 'schedule_interviews', label: 'Schedule Interviews', description: 'Set interview dates' },
  { id: 'generate_contracts', label: 'Generate Contracts', description: 'Create contracts' },
  { id: 'submit_application', label: 'Submit Application', description: 'Candidate: apply for jobs' },
  { id: 'complete_screening', label: 'Complete Screening', description: 'Candidate: fill screening form' },
  { id: 'view_interview', label: 'View Interview', description: 'Candidate: see interview details' },
  { id: 'sign_contract', label: 'Sign Contract', description: 'Candidate: sign contracts' },
  { id: 'view_inbox', label: 'View Inbox', description: 'Access inbox/messages' },
  { id: 'send_messages', label: 'Send Messages', description: 'Send messages to other users' },
  { id: 'manage_website_content', label: 'Manage Website Content', description: 'Admin: manage public website CMS content' },
  { id: 'add_job_position', label: 'Add Job Position', description: 'Create and manage job postings' },
  { id: 'manage_knowledge_base', label: 'Manage Knowledge Base', description: 'Create and edit knowledge base articles and categories' },
  { id: 'manage_activity_forms', label: 'Manage Activity Forms', description: 'Design forms, assign frequency and audience, and review submissions' },
  { id: 'view_finance', label: 'View Finance', description: 'Access personal Finance page' },
  { id: 'approve_finance_requests', label: 'Approve Finance Requests', description: 'Approve/reject salary advance, reimbursement and cash advance requests' },
  { id: 'manage_finance_budgets', label: 'Manage Finance Budgets', description: 'Edit finance categories and budget limits' },
] as const;

export type CapabilityId = typeof ALL_CAPABILITIES[number]['id'];

export interface UseCapabilitiesReturn {
  capabilities: string[];
  loading: boolean;
  hasCapability: (capability: string) => boolean;
  refreshCapabilities: () => Promise<void>;
}

export const useCapabilities = (userId: string | null): UseCapabilitiesReturn => {
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCapabilities = useCallback(async () => {
    if (!userId) {
      setCapabilities([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('user_capabilities')
        .select('capability')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching capabilities:', error);
        setCapabilities([]);
      } else {
        setCapabilities(data?.map((c: any) => c.capability) || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setCapabilities([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCapabilities();
  }, [fetchCapabilities]);

  const hasCapability = useCallback((capability: string) => {
    return capabilities.includes(capability);
  }, [capabilities]);

  return {
    capabilities,
    loading,
    hasCapability,
    refreshCapabilities: fetchCapabilities
  };
};
