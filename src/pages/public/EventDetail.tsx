import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/components/PublicLayout';
import { db } from '@/lib/supabase-db';

const EventDetail = () => {
  const { slug } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    db.from('events').select('*').eq('slug', slug).maybeSingle().then((r: any) => setEvent(r.data));
  }, [slug]);

  if (!event) return <PublicLayout><div className="py-20 text-center text-[hsl(210,15%,40%)]">Loading...</div></PublicLayout>;

  const gallery: string[] = Array.isArray(event.gallery) ? event.gallery : [];
  const descParagraphs = (event.description || event.short_description || '').split('\n').filter((p: string) => p.trim());

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative bg-[hsl(214,95%,15%)] py-16 md:py-24 overflow-hidden">
        {event.image_url && (
          <>
            <img src={event.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(214,95%,8%)/0.95] to-[hsl(12,90%,15%)/0.8]" />
          </>
        )}
        <div className="relative max-w-7xl mx-auto px-4">
          <Link to="/events" className="inline-flex items-center text-brand-red-orange hover:underline mb-6 text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Events
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{event.title}</h1>
          {event.event_date && (
            <div className="flex items-center gap-2 text-[hsl(0,0%,70%)]">
              <Calendar className="h-4 w-4" />
              <span>{new Date(event.event_date).toLocaleDateString('en-NG', { dateStyle: 'long' })}</span>
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-6">
              {descParagraphs.map((p: string, i: number) => (
                <p key={i} className="text-[hsl(210,15%,40%)] leading-relaxed text-lg">{p}</p>
              ))}
            </div>
            <div className="space-y-6">
              {event.image_url && (
                <div className="rounded-xl overflow-hidden shadow-lg">
                  <img src={event.image_url} alt={event.title} className="w-full h-64 object-cover" />
                </div>
              )}
              {event.registration_url && (
                <Button asChild className="w-full bg-gradient-to-r from-[hsl(28,100%,55%)] to-[hsl(12,90%,50%)] text-white border-0">
                  <a href={event.registration_url} target="_blank" rel="noopener noreferrer">Register Now <ExternalLink className="ml-2 h-4 w-4" /></a>
                </Button>
              )}
              <Button asChild variant="outline" className="w-full border-[hsl(214,95%,25%)] text-[hsl(214,95%,25%)]">
                <Link to="/contact">Contact Us About This Event</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="bg-[hsl(210,20%,97%)] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-[hsl(214,95%,15%)] mb-8">Event Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gallery.map((url, i) => (
                <button key={i} onClick={() => setLightboxImage(url)} className="aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity">
                  <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-6 right-6 text-white" onClick={() => setLightboxImage(null)}>
            <X className="h-8 w-8" />
          </button>
          <img src={lightboxImage} alt="Gallery" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </PublicLayout>
  );
};

export default EventDetail;
