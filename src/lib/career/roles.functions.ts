import { createServerFn } from '@tanstack/react-start';
import { queryOptions } from '@tanstack/react-query';
import { weeklyIndex } from './logic';
export type DesignRole = { id: string; title: string; company: string; location: string; url: string; description: string };
export const getWeeklyRoles = createServerFn({ method: 'GET' }).handler(async () => {
  const boards = [{ id: 'harvey', name: 'Harvey' }, { id: 'Headway', name: 'Headway' }, { id: 'openloophealth', name: 'OpenLoop Health' }];
  const results = await Promise.allSettled(boards.map(async board => {
    const response = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${board.id}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('The public job feed is unavailable.');
    const body = await response.json() as { jobs?: { id: string; title: string; location: string; jobUrl: string; descriptionPlain: string; isListed: boolean }[] };
    return (body.jobs ?? []).filter(j => j.isListed && /product design|ux design|design systems/i.test(j.title) && !/recruit|engineer/i.test(j.title) && j.jobUrl.startsWith('https://jobs.ashbyhq.com/')).map(j => ({ id: j.id, title: j.title, company: board.name, location: j.location, url: j.jobUrl, description: j.descriptionPlain }));
  }));
  const now = new Date();
  const roles = results.flatMap(result => {
    if (result.status !== 'fulfilled' || !result.value.length) return [];
    const sorted = result.value.sort((a, b) => a.id.localeCompare(b.id));
    const role = sorted[weeklyIndex(now, sorted.length)];
    return role ? [role] : [];
  });
  return { roles, checkedAt: now.toISOString(), unavailableFeeds: results.filter(r => r.status === 'rejected').length };
});
export const weeklyRolesQuery = () => queryOptions({ queryKey: ['weekly-design-roles'], queryFn: () => getWeeklyRoles(), staleTime: 300000 });
