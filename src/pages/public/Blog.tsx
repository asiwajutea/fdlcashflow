import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import PublicLayout from '@/components/PublicLayout';
import { db } from '@/lib/supabase-db';
import { format } from 'date-fns';

const Blog = () => {
  const [posts, setPosts] = useState<any[]>([]);
  useEffect(() => {
    db.from('blog_posts').select('*').eq('status', 'published').order('published_at', { ascending: false }).then((r: any) => setPosts(r.data || []));
  }, []);

  return (
    <PublicLayout>
      <section className="bg-[hsl(214,95%,15%)] py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Blog</h1>
          <p className="text-[hsl(0,0%,75%)] text-lg">Insights, stories, and updates from our team</p>
        </div>
      </section>
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          {posts.length === 0 ? (
            <p className="text-center text-[hsl(210,15%,40%)] py-8">No blog posts yet. Stay tuned!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(post => (
                <Link key={post.id} to={`/blog/${post.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    {post.featured_image && (
                      <div className="aspect-video overflow-hidden rounded-t-lg">
                        <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <p className="text-xs text-[hsl(210,15%,55%)] mb-2">
                        {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : ''}
                      </p>
                      <h3 className="text-lg font-semibold text-[hsl(214,95%,15%)] mb-2">{post.title}</h3>
                      <p className="text-sm text-[hsl(210,15%,40%)] line-clamp-3">{post.excerpt}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default Blog;
