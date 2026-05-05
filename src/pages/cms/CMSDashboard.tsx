import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Calendar, Sparkles, Image, BookOpen, Users, MessageSquare, Settings, Globe, SlidersHorizontal, Briefcase, Building2, FolderKanban, UsersRound, Lightbulb, FolderTree, ClipboardList } from 'lucide-react';

type CMSLink = { title: string; description: string; icon: JSX.Element; path: string };

const SECTIONS: { label: string; description: string; links: CMSLink[] }[] = [
  {
    label: 'Public Website',
    description: 'Content visible to your visitors and prospects.',
    links: [
      { title: 'Hero Slides', description: 'Manage homepage slideshow', icon: <SlidersHorizontal className="h-6 w-6" />, path: '/cms/hero-slides' },
      { title: 'Services', description: 'Manage service offerings', icon: <Settings className="h-6 w-6" />, path: '/cms/services' },
      { title: 'Events', description: 'Manage flagship events', icon: <Calendar className="h-6 w-6" />, path: '/cms/events' },
      { title: 'Innovations', description: 'Manage innovation projects', icon: <Sparkles className="h-6 w-6" />, path: '/cms/innovations' },
      { title: 'Blog Posts', description: 'Create and edit blog articles', icon: <BookOpen className="h-6 w-6" />, path: '/cms/blog' },
      { title: 'Gallery', description: 'Manage media gallery', icon: <Image className="h-6 w-6" />, path: '/cms/gallery' },
      { title: 'Partners', description: 'Manage partner logos', icon: <Users className="h-6 w-6" />, path: '/cms/partners' },
      { title: 'Testimonials', description: 'Manage testimonials', icon: <MessageSquare className="h-6 w-6" />, path: '/cms/testimonials' },
      { title: 'Website Sections', description: 'Edit homepage and page content', icon: <Globe className="h-6 w-6" />, path: '/cms/sections' },
    ],
  },
  {
    label: 'Workforce & Org Data',
    description: 'Reference data used across HR, payslips, and forms.',
    links: [
      { title: 'Positions', description: 'Manage job positions/titles', icon: <Briefcase className="h-6 w-6" />, path: '/cms/positions' },
      { title: 'Departments', description: 'Manage company departments', icon: <Building2 className="h-6 w-6" />, path: '/cms/departments' },
      { title: 'Projects', description: 'Manage active projects', icon: <FolderKanban className="h-6 w-6" />, path: '/cms/projects' },
      { title: 'Teams', description: 'Manage workforce teams', icon: <UsersRound className="h-6 w-6" />, path: '/cms/teams' },
      { title: 'Team Members', description: 'Manage leadership team', icon: <Users className="h-6 w-6" />, path: '/cms/team' },
    ],
  },
  {
    label: 'Knowledge Base',
    description: 'Internal articles and help content for staff.',
    links: [
      { title: 'Knowledge Base', description: 'Create and edit help articles', icon: <Lightbulb className="h-6 w-6" />, path: '/cms/knowledge-base' },
      { title: 'KB Categories', description: 'Organize knowledge base sections', icon: <FolderTree className="h-6 w-6" />, path: '/cms/kb-categories' },
    ],
  },
  {
    label: 'Operations',
    description: 'Forms, communications, and shared assets.',
    links: [
      { title: 'Activity Forms', description: 'Design forms for daily/weekly reporting', icon: <ClipboardList className="h-6 w-6" />, path: '/cms/activity-forms' },
      { title: 'Contact Submissions', description: 'View contact form messages', icon: <FileText className="h-6 w-6" />, path: '/cms/contacts' },
      { title: 'Media Library', description: 'Upload and manage images', icon: <Image className="h-6 w-6" />, path: '/cms/media' },
    ],
  },
];

const CMSDashboard = () => {
  return (
    <DashboardLayout title="Website CMS">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Content Management</h2>
        <p className="text-muted-foreground">Manage your public website content and internal data.</p>
      </div>
      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.label}>
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-foreground">{section.label}</h3>
              <p className="text-xs text-muted-foreground">{section.description}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.links.map((link) => (
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
          </section>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default CMSDashboard;
