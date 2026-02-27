import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Monitor, GraduationCap, ShoppingBag, BookOpen, Sparkles, Users, Award, TrendingUp, ChevronLeft, ChevronRight, Quote, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PublicLayout from '@/components/PublicLayout';
import { db } from '@/lib/supabase-db';

const iconMap: Record<string, React.ReactNode> = {
  Calendar: <Calendar className="h-8 w-8" />,
  ShoppingBag: <ShoppingBag className="h-8 w-8" />,
  Monitor: <Monitor className="h-8 w-8" />,
  GraduationCap: <GraduationCap className="h-8 w-8" />,
  BookOpen: <BookOpen className="h-8 w-8" />
};

// Animated counter hook
const useCounter = (end: number, duration = 2000, startCounting = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!startCounting) return;
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {setCount(end);clearInterval(timer);} else
      setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, startCounting]);
  return count;
};

const Home = () => {
  const [services, setServices] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [innovations, setInnovations] = useState<any[]>([]);
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
    db.from('services').select('*').order('display_order'),
    db.from('events').select('*').order('display_order'),
    db.from('innovations').select('*').order('display_order'),
    db.from('hero_slides').select('*').eq('is_published', true).order('display_order'),
    db.from('testimonials').select('*').eq('is_published', true).order('display_order'),
    db.from('partners').select('*').eq('is_published', true).order('display_order')]
    ).then(([s, e, i, h, t, p]) => {
      setServices(s.data || []);
      setEvents(e.data || []);
      setInnovations(i.data || []);
      setHeroSlides(h.data || []);
      setTestimonials(t.data || []);
      setPartners(p.data || []);
    });
  }, []);

  // Auto-advance slideshow - SLOW (8 seconds)
  useEffect(() => {
    if (heroSlides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Auto-advance testimonials
  useEffect(() => {
    if (testimonials.length === 0) return;
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  // Intersection observer for animated counters
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {if (entry.isIntersecting) setStatsVisible(true);},
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const founded = useCounter(2019, 1500, statsVisible);
  const eventsCount = useCounter(5, 1500, statsVisible);
  const innovationsCount = useCounter(4, 1500, statsVisible);
  const serviceLines = useCounter(5, 1500, statsVisible);

  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);

  const fallbackSlides = [
  { title: 'Making a Difference', accent: 'Across Industries', subtitle: 'Delivering excellence in Events, Technology, Education, and Cultural Preservation.', image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1920&q=80' }];

  const slides = heroSlides.length > 0 ? heroSlides : fallbackSlides;

  return (
    <PublicLayout>
      {/* Hero Section with Cinematic Slideshow */}
      <section className="relative h-[650px] md:h-[750px] overflow-hidden">
        {slides.map((slide, index) =>
        <div
          key={index}
          className="absolute inset-0 transition-opacity duration-[2500ms] ease-in-out"
          style={{ opacity: currentSlide === index ? 1 : 0 }}>

            <img
            src={slide.image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-105 transition-transform duration-[10000ms] ease-out"
            style={{ transform: currentSlide === index ? 'scale(1.08)' : 'scale(1)' }}
            loading={index === 0 ? 'eager' : 'lazy'} />

            {/* Deep cinematic gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(214,95%,6%)/0.95] via-[hsl(214,95%,8%)/0.88] to-[hsl(12,90%,15%)/0.7]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(214,95%,6%)/0.9] via-transparent to-[hsl(214,95%,6%)/0.4]" />
          </div>
        )}

        {/* Animated decorative shapes */}
        <div className="absolute inset-0 z-[5] overflow-hidden pointer-events-none">
          <div className="absolute top-[15%] right-[10%] w-64 h-64 rounded-full border border-brand-red-orange/20 animate-[spin_25s_linear_infinite]" />
          <div className="absolute bottom-[20%] right-[15%] w-40 h-40 rounded-full bg-brand-red-orange/[0.07] animate-[pulse_4s_ease-in-out_infinite]" />
          <div className="absolute top-[30%] right-[25%] w-3 h-3 rounded-full bg-brand-red-orange/40 animate-[bounce_3s_ease-in-out_infinite]" />
          <div className="absolute top-[55%] right-[8%] w-2 h-2 rounded-full bg-white/30 animate-[bounce_2.5s_ease-in-out_infinite_0.5s]" />
          <div className="absolute top-[10%] left-[60%] w-96 h-96 rounded-full border border-white/[0.05] animate-[spin_40s_linear_infinite_reverse]" />
          <div className="absolute bottom-[30%] left-[50%] w-20 h-20 rotate-45 border border-brand-red-orange/15 animate-[spin_20s_linear_infinite]" />
          <div className="absolute top-[40%] right-[35%] w-1.5 h-1.5 rounded-full bg-white/50 animate-[ping_3s_ease-in-out_infinite_1s]" />
        </div>

        {/* Content overlay */}
        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
          <div className="max-w-3xl">
            {slides.map((slide, index) =>
            <div
              key={index}
              className="absolute transition-all duration-[1500ms] ease-in-out"
              style={{
                opacity: currentSlide === index ? 1 : 0,
                transform: currentSlide === index ? 'translateY(0)' : 'translateY(30px)',
                pointerEvents: currentSlide === index ? 'auto' : 'none'
              }}>

                <div className="inline-block px-4 py-1.5 rounded-full bg-brand-red-orange/20 border border-brand-red-orange/30 text-brand-red-orange-light text-sm font-medium mb-6 shadow-lg">
                  Making a Difference
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white leading-tight mb-6 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_20px_rgba(0,0,0,0.7),_0_1px_4px_rgba(0,0,0,0.9)]">
                  {slide.title}{' '}
                  <span className="bg-gradient-to-r from-[hsl(28,100%,55%)] to-[hsl(12,90%,55%)] bg-clip-text drop-shadow-none [filter:drop-shadow(0_2px_8px_rgba(200,80,0,0.5))] [-webkit-text-stroke:0.8px_white] text-[brand-red-orange-dark] text-[#f54c0f]">
                    {slide.accent}
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-white mb-8 leading-relaxed max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] [text-shadow:_0_1px_6px_rgba(0,0,0,0.9),_0_0px_2px_rgba(0,0,0,1)]">
                  {slide.subtitle}
                </p>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-52 md:mt-56">
              <Button size="lg" asChild className="bg-gradient-to-r from-[hsl(28,100%,55%)] to-[hsl(12,90%,50%)] hover:from-[hsl(28,100%,45%)] hover:to-[hsl(12,90%,40%)] text-white text-base px-8 shadow-lg shadow-[hsl(28,100%,55%)/0.3] border-0">
                <Link to="/services">Explore Our Services <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm text-base px-8">
                <Link to="/contact">Book a Consultation</Link>
              </Button>
            </div>
          </div>

          {/* Slide Navigation */}
          <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-3 z-20">
            <button onClick={prevSlide} className="p-2 text-white/50 hover:text-white transition-colors" aria-label="Previous slide">
              <ChevronLeft className="h-5 w-5" />
            </button>
            {slides.map((_, index) =>
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-500 ${
              currentSlide === index ? 'w-10 bg-gradient-to-r from-[hsl(28,100%,55%)] to-[hsl(12,90%,50%)]' : 'w-2 bg-white/30 hover:bg-white/50'}`
              }
              aria-label={`Go to slide ${index + 1}`} />

            )}
            <button onClick={nextSlide} className="p-2 text-white/50 hover:text-white transition-colors" aria-label="Next slide">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Animated Stats Section */}
      <section ref={statsRef} className="bg-[hsl(214,95%,12%)] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-white/10">
            {[
            { icon: <Users className="h-5 w-5" />, value: founded, label: 'Founded', suffix: '' },
            { icon: <Award className="h-5 w-5" />, value: eventsCount, label: 'Flagship Events', suffix: '+' },
            { icon: <TrendingUp className="h-5 w-5" />, value: innovationsCount, label: 'Innovations', suffix: '+' },
            { icon: <Sparkles className="h-5 w-5" />, value: serviceLines, label: 'Service Lines', suffix: '+' }].
            map((stat, i) =>
            <div key={i} className="text-center py-6 md:py-8">
                <div className="text-brand-red-orange flex justify-center mb-2">{stat.icon}</div>
                <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}{stat.suffix}</div>
                <div className="text-xs text-white/40 mt-1">{stat.label}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* About Snapshot */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-[hsl(214,95%,15%)] mb-6">Who We Are</h2>
            <p className="text-lg text-[hsl(210,15%,40%)] leading-relaxed mb-8">
              Footprints Dynasty Ltd (RC: 1554073) is a forward-thinking Nigerian enterprise founded in 2019. 
              We specialize in event management, technology solutions, education innovation, and cultural preservation — 
              driven by our mission of <strong className="text-brand-red-orange">Making a Difference</strong> in every community we serve.
            </p>
            <Button variant="outline" asChild className="border-[hsl(214,95%,25%)] text-[hsl(214,95%,25%)] hover:bg-[hsl(214,95%,95%)]">
              <Link to="/about" className="text-primary-foreground">Learn More About Us <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="bg-[hsl(210,20%,97%)] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[hsl(214,95%,15%)] mb-4">Our Core Services</h2>
            <p className="text-[hsl(210,15%,40%)] max-w-2xl mx-auto">Comprehensive solutions across multiple industries</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) =>
            <Link key={service.id} to={`/services/${service.slug}`}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-white group">
                  {service.image_url &&
                <div className="h-48 overflow-hidden rounded-t-lg">
                      <img src={service.image_url} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                }
                  <CardContent className="p-6">
                    <div className="text-brand-red-orange mb-4">
                      {iconMap[service.icon] || <Sparkles className="h-8 w-8" />}
                    </div>
                    <h3 className="text-lg font-semibold text-[hsl(214,95%,15%)] mb-2">{service.title}</h3>
                    <p className="text-sm text-[hsl(210,15%,40%)] leading-relaxed">{service.short_description}</p>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Flagship Events */}
      <section className="bg-[hsl(214,95%,15%)] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Flagship Events</h2>
            <p className="text-[hsl(0,0%,70%)] max-w-2xl mx-auto">Our signature events that celebrate talent, culture, and community</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) =>
            <Link key={event.id} to={`/events/${event.slug}`}>
                <Card className="h-full bg-[hsl(214,85%,20%)] border-[hsl(214,70%,25%)] hover:border-brand-red-orange transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
                  {event.image_url &&
                <div className="h-48 overflow-hidden">
                      <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                }
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-full bg-brand-red-orange/15 flex items-center justify-center mb-4">
                      <Calendar className="h-6 w-6 text-brand-red-orange" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{event.title}</h3>
                    <p className="text-sm text-[hsl(0,0%,70%)] leading-relaxed">{event.short_description}</p>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Innovations */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[hsl(214,95%,15%)] mb-4">Our Innovations</h2>
            <p className="text-[hsl(210,15%,40%)] max-w-2xl mx-auto">Technology and programs driving impact</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {innovations.map((innovation) =>
            <Link key={innovation.id} to={`/innovations/${innovation.slug}`}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-[hsl(214,25%,90%)]">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-[hsl(12,90%,96%)] flex items-center justify-center shrink-0">
                      <Sparkles className="h-6 w-6 text-brand-red-orange" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[hsl(214,95%,15%)] mb-1">{innovation.title}</h3>
                      <p className="text-sm text-[hsl(210,15%,40%)] leading-relaxed">{innovation.short_description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials Carousel */}
      {testimonials.length > 0 &&
      <section className="bg-[hsl(210,20%,97%)] py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[hsl(214,95%,15%)] mb-4">What People Say</h2>
              <p className="text-[hsl(210,15%,40%)]">Hear from those who have experienced our work</p>
            </div>
            <div className="max-w-3xl mx-auto relative min-h-[200px]">
              {testimonials.map((t, index) =>
            <div
              key={t.id}
              className="absolute inset-0 transition-all duration-700 ease-in-out flex flex-col items-center text-center"
              style={{
                opacity: currentTestimonial === index ? 1 : 0,
                transform: currentTestimonial === index ? 'translateX(0)' : 'translateX(40px)',
                pointerEvents: currentTestimonial === index ? 'auto' : 'none'
              }}>

                  <Quote className="h-10 w-10 text-brand-red-orange/30 mb-4" />
                  <blockquote className="text-lg md:text-xl text-[hsl(214,95%,15%)] leading-relaxed italic mb-6">
                    "{t.quote}"
                  </blockquote>
                  <div className="flex items-center gap-3">
                    {t.author_image && <img src={t.author_image} alt={t.author_name} className="h-12 w-12 rounded-full object-cover" />}
                    <div className="text-left">
                      <div className="font-semibold text-[hsl(214,95%,15%)]">{t.author_name}</div>
                      {t.author_title && <div className="text-sm text-[hsl(210,15%,40%)]">{t.author_title}</div>}
                    </div>
                  </div>
                </div>
            )}
              {/* Dots */}
              <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-2">
                {testimonials.map((_, i) =>
              <button
                key={i}
                onClick={() => setCurrentTestimonial(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                currentTestimonial === i ? 'w-6 bg-brand-red-orange' : 'w-2 bg-[hsl(214,25%,80%)]'}`
                }
                aria-label={`Testimonial ${i + 1}`} />

              )}
              </div>
            </div>
          </div>
        </section>
      }

      {/* Partners Section */}
      {partners.length > 0 &&
      <section className="bg-white py-12 md:py-16 border-t border-[hsl(214,25%,92%)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-[hsl(214,95%,15%)] mb-2">Our Partners</h2>
              <p className="text-sm text-[hsl(210,15%,40%)]">Trusted by organizations making a difference</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
              {partners.map((partner) =>
            <a
              key={partner.id}
              href={partner.website_url || '#'}
              target={partner.website_url ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity duration-300">

                  {partner.logo_url ?
              <img src={partner.logo_url} alt={partner.name} className="h-14 md:h-16 object-contain grayscale group-hover:grayscale-0 transition-all duration-300" /> :

              <div className="h-14 md:h-16 px-6 flex items-center justify-center rounded-lg bg-[hsl(210,20%,95%)] text-[hsl(214,95%,25%)] font-semibold text-sm">
                      {partner.name}
                    </div>
              }
                </a>
            )}
            </div>
          </div>
        </section>
      }

      {/* CTA Banner */}
      <section className="bg-gradient-to-r from-[hsl(12,90%,45%)] via-[hsl(28,100%,50%)] to-[hsl(28,100%,55%)] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Make a Difference?</h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Whether you want to host an event, partner with us, or join our team — we'd love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-[hsl(214,95%,15%)] hover:bg-[hsl(214,95%,20%)] text-white px-8">
              <Link to="/contact">Book an Event</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-white text-white hover:bg-white/10 px-8">
              <Link to="/contact">Partner With Us</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-white text-white hover:bg-white/10 px-8">
              <Link to="/careers">Join Our Team</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>);

};

export default Home;