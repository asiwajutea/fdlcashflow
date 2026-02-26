import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Monitor, GraduationCap, ShoppingBag, BookOpen, Sparkles, Users, Award, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PublicLayout from '@/components/PublicLayout';
import { db } from '@/lib/supabase-db';

const iconMap: Record<string, React.ReactNode> = {
  Calendar: <Calendar className="h-8 w-8" />,
  ShoppingBag: <ShoppingBag className="h-8 w-8" />,
  Monitor: <Monitor className="h-8 w-8" />,
  GraduationCap: <GraduationCap className="h-8 w-8" />,
  BookOpen: <BookOpen className="h-8 w-8" />,
};

const heroSlides = [
  {
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1920&q=80',
    title: 'Making a Difference',
    accent: 'Across Industries',
    subtitle: 'Delivering excellence in Events, Technology, Education, and Cultural Preservation.',
  },
  {
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1920&q=80',
    title: 'Innovation That',
    accent: 'Drives Impact',
    subtitle: 'Pioneering solutions in EduTech, SaaS, and digital transformation.',
  },
  {
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1920&q=80',
    title: 'Unforgettable',
    accent: 'Events & Experiences',
    subtitle: 'From MAQ7 to StreeTalentz — celebrating talent, culture, and community.',
  },
  {
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1920&q=80',
    title: 'Building the',
    accent: 'Next Generation',
    subtitle: 'Education programs and cultural preservation for a brighter future.',
  },
];

const Home = () => {
  const [services, setServices] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [innovations, setInnovations] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    Promise.all([
      db.from('services').select('*').order('display_order'),
      db.from('events').select('*').order('display_order'),
      db.from('innovations').select('*').order('display_order'),
    ]).then(([s, e, i]) => {
      setServices(s.data || []);
      setEvents(e.data || []);
      setInnovations(i.data || []);
    });
  }, []);

  // Auto-advance slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => setCurrentSlide(index);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);

  return (
    <PublicLayout>
      {/* Hero Section with Slideshow */}
      <section className="relative h-[600px] md:h-[700px] overflow-hidden">
        {/* Slides */}
        {heroSlides.map((slide, index) => (
          <div
            key={index}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{ opacity: currentSlide === index ? 1 : 0 }}
          >
            <img
              src={slide.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(214,95%,10%)/0.92] via-[hsl(214,95%,15%)/0.8] to-[hsl(214,95%,15%)/0.6]" />
          </div>
        ))}

        {/* Content overlay */}
        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
          <div className="max-w-3xl">
            {heroSlides.map((slide, index) => (
              <div
                key={index}
                className="absolute transition-all duration-700 ease-in-out"
                style={{
                  opacity: currentSlide === index ? 1 : 0,
                  transform: currentSlide === index ? 'translateY(0)' : 'translateY(20px)',
                  pointerEvents: currentSlide === index ? 'auto' : 'none',
                }}
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                  {slide.title} <span className="text-[hsl(28,100%,55%)]">{slide.accent}</span>
                </h1>
                <p className="text-lg md:text-xl text-[hsl(0,0%,80%)] mb-8 leading-relaxed max-w-2xl">
                  {slide.subtitle}
                </p>
              </div>
            ))}

            {/* CTA Buttons - always visible */}
            <div className="flex flex-col sm:flex-row gap-4 mt-44 md:mt-48">
              <Button size="lg" asChild className="bg-[hsl(28,100%,55%)] hover:bg-[hsl(28,100%,45%)] text-white text-base px-8 shadow-lg">
                <Link to="/services">Explore Our Services <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-white/50 text-white hover:bg-white/10 backdrop-blur-sm text-base px-8">
                <Link to="/contact">Book a Consultation</Link>
              </Button>
            </div>
          </div>

          {/* Slide Navigation */}
          <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-3 z-20">
            <button onClick={prevSlide} className="p-2 text-white/60 hover:text-white transition-colors" aria-label="Previous slide">
              <ChevronLeft className="h-5 w-5" />
            </button>
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentSlide === index ? 'w-8 bg-[hsl(28,100%,55%)]' : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
            <button onClick={nextSlide} className="p-2 text-white/60 hover:text-white transition-colors" aria-label="Next slide">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats Bar at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-[hsl(214,95%,12%)/0.9] backdrop-blur-md border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-white/10">
              {[
                { icon: <Users className="h-5 w-5" />, value: '2019', label: 'Founded' },
                { icon: <Award className="h-5 w-5" />, value: '5+', label: 'Flagship Events' },
                { icon: <TrendingUp className="h-5 w-5" />, value: '4+', label: 'Innovations' },
                { icon: <Sparkles className="h-5 w-5" />, value: '5+', label: 'Service Lines' },
              ].map((stat, i) => (
                <div key={i} className="text-center py-4 md:py-5">
                  <div className="text-[hsl(28,100%,55%)] flex justify-center mb-1">{stat.icon}</div>
                  <div className="text-xl md:text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-white/50">{stat.label}</div>
                </div>
              ))}
            </div>
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
              driven by our mission of <strong className="text-[hsl(28,100%,50%)]">Making a Difference</strong> in every community we serve.
            </p>
            <Button variant="outline" asChild className="border-[hsl(214,95%,25%)] text-[hsl(214,95%,25%)] hover:bg-[hsl(214,95%,95%)]">
              <Link to="/about">Learn More About Us <ArrowRight className="ml-2 h-4 w-4" /></Link>
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
            {services.map(service => (
              <Link key={service.id} to={`/services/${service.slug}`}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-white">
                  <CardContent className="p-6">
                    <div className="text-[hsl(28,100%,55%)] mb-4">
                      {iconMap[service.icon] || <Sparkles className="h-8 w-8" />}
                    </div>
                    <h3 className="text-lg font-semibold text-[hsl(214,95%,15%)] mb-2">{service.title}</h3>
                    <p className="text-sm text-[hsl(210,15%,40%)] leading-relaxed">{service.short_description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
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
            {events.map(event => (
              <Link key={event.id} to={`/events/${event.slug}`}>
                <Card className="h-full bg-[hsl(214,85%,20%)] border-[hsl(214,70%,25%)] hover:border-[hsl(28,100%,55%)] transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-full bg-[hsl(28,100%,55%)/0.15] flex items-center justify-center mb-4">
                      <Calendar className="h-6 w-6 text-[hsl(28,100%,55%)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{event.title}</h3>
                    <p className="text-sm text-[hsl(0,0%,70%)] leading-relaxed">{event.short_description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
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
            {innovations.map(innovation => (
              <Link key={innovation.id} to={`/innovations/${innovation.slug}`}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-[hsl(214,25%,90%)]">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-[hsl(28,100%,96%)] flex items-center justify-center shrink-0">
                      <Sparkles className="h-6 w-6 text-[hsl(28,100%,55%)]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[hsl(214,95%,15%)] mb-1">{innovation.title}</h3>
                      <p className="text-sm text-[hsl(210,15%,40%)] leading-relaxed">{innovation.short_description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-gradient-to-r from-[hsl(28,100%,50%)] to-[hsl(28,100%,60%)] py-16">
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
    </PublicLayout>
  );
};

export default Home;
