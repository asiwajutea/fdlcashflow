import { useEffect, useState, useRef, useCallback } from 'react';
import { Camera, X, ArrowRight, Phone, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import PublicLayout from '@/components/PublicLayout';
import SEO from '@/components/SEO';
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

const Gallery = () => {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const gridSection = useInView(0.1);
  const ctaSection = useInView(0.2);

  useEffect(() => {
    db.from('gallery_items').select('*').order('display_order').then((r: any) => setItems(r.data || []));
  }, []);

  const categories = ['all', ...new Set(items.map(i => i.category).filter(Boolean))];
  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter);
  const total = filtered.length;

  const close = useCallback(() => { setLightboxIndex(null); setPlaying(false); }, []);
  const next = useCallback(() => setLightboxIndex(i => i === null ? null : (i + 1) % total), [total]);
  const prev = useCallback(() => setLightboxIndex(i => i === null ? null : (i - 1 + total) % total), [total]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, close, next, prev]);

  useEffect(() => {
    if (!playing || paused || lightboxIndex === null) return;
    const id = setInterval(() => next(), 4000);
    return () => clearInterval(id);
  }, [playing, paused, lightboxIndex, next]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; setPaused(true); };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 50) prev();
    else if (delta < -50) next();
    touchStartX.current = null;
    setTimeout(() => setPaused(false), 100);
  };

  const current = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  return (
    <PublicLayout>
      <SEO title="Gallery" description="Photos and visuals from Footprints Dynasty projects, events and heritage initiatives." />
      {/* HERO */}
      <section className="relative h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80"
          alt="Gallery"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(214,95%,6%)/0.92] via-[hsl(214,95%,8%)/0.85] to-[hsl(214,95%,10%)/0.7]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(214,95%,6%)/0.95] via-transparent to-transparent" />
        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16 md:pb-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white/90 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Camera className="h-3 w-3 text-brand-red-orange-light" />
              Gallery
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.1] mb-4 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
              Our <span className="text-brand-red-orange-light">Gallery</span>
            </h1>
            <p className="text-sm sm:text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              Moments captured across our events, projects, and community engagements.
            </p>
          </div>
        </div>
      </section>

      {/* FILTER + GRID */}
      <section ref={gridSection.ref} className="bg-card py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-10 justify-center">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    filter === c
                      ? 'bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground shadow-glow-orange'
                      : 'bg-[hsl(210,20%,95%)] text-muted-foreground hover:bg-[hsl(210,20%,90%)] hover:text-card-foreground'
                  }`}
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No gallery items yet. Check back soon!</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => setLightboxIndex(i)}
                  className="relative aspect-square rounded-2xl overflow-hidden group"
                >
                  <img src={item.media_url} alt={item.title || 'Gallery image'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[hsl(214,95%,10%)/0.7] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {item.title && (
                    <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-sm font-medium truncate drop-shadow-lg">{item.title}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaSection.ref} className="relative bg-[hsl(214,95%,12%)] py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-red-orange/10 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/15 text-brand-red-orange-light text-xs font-semibold uppercase tracking-wider mb-6">
            <Phone className="h-3 w-3" />
            Get In Touch
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            Want to see <span className="text-brand-red-orange-light">more?</span>
          </h2>
          <p className="text-white/50 mb-8 max-w-xl mx-auto">Interested in our events or want to collaborate? Let's connect.</p>
          <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground border-0 shadow-glow-orange hover:shadow-lg px-8">
            <Link to="/contact">
              Contact Us <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Lightbox */}
      {current && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between text-white z-10">
            <span className="text-sm font-medium bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
              {lightboxIndex + 1} / {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlaying(p => !p)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
                aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button
                onClick={close}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Prev */}
          {total > 1 && (
            <button
              onClick={prev}
              className="absolute left-2 sm:left-6 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-colors z-10"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Image */}
          <div className="px-4 sm:px-20 max-w-7xl w-full flex flex-col items-center">
            <img
              src={current.media_url}
              alt={current.title || 'Gallery'}
              className="max-w-full max-h-[80vh] object-contain rounded-lg select-none"
              draggable={false}
            />
            {current.title && (
              <p className="mt-4 text-white/90 text-center text-sm sm:text-base">{current.title}</p>
            )}
          </div>

          {/* Next */}
          {total > 1 && (
            <button
              onClick={next}
              className="absolute right-2 sm:right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-colors z-10"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>
      )}
    </PublicLayout>
  );
};

export default Gallery;
