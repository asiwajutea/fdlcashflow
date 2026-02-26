import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PublicLayout from '@/components/PublicLayout';
import { db } from '@/lib/supabase-db';
import { format } from 'date-fns';

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<any>(null);

  useEffect(() => {
    db.from('blog_posts').select('*').eq('slug', slug).maybeSingle().then((r: any) => setPost(r.data));
  }, [slug]);

  if (!post) return <PublicLayout><div className="py-20 text-center text-[hsl(210,15%,40%)]">Loading...</div></PublicLayout>;

  return (
    <PublicLayout>
      <section className="bg-[hsl(214,95%,15%)] py-16">
        <div className="max-w-7xl mx-auto px-4">
          <Link to="/blog" className="inline-flex items-center text-[hsl(28,100%,55%)] hover:underline mb-4 text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Blog
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{post.title}</h1>
          {post.published_at && (
            <p className="text-[hsl(0,0%,70%)] mt-2">{format(new Date(post.published_at), 'MMMM d, yyyy')}</p>
          )}
        </div>
      </section>
      <section className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-4 prose prose-lg">
          {post.featured_image && <img src={post.featured_image} alt={post.title} className="rounded-lg mb-8 w-full" />}
          <div dangerouslySetInnerHTML={{ __html: post.body }} />
        </div>
      </section>
    </PublicLayout>
  );
};

export default BlogPost;
