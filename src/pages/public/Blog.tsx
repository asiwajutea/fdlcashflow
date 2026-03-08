import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, Star, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/components/PublicLayout';
import { db } from '@/lib/supabase-db';
import { format } from 'date-fns';

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

const defaultFallback = 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80';

const Blog = () => {
  const [posts, setPosts] = useState<any[]>([]);

  const introSection = useInView(0.2);
  const gridSection = useInView(0.1);
  const ctaSection = useInView(0.2);

  useEffect(() => {
    db.from('blog_posts').select('*').eq('status', 'published').order('published_at', { ascending: false }).then((r: any) => setPosts(r.data || []));
  }, []);

  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1920&q=80"
          alt="Blog"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(214,95%,6%)/0.92] via-[hsl(214,95%,8%)/0.85] to-[hsl(214,95%,10%)/0.7]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(214,95%,6%)/0.95] via-transparent to-transparent" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(hsl(0,0%,100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0,0%,100%) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16 md:pb-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white/90 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <BookOpen className="h-3 w-3 text-brand-red-orange-light" />
              Our Blog
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.1] mb-4 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_20px_rgba(0,0,0,0.7)]">
              Insights & <span className="text-brand-red-orange-light drop-shadow-none [filter:drop-shadow(0_2px_8px_rgba(200,80,0,0.5))]">Stories</span>
            </h1>
            <p className="text-sm sm:text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              Insights, stories, and updates from our team.
            </p>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section ref={introSection.ref} className="bg-card py-16 md:py-20">
        <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center ${introSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-6">
            <Star className="h-3 w-3" />
            Latest Articles
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-card-foreground mb-6 leading-[1.2]">
            Stay informed with <span className="text-brand-red-orange">our latest thinking</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto">
            Explore articles on innovation, community development, technology, and the stories that drive our mission forward.
          </p>
        </div>
      </section>

      {/* BLOG GRID */}
      <section ref={gridSection.ref} className="bg-[hsl(210,20%,97%)] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {posts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No blog posts yet. Stay tuned!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {posts.map((post, i) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                  <Card
                    className={`h-full border border-card-border hover:border-brand-red-orange/20 hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 rounded-2xl overflow-hidden ${gridSection.inView ? 'animate-fade-up' : 'opacity-0'}`}
                    style={{ animationDelay: `${(i + 1) * 100}ms` }}
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={post.featured_image || defaultFallback}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(214,95%,10%)] via-[hsl(214,95%,12%)/0.6] to-[hsl(214,95%,15%)/0.35]" />
                      {post.published_at && (
                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white text-xs font-medium">
                          {format(new Date(post.published_at), 'MMM d, yyyy')}
                        </div>
                      )}
                      <div className="absolute bottom-4 left-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-red-orange to-brand-red-orange-dark flex items-center justify-center shadow-glow-orange">
                          <BookOpen className="h-5 w-5 text-primary-foreground" />
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-card-foreground mb-2 group-hover:text-brand-red-orange transition-colors">{post.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{post.excerpt}</p>
                      <div className="flex items-center gap-1 mt-4 text-sm font-semibold text-brand-red-orange opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Read more <ArrowRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaSection.ref} className="relative bg-card py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-red-orange/5 via-transparent to-[hsl(214,95%,15%)/0.05]" />
        <div className={`relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center ${ctaSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red-orange/10 text-brand-red-orange text-xs font-semibold uppercase tracking-wider mb-6">
            <Phone className="h-3 w-3" />
            Stay Connected
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-card-foreground mb-6 leading-[1.15]">
            Want to <span className="text-brand-red-orange">stay updated?</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            Reach out to learn more about our work, upcoming projects, and how we're making a difference.
          </p>
          <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground border-0 shadow-glow-orange hover:shadow-lg px-8 text-base">
            <Link to="/contact">
              Get In Touch <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Blog;
