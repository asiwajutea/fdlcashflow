import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/components/PublicLayout';
import { db } from '@/lib/supabase-db';

const ServiceDetail = () => {
  const { slug } = useParams();
  const [service, setService] = useState<any>(null);

  useEffect(() => {
    db.from('services').select('*').eq('slug', slug).maybeSingle().then((r: any) => setService(r.data));
  }, [slug]);

  if (!service) return <PublicLayout><div className="py-20 text-center text-[hsl(210,15%,40%)]">Loading...</div></PublicLayout>;

  // Parse description for bullet points if available
  const descParagraphs = (service.description || service.short_description || '').split('\n').filter((p: string) => p.trim());

  return (
    <PublicLayout>
      {/* Hero with image */}
      <section className="relative bg-[hsl(214,95%,15%)] py-16 md:py-24 overflow-hidden">
        {service.image_url && (
          <>
            <img src={service.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(214,95%,10%)/0.95] to-[hsl(214,95%,15%)/0.8]" />
          </>
        )}
        <div className="relative max-w-7xl mx-auto px-4">
          <Link to="/services" className="inline-flex items-center text-brand-red-orange hover:underline mb-6 text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Services
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{service.title}</h1>
          <p className="text-lg text-[hsl(0,0%,75%)] max-w-2xl">{service.short_description}</p>
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
              {service.image_url && (
                <div className="rounded-xl overflow-hidden shadow-lg">
                  <img src={service.image_url} alt={service.title} className="w-full h-64 object-cover" />
                </div>
              )}
              <div className="bg-[hsl(210,20%,97%)] rounded-xl p-6">
                <h3 className="font-semibold text-[hsl(214,95%,15%)] mb-4">Interested?</h3>
                <p className="text-sm text-[hsl(210,15%,40%)] mb-4">Get in touch with us to discuss how we can help.</p>
                <Button asChild className="w-full bg-gradient-to-r from-[hsl(28,100%,55%)] to-[hsl(12,90%,50%)] text-white border-0">
                  <Link to="/contact">Request a Quote</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default ServiceDetail;
