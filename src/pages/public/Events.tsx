import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import PublicLayout from '@/components/PublicLayout';
import { db } from '@/lib/supabase-db';

const Events = () => {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    db.from('events').select('*').order('display_order').then((r: any) => setEvents(r.data || []));
  }, []);

  return (
    <PublicLayout>
      <section className="bg-[hsl(214,95%,15%)] py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Our Events</h1>
          <p className="text-[hsl(0,0%,75%)] text-lg">Flagship events celebrating talent, culture, and community</p>
        </div>
      </section>
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(e => (
            <Link key={e.id} to={`/events/${e.slug}`}>
              <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <Calendar className="h-8 w-8 text-[hsl(28,100%,55%)] mb-4" />
                  <h3 className="text-lg font-semibold text-[hsl(214,95%,15%)] mb-2">{e.title}</h3>
                  <p className="text-sm text-[hsl(210,15%,40%)]">{e.short_description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
};

export default Events;
