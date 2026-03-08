import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin, ArrowRight, Star, TrendingUp, Heart, Users, Lightbulb, Phone } from 'lucide-react';
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

const perks = [
  { icon: <TrendingUp className="h-6 w-6" />, title: 'Growth', desc: 'Continuous learning and career development opportunities' },
  { icon: <Heart className="h-6 w-6" />, title: 'Impact', desc: 'Work that makes a real difference in communities' },
  { icon: <Users className="h-6 w-6" />, title: 'Culture', desc: 'A collaborative, inclusive, and supportive team environment' },
  { icon: <Lightbulb className="h-6 w-6" />, title: 'Innovation', desc: 'Freedom to experiment and bring creative ideas to life' },
];

const Careers = () => {
  const [jobs, setJobs] = useState<any[]>([]);

  const introSection = useInView(0.2);
  const gridSection = useInView(0.1);
  const perksSection = useInView(0.2);
  const ctaSection = useInView(0.2);

  useEffect(() => {
    db.from('job_positions').select('*').eq('status', 'open').order('created_at', { ascending: false }).then((r: any) => setJobs(r.data || []));
  }, []);

  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80"
          alt="Careers"
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
              <Briefcase className="h-3 w-3 text-brand-red-orange-light" />
              Join Our Team
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.1] mb-4 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_20px_rgba(0,0,0,0.7)]">
              Build Your <span className="text-brand-red-orange-light drop-shadow-none [filter:drop-shadow(0_2px_8px_rgba(200,80,0,0.5))]">Career</span>
            </h1>
            <p className="text-sm sm:text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              Join a team that's passionate about innovation, impact, and excellence.
            </p>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section ref={introSection.ref} className="bg-card py-16 md:py-20">
        <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center ${introSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-6">
            <Star className="h-3 w-3" />
            We're Hiring
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-card-foreground mb-6 leading-[1.2]">
            Be part of a team that <span className="text-brand-red-orange">makes a difference</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto">
            At Footprints Dynasty, we believe in empowering our people to grow, innovate, and create meaningful impact. Explore our open positions below.
          </p>
        </div>
      </section>

      {/* JOB LISTINGS */}
      <section ref={gridSection.ref} className="bg-[hsl(210,20%,97%)] py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-14 ${gridSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[hsl(214,95%,15%)] mb-4">Open Positions</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Find the role that's right for you</p>
          </div>
          {jobs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No open positions at the moment. Check back soon!</p>
          ) : (
            <div className="space-y-4">
              {jobs.map((job, i) => (
                <Card
                  key={job.id}
                  className={`border border-card-border hover:border-brand-red-orange/20 hover:shadow-card-hover transition-all duration-500 rounded-2xl overflow-hidden ${gridSection.inView ? 'animate-fade-up' : 'opacity-0'}`}
                  style={{ animationDelay: `${(i + 1) * 100}ms` }}
                >
                  <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-red-orange/15 to-brand-red-orange/5 flex items-center justify-center shrink-0">
                        <Briefcase className="h-5 w-5 text-brand-red-orange" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-card-foreground">{job.title}</h3>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                          {job.department && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5" /> {job.department}
                            </span>
                          )}
                          {job.work_location_state && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {job.work_location_state}
                            </span>
                          )}
                          {job.job_type && (
                            <span className="px-2 py-0.5 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-medium">
                              {job.job_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button asChild className="rounded-full bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground border-0 shadow-glow-orange shrink-0">
                      <Link to="/apply">
                        Apply Now <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* WHY JOIN US */}
      <section ref={perksSection.ref} className="relative bg-[hsl(214,95%,12%)] py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(0,0%,100%) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-14 ${perksSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/15 text-brand-red-orange-light text-xs font-semibold uppercase tracking-wider mb-4">
              Why Join Us
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">Life at Footprints Dynasty</h2>
            <p className="text-white/50 max-w-xl mx-auto">More than a job — it's a mission</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {perks.map((perk, i) => (
              <div
                key={perk.title}
                className={`relative text-center ${perksSection.inView ? 'animate-fade-up' : 'opacity-0'}`}
                style={{ animationDelay: `${(i + 1) * 150}ms` }}
              >
                {i < perks.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-brand-red-orange/40 to-transparent" />
                )}
                <div className="relative inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-brand-red-orange/20 to-brand-red-orange/5 border border-brand-red-orange/20 mb-6 mx-auto">
                  <div className="text-brand-red-orange-light">{perk.icon}</div>
                </div>
                <h3 className="text-lg font-bold text-primary-foreground mb-2">{perk.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{perk.desc}</p>
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
            Get In Touch
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-card-foreground mb-6 leading-[1.15]">
            Don't see your role? <span className="text-brand-red-orange">Let's talk</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            We're always looking for talented individuals who share our vision. Send us your CV and let's explore opportunities together.
          </p>
          <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground border-0 shadow-glow-orange hover:shadow-lg px-8 text-base">
            <Link to="/contact">
              Contact Us <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Careers;
