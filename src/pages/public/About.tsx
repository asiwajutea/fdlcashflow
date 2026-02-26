import PublicLayout from '@/components/PublicLayout';

const About = () => (
  <PublicLayout>
    <section className="bg-[hsl(214,95%,15%)] py-16">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">About Us</h1>
        <p className="text-[hsl(0,0%,75%)] text-lg">Our story, vision, and the team behind Footprints Dynasty</p>
      </div>
    </section>
    <section className="bg-white py-16">
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-[hsl(214,95%,15%)] mb-3">Our Story</h2>
          <p className="text-[hsl(210,15%,40%)] leading-relaxed">Founded in 2019, Footprints Dynasty Ltd (RC: 1554073) began with a vision to make a meaningful difference across Nigerian industries. From humble beginnings, we have grown into a multifaceted enterprise spanning events, technology, education, and cultural preservation.</p>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[hsl(214,95%,15%)] mb-3">Vision & Mission</h2>
          <p className="text-[hsl(210,15%,40%)] leading-relaxed"><strong>Vision:</strong> To be the leading force driving positive change across communities through innovation and excellence.</p>
          <p className="text-[hsl(210,15%,40%)] leading-relaxed mt-2"><strong>Mission:</strong> Making a difference by delivering outstanding services in events management, technology solutions, education, and cultural heritage preservation.</p>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[hsl(214,95%,15%)] mb-3">Core Values</h2>
          <ul className="grid grid-cols-2 gap-3 text-[hsl(210,15%,40%)]">
            {['Excellence', 'Innovation', 'Integrity', 'Community Impact', 'Cultural Preservation', 'Teamwork'].map(v => (
              <li key={v} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[hsl(28,100%,55%)]" /> {v}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  </PublicLayout>
);

export default About;
