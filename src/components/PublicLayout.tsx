import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronRight, LogIn, Briefcase, Home, Info, Layers, Calendar, Lightbulb, Image, Users, BookOpen, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import fdlLogo from '@/assets/fdl-logo.jpg';

const navLinks = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'About', path: '/about', icon: Info },
  { label: 'Services', path: '/services', icon: Layers },
  { label: 'Events', path: '/events', icon: Calendar },
  { label: 'Innovations', path: '/innovations', icon: Lightbulb },
  { label: 'Gallery', path: '/gallery', icon: Image },
  { label: 'Careers', path: '/careers', icon: Users },
  { label: 'Blog', path: '/blog', icon: BookOpen },
  { label: 'Contact', path: '/contact', icon: Mail },
];

const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Force light mode on all public pages
  useEffect(() => {
    const root = window.document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    root.classList.add('light');
    return () => {
      if (wasDark) {
        root.classList.remove('light');
        root.classList.add('dark');
      }
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-[hsl(214,95%,15%)] border-b border-[hsl(214,70%,25%)] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 shrink-0">
              <img src={fdlLogo} alt="FDL Logo" className="h-10 w-10 rounded-full object-cover" />
              <div className="hidden sm:block">
                <span className="text-white font-bold text-lg leading-tight block">FOOTPRINTS DYNASTY</span>
                <span className="text-[hsl(28,100%,55%)] text-xs font-medium">Making a Difference</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === link.path
                      ? 'text-[hsl(28,100%,55%)] bg-[hsl(214,85%,20%)]'
                      : 'text-[hsl(0,0%,85%)] hover:text-white hover:bg-[hsl(214,85%,20%)]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" size="sm" asChild className="border-[hsl(0,0%,85%)] text-white hover:bg-[hsl(214,85%,25%)]">
                <Link to="/auth">Employee Login</Link>
              </Button>
              <Button size="sm" asChild className="bg-[hsl(28,100%,55%)] hover:bg-[hsl(28,100%,45%)] text-white">
                <Link to="/apply">Apply for Job</Link>
              </Button>
            </div>

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-white p-2 relative z-[60]"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu - Full Screen Overlay */}
      <div
        className={`fixed inset-0 z-[55] lg:hidden transition-all duration-300 ${
          mobileOpen ? 'visible' : 'invisible'
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMobileOpen(false)}
        />

        {/* Slide-in Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-[85%] max-w-[320px] bg-gradient-to-b from-[hsl(214,95%,12%)] to-[hsl(214,95%,8%)] shadow-2xl transition-transform duration-300 ease-out ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Menu Header */}
          <div className="px-6 pt-20 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <img src={fdlLogo} alt="FDL Logo" className="h-12 w-12 rounded-full object-cover ring-2 ring-[hsl(28,100%,55%)]/30" />
              <div>
                <span className="text-white font-bold text-sm block">FOOTPRINTS DYNASTY</span>
                <span className="text-[hsl(28,100%,55%)] text-xs font-medium">Making a Difference</span>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="px-3 py-4 space-y-0.5 overflow-y-auto max-h-[calc(100vh-280px)]">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-[hsl(28,100%,55%)]/15 text-[hsl(28,100%,55%)]'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-[hsl(28,100%,55%)]' : 'text-white/40 group-hover:text-white/70'}`} />
                  <span className="flex-1">{link.label}</span>
                  <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isActive ? 'text-[hsl(28,100%,55%)]' : 'text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5'}`} />
                </Link>
              );
            })}
          </nav>

          {/* CTA Section */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 border-t border-white/10 bg-[hsl(214,95%,8%)]">
            <Button variant="outline" size="default" asChild className="w-full border-white/20 text-white hover:bg-white/10 justify-start gap-2">
              <Link to="/auth" onClick={() => setMobileOpen(false)}>
                <LogIn className="h-4 w-4" />
                Employee Login
              </Link>
            </Button>
            <Button size="default" asChild className="w-full bg-gradient-to-r from-[hsl(28,100%,55%)] to-[hsl(12,90%,50%)] hover:from-[hsl(28,100%,45%)] hover:to-[hsl(12,90%,40%)] text-white justify-start gap-2 shadow-lg shadow-[hsl(28,100%,55%)]/20">
              <Link to="/apply" onClick={() => setMobileOpen(false)}>
                <Briefcase className="h-4 w-4" />
                Apply for Job
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-[hsl(214,95%,8%)] text-white/60">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-[hsl(214,95%,25%)] via-[hsl(28,100%,55%)] to-[hsl(12,90%,50%)]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-5">
                <img src={fdlLogo} alt="FDL Logo" className="h-11 w-11 rounded-full object-cover ring-2 ring-[hsl(28,100%,55%)]/20" />
                <div>
                  <span className="text-white font-bold text-base block tracking-wide">FOOTPRINTS DYNASTY</span>
                  <span className="text-[hsl(28,100%,55%)] text-xs font-medium">Making a Difference</span>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-white/40 mb-5">
                Delivering excellence across Events, Technology, Education, and Cultural Preservation since 2019.
              </p>
              {/* Social placeholder */}
              <div className="flex gap-3">
                {['Facebook', 'Twitter', 'LinkedIn', 'Instagram'].map((s) => (
                  <div key={s} className="h-9 w-9 rounded-lg bg-white/5 hover:bg-[hsl(28,100%,55%)]/15 flex items-center justify-center text-white/30 hover:text-[hsl(28,100%,55%)] transition-all cursor-pointer text-xs font-bold">
                    {s[0]}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-3 text-sm">
                {navLinks.slice(0, 5).map(link => (
                  <li key={link.path}>
                    <Link to={link.path} className="text-white/40 hover:text-[hsl(28,100%,55%)] transition-colors duration-200 flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 text-white/20" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Resources</h4>
              <ul className="space-y-3 text-sm">
                {navLinks.slice(5).map(link => (
                  <li key={link.path}>
                    <Link to={link.path} className="text-white/40 hover:text-[hsl(28,100%,55%)] transition-colors duration-200 flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 text-white/20" />
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/auth" className="text-white/40 hover:text-[hsl(28,100%,55%)] transition-colors duration-200 flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-white/20" />
                    Employee Portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-[hsl(28,100%,55%)] mt-0.5 shrink-0" />
                  <span className="text-white/40">info@footprintsdynasty.com.ng</span>
                </li>
                <li className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 text-[hsl(28,100%,55%)] mt-0.5 shrink-0" />
                  <span className="text-white/40">RC: 1554073</span>
                </li>
                <li className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-[hsl(28,100%,55%)] mt-0.5 shrink-0" />
                  <span className="text-white/40">Founded: 2019</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
            <p>© {new Date().getFullYear()} Footprints Dynasty Ltd. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/contact" className="hover:text-[hsl(28,100%,55%)] transition-colors">Privacy Policy</Link>
              <Link to="/contact" className="hover:text-[hsl(28,100%,55%)] transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;