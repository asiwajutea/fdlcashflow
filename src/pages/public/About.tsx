import { useEffect, useState } from 'react';
import { Users, Target, Eye, Heart, Award, Lightbulb, Shield, Handshake } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import PublicLayout from '@/components/PublicLayout';
import { db } from '@/lib/supabase-db';

const coreValues = [
  { icon: <Award className="h-6 w-6" />, name: 'Excellence', desc: 'Delivering the highest quality in everything we do' },
  { icon: <Lightbulb className="h-6 w-6" />, name: 'Innovation', desc: 'Pioneering creative solutions for modern challenges' },
  { icon: <Shield className="h-6 w-6" />, name: 'Integrity', desc: 'Building trust through transparency and honesty' },
  { icon: <Heart className="h-6 w-6" />, name: 'Community Impact', desc: 'Making meaningful differences in communities we serve' },
  { icon: <Users className="h-6 w-6" />, name: 'Cultural Preservation', desc: 'Honoring and preserving African heritage and traditions' },
  { icon: <Handshake className="h-6 w-6" />, name: 'Teamwork', desc: 'Collaborating to achieve greater outcomes together' },
];

const leadershipTeam = [
  { name: 'Founder & CEO', role: 'Visionary leader driving FDL\'s mission across events, tech, and education.', placeholder: 'FC' },
  { name: 'Chief Operating Officer', role: 'Oversees day-to-day operations ensuring excellence across all service lines.', placeholder: 'CO' },
  { name: 'Head of Events', role: 'Creative director behind MAQ7, StreeTalentz, and all flagship events.', placeholder: 'HE' },
  { name: 'Head of Technology', role: 'Leading digital transformation, SaaS development, and EduTech innovation.', placeholder: 'HT' },
];

const About = () => {
  const [aboutSection, setAboutSection] = useState<any>(null);

  useEffect(() => {
    db.from('website_sections').select('*').eq('section_key', 'about_page').maybeSingle().then((r: any) => setAboutSection(r.data));
  }, []);

  return (
    <PublicLayout>
      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-[hsl(214,95%,12%)] via-[hsl(214,95%,15%)] to-[hsl(12,90%,20%)] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">About Us</h1>
          <p className="text-[hsl(0,0%,75%)] text-lg max-w-2xl mx-auto">Our story, vision, and the team behind Footprints Dynasty</p>
        </div>
      </section>

      {/* Our Story */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-[hsl(214,95%,15%)] mb-6">Our Story</h2>
              <div className="space-y-4 text-[hsl(210,15%,40%)] leading-relaxed">
                <p>Founded in 2019, Footprints Dynasty Ltd (RC: 1554073) began with a bold vision — to make a meaningful difference across Nigerian industries. From humble beginnings, we have grown into a multifaceted enterprise spanning events, technology, education, and cultural preservation.</p>
                <p>What started as a passion project has evolved into a movement that touches thousands of lives. Our events celebrate talent and culture, our technology solutions drive digital transformation, and our education programs empower the next generation.</p>
                <p>Today, we stand as a testament to what's possible when innovation meets purpose, and ambition meets action.</p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-[hsl(214,95%,15%)] to-[hsl(12,90%,30%)] flex items-center justify-center">
                <div className="text-center text-white p-8">
                  <div className="text-6xl font-bold mb-2">2019</div>
                  <div className="text-lg opacity-80">Year Founded</div>
                  <div className="mt-4 text-sm opacity-60">RC: 1554073</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="bg-[hsl(210,20%,97%)] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-8">
                <div className="h-14 w-14 rounded-2xl bg-[hsl(214,95%,15%)] flex items-center justify-center mb-6">
                  <Eye className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-[hsl(214,95%,15%)] mb-4">Our Vision</h3>
                <p className="text-[hsl(210,15%,40%)] leading-relaxed text-lg">
                  To be the leading force driving positive change across communities through innovation and excellence — creating lasting impact in events, technology, education, and cultural heritage.
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-8">
                <div className="h-14 w-14 rounded-2xl bg-brand-red-orange flex items-center justify-center mb-6">
                  <Target className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-[hsl(214,95%,15%)] mb-4">Our Mission</h3>
                <p className="text-[hsl(210,15%,40%)] leading-relaxed text-lg">
                  Making a difference by delivering outstanding services in events management, technology solutions, education, and cultural heritage preservation — empowering communities and building futures.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[hsl(214,95%,15%)] mb-4">Core Values</h2>
            <p className="text-[hsl(210,15%,40%)]">The principles that guide everything we do</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreValues.map((value) => (
              <Card key={value.name} className="border border-[hsl(214,25%,92%)] hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-brand-red-orange/10 flex items-center justify-center shrink-0 text-brand-red-orange">
                    {value.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[hsl(214,95%,15%)] mb-1">{value.name}</h3>
                    <p className="text-sm text-[hsl(210,15%,40%)]">{value.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="bg-[hsl(214,95%,15%)] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Leadership Team</h2>
            <p className="text-[hsl(0,0%,70%)]">The people driving our vision forward</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {leadershipTeam.map((member) => (
              <Card key={member.name} className="bg-[hsl(214,85%,20%)] border-[hsl(214,70%,25%)] text-center">
                <CardContent className="p-6">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[hsl(28,100%,55%)] to-[hsl(12,90%,50%)] flex items-center justify-center mx-auto mb-4 text-white text-xl font-bold">
                    {member.placeholder}
                  </div>
                  <h3 className="font-semibold text-white mb-2">{member.name}</h3>
                  <p className="text-sm text-[hsl(0,0%,65%)] leading-relaxed">{member.role}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default About;
