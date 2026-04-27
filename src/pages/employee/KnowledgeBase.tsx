import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Search, BookOpen, Pin, Clock, ArrowRight, Rocket, Users, Laptop, MapPin,
  Wallet, Building2, FileText, Sparkles, Filter
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  BookOpen, Rocket, Users, Laptop, MapPin, Wallet, Building2, FileText, Sparkles,
};

interface Category { id: string; name: string; slug: string; description: string; icon: string; }
interface Article {
  id: string; title: string; slug: string; summary: string; category_id: string | null;
  department_id: string | null; tags: any; is_pinned: boolean; updated_at: string; view_count: number;
}

const KnowledgeBase = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [userDept, setUserDept] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [catsRes, artsRes, profileRes] = await Promise.all([
        (supabase as any).from('kb_categories').select('*').eq('is_active', true).order('display_order'),
        (supabase as any).from('kb_articles').select('*').eq('status', 'published').order('updated_at', { ascending: false }),
        user ? (supabase as any).from('profiles').select('department_id').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setCategories(catsRes.data || []);
      setArticles(artsRes.data || []);
      setUserDept(profileRes.data?.department_id || null);
      // counts per category
      const c: Record<string, number> = {};
      (artsRes.data || []).forEach((a: Article) => {
        if (a.category_id) c[a.category_id] = (c[a.category_id] || 0) + 1;
      });
      setCounts(c);
    })();
  }, [user]);

  // Debounced smart search
  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); setShowResults(false); return; }
    setSearching(true);
    setShowResults(true);
    const t = setTimeout(async () => {
      const q = query.trim();
      const { data } = await (supabase as any)
        .from('kb_articles')
        .select('id, title, slug, summary, category_id, department_id, tags, is_pinned, updated_at, view_count')
        .eq('status', 'published')
        .or(`title.ilike.%${q}%,summary.ilike.%${q}%,body.ilike.%${q}%`)
        .limit(10);
      setSearchResults(data || []);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const visibleArticles = useMemo(() => {
    if (scope === 'all') return articles;
    return articles.filter(a => !a.department_id || a.department_id === userDept);
  }, [articles, scope, userDept]);

  const pinned = visibleArticles.filter(a => a.is_pinned).slice(0, 3);
  const recent = visibleArticles.slice(0, 6);

  const getIcon = (name: string) => {
    const I = ICON_MAP[name] || (LucideIcons as any)[name] || BookOpen;
    return I;
  };

  const openArticle = (slug: string) => navigate(`/knowledge-base/${slug}`);

  return (
    <DashboardLayout title="Knowledge Base">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero / search */}
        <div className="text-center py-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl px-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">How can we help you?</h1>
          <p className="text-muted-foreground mb-6">Search guides, policies, and resources across every department.</p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 150)}
              placeholder="Search e.g. leave policy, expense report, onboarding..."
              className="pl-12 h-14 text-base shadow-md"
            />
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-lg shadow-xl z-20 text-left max-h-96 overflow-y-auto">
                {searching && <div className="p-4 text-sm text-muted-foreground">Searching...</div>}
                {!searching && searchResults.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">No matching articles found.</div>
                )}
                {!searching && searchResults.map(r => (
                  <button
                    key={r.id}
                    onMouseDown={() => openArticle(r.slug)}
                    className="w-full text-left p-3 hover:bg-accent border-b last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-foreground">{r.title}</div>
                    {r.summary && <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{r.summary}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {userDept && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Button variant={scope === 'mine' ? 'default' : 'outline'} size="sm" onClick={() => setScope('mine')}>
                My department
              </Button>
              <Button variant={scope === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setScope('all')}>
                All departments
              </Button>
            </div>
          )}
        </div>

        {/* Pinned */}
        {pinned.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Pin className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Featured</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pinned.map(a => (
                <Card key={a.id} className="hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5" onClick={() => openArticle(a.slug)}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-start gap-2">
                      <Pin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{a.title}</span>
                    </CardTitle>
                  </CardHeader>
                  {a.summary && <CardContent className="text-sm text-muted-foreground line-clamp-2">{a.summary}</CardContent>}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Browse by category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => {
              const Icon = getIcon(cat.icon);
              return (
                <Card key={cat.id} className="hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
                  onClick={() => navigate(`/knowledge-base?category=${cat.slug}`)}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{cat.name}</h3>
                        {cat.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{cat.description}</p>}
                        <Badge variant="secondary" className="mt-2 text-xs">{counts[cat.id] || 0} articles</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recently updated */}
        {recent.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Recently updated</h2>
            </div>
            <Card>
              <CardContent className="p-0 divide-y">
                {recent.map(a => (
                  <button key={a.id} onClick={() => openArticle(a.slug)}
                    className="w-full text-left flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{a.title}</div>
                      {a.summary && <div className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{a.summary}</div>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground ml-3">
                      <span className="hidden sm:inline">{new Date(a.updated_at).toLocaleDateString()}</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {visibleArticles.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-foreground">No articles yet</p>
              <p className="text-sm">Articles published by your administrators will appear here.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default KnowledgeBase;
