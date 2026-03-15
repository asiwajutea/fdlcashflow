import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Users, Target, Eye, Heart, Award, Lightbulb, Shield, Handshake, ArrowRight, Sparkles, Star, CheckCircle, Globe, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/components/PublicLayout';
import { db } from '@/lib/supabase-db';

/* ── Scroll animation hook ── */
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

/* ── Animated counter hook ── */
const useCounter = (end: number, duration = 2000, startCounting = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!startCounting) return;
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); } else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, startCounting]);
  return count;
};

const coreValues = [
  { icon: <Award className="h-6 w-6" />, name: 'Excellence', desc: 'Delivering the highest quality in everything we do' },
  { icon: <Lightbulb className="h-6 w-6" />, name: 'Innovation', desc: 'Pioneering creative solutions for modern challenges' },
  { icon: <Shield className="h-6 w-6" />, name: 'Integrity', desc: 'Building trust through transparency and honesty' },
  { icon: <Heart className="h-6 w-6" />, name: 'Community Impact', desc: 'Making meaningful differences in communities we serve' },
  { icon: <Users className="h-6 w-6" />, name: 'Cultural Preservation', desc: 'Honoring and preserving African heritage and traditions' },
  { icon: <Handshake className="h-6 w-6" />, name: 'Teamwork', desc: 'Collaborating to achieve greater outcomes together' },
];

const About = () => {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const storySection = useInView(0.2);
  const visionSection = useInView(0.2);
  const valuesSection = useInView(0.15);
  const teamSection = useInView(0.15);
  const statsSection = useInView(0.3);
  const ctaSection = useInView(0.2);

  const yearsFounded = useCounter(2019, 1500, statsSection.inView);
  const teamSize = useCounter(50, 1500, statsSection.inView);
  const projectsCount = useCounter(100, 1500, statsSection.inView);
  const communitiesCount = useCounter(25, 1500, statsSection.inView);

  useEffect(() => {
    db.from('team_members').select('*').eq('is_published', true).order('display_order').then((r: any) => setTeamMembers(r.data || []));
  }, []);

  return (
    <PublicLayout>
      {/* ═══════════════════════════════════════════ */}
      {/* HERO — Cinematic Banner                     */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80"
          alt="Team working together"
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
              Our Story
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.1] mb-4 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_20px_rgba(0,0,0,0.7)]">
              About <span className="text-brand-red-orange-light drop-shadow-none [filter:drop-shadow(0_2px_8px_rgba(200,80,0,0.5))]">Footprints Dynasty</span>
            </h1>
            <p className="text-sm sm:text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              Making a Difference across events, technology, education, and cultural preservation since 2019.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* OUR STORY — Split Layout                    */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={storySection.ref} className="bg-card py-20 md:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className={`${storySection.inView ? 'animate-slide-in-left' : 'opacity-0'}`}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-6">
                <Sparkles className="h-3 w-3" />
                Our Journey
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-card-foreground mb-6 leading-[1.15]">
                From Vision to <span className="text-brand-red-orange">Impact</span>
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>Founded in 2019, Footprints Dynasty Ltd (RC: 1554073) began with a bold vision — to make a meaningful difference across African industries. From humble beginnings, we have grown into a multifaceted enterprise spanning events, technology, education, and cultural preservation.</p>
                <p>What started as a passion project has evolved into a movement that touches thousands of lives. Our events celebrate talent and culture, our technology solutions drive digital transformation, and our education programs empower the next generation.</p>
                <p>Today, we stand as a testament to what's possible when <strong className="text-brand-red-orange font-semibold">innovation meets purpose</strong>, and ambition meets action.</p>
              </div>
              <div className="flex flex-wrap gap-4 mt-8">
                {['Events', 'Technology', 'Education', 'Culture'].map((tag) => (
                  <span key={tag} className="px-4 py-2 rounded-lg bg-[hsl(214,25%,95%)] text-card-foreground text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className={`relative ${storySection.inView ? 'animate-slide-in-right' : 'opacity-0'}`}>
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-financial-lg">
                <img
                  src="https://scontent.fiba2-3.fna.fbcdn.net/v/t1.6435-9/55437925_429020411178200_8762309054270799872_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=2a1932&_nc_ohc=UPyNGaN5qdUQ7kNvwET3L8L&_nc_oc=AdnNYGGB1umhYFL_Q2JkgfOBmgvkmNf4IDF5ahUI-Um_NeNllvn4bseEgA9T4Gb6PUg&_nc_zt=23&_nc_ht=scontent.fiba2-3.fna&_nc_gid=FT7ILLA3f4y6qiRswiwPQQ&oh=00_Aftcx-ZI8pmNvFBFOYb3gs0Y0rRrEhHB5XZP3OxjSspalQ&oe=69C92BED"
                  alt="Young woman speaking at Footprints Dynasty event"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
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
      {/* VISION & MISSION — Premium Cards            */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={visionSection.ref} className="bg-[hsl(210,20%,97%)] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-14 ${visionSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-4">
              Our Direction
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[hsl(214,95%,15%)] mb-4">Vision & Mission</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">The guiding principles that shape our path forward</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className={`border-0 shadow-sm hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 rounded-2xl overflow-hidden ${visionSection.inView ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '100ms' }}>
              <CardContent className="p-8 md:p-10">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[hsl(214,95%,15%)] to-[hsl(214,95%,25%)] flex items-center justify-center mb-6">
                  <Eye className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-card-foreground mb-4">Our Vision</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  To be the leading force driving positive change across communities through innovation and excellence — creating lasting impact in events, technology, education, and cultural heritage.
                </p>
              </CardContent>
            </Card>
            <Card className={`border-0 shadow-sm hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 rounded-2xl overflow-hidden ${visionSection.inView ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '200ms' }}>
              <CardContent className="p-8 md:p-10">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-red-orange to-brand-red-orange-dark flex items-center justify-center mb-6">
                  <Target className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-card-foreground mb-4">Our Mission</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  Making a difference by delivering outstanding services in events management, technology solutions, education, and cultural heritage preservation — empowering communities and building futures.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* CORE VALUES — Animated Grid                  */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={valuesSection.ref} className="bg-card py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-14 ${valuesSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-4">
              <CheckCircle className="h-3 w-3" />
              What Drives Us
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-card-foreground mb-4">Core Values</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">The principles that guide everything we do</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {coreValues.map((value, i) => (
              <Card
                key={value.name}
                className={`border border-card-border hover:border-brand-red-orange/20 hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 group rounded-2xl ${valuesSection.inView ? 'animate-fade-up' : 'opacity-0'}`}
                style={{ animationDelay: `${(i + 1) * 100}ms` }}
              >
                <CardContent className="p-6 md:p-8 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-red-orange/15 to-brand-red-orange/5 flex items-center justify-center shrink-0 text-brand-red-orange group-hover:from-brand-red-orange group-hover:to-brand-red-orange-dark group-hover:text-primary-foreground transition-all duration-300">
                    {value.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-card-foreground mb-1 group-hover:text-brand-red-orange transition-colors">{value.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{value.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* ANIMATED STATS BAR                          */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={statsSection.ref} className="relative bg-[hsl(214,95%,12%)] border-t border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-red-orange/5 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
              { icon: <Globe className="h-5 w-5" />, value: yearsFounded, label: 'Founded', suffix: '' },
              { icon: <Users className="h-5 w-5" />, value: teamSize, label: 'Team Members', suffix: '+' },
              { icon: <Award className="h-5 w-5" />, value: projectsCount, label: 'Projects Delivered', suffix: '+' },
              { icon: <MapPin className="h-5 w-5" />, value: communitiesCount, label: 'Communities Reached', suffix: '+' },
            ].map((stat, i) => (
              <div
                key={i}
                className={`text-center py-8 md:py-10 border-r border-white/5 last:border-r-0 ${statsSection.inView ? 'animate-count-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-brand-red-orange/15 text-brand-red-orange mb-3">
                  {stat.icon}
                </div>
                <div className="text-3xl md:text-4xl font-bold text-primary-foreground tracking-tight">
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-xs text-white/40 mt-1.5 uppercase tracking-wider font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* LEADERSHIP TEAM — CMS-Driven                 */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={teamSection.ref} className="relative bg-[hsl(214,95%,10%)] py-20 md:py-28 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(0,0%,100%) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-14 ${teamSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/15 text-brand-red-orange-light text-xs font-semibold uppercase tracking-wider mb-4">
              <Users className="h-3 w-3" />
              Our People
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">Leadership Team</h2>
            <p className="text-white/50 max-w-xl mx-auto">The people driving our vision forward</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {teamMembers.map((member, i) => (
              <div
                key={member.id}
                className={`group relative rounded-2xl overflow-hidden bg-[hsl(214,85%,15%)] border border-white/5 hover:border-brand-red-orange/30 transition-all duration-500 hover:-translate-y-2 ${teamSection.inView ? 'animate-fade-up' : 'opacity-0'}`}
                style={{ animationDelay: `${(i + 1) * 120}ms` }}
              >
                {/* Image */}
                <div className="h-64 overflow-hidden relative">
                  {member.image_url ? (
                    <img
                      src={member.image_url}
                      alt={member.full_name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[hsl(28,100%,55%)] to-[hsl(12,90%,50%)] flex items-center justify-center">
                      <span className="text-4xl font-bold text-primary-foreground">
                        {member.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[hsl(214,85%,15%)] via-transparent to-transparent" />

                  {/* Hover bio overlay */}
                  {member.bio && (
                    <div className="absolute inset-0 bg-[hsl(214,95%,10%)/0.9] flex items-center justify-center p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-sm text-white/80 text-center leading-relaxed line-clamp-6">{member.bio}</p>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-5 text-center">
                  <h3 className="text-base font-bold text-primary-foreground mb-1 group-hover:text-brand-red-orange-light transition-colors">{member.full_name}</h3>
                  <p className="text-sm text-white/50">{member.role}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Fallback when no team members */}
          {teamMembers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/40 text-lg">Leadership profiles loading… The brilliant minds behind our mission will appear here shortly.</p>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* CTA SECTION                                  */}
      {/* ═══════════════════════════════════════════ */}
      <section ref={ctaSection.ref} className="relative bg-gradient-to-br from-[hsl(214,95%,15%)] via-[hsl(214,95%,18%)] to-[hsl(12,90%,20%)] py-20 md:py-28 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[15%] right-[8%] w-72 h-72 rounded-full border border-brand-red-orange/10 animate-[spin_30s_linear_infinite]" />
          <div className="absolute bottom-[10%] left-[5%] w-40 h-40 rounded-full border border-white/[0.04] animate-[spin_25s_linear_infinite_reverse]" />
        </div>
        <div className={`relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center ${ctaSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white/90 text-xs sm:text-sm font-medium mb-6">
            <Sparkles className="h-3 w-3 text-brand-red-orange-light" />
            Let's Work Together
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6 leading-tight">
            Ready to Make a <span className="text-brand-red-orange-light">Difference</span> Together?
          </h2>
          <p className="text-lg text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            Whether you need expert event management, cutting-edge technology solutions, or innovative education programs — we're here to help you succeed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-gradient-to-r from-[hsl(28,100%,55%)] to-[hsl(12,90%,50%)] hover:from-[hsl(28,100%,45%)] hover:to-[hsl(12,90%,40%)] text-primary-foreground text-base px-8 shadow-lg shadow-[hsl(28,100%,55%)/0.3] border-0 h-12 rounded-xl group">
              <Link to="/contact">
                Get In Touch
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="bg-transparent border-white/25 text-primary-foreground hover:bg-white/10 hover:text-white backdrop-blur-sm text-base px-8 h-12 rounded-xl">
              <Link to="/services">Explore Services</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default About;
