import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Clock, Eye, Tag, Paperclip } from 'lucide-react';

interface Article {
  id: string; title: string; slug: string; summary: string; body: string;
  category_id: string | null; tags: any; cover_image: string;
  attachments: any; updated_at: string; view_count: number;
}

const renderMarkdown = (text: string) => {
  if (!text) return '';
  // Minimal markdown: headings, bold, italic, links, code, lists, paragraphs
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let html = escape(text);
  html = html
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-sm">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary underline">$1</a>')
    .replace(/^- (.*)$/gim, '<li class="ml-5 list-disc">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br/>');
  return `<p class="mb-3">${html}</p>`;
};

const KBArticlePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<Article[]>([]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('kb_articles').select('*').eq('slug', slug).eq('status', 'published').maybeSingle();
      if (error || !data) { setArticle(null); setLoading(false); return; }
      setArticle(data);
      // Increment view count (best-effort)
      (supabase as any).from('kb_articles').update({ view_count: (data.view_count || 0) + 1 }).eq('id', data.id).then(() => {});
      // Related by category
      if (data.category_id) {
        const { data: rel } = await (supabase as any)
          .from('kb_articles').select('id, title, slug, summary, category_id, tags, updated_at, view_count, body, cover_image, attachments')
          .eq('status', 'published').eq('category_id', data.category_id).neq('id', data.id).limit(4);
        setRelated(rel || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <DashboardLayout title="Knowledge Base"><div className="text-center py-10 text-muted-foreground">Loading...</div></DashboardLayout>;

  if (!article) {
    return (
      <DashboardLayout title="Article not found">
        <div className="max-w-2xl mx-auto text-center py-10">
          <p className="text-muted-foreground mb-4">This article doesn't exist or you don't have access.</p>
          <Button onClick={() => navigate('/knowledge-base')}>Back to Knowledge Base</Button>
        </div>
      </DashboardLayout>
    );
  }

  const tags: string[] = Array.isArray(article.tags) ? article.tags : [];
  const attachments: any[] = Array.isArray(article.attachments) ? article.attachments : [];

  return (
    <DashboardLayout title={article.title}>
      <div className="max-w-3xl mx-auto">
        <Link to="/knowledge-base" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Knowledge Base
        </Link>

        {article.cover_image && (
          <img src={article.cover_image} alt={article.title} className="w-full h-56 object-cover rounded-lg mb-6" />
        )}

        <h1 className="text-3xl font-bold text-foreground mb-2">{article.title}</h1>
        {article.summary && <p className="text-lg text-muted-foreground mb-4">{article.summary}</p>}

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6 pb-6 border-b">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Updated {new Date(article.updated_at).toLocaleDateString()}</span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {article.view_count} views</span>
        </div>

        <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }} />

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t">
            <Tag className="h-4 w-4 text-muted-foreground" />
            {tags.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Paperclip className="h-4 w-4" /> Attachments</h3>
            <div className="space-y-1">
              {attachments.map((a: any, i: number) => (
                <a key={i} href={a.url} target="_blank" rel="noopener" className="block text-sm text-primary hover:underline">
                  {a.name || a.url}
                </a>
              ))}
            </div>
          </div>
        )}

        {related.length > 0 && (
          <div className="mt-10 pt-6 border-t">
            <h3 className="font-semibold text-foreground mb-3">Related articles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {related.map(r => (
                <Card key={r.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate(`/knowledge-base/${r.slug}`)}>
                  <CardContent className="p-3">
                    <div className="font-medium text-sm text-foreground">{r.title}</div>
                    {r.summary && <div className="text-xs text-muted-foreground line-clamp-1 mt-1">{r.summary}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default KBArticlePage;
