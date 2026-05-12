import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import FormAnalyticsView from '@/components/forms/FormAnalyticsView';

const CMSFormAnalytics = () => {
  const { id } = useParams();
  if (!id) return null;
  return (
    <DashboardLayout title="Form Analytics">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/cms/activity-forms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h2 className="text-lg font-semibold">Form Analytics</h2>
      </div>
      <FormAnalyticsView formId={id} mode="admin" />
    </DashboardLayout>
  );
};

export default CMSFormAnalytics;
