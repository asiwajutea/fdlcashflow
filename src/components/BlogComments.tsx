import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
  user_id: string | null;
}

const BlogComments = ({ postId }: { postId: string }) => {
  const { user, fullName } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (fullName) setName(fullName);
    if (user?.email) setEmail(user.email);
  }, [fullName, user]);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('blog_comments')
      .select('id, author_name, body, created_at, user_id')
      .eq('post_id', postId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    setComments((data as Comment[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('comments-' + postId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blog_comments', filter: `post_id=eq.${postId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any).from('blog_comments').insert({
      post_id: postId,
      user_id: user?.id || null,
      author_name: name.trim(),
      author_email: email.trim() || null,
      body: body.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error('Could not post comment: ' + error.message);
      return;
    }
    setBody('');
    toast.success('Comment posted');
  };

  return (
    <section className="mt-12 pt-8 border-t border-card-border">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="h-5 w-5 text-brand-red-orange" />
        <h3 className="text-lg font-bold text-card-foreground">
          Comments {comments.length > 0 && <span className="text-muted-foreground font-normal">({comments.length})</span>}
        </h3>
      </div>

      <form onSubmit={submit} className="space-y-3 mb-8 p-4 rounded-xl bg-[hsl(210,20%,97%)] border border-card-border">
        {!user && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Your name *" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input type="email" placeholder="Your email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        )}
        <Textarea
          placeholder="Share your thoughts on this post…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          required
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting} className="rounded-full bg-gradient-to-r from-brand-red-orange to-brand-red-orange-dark text-primary-foreground border-0">
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Post Comment
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading comments…</div>
      ) : comments.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Be the first to comment!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 p-4 rounded-xl bg-card border border-card-border">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-brand-red-orange/10 text-brand-red-orange text-sm font-semibold">
                  {c.author_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="font-semibold text-card-foreground text-sm">{c.author_name}</p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</p>
                </div>
                <p className="text-sm text-foreground/85 mt-1 whitespace-pre-wrap">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default BlogComments;
