import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface SkeletonPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const SkeletonPage: React.FC<SkeletonPageProps> = ({ title, description, icon: Icon }) => {
  return (
    <DashboardLayout title={title}>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>{title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Icon className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium text-foreground">Coming soon</p>
              <p className="text-sm text-muted-foreground mt-1">This feature is being built and will be available shortly.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};
