import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Bookmark, BookmarkCheck, Copy, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CareerNav } from '@/components/CareerNav';
import { q, must } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import { careerQueries } from '@/lib/career/db';
import { filterBullets } from '@/lib/career/content';
import { careerHead } from '@/lib/career/meta';
import { FTI_DIMENSIONS, LEVELS } from '@/lib/scoring';
export const Route = createFileRoute('/swipe-file')({ head: () => careerHead('Design bullet library', '128 Product & UX resume formulas, organized by dimension and career level. Save your favorites and add your own facts.'), component: SwipeFile });
function SwipeFile() {
  const [search, setSearch] = useState(''); const [dimension, setDimension] = useState(''); const [level, setLevel] = useState(''); const [savedOnly, setSavedOnly] = useState(false); const [saving, setSaving] = useState(''); const [signin, setSignin] = useState(false);
  const { data: me } = useQuery(q.me()); const client = useQueryClient();
  const { data: saved = [], error } = useQuery({ ...careerQueries.bookmarks(me?.id ?? ''), enabled: !!me });
  const items = filterBullets(search, dimension, level, savedOnly, saved);
  const toggle = async (id: string) => {
    if (!me) { setSignin(true); return; } setSaving(id);
    try { if (saved.includes(id)) must(await supabase.from('design_bookmarks').delete().eq('user_id', me.id).eq('bullet_id', id)); else must(await supabase.from('design_bookmarks').insert({ user_id: me.id, bullet_id: id })); await client.invalidateQueries({ queryKey: ['career-bookmarks', me.id] }); }
    catch(e) { toast.error((e as Error).message); } finally { setSaving(''); }
  };
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast.success('Formula copied'); } catch { toast.error('Could not copy the formula'); } };
  return <div className="space-y-8"><CareerNav /><header className="space-y-3"><p className="text-sm font-medium text-primary">THE DESIGN SWIPE FILE · 128 FORMULAS</p><h1 className="text-4xl">Make your work worth reading.</h1><p className="max-w-2xl text-muted-foreground">A starting point for your next application, review or promotion. Replace every bracket with your own true facts.</p></header>
    <div className="flex flex-wrap items-end gap-3 border-y py-4"><label className="relative min-w-0 basis-full md:basis-64 md:flex-1"><span className="sr-only">Search formulas</span><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input className="w-full rounded-md border bg-card py-2.5 pl-9 pr-3 text-sm" placeholder="Search onboarding, research, leadership…" value={search} onChange={e => setSearch(e.target.value)} /></label>
      <label className="space-y-1 text-xs text-muted-foreground">Dimension<select aria-label="Dimension" className="block max-w-full rounded-md border bg-card p-2 text-sm text-foreground" value={dimension} onChange={e => setDimension(e.target.value)}><option value="">All 8 dimensions</option>{FTI_DIMENSIONS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      <label className="space-y-1 text-xs text-muted-foreground">Career level<select className="block max-w-full rounded-md border bg-card p-2 text-sm text-foreground" value={level} onChange={e => setLevel(e.target.value)}><option value="">All levels</option>{LEVELS.map(l => <option key={l}>{l}</option>)}</select></label>
      <Button variant={savedOnly ? 'default' : 'outline'} onClick={() => setSavedOnly(!savedOnly)} aria-pressed={savedOnly}><Bookmark />Saved ({saved.length})</Button></div>
    {signin && <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-primary pl-4 text-sm"><p>Sign in to keep your favorites across devices.</p><Button asChild size="sm"><Link to="/auth" search={{ mode: 'signin', redirect: '/swipe-file' }}>Sign in</Link></Button></div>}
    {error && <p role="alert" className="text-sm text-destructive">Your saved bullets could not be loaded. Please refresh.</p>}
    <p className="text-xs text-muted-foreground">{items.length} formulas{savedOnly && ' in your collection'}</p>
    {!items.length && <div className="py-12 text-center"><Bookmark className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><h2 className="text-lg">{savedOnly ? 'Your collection starts here' : 'No matching formulas'}</h2><Button variant="ghost" className="mt-3" onClick={() => { setSearch(''); setDimension(''); setLevel(''); setSavedOnly(false); }}>Browse all formulas</Button></div>}
    <div className="grid gap-4 md:grid-cols-2">{items.map(b => <article key={b.id} className="flex flex-col gap-4 rounded-lg border bg-card p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-primary">{b.dimensionName}</p><h2 className="mt-1 text-lg">{b.title}</h2></div><Button size="icon" variant="ghost" disabled={saving === b.id} aria-label={`${saved.includes(b.id) ? 'Remove saved' : 'Save'} ${b.id}`} title={saved.includes(b.id) ? 'Remove bookmark' : 'Save formula'} onClick={() => toggle(b.id)}>{saved.includes(b.id) ? <BookmarkCheck className="text-primary" /> : <Bookmark />}</Button></div><p className="flex-1 text-sm leading-relaxed">{b.text}</p><div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"><span className="text-xs text-muted-foreground">{b.level}</span><Button size="sm" variant="ghost" onClick={() => copy(b.text)}><Copy />Copy formula</Button></div></article>)}</div>
  </div>;
}
