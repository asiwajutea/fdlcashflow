import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Star, Phone } from 'lucide-react';
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

const ServiceDetail = () => {
  const { slug } = useParams();
  const [service, setService] = useState<any>(null);
  const [otherServices, setOtherServices] = useState<any[]>([]);

  const contentSection = useInView(0.1);
  const moreSection = useInView(0.15);
  const ctaSection = useInView(0.2);

  useEffect(() => {
    db.from('services').select('*').eq('slug', slug).maybeSingle().then((r: any) => setService(r.data));
    db.from('services').select('*').eq('is_published', true).neq('slug', slug!).order('display_order').limit(3).then((r: any) => setOtherServices(r.data || []));
  }, [slug]);

  if (!service) {
    return (
      <PublicLayout>
        <div className="py-32 text-center">
          <div className="inline-block h-8 w-8 border-2 border-brand-red-orange border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-muted-foreground">Loading service…</p>
        </div>
      </PublicLayout>
    );
  }

  const descParagraphs = (service.description || service.short_description || '').split('\n').filter((p: string) => p.trim());

  return (
    <PublicLayout>
      {/* ═══════════════════════════════════════════ */}
      {/* HERO — Cinematic Service Banner              */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative h-[55vh] min-h-[380px] max-h-[550px] overflow-hidden">
        {service.image_url ? (
          <img src={service.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(214,95%,12%)] via-[hsl(214,95%,18%)] to-[hsl(214,85%,25%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(214,95%,6%)/0.92] via-[hsl(214,95%,8%)/0.85] to-[hsl(214,95%,10%)/0.7]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(214,95%,6%)/0.95] via-transparent to-transparent" />

        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(hsl(0,0%,100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0,0%,100%) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16 md:pb-20">
          <div className="max-w-3xl">
            <Link to="/services" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white/90 text-xs sm:text-sm font-medium mb-4 sm:mb-6 hover:bg-white/15 transition-colors">
              <ArrowLeft className="h-3 w-3" /> Back to Services
            </Link>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary-foreground leading-[1.1] mb-4 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_20px_rgba(0,0,0,0.7)]">
              {service.title}
            </h1>
            <p className="text-sm sm:text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {service.short_description}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* CONTENT — Split Layout                       */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={contentSection.ref} className="bg-card py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`grid md:grid-cols-3 gap-12 lg:gap-16 ${contentSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
            {/* Main content */}
            <div className="md:col-span-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="h-3 w-3" />
                Service Details
              </div>
              {descParagraphs.map((p: string, i: number) => (
                <p key={i} className="text-muted-foreground leading-relaxed text-lg">{p}</p>
              ))}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {service.image_url && (
                <div className="rounded-2xl overflow-hidden shadow-lg">
                  <img src={service.image_url} alt={service.title} className="w-full h-64 object-cover" loading="lazy" />
                </div>
              )}
              <Card className="rounded-2xl border-0 shadow-sm bg-[hsl(210,20%,97%)]">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-red-orange/15 to-brand-red-orange/5 flex items-center justify-center mb-4">
                    <Phone className="h-5 w-5 text-brand-red-orange" />
                  </div>
                  <h3 className="font-bold text-card-foreground mb-2">Interested in this service?</h3>
                  <p className="text-sm text-muted-foreground mb-4">Get in touch with us to discuss how we can help your organization.</p>
                  <Button asChild className="w-full rounded-full bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground border-0 shadow-glow-orange">
                    <Link to="/contact">Request a Quote</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Other services sidebar links */}
              {otherServices.length > 0 && (
                <Card className="rounded-2xl border border-card-border">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-card-foreground mb-4 text-sm uppercase tracking-wider">Other Services</h3>
                    <div className="space-y-3">
                      {otherServices.map(os => (
                        <Link key={os.id} to={`/services/${os.slug}`} className="flex items-center gap-3 group">
                          <div className="h-8 w-8 rounded-lg bg-[hsl(214,95%,15%)]/10 flex items-center justify-center shrink-0">
                            <Star className="h-3.5 w-3.5 text-brand-red-orange" />
                          </div>
                          <span className="text-sm text-muted-foreground group-hover:text-brand-red-orange transition-colors font-medium">{os.title}</span>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* MORE SERVICES — Cross Navigation             */}
      {/* ═══════════════════════════════════════════ */}
      {otherServices.length > 0 && (
        <section ref={moreSection.ref} className="bg-[hsl(210,20%,97%)] py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`text-center mb-14 ${moreSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
              <h2 className="text-3xl md:text-4xl font-bold text-[hsl(214,95%,15%)] mb-4">More Services</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Explore other ways we can help you succeed</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {otherServices.map((os, i) => (
                <Link key={os.id} to={`/services/${os.slug}`} className="group">
                  <Card
                    className={`h-full border border-card-border hover:border-brand-red-orange/20 hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 rounded-2xl overflow-hidden ${moreSection.inView ? 'animate-fade-up' : 'opacity-0'}`}
                    style={{ animationDelay: `${(i + 1) * 100}ms` }}
                  >
                    <div className="relative h-40 overflow-hidden">
                      {os.image_url ? (
                        <img src={os.image_url} alt={os.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[hsl(214,95%,15%)] via-[hsl(214,95%,20%)] to-[hsl(214,85%,30%)]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                    <CardContent className="p-5">
                      <h3 className="text-base font-bold text-card-foreground mb-1 group-hover:text-brand-red-orange transition-colors">{os.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{os.short_description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* CTA STRIP                                    */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={ctaSection.ref} className="relative bg-[hsl(214,95%,12%)] py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-red-orange/10 via-transparent to-transparent" />
        <div className={`relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center ${ctaSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            Let's Build Something <span className="text-brand-red-orange-light">Great Together</span>
          </h2>
          <p className="text-white/50 mb-8 max-w-xl mx-auto">Have a project in mind? Our team is ready to help you achieve your goals.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground border-0 shadow-glow-orange hover:shadow-lg px-8">
              <Link to="/contact">
                Contact Us <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full border-white/20 text-white/80 hover:bg-white/10 px-8">
              <Link to="/services">
                View All Services
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default ServiceDetail;
