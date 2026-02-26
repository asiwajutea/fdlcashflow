import { useEffect, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import { db } from '@/lib/supabase-db';

const Gallery = () => {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    db.from('gallery_items').select('*').order('display_order').then((r: any) => setItems(r.data || []));
  }, []);

  const categories = ['all', ...new Set(items.map(i => i.category))];
  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter);

  return (
    <PublicLayout>
      <section className="bg-[hsl(214,95%,15%)] py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Gallery</h1>
          <p className="text-[hsl(0,0%,75%)] text-lg">Moments captured across our events and projects</p>
        </div>
      </section>
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-8 justify-center">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    filter === c ? 'bg-[hsl(28,100%,55%)] text-white' : 'bg-[hsl(210,20%,95%)] text-[hsl(210,15%,40%)] hover:bg-[hsl(210,20%,90%)]'
                  }`}
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          )}
          {filtered.length === 0 ? (
            <p className="text-center text-[hsl(210,15%,40%)]">No gallery items yet. Check back soon!</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(item => (
                <div key={item.id} className="rounded-lg overflow-hidden aspect-square bg-[hsl(210,20%,95%)]">
                  <img src={item.media_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default Gallery;
