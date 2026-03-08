import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Calendar, Monitor, GraduationCap, ShoppingBag, BookOpen,
  Sparkles, Users, Award, TrendingUp, ChevronLeft, ChevronRight, Quote,
  MapPin, Phone, Mail, Play, Star, CheckCircle, Target, Globe, Heart } from
'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PublicLayout from '@/components/PublicLayout';
import { db } from '@/lib/supabase-db';

const iconMap: Record<string, React.ReactNode> = {
  Calendar: <Calendar className="h-7 w-7" />,
  ShoppingBag: <ShoppingBag className="h-7 w-7" />,
  Monitor: <Monitor className="h-7 w-7" />,
  GraduationCap: <GraduationCap className="h-7 w-7" />,
  BookOpen: <BookOpen className="h-7 w-7" />
};

// Intersection observer hook for scroll animations
const useInView = (threshold = 0.2) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {if (entry.isIntersecting) setInView(true);},
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
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

  const statsSection = useInView(0.3);
  const aboutSection = useInView(0.2);
  const servicesSection = useInView(0.15);
  const eventsSection = useInView(0.15);
  const innovationsSection = useInView(0.15);
  const testimonialsSection = useInView(0.15);
  const ctaSection = useInView(0.2);

  const founded = useCounter(2019, 1500, statsSection.inView);
  const eventsCount = useCounter(5, 1500, statsSection.inView);
  const innovationsCount = useCounter(4, 1500, statsSection.inView);
  const serviceLines = useCounter(5, 1500, statsSection.inView);

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

  // Auto-advance slideshow
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

  const prevSlide = useCallback(() => setCurrentSlide((prev) => (prev - 1 + (heroSlides.length || 1)) % (heroSlides.length || 1)), [heroSlides.length]);
  const nextSlide = useCallback(() => setCurrentSlide((prev) => (prev + 1) % (heroSlides.length || 1)), [heroSlides.length]);

  const fallbackSlides = [
  { title: 'Making a Difference', accent: 'Across Industries', subtitle: 'Delivering excellence in Events, Technology, Education, and Cultural Preservation.', image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1920&q=80' }];


  const slides = heroSlides.length > 0 ? heroSlides : fallbackSlides;

  const whyChooseUs = [
  { icon: <Target className="h-6 w-6" />, title: 'Mission-Driven', desc: 'Every project we undertake is guided by our core mission of Making a Difference.' },
  { icon: <Globe className="h-6 w-6" />, title: 'Multi-Industry Expertise', desc: 'From tech to culture, we bring cross-sector insights to every engagement.' },
  { icon: <Heart className="h-6 w-6" />, title: 'Community First', desc: 'We invest in communities through education, events, and innovation programs.' },
  { icon: <CheckCircle className="h-6 w-6" />, title: 'Proven Track Record', desc: 'Years of successful delivery across Nigeria and beyond.' }];


  return (
    <PublicLayout>
      {/* ═══════════════════════════════════════════ */}
      {/* HERO SECTION — Cinematic Full-Screen        */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative h-[100svh] min-h-[550px] max-h-[900px] overflow-hidden">
        {/* Background slides */}
        {slides.map((slide, index) =>
        <div
          key={index}
          className="absolute inset-0 transition-opacity duration-[2500ms] ease-in-out"
          style={{ opacity: currentSlide === index ? 1 : 0 }}>
          
            <img
            src={slide.image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[12000ms] ease-out"
            style={{ transform: currentSlide === index ? 'scale(1.08)' : 'scale(1)' }}
            loading={index === 0 ? 'eager' : 'lazy'} />
          
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(214,95%,6%)/0.92] via-[hsl(214,95%,8%)/0.82] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(214,95%,6%)/0.95] via-transparent to-[hsl(214,95%,6%)/0.3]" />

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(hsl(0,0%,100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0,0%,100%) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        {/* Decorative elements */}
        <div className="absolute inset-0 z-[5] overflow-hidden pointer-events-none hidden md:block">
          <div className="absolute top-[15%] right-[8%] w-72 h-72 rounded-full border border-brand-red-orange/10 animate-[spin_30s_linear_infinite]" />
          <div className="absolute top-[12%] right-[6%] w-80 h-80 rounded-full border border-white/[0.04] animate-[spin_45s_linear_infinite_reverse]" />
          <div className="absolute bottom-[25%] right-[12%] w-3 h-3 rounded-full bg-brand-red-orange/40 animate-[bounce_3s_ease-in-out_infinite]" />
          <div className="absolute bottom-[40%] right-[20%] w-2 h-2 rounded-full bg-white/30 animate-[bounce_2.5s_ease-in-out_infinite_0.5s]" />
          {/* Vertical accent line */}
          <div className="absolute top-0 bottom-0 right-[45%] w-px bg-gradient-to-b from-transparent via-brand-red-orange/10 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-28 sm:pb-32 md:pb-36">
          <div className="max-w-3xl relative">
            {/* Invisible spacer */}
            <div className="invisible" aria-hidden="true">
              <div className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                Making a Difference
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-4 md:mb-6">
                {slides[0]?.title} {slides[0]?.accent}
              </h1>
              <p className="text-sm sm:text-lg md:text-xl mb-6 md:mb-8 leading-relaxed max-w-2xl">
                {slides[0]?.subtitle}
              </p>
            </div>

            {/* Active slide text */}
            {slides.map((slide, index) =>
            <div
              key={index}
              className="absolute inset-0 transition-all duration-[1500ms] ease-in-out"
              style={{
                opacity: currentSlide === index ? 1 : 0,
                transform: currentSlide === index ? 'translateY(0)' : 'translateY(30px)',
                pointerEvents: currentSlide === index ? 'auto' : 'none'
              }}>
              
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-navy border border-white/15 backdrop-blur-sm text-white text-xs sm:text-sm font-medium mb-4 sm:mb-6">
                  <Star className="h-3 w-3 text-brand-red-orange-light" />
                  Making a Difference
                </div>
                <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.1] mb-3 sm:mb-5 md:mb-6 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_20px_rgba(0,0,0,0.7),_0_1px_4px_rgba(0,0,0,0.9)]">
                  {slide.title}{' '}
                  <span className="text-brand-red-orange-light drop-shadow-none [filter:drop-shadow(0_2px_8px_rgba(200,80,0,0.5))]">
                    {slide.accent}
                  </span>
                </h1>
                <p className="text-sm sm:text-lg md:text-xl mb-6 md:mb-8 leading-relaxed max-w-2xl text-white/80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] [text-shadow:_0_1px_6px_rgba(0,0,0,0.9)]">
                  {slide.subtitle}
                </p>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
              <Button size="lg" asChild className="bg-gradient-to-r from-[hsl(28,100%,55%)] to-[hsl(12,90%,50%)] hover:from-[hsl(28,100%,45%)] hover:to-[hsl(12,90%,40%)] text-primary-foreground text-sm sm:text-base px-6 sm:px-8 shadow-lg shadow-[hsl(28,100%,55%)/0.3] border-0 h-11 sm:h-12 rounded-xl group">
                <Link to="/services">
                  Explore Our Services
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="bg-transparent border-white/25 text-primary-foreground hover:bg-white/10 hover:text-white backdrop-blur-sm text-sm sm:text-base px-6 sm:px-8 h-11 sm:h-12 rounded-xl">
                <Link to="/contact">Book a Consultation</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Slide Navigation — bottom center */}
        <div className="absolute bottom-6 sm:bottom-10 left-0 right-0 flex items-center justify-center gap-3 z-20">
          <button onClick={prevSlide} className="p-2 text-white/40 hover:text-white transition-colors" aria-label="Previous slide">
            <ChevronLeft className="h-5 w-5" />
          </button>
          {slides.map((_, index) =>
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-1.5 rounded-full transition-all duration-500 ${currentSlide === index ?
            'w-10 bg-gradient-to-r from-[hsl(28,100%,55%)] to-[hsl(12,90%,50%)]' :
            'w-3 bg-white/25 hover:bg-white/40'}`
            }
            aria-label={`Go to slide ${index + 1}`} />

          )}
          <button onClick={nextSlide} className="p-2 text-white/40 hover:text-white transition-colors" aria-label="Next slide">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* ANIMATED STATS BAR                          */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={statsSection.ref} className="relative bg-[hsl(214,95%,12%)] border-t border-white/5 overflow-hidden">
        {/* Subtle diagonal accent */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-red-orange/5 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
            { icon: <Users className="h-5 w-5" />, value: founded, label: 'Founded', suffix: '' },
            { icon: <Award className="h-5 w-5" />, value: eventsCount, label: 'Flagship Events', suffix: '+' },
            { icon: <TrendingUp className="h-5 w-5" />, value: innovationsCount, label: 'Innovations', suffix: '+' },
            { icon: <Sparkles className="h-5 w-5" />, value: serviceLines, label: 'Service Lines', suffix: '+' }].
            map((stat, i) =>
            <div
              key={i}
              className={`text-center py-8 md:py-10 border-r border-white/5 last:border-r-0 ${statsSection.inView ? 'animate-count-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 150}ms` }}>
              
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-brand-red-orange/15 text-brand-red-orange mb-3">
                  {stat.icon}
                </div>
                <div className="text-3xl md:text-4xl font-bold text-primary-foreground tracking-tight">
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-xs text-white/40 mt-1.5 uppercase tracking-wider font-medium">{stat.label}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* ABOUT SNAPSHOT — Split Layout                */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={aboutSection.ref} className="bg-card py-20 md:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left — Text */}
            <div className={`${aboutSection.inView ? 'animate-slide-in-left' : 'opacity-0'}`}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-6">
                <Sparkles className="h-3 w-3" />
                About Us
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-card-foreground mb-6 leading-[1.15]">
                We Are <span className="text-brand-red-orange">Footprints Dynasty</span>
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-6">
                Footprints Dynasty Ltd (RC: 1554073) is a forward-thinking Nigerian enterprise founded in 2019.
                We specialize in event management, technology solutions, education innovation, and cultural preservation —
                driven by our mission of <strong className="text-brand-red-orange font-semibold">Making a Difference</strong> in every community we serve.
              </p>
              <div className="flex flex-wrap gap-4 mb-8">
                {['Events', 'Technology', 'Education', 'Culture'].map((tag) =>
                <span key={tag} className="px-4 py-2 rounded-lg bg-[hsl(214,25%,95%)] text-card-foreground text-sm font-medium">
                    {tag}
                  </span>
                )}
              </div>
              <Button size="lg" variant="outline" asChild className="border-card-foreground/20 text-card-foreground hover:bg-card-foreground/5 rounded-xl group">
                <Link to="/about">
                  Learn More About Us
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>

            {/* Right — Visual element */}
            <div className={`relative ${aboutSection.inView ? 'animate-slide-in-right' : 'opacity-0'}`}>
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-financial-lg">
                <img
                  src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80"
                  alt="Team collaboration at Footprints Dynasty"
                  className="w-full h-full object-cover"
                  loading="lazy" />
                
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(214,95%,10%)/0.6] to-transparent" />
              </div>
              {/* Floating stat card */}
              <div className="absolute -bottom-6 -left-4 sm:-left-6 bg-card rounded-xl shadow-financial-lg p-4 border border-card-border">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-brand-red-orange/15 flex items-center justify-center">
                    <Award className="h-5 w-5 text-brand-red-orange" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-card-foreground">2019</div>
                    <div className="text-xs text-muted-foreground">Established</div>
                  </div>
                </div>
              </div>
              {/* Decorative border */}
              <div className="absolute -top-4 -right-4 w-full h-full rounded-2xl border-2 border-brand-red-orange/15 -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* SERVICES — Modern Grid                      */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={servicesSection.ref} className="bg-[hsl(210,20%,97%)] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-14 ${servicesSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-4">
              What We Do
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[hsl(214,95%,15%)] mb-4">Our Core Services</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base">Comprehensive solutions that drive impact across multiple industries</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {services.slice(0, 6).map((service, i) =>
            <Link key={service.id} to={`/services/${service.slug}`}>
                <Card
                className={`h-full border-0 bg-card shadow-sm hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 group overflow-hidden rounded-2xl ${servicesSection.inView ? 'animate-fade-up' : 'opacity-0'}`}
                style={{ animationDelay: `${(i + 1) * 100}ms` }}>
                
                  {service.image_url &&
                <div className="h-52 overflow-hidden">
                      <img
                    src={service.image_url}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy" />
                  
                    </div>
                }
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-xl bg-brand-red-orange/10 flex items-center justify-center mb-4 text-brand-red-orange group-hover:bg-brand-red-orange group-hover:text-primary-foreground transition-colors duration-300">
                      {iconMap[service.icon] || <Sparkles className="h-7 w-7" />}
                    </div>
                    <h3 className="text-lg font-bold text-card-foreground mb-2 group-hover:text-brand-red-orange transition-colors">{service.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{service.short_description}</p>
                    <div className="mt-4 flex items-center text-brand-red-orange text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Learn more <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* WHY CHOOSE US — Value Props                 */}
      {/* ═══════════════════════════════════════════ */}
      <section className="bg-card py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(214,95%,15%)]/10 text-[hsl(214,95%,25%)] text-xs font-semibold uppercase tracking-wider mb-4">
              Our Edge
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-card-foreground mb-4">Why Choose Us</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">What sets Footprints Dynasty apart</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {whyChooseUs.map((item, i) =>
            <div
              key={i}
              className="text-center group p-6 rounded-2xl border border-transparent hover:border-brand-red-orange/20 hover:bg-brand-red-orange/[0.03] transition-all duration-300">
              
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-red-orange/15 to-brand-red-orange/5 text-brand-red-orange mb-5 group-hover:scale-110 transition-transform duration-300">
                  {item.icon}
                </div>
                <h3 className="text-base font-bold text-card-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* FLAGSHIP EVENTS — Dark Cinematic             */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={eventsSection.ref} className="relative bg-[hsl(214,95%,10%)] py-20 md:py-28 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(0,0%,100%) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-14 ${eventsSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/15 text-brand-red-orange-light text-xs font-semibold uppercase tracking-wider mb-4">
              <Calendar className="h-3 w-3" />
              Events
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">Flagship Events</h2>
            <p className="text-white/50 max-w-xl mx-auto">Our signature events that celebrate talent, culture, and community</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {events.slice(0, 6).map((event, i) =>
            <Link key={event.id} to={`/events/${event.slug}`}>
                <div
                className={`group relative rounded-2xl overflow-hidden bg-[hsl(214,85%,15%)] border border-white/5 hover:border-brand-red-orange/30 transition-all duration-500 hover:-translate-y-2 ${eventsSection.inView ? 'animate-fade-up' : 'opacity-0'}`}
                style={{ animationDelay: `${(i + 1) * 120}ms` }}>
                
                  {event.image_url &&
                <div className="h-56 overflow-hidden">
                      <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(214,85%,15%)] via-transparent to-transparent" />
                    </div>
                }
                  <div className="p-6 relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/15 text-brand-red-orange text-xs font-medium mb-3">
                      <Calendar className="h-3 w-3" />
                      Event
                    </div>
                    <h3 className="text-lg font-bold text-primary-foreground mb-2 group-hover:text-brand-red-orange-light transition-colors">{event.title}</h3>
                    <p className="text-sm text-white/50 leading-relaxed line-clamp-2">{event.short_description}</p>
                    <div className="mt-4 flex items-center text-brand-red-orange text-sm font-medium">
                      View Details <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* INNOVATIONS — Asymmetric Layout              */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={innovationsSection.ref} className="bg-card py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex flex-col lg:flex-row lg:items-end lg:justify-between mb-14 gap-6 ${innovationsSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-4">
                <Sparkles className="h-3 w-3" />
                Innovation
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-card-foreground">Our Innovations</h2>
            </div>
            <p className="text-muted-foreground max-w-md text-base">Technology and programs driving meaningful impact across communities</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {innovations.slice(0, 4).map((innovation, i) =>
            <Link key={innovation.id} to={`/innovations/${innovation.slug}`}>
                <Card
                className={`h-full border border-card-border hover:border-brand-red-orange/20 hover:shadow-card-hover transition-all duration-500 hover:-translate-y-1 group rounded-2xl overflow-hidden ${innovationsSection.inView ? 'animate-fade-up' : 'opacity-0'}`}
                style={{ animationDelay: `${(i + 1) * 100}ms` }}>
                
                  <CardContent className="p-6 md:p-8 flex items-start gap-5">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-red-orange/15 to-brand-red-orange/5 flex items-center justify-center shrink-0 group-hover:from-brand-red-orange group-hover:to-brand-red-orange-dark transition-all duration-300">
                      <Sparkles className="h-6 w-6 text-brand-red-orange group-hover:text-primary-foreground transition-colors duration-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-card-foreground mb-2 group-hover:text-brand-red-orange transition-colors">{innovation.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{innovation.short_description}</p>
                      <div className="mt-4 flex items-center text-brand-red-orange text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Explore <ArrowRight className="ml-1 h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* TESTIMONIALS — Elegant Carousel              */}
      {/* ═══════════════════════════════════════════ */}
      {testimonials.length > 0 &&
      <section ref={testimonialsSection.ref} className="bg-[hsl(210,20%,97%)] py-20 md:py-28 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`text-center mb-14 ${testimonialsSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-4">
                <Quote className="h-3 w-3" />
                Testimonials
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[hsl(214,95%,15%)] mb-4">What People Say</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Hear from those who have experienced our work</p>
            </div>

            <div className="max-w-4xl mx-auto relative">
              {/* Large decorative quote */}
              <Quote className="absolute -top-6 left-0 h-20 w-20 text-brand-red-orange/[0.07] -z-0" />

              <div className="relative min-h-[220px]">
                {testimonials.map((t, index) =>
              <div
                key={t.id}
                className="absolute inset-0 transition-all duration-700 ease-in-out flex flex-col items-center text-center px-4"
                style={{
                  opacity: currentTestimonial === index ? 1 : 0,
                  transform: currentTestimonial === index ? 'scale(1)' : 'scale(0.95)',
                  pointerEvents: currentTestimonial === index ? 'auto' : 'none'
                }}>
                
                    {/* Stars */}
                    <div className="flex gap-1 mb-5">
                      {[...Array(5)].map((_, s) =>
                  <Star key={s} className="h-4 w-4 text-brand-red-orange fill-brand-red-orange" />
                  )}
                    </div>
                    <blockquote className="text-lg md:text-2xl text-[hsl(214,95%,15%)] leading-relaxed font-medium italic mb-8 max-w-3xl">
                      "{t.quote}"
                    </blockquote>
                    <div className="flex items-center gap-4">
                      {t.author_image &&
                  <img src={t.author_image} alt={t.author_name} className="h-14 w-14 rounded-full object-cover ring-2 ring-brand-red-orange/20 ring-offset-2" />
                  }
                      <div className="text-left">
                        <div className="font-bold text-[hsl(214,95%,15%)] text-base">{t.author_name}</div>
                        {t.author_title && <div className="text-sm text-muted-foreground">{t.author_title}</div>}
                      </div>
                    </div>
                  </div>
              )}
              </div>

              {/* Dots */}
              <div className="flex justify-center gap-2 mt-10">
                {testimonials.map((_, i) =>
              <button
                key={i}
                onClick={() => setCurrentTestimonial(i)}
                className={`h-2 rounded-full transition-all duration-300 ${currentTestimonial === i ? 'w-8 bg-brand-red-orange' : 'w-2 bg-[hsl(214,25%,80%)] hover:bg-[hsl(214,25%,70%)]'}`}
                aria-label={`Testimonial ${i + 1}`} />

              )}
              </div>
            </div>
          </div>
        </section>
      }

      {/* ═══════════════════════════════════════════ */}
      {/* PARTNERS — Logo Marquee                     */}
      {/* ═══════════════════════════════════════════ */}
      {partners.length > 0 &&
      <section className="bg-card py-16 md:py-20 border-t border-card-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Trusted By Leading Organizations</p>
            </div>
            {/* Scrolling marquee for many partners */}
            <div className="relative overflow-hidden">
              <div className="flex items-center gap-12 md:gap-16 justify-center flex-wrap">
                {partners.map((partner) =>
              <a
                key={partner.id}
                href={partner.website_url || '#'}
                target={partner.website_url ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-all duration-500">
                
                    {partner.logo_url ?
                <img src={partner.logo_url} alt={partner.name} className="h-12 md:h-16 object-contain grayscale group-hover:grayscale-0 transition-all duration-500" loading="lazy" /> :

                <div className="h-12 md:h-16 px-6 flex items-center justify-center rounded-lg bg-[hsl(210,20%,95%)] text-[hsl(214,95%,25%)] font-bold text-sm">
                        {partner.name}
                      </div>
                }
                  </a>
              )}
              </div>
            </div>
          </div>
        </section>
      }

      {/* ═══════════════════════════════════════════ */}
      {/* CTA BANNER — Dramatic Final Section          */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={ctaSection.ref} className="relative bg-[hsl(214,95%,10%)] py-24 md:py-32 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-brand-red-orange/[0.06] blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[hsl(214,95%,30%)]/10 blur-[80px]" />
        </div>

        <div className={`relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center ${ctaSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-white/70 text-xs font-semibold uppercase tracking-wider mb-8">
            Get Started
          </div>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-[1.1]">
            Ready to Make a{' '}
            <span className="text-brand-red-orange-light">Difference</span>?
          </h2>
          <p className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            Whether you want to host an event, partner with us, or join our team — we'd love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-gradient-to-r from-[hsl(28,100%,55%)] to-[hsl(12,90%,50%)] hover:from-[hsl(28,100%,45%)] hover:to-[hsl(12,90%,40%)] text-primary-foreground px-10 h-13 text-base rounded-xl shadow-lg shadow-[hsl(28,100%,55%)/0.25] group">
              <Link to="/contact">
                Book an Event
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="bg-transparent border-white/20 text-primary-foreground hover:bg-white/10 hover:text-white px-10 h-13 text-base rounded-xl">
              <Link to="/contact">Partner With Us</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="bg-transparent border-white/20 text-primary-foreground hover:bg-white/10 hover:text-white px-10 h-13 text-base rounded-xl">
              <Link to="/careers">Join Our Team</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>);

};

export default Home;