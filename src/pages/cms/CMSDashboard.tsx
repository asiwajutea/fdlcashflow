import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Calendar, Sparkles, Image, BookOpen, Users, MessageSquare, Settings, Globe } from 'lucide-react';

const cmsLinks = [
  { title: 'Services', description: 'Manage service offerings', icon: <Settings className="h-6 w-6" />, path: '/cms/services' },
  { title: 'Events', description: 'Manage flagship events', icon: <Calendar className="h-6 w-6" />, path: '/cms/events' },
  { title: 'Innovations', description: 'Manage innovation projects', icon: <Sparkles className="h-6 w-6" />, path: '/cms/innovations' },
  { title: 'Blog Posts', description: 'Create and edit blog articles', icon: <BookOpen className="h-6 w-6" />, path: '/cms/blog' },
  { title: 'Gallery', description: 'Manage media gallery', icon: <Image className="h-6 w-6" />, path: '/cms/gallery' },
  { title: 'Partners', description: 'Manage partner logos', icon: <Users className="h-6 w-6" />, path: '/cms/partners' },
  { title: 'Testimonials', description: 'Manage testimonials', icon: <MessageSquare className="h-6 w-6" />, path: '/cms/testimonials' },
  { title: 'Website Sections', description: 'Edit homepage and page content', icon: <Globe className="h-6 w-6" />, path: '/cms/sections' },
  { title: 'Contact Submissions', description: 'View contact form messages', icon: <FileText className="h-6 w-6" />, path: '/cms/contacts' },
];

const CMSDashboard = () => {
  return (
    <DashboardLayout title="Website CMS">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Content Management</h2>
        <p className="text-muted-foreground">Manage your public website content</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cmsLinks.map((link) => (
          <Link key={link.path} to={link.path}>
            <Card className="h-full hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent text-accent-foreground">{link.icon}</div>
                  <div>
                    <CardTitle className="text-base">{link.title}</CardTitle>
                    <CardDescription className="text-xs">{link.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default CMSDashboard;
