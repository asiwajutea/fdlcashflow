import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/components/PublicLayout';
import { db } from '@/lib/supabase-db';

const EventDetail = () => {
  const { slug } = useParams();
  const [event, setEvent] = useState<any>(null);

  useEffect(() => {
    db.from('events').select('*').eq('slug', slug).maybeSingle().then((r: any) => setEvent(r.data));
  }, [slug]);

  if (!event) return <PublicLayout><div className="py-20 text-center text-[hsl(210,15%,40%)]">Loading...</div></PublicLayout>;

  return (
    <PublicLayout>
      <section className="bg-[hsl(214,95%,15%)] py-16">
        <div className="max-w-7xl mx-auto px-4">
          <Link to="/events" className="inline-flex items-center text-[hsl(28,100%,55%)] hover:underline mb-4 text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Events
          </Link>
          <h1 className="text-4xl font-bold text-white">{event.title}</h1>
        </div>
      </section>
      <section className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-[hsl(210,15%,40%)] leading-relaxed text-lg mb-8">{event.description || event.short_description}</p>
          <Button asChild className="bg-[hsl(28,100%,55%)] hover:bg-[hsl(28,100%,45%)] text-white">
            <Link to="/contact">Register Interest</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
};

export default EventDetail;
