import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar, ExternalLink, Star, Phone, X, Sparkles } from 'lucide-react';
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

const EventDetail = () => {
  const { slug } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [otherEvents, setOtherEvents] = useState<any[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const contentSection = useInView(0.1);
  const gallerySection = useInView(0.1);
  const moreSection = useInView(0.15);
  const ctaSection = useInView(0.2);

  useEffect(() => {
    db.from('events').select('*').eq('slug', slug).maybeSingle().then((r: any) => setEvent(r.data));
    db.from('events').select('*').eq('is_published', true).neq('slug', slug!).order('display_order').limit(3).then((r: any) => setOtherEvents(r.data || []));
  }, [slug]);

  if (!event) {
    return (
      <PublicLayout>
        <div className="py-32 text-center">
          <div className="inline-block h-8 w-8 border-2 border-brand-red-orange border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-muted-foreground">Loading event…</p>
        </div>
      </PublicLayout>
    );
  }

  const gallery: string[] = Array.isArray(event.gallery) ? event.gallery : [];
  const descParagraphs = (event.description || event.short_description || '').split('\n').filter((p: string) => p.trim());

  return (
    <PublicLayout>
      <SEO
        title={event.title}
        description={event.short_description || event.description}
        image={event.image_url}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: event.title,
          description: event.short_description || event.description,
          startDate: event.event_date,
          image: event.image_url || undefined,
          eventStatus: 'https://schema.org/EventScheduled',
          organizer: { '@type': 'Organization', name: 'Footprints Dynasty' },
        }}
      />
      {/* HERO */}
      <section className="relative h-[55vh] min-h-[380px] max-h-[550px] overflow-hidden">
        {event.image_url ? (
          <img src={event.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
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
            <Link to="/events" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white/90 text-xs sm:text-sm font-medium mb-4 sm:mb-6 hover:bg-white/15 transition-colors">
              <ArrowLeft className="h-3 w-3" /> Back to Events
            </Link>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary-foreground leading-[1.1] mb-4 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_20px_rgba(0,0,0,0.7)]">
              {event.title}
            </h1>
            {event.event_date && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white/80 text-sm">
                <Calendar className="h-3.5 w-3.5 text-brand-red-orange-light" />
                {new Date(event.event_date).toLocaleDateString('en-NG', { dateStyle: 'long' })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CONTENT — Split Layout */}
      <section ref={contentSection.ref} className="bg-card py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`grid md:grid-cols-3 gap-12 lg:gap-16 ${contentSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
            <div className="md:col-span-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="h-3 w-3" />
                Event Details
              </div>
              {descParagraphs.map((p: string, i: number) => (
                <p key={i} className="text-muted-foreground leading-relaxed text-lg">{p}</p>
              ))}
            </div>

            <div className="space-y-6">
              {event.image_url && (
                <div className="rounded-2xl overflow-hidden shadow-lg">
                  <img src={event.image_url} alt={event.title} className="w-full h-64 object-cover" loading="lazy" />
                </div>
              )}
              {event.registration_url && (
                <Button asChild className="w-full rounded-full bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground border-0 shadow-glow-orange">
                  <a href={event.registration_url} target="_blank" rel="noopener noreferrer">
                    Register Now <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
              <Card className="rounded-2xl border-0 shadow-sm bg-[hsl(210,20%,97%)]">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-red-orange/15 to-brand-red-orange/5 flex items-center justify-center mb-4">
                    <Phone className="h-5 w-5 text-brand-red-orange" />
                  </div>
                  <h3 className="font-bold text-card-foreground mb-2">Interested in this event?</h3>
                  <p className="text-sm text-muted-foreground mb-4">Get in touch with us for sponsorship, participation, or partnership opportunities.</p>
                  <Button asChild className="w-full rounded-full bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground border-0 shadow-glow-orange">
                    <Link to="/contact">Contact Us</Link>
                  </Button>
                </CardContent>
              </Card>

              {otherEvents.length > 0 && (
                <Card className="rounded-2xl border border-card-border">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-card-foreground mb-4 text-sm uppercase tracking-wider">Other Events</h3>
                    <div className="space-y-3">
                      {otherEvents.map(oe => (
                        <Link key={oe.id} to={`/events/${oe.slug}`} className="flex items-center gap-3 group">
                          <div className="h-8 w-8 rounded-lg bg-[hsl(214,95%,15%)]/10 flex items-center justify-center shrink-0">
                            <Star className="h-3.5 w-3.5 text-brand-red-orange" />
                          </div>
                          <span className="text-sm text-muted-foreground group-hover:text-brand-red-orange transition-colors font-medium">{oe.title}</span>
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

      {/* GALLERY */}
      {gallery.length > 0 && (
        <section ref={gallerySection.ref} className="bg-[hsl(210,20%,97%)] py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`text-center mb-10 ${gallerySection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
              <h2 className="text-3xl md:text-4xl font-bold text-[hsl(214,95%,15%)] mb-4">Event Gallery</h2>
              <p className="text-muted-foreground">Moments captured from this event</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gallery.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxImage(url)}
                  className={`aspect-square rounded-2xl overflow-hidden group ${gallerySection.inView ? 'animate-fade-up' : 'opacity-0'}`}
                  style={{ animationDelay: `${(i + 1) * 80}ms` }}
                >
                  <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* MORE EVENTS */}
      {otherEvents.length > 0 && (
        <section ref={moreSection.ref} className="bg-card py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`text-center mb-14 ${moreSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
              <h2 className="text-3xl md:text-4xl font-bold text-[hsl(214,95%,15%)] mb-4">More Events</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Explore more of our flagship events</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {otherEvents.map((oe, i) => (
                <Link key={oe.id} to={`/events/${oe.slug}`} className="group">
                  <Card
                    className={`h-full border border-card-border hover:border-brand-red-orange/20 hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 rounded-2xl overflow-hidden ${moreSection.inView ? 'animate-fade-up' : 'opacity-0'}`}
                    style={{ animationDelay: `${(i + 1) * 100}ms` }}
                  >
                    <div className="relative h-40 overflow-hidden">
                      {oe.image_url ? (
                        <img src={oe.image_url} alt={oe.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[hsl(214,95%,15%)] via-[hsl(214,95%,20%)] to-[hsl(214,85%,30%)]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                    <CardContent className="p-5">
                      <h3 className="text-base font-bold text-card-foreground mb-1 group-hover:text-brand-red-orange transition-colors">{oe.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{oe.short_description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA STRIP */}
      <section ref={ctaSection.ref} className="relative bg-[hsl(214,95%,12%)] py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-red-orange/10 via-transparent to-transparent" />
        <div className={`relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center ${ctaSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            Let's Create Something <span className="text-brand-red-orange-light">Extraordinary</span>
          </h2>
          <p className="text-white/50 mb-8 max-w-xl mx-auto">Interested in partnering, sponsoring, or participating? We'd love to hear from you.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground border-0 shadow-glow-orange hover:shadow-lg px-8">
              <Link to="/contact">
                Contact Us <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="bg-transparent rounded-full border-white/20 text-white/80 hover:bg-white/10 hover:text-white px-8">
              <Link to="/events">
                View All Events
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-6 right-6 text-white hover:text-brand-red-orange transition-colors" onClick={() => setLightboxImage(null)}>
            <X className="h-8 w-8" />
          </button>
          <img src={lightboxImage} alt="Gallery" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </PublicLayout>
  );
};

export default EventDetail;
