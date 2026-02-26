import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import fdlLogo from '@/assets/fdl-logo.jpg';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Services', path: '/services' },
  { label: 'Events', path: '/events' },
  { label: 'Innovations', path: '/innovations' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'Careers', path: '/careers' },
  { label: 'Blog', path: '/blog' },
  { label: 'Contact', path: '/contact' },
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
              className="lg:hidden text-white p-2"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-[hsl(214,95%,13%)] border-t border-[hsl(214,70%,25%)] pb-4">
            <nav className="px-4 pt-2 space-y-1">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === link.path
                      ? 'text-[hsl(28,100%,55%)] bg-[hsl(214,85%,20%)]'
                      : 'text-[hsl(0,0%,85%)] hover:text-white hover:bg-[hsl(214,85%,20%)]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="px-4 mt-4 flex flex-col gap-2">
              <Button variant="outline" size="sm" asChild className="border-[hsl(0,0%,85%)] text-white hover:bg-[hsl(214,85%,25%)] w-full">
                <Link to="/auth" onClick={() => setMobileOpen(false)}>Employee Login</Link>
              </Button>
              <Button size="sm" asChild className="bg-[hsl(28,100%,55%)] hover:bg-[hsl(28,100%,45%)] text-white w-full">
                <Link to="/apply" onClick={() => setMobileOpen(false)}>Apply for Job</Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-[hsl(214,95%,12%)] text-[hsl(0,0%,75%)] border-t border-[hsl(214,70%,20%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src={fdlLogo} alt="FDL Logo" className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <span className="text-white font-bold block">FOOTPRINTS DYNASTY LTD</span>
                  <span className="text-[hsl(28,100%,55%)] text-xs">Making a Difference</span>
                </div>
              </div>
              <p className="text-sm leading-relaxed">
                Delivering excellence across Events, Technology, Education, and Cultural Preservation since 2019.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                {navLinks.slice(0, 5).map(link => (
                  <li key={link.path}>
                    <Link to={link.path} className="hover:text-[hsl(28,100%,55%)] transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* More Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                {navLinks.slice(5).map(link => (
                  <li key={link.path}>
                    <Link to={link.path} className="hover:text-[hsl(28,100%,55%)] transition-colors">{link.label}</Link>
                  </li>
                ))}
                <li>
                  <Link to="/auth" className="hover:text-[hsl(28,100%,55%)] transition-colors">Employee Portal</Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>info@footprintsdynasty.com.ng</li>
                <li>RC: 1554073</li>
                <li>Founded: 2019</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[hsl(214,70%,20%)] mt-8 pt-8 text-center text-sm">
            <p>© {new Date().getFullYear()} Footprints Dynasty Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
