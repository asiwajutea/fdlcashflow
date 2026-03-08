import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Star, Lightbulb, Globe, Users, Zap, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/components/PublicLayout';
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

const impactItems = [
  { icon: <Zap className="h-6 w-6" />, title: 'Cutting-Edge Tech', desc: 'Building innovative solutions that push boundaries' },
  { icon: <Globe className="h-6 w-6" />, title: 'Social Impact', desc: 'Technology that addresses real community challenges' },
  { icon: <Lightbulb className="h-6 w-6" />, title: 'Scalable Solutions', desc: 'Designed to grow and adapt with evolving needs' },
  { icon: <Users className="h-6 w-6" />, title: 'Community First', desc: 'Empowering people through accessible innovation' },
];

const fallbackImages: Record<string, string> = {
  'tech': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
  'edu': 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
  'gene': 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
  'data': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
};
const defaultFallback = 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80';
const getFallbackImage = (slug: string) => {
  const key = Object.keys(fallbackImages).find(k => slug.toLowerCase().includes(k));
  return key ? fallbackImages[key] : defaultFallback;
};

const Innovations = () => {
  const [innovations, setInnovations] = useState<any[]>([]);

  const introSection = useInView(0.2);
  const gridSection = useInView(0.1);
  const impactSection = useInView(0.2);
  const ctaSection = useInView(0.2);

  useEffect(() => {
    db.from('innovations').select('*').order('display_order').then((r: any) => setInnovations(r.data || []));
  }, []);

  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1920&q=80"
          alt="Innovations"
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
              <Lightbulb className="h-3 w-3 text-brand-red-orange-light" />
              Our Innovations
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.1] mb-4 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_20px_rgba(0,0,0,0.7)]">
              Driving <span className="text-brand-red-orange-light drop-shadow-none [filter:drop-shadow(0_2px_8px_rgba(200,80,0,0.5))]">Innovation</span>
            </h1>
            <p className="text-sm sm:text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              Technology and programs designed to create lasting impact and drive meaningful change.
            </p>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section ref={introSection.ref} className="bg-card py-16 md:py-20">
        <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center ${introSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-6">
            <Star className="h-3 w-3" />
            Pioneering Solutions
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-card-foreground mb-6 leading-[1.2]">
            Building <span className="text-brand-red-orange">transformative solutions</span> that address real-world challenges
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto">
            Our innovations span technology, education, and cultural preservation — each one designed to empower communities and create sustainable impact.
          </p>
        </div>
      </section>

      {/* INNOVATIONS GRID */}
      <section ref={gridSection.ref} className="bg-[hsl(210,20%,97%)] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-14 ${gridSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[hsl(214,95%,15%)] mb-4">Explore Our Innovations</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Discover the projects and platforms shaping the future</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {innovations.map((inn, i) => (
              <Link key={inn.id} to={`/innovations/${inn.slug}`} className="group">
                <Card
                  className={`h-full border border-card-border hover:border-brand-red-orange/20 hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 rounded-2xl overflow-hidden ${gridSection.inView ? 'animate-fade-up' : 'opacity-0'}`}
                  style={{ animationDelay: `${(i + 1) * 100}ms` }}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={inn.image_url || getFallbackImage(inn.slug || inn.title)}
                      alt={inn.title}
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
                    <h3 className="text-lg font-bold text-card-foreground mb-2 group-hover:text-brand-red-orange transition-colors">{inn.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{inn.short_description}</p>
                    <div className="flex items-center gap-1 mt-4 text-sm font-semibold text-brand-red-orange opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Explore <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section ref={impactSection.ref} className="relative bg-[hsl(214,95%,12%)] py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(0,0%,100%) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-14 ${impactSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/15 text-brand-red-orange-light text-xs font-semibold uppercase tracking-wider mb-4">
              Our Impact
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">Why We Innovate</h2>
            <p className="text-white/50 max-w-xl mx-auto">Every innovation is driven by purpose and a commitment to excellence</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {impactItems.map((item, i) => (
              <div
                key={item.title}
                className={`relative text-center ${impactSection.inView ? 'animate-fade-up' : 'opacity-0'}`}
                style={{ animationDelay: `${(i + 1) * 150}ms` }}
              >
                {i < impactItems.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-brand-red-orange/40 to-transparent" />
                )}
                <div className="relative inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-brand-red-orange/20 to-brand-red-orange/5 border border-brand-red-orange/20 mb-6 mx-auto">
                  <div className="text-brand-red-orange-light">{item.icon}</div>
                </div>
                <h3 className="text-lg font-bold text-primary-foreground mb-2">{item.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaSection.ref} className="relative bg-card py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-red-orange/5 via-transparent to-[hsl(214,95%,15%)/0.05]" />
        <div className={`relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center ${ctaSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-6">
            <Phone className="h-3 w-3" />
            Collaborate
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-card-foreground mb-6 leading-[1.15]">
            Have an idea? <span className="text-brand-red-orange">Let's innovate together</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            We're always looking for partners and collaborators who share our passion for creating meaningful, technology-driven solutions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground border-0 shadow-glow-orange hover:shadow-lg px-8 text-base">
              <Link to="/contact">
                Get In Touch <ArrowRight className="ml-2 h-4 w-4" />
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

export default Innovations;
