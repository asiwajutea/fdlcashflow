import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import AIAssistantPanel from '@/components/AIAssistantPanel';

export default function AIAssistant() {
  const { role, loading: authLoading } = useAuth();

  if (!authLoading && role !== 'admin') {
    return (
      <DashboardLayout title="AI Assistant">
        <Card><CardContent className="py-10 text-center text-muted-foreground">The AI Assistant is available to admins only.</CardContent></Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="AI Assistant">
      <div className="max-w-4xl mx-auto">
        <AIAssistantPanel />
      </div>
    </DashboardLayout>
  );
}
