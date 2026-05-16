import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ArrowRight, Send, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import PublicLayout from '@/components/PublicLayout';
import SEO from '@/components/SEO';
import { db } from '@/lib/supabase-db';
import { toast } from 'sonner';

const useInView = (threshold = 0.2) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
};

const contactInfo = [
  { icon: <Mail className="h-5 w-5" />, title: 'Email', detail: 'info@footprintsdynasty.com.ng' },
  { icon: <Phone className="h-5 w-5" />, title: 'Phone', detail: 'Contact via email' },
  { icon: <MapPin className="h-5 w-5" />, title: 'Registration', detail: 'RC: 1554073' },
];

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const infoSection = useInView(0.2);
  const formSection = useInView(0.1);
  const ctaSection = useInView(0.2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    const { error } = await db.from('contact_submissions').insert([form]);
    setLoading(false);
    if (error) {
      toast.error('Failed to submit. Please try again.');
    } else {
      toast.success('Message sent successfully!');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    }
  };

  return (
    <PublicLayout>
      <SEO title="Contact Us" description="Get in touch with Footprints Dynasty for collaborations, partnerships and questions." />
      {/* HERO */}
      <section className="relative h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1423666639041-f56000c27a9a?auto=format&fit=crop&w=1920&q=80"
          alt="Contact us"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(214,95%,6%)/0.92] via-[hsl(214,95%,8%)/0.85] to-[hsl(214,95%,10%)/0.7]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(214,95%,6%)/0.95] via-transparent to-transparent" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(hsl(0,0%,100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0,0%,100%) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16 md:pb-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white/90 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Send className="h-3 w-3 text-brand-red-orange-light" />
              Get In Touch
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.1] mb-4 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_20px_rgba(0,0,0,0.7)]">
              Contact <span className="text-brand-red-orange-light drop-shadow-none [filter:drop-shadow(0_2px_8px_rgba(200,80,0,0.5))]">Us</span>
            </h1>
            <p className="text-sm sm:text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              We'd love to hear from you. Let's start a conversation.
            </p>
          </div>
        </div>
      </section>

      {/* INFO CARDS */}
      <section ref={infoSection.ref} className="bg-card py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${infoSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
            {contactInfo.map((info, i) => (
              <Card
                key={info.title}
                className="border border-card-border hover:border-brand-red-orange/20 hover:shadow-card-hover transition-all duration-500 rounded-2xl overflow-hidden"
                style={{ animationDelay: `${(i + 1) * 100}ms` }}
              >
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-red-orange/15 to-brand-red-orange/5 flex items-center justify-center shrink-0">
                    <div className="text-brand-red-orange">{info.icon}</div>
                  </div>
                  <div>
                    <h4 className="font-bold text-card-foreground mb-1">{info.title}</h4>
                    <p className="text-sm text-muted-foreground">{info.detail}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FORM */}
      <section ref={formSection.ref} className="bg-[hsl(210,20%,97%)] py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-14 ${formSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-6">
              <Star className="h-3 w-3" />
              Send a Message
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[hsl(214,95%,15%)] mb-4">Drop Us a Line</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Fill out the form below and we'll get back to you as soon as possible.</p>
          </div>
          <Card className={`rounded-2xl border border-card-border shadow-lg overflow-hidden ${formSection.inView ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '200ms' }}>
            <div className="h-1.5 bg-gradient-to-r from-brand-red-orange via-brand-red-orange-dark to-[hsl(214,95%,15%)]" />
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input placeholder="Your Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl h-12 border-card-border" />
                  <Input placeholder="Your Email *" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="rounded-xl h-12 border-card-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input placeholder="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="rounded-xl h-12 border-card-border" />
                  <Input placeholder="Subject" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className="rounded-xl h-12 border-card-border" />
                </div>
                <Textarea placeholder="Your Message *" rows={6} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} className="rounded-xl border-card-border" />
                <Button type="submit" disabled={loading} size="lg" className="rounded-full bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground border-0 shadow-glow-orange hover:shadow-lg px-8 text-base w-full sm:w-auto">
                  {loading ? 'Sending...' : 'Send Message'} <Send className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA STRIP */}
      <section ref={ctaSection.ref} className="relative bg-[hsl(214,95%,12%)] py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-red-orange/10 via-transparent to-transparent" />
        <div className={`relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center ${ctaSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            Prefer to learn more <span className="text-brand-red-orange-light">about us first?</span>
          </h2>
          <p className="text-white/50 mb-8 max-w-xl mx-auto">Explore our services, events, and innovations to see how we can work together.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground border-0 shadow-glow-orange hover:shadow-lg px-8">
              <Link to="/services">
                Our Services <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="bg-transparent rounded-full border-white/20 text-white/80 hover:bg-white/10 hover:text-white px-8">
              <Link to="/about">
                About Us
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Contact;
