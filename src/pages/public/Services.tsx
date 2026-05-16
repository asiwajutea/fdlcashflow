import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Star, MessageSquare, ClipboardList, Rocket, CheckCircle, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/components/PublicLayout';
import SEO from '@/components/SEO';
import { db } from '@/lib/supabase-db';

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

const processSteps = [
  { icon: <MessageSquare className="h-6 w-6" />, title: 'Consult', desc: 'We listen to understand your unique needs and goals' },
  { icon: <ClipboardList className="h-6 w-6" />, title: 'Plan', desc: 'Crafting a tailored strategy and detailed roadmap' },
  { icon: <Rocket className="h-6 w-6" />, title: 'Execute', desc: 'Bringing the plan to life with precision and care' },
  { icon: <CheckCircle className="h-6 w-6" />, title: 'Deliver', desc: 'Ensuring exceptional outcomes that exceed expectations' },
];

const fallbackImages: Record<string, string> = {
  'event-management': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
  'general-merchandize': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
  'saas-technology': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
  'edutech': 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
  'oral-genealogy': 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
};
const defaultFallback = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80';
const getFallbackImage = (slug: string) => {
  const key = Object.keys(fallbackImages).find(k => slug.toLowerCase().includes(k.replace(/-/g, ' ').substring(0, 6)));
  return key ? fallbackImages[key] : defaultFallback;
};
const Services = () => {
  const [services, setServices] = useState<any[]>([]);

  const introSection = useInView(0.2);
  const gridSection = useInView(0.1);
  const processSection = useInView(0.2);
  const ctaSection = useInView(0.2);

  useEffect(() => {
    db.from('services').select('*').eq('is_published', true).order('display_order').then((r: any) => setServices(r.data || []));
  }, []);

  return (
    <PublicLayout>
      <SEO title="Services" description="Services from Footprints Dynasty: education, heritage preservation, family history, cultural projects." />
      {/* ═══════════════════════════════════════════ */}
      {/* HERO — Cinematic Banner                     */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1920&q=80"
          alt="Professional services"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(214,95%,6%)/0.92] via-[hsl(214,95%,8%)/0.85] to-[hsl(214,95%,10%)/0.7]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(214,95%,6%)/0.95] via-transparent to-transparent" />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(hsl(0,0%,100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0,0%,100%) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16 md:pb-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white/90 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Star className="h-3 w-3 text-brand-red-orange-light" />
              What We Offer
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.1] mb-4 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_20px_rgba(0,0,0,0.7)]">
              Our <span className="text-brand-red-orange-light drop-shadow-none [filter:drop-shadow(0_2px_8px_rgba(200,80,0,0.5))]">Services</span>
            </h1>
            <p className="text-sm sm:text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              Comprehensive solutions across multiple industries — built on excellence, innovation, and a commitment to making a difference.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* INTRO — Positioning Statement                */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={introSection.ref} className="bg-card py-16 md:py-20">
        <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center ${introSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="h-3 w-3" />
            Trusted Partner
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-card-foreground mb-6 leading-[1.2]">
            We deliver <span className="text-brand-red-orange">end-to-end solutions</span> that drive growth and create lasting impact
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto">
            From events management and technology consulting to education and cultural preservation, our multidisciplinary team brings expertise, passion, and innovation to every project we undertake.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* SERVICES GRID                                */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={gridSection.ref} className="bg-[hsl(210,20%,97%)] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-14 ${gridSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[hsl(214,95%,15%)] mb-4">Explore Our Services</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Discover how we can help transform your ideas into reality</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {services.map((s, i) => (
              <Link key={s.id} to={`/services/${s.slug}`} className="group">
                <Card
                  className={`h-full border border-card-border hover:border-brand-red-orange/20 hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 rounded-2xl overflow-hidden ${gridSection.inView ? 'animate-fade-up' : 'opacity-0'}`}
                  style={{ animationDelay: `${(i + 1) * 100}ms` }}
                >
                  {/* Image with navy blend */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={s.image_url || getFallbackImage(s.slug || s.title)}
                      alt={s.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[hsl(214,95%,10%)] via-[hsl(214,95%,12%)/0.6] to-[hsl(214,95%,15%)/0.35]" />
                    <div className="absolute bottom-4 left-4">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-red-orange to-brand-red-orange-dark flex items-center justify-center shadow-glow-orange">
                        <Sparkles className="h-5 w-5 text-primary-foreground" />
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-card-foreground mb-2 group-hover:text-brand-red-orange transition-colors">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{s.short_description}</p>
                    <div className="flex items-center gap-1 mt-4 text-sm font-semibold text-brand-red-orange opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Learn more <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* PROCESS — How We Work                        */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={processSection.ref} className="relative bg-[hsl(214,95%,12%)] py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(0,0%,100%) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-14 ${processSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/15 text-brand-red-orange-light text-xs font-semibold uppercase tracking-wider mb-4">
              Our Process
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">How We Work</h2>
            <p className="text-white/50 max-w-xl mx-auto">A proven methodology that ensures success from start to finish</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((step, i) => (
              <div
                key={step.title}
                className={`relative text-center ${processSection.inView ? 'animate-fade-up' : 'opacity-0'}`}
                style={{ animationDelay: `${(i + 1) * 150}ms` }}
              >
                {/* Connecting line */}
                {i < processSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-brand-red-orange/40 to-transparent" />
                )}
                <div className="relative inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-brand-red-orange/20 to-brand-red-orange/5 border border-brand-red-orange/20 mb-6 mx-auto">
                  <div className="text-brand-red-orange-light">
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-brand-red-orange text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-primary-foreground mb-2">{step.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* CTA — Call to Action                         */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={ctaSection.ref} className="relative bg-card py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-red-orange/5 via-transparent to-[hsl(214,95%,15%)/0.05]" />
        <div className={`relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center ${ctaSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-6">
            <Phone className="h-3 w-3" />
            Get In Touch
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-card-foreground mb-6 leading-[1.15]">
            Ready to <span className="text-brand-red-orange">Get Started?</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            Whether you need event management, technology consulting, or educational programs — let's discuss how we can help bring your vision to life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground border-0 shadow-glow-orange hover:shadow-lg px-8 text-base">
              <Link to="/contact">
                Request a Quote <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full border-card-border text-card-foreground hover:bg-[hsl(210,20%,97%)] px-8 text-base">
              <Link to="/about">
                Learn About Us
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Services;
