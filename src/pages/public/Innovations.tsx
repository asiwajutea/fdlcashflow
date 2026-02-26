import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import PublicLayout from '@/components/PublicLayout';
import { db } from '@/lib/supabase-db';

const Innovations = () => {
  const [innovations, setInnovations] = useState<any[]>([]);
  useEffect(() => {
    db.from('innovations').select('*').order('display_order').then((r: any) => setInnovations(r.data || []));
  }, []);

  return (
    <PublicLayout>
      <section className="bg-[hsl(214,95%,15%)] py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Our Innovations</h1>
          <p className="text-[hsl(0,0%,75%)] text-lg">Technology and programs driving impact</p>
        </div>
      </section>
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {innovations.map(i => (
            <Link key={i.id} to={`/innovations/${i.slug}`}>
              <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-[hsl(28,100%,96%)] flex items-center justify-center shrink-0">
                    <Sparkles className="h-6 w-6 text-[hsl(28,100%,55%)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(214,95%,15%)] mb-1">{i.title}</h3>
                    <p className="text-sm text-[hsl(210,15%,40%)]">{i.short_description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
};

export default Innovations;
