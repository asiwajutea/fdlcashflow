import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/supabase-db';
import { useAuth } from '@/hooks/useAuth';
import FormAnalyticsView from '@/components/forms/FormAnalyticsView';

const EmployeeFormAnalytics = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    db.from('activity_forms').select('*').eq('id', id).single().then(({ data }: any) => setForm(data));
  }, [id]);

  if (!id || !user) return null;

  const canPersonal = form?.analytics_visible_to_submitter !== false;
  const canTeam = !!form?.analytics_employee_visible;

  return (
    <DashboardLayout title="Form Analytics">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/activity-report"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h2 className="text-lg font-semibold">{form?.title || 'Analytics'}</h2>
      </div>

      {!canPersonal && !canTeam ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">Analytics for this form are not available to you.</CardContent></Card>
      ) : (
        <Tabs defaultValue={canPersonal ? 'personal' : 'team'}>
          <TabsList>
            {canPersonal && <TabsTrigger value="personal">My Submissions</TabsTrigger>}
            {canTeam && <TabsTrigger value="team">Team Aggregate</TabsTrigger>}
          </TabsList>
          {canPersonal && (
            <TabsContent value="personal" className="mt-4">
              <FormAnalyticsView formId={id} mode="submitter" currentUserId={user.id} />
            </TabsContent>
          )}
          {canTeam && (
            <TabsContent value="team" className="mt-4">
              <FormAnalyticsView formId={id} mode="employee-aggregate" />
            </TabsContent>
          )}
        </Tabs>
      )}
    </DashboardLayout>
  );
};

export default EmployeeFormAnalytics;
