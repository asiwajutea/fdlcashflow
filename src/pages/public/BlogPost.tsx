import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Star, Phone, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/components/PublicLayout';
import SEO from '@/components/SEO';
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

const defaultFallback = 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1920&q=80';

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<any>(null);
  const [otherPosts, setOtherPosts] = useState<any[]>([]);

  const contentSection = useInView(0.1);
  const moreSection = useInView(0.15);
  const ctaSection = useInView(0.2);

  useEffect(() => {
    db.from('blog_posts').select('*').eq('slug', slug).maybeSingle().then((r: any) => setPost(r.data));
    db.from('blog_posts').select('*').eq('status', 'published').neq('slug', slug!).order('published_at', { ascending: false }).limit(3).then((r: any) => setOtherPosts(r.data || []));
  }, [slug]);

  if (!post) {
    return (
      <PublicLayout>
        <div className="py-32 text-center">
          <div className="inline-block h-8 w-8 border-2 border-brand-red-orange border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-muted-foreground">Loading…</p>
        </div>
      </PublicLayout>
    );
  }

  const authorName = post.author_name || 'Footprints Dynasty Team';
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.meta_description || '',
    image: post.featured_image || undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: { '@type': 'Person', name: authorName },
    publisher: {
      '@type': 'Organization',
      name: 'Footprints Dynasty',
    },
  };

  return (
    <PublicLayout>
      <SEO
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt}
        image={post.featured_image}
        type="article"
        jsonLd={articleLd}
      />
      {/* HERO */}
      <section className="relative h-[55vh] min-h-[380px] max-h-[550px] overflow-hidden">
        <img
          src={post.featured_image || defaultFallback}
          alt=""
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
            <Link to="/blog" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white/90 text-xs sm:text-sm font-medium mb-4 sm:mb-6 hover:bg-white/15 transition-colors">
              <ArrowLeft className="h-3 w-3" /> Back to Blog
            </Link>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary-foreground leading-[1.1] mb-4 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] [text-shadow:_0_2px_20px_rgba(0,0,0,0.7)]">
              {post.title}
            </h1>
            {post.published_at && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white/80 text-sm">
                  <BookOpen className="h-3.5 w-3.5 text-brand-red-orange-light" />
                  {format(new Date(post.published_at), 'MMMM d, yyyy')}
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white/80 text-sm">
                  <User className="h-3.5 w-3.5 text-brand-red-orange-light" />
                  By {authorName}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CONTENT — Split Layout */}
      <section ref={contentSection.ref} className="bg-card py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
            <div className="md:col-span-2">
              {post.featured_image && (
                <img src={post.featured_image} alt={post.title} className="rounded-2xl mb-8 w-full shadow-lg" />
              )}
              <div
                className="prose prose-lg max-w-none prose-headings:text-card-foreground prose-headings:font-bold prose-headings:mt-10 prose-headings:mb-4 prose-h2:text-2xl prose-h3:text-xl prose-p:text-foreground/85 prose-p:my-5 prose-p:leading-[1.8] prose-li:text-foreground/85 prose-li:my-2 prose-strong:text-card-foreground prose-a:text-brand-red-orange prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-brand-red-orange prose-blockquote:text-foreground/75"
                dangerouslySetInnerHTML={{ __html: (post.body || '').replace(/<h2[^>]*>\s*Sources?\s*<\/h2>[\s\S]*$/i, '') }}
              />
              {Array.isArray(post.tags) && post.tags.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {post.tags.map((t: string) => (
                    <span key={t} className="px-3 py-1 rounded-full bg-[hsl(214,25%,95%)] text-card-foreground text-xs font-medium">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              {Array.isArray(post.sources) && post.sources.length > 0 && (
                <div className="mt-10 pt-6 border-t border-card-border">
                  <h3 className="text-sm font-semibold text-card-foreground uppercase tracking-wider mb-3">Sources</h3>
                  <ul className="space-y-2 list-disc list-inside text-sm">
                    {post.sources.map((s: any, i: number) => (
                      <li key={i}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-brand-red-orange hover:underline">
                          {s.title || s.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <BlogComments postId={post.id} />
            </div>

            <div className="space-y-6">
              <Card className="rounded-2xl border-0 shadow-sm bg-[hsl(210,20%,97%)]">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-red-orange/15 to-brand-red-orange/5 flex items-center justify-center mb-4">
                    <Phone className="h-5 w-5 text-brand-red-orange" />
                  </div>
                  <h3 className="font-bold text-card-foreground mb-2">Have questions?</h3>
                  <p className="text-sm text-muted-foreground mb-4">Want to learn more about this topic or collaborate with us? Reach out.</p>
                  <Button asChild className="w-full rounded-full bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground border-0 shadow-glow-orange">
                    <Link to="/contact">Contact Us</Link>
                  </Button>
                </CardContent>
              </Card>

              {otherPosts.length > 0 && (
                <Card className="rounded-2xl border border-card-border">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-card-foreground mb-4 text-sm uppercase tracking-wider">More Articles</h3>
                    <div className="space-y-3">
                      {otherPosts.map(op => (
                        <Link key={op.id} to={`/blog/${op.slug}`} className="flex items-center gap-3 group">
                          <div className="h-8 w-8 rounded-lg bg-[hsl(214,95%,15%)]/10 flex items-center justify-center shrink-0">
                            <Star className="h-3.5 w-3.5 text-brand-red-orange" />
                          </div>
                          <span className="text-sm text-muted-foreground group-hover:text-brand-red-orange transition-colors font-medium">{op.title}</span>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MORE POSTS */}
      {otherPosts.length > 0 && (
        <section ref={moreSection.ref} className="bg-[hsl(210,20%,97%)] py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`text-center mb-14 ${moreSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
              <h2 className="text-3xl md:text-4xl font-bold text-[hsl(214,95%,15%)] mb-4">More Articles</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Continue reading from our blog</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {otherPosts.map((op, i) => (
                <Link key={op.id} to={`/blog/${op.slug}`} className="group">
                  <Card
                    className={`h-full border border-card-border hover:border-brand-red-orange/20 hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 rounded-2xl overflow-hidden ${moreSection.inView ? 'animate-fade-up' : 'opacity-0'}`}
                    style={{ animationDelay: `${(i + 1) * 100}ms` }}
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img src={op.featured_image || defaultFallback} alt={op.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                    <CardContent className="p-5">
                      <h3 className="text-base font-bold text-card-foreground mb-1 group-hover:text-brand-red-orange transition-colors">{op.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{op.excerpt}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA STRIP */}
      <section ref={ctaSection.ref} className="relative bg-[hsl(214,95%,12%)] py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-red-orange/10 via-transparent to-transparent" />
        <div className={`relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center ${ctaSection.inView ? 'animate-fade-up' : 'opacity-0'}`}>
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            Enjoyed this article? <span className="text-brand-red-orange-light">Let's connect</span>
          </h2>
          <p className="text-white/50 mb-8 max-w-xl mx-auto">Have ideas, feedback, or want to collaborate? We'd love to hear from you.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground border-0 shadow-glow-orange hover:shadow-lg px-8">
              <Link to="/contact">
                Contact Us <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="bg-transparent rounded-full border-white/20 text-white/80 hover:bg-white/10 hover:text-white px-8">
              <Link to="/blog">
                View All Posts
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default BlogPost;
