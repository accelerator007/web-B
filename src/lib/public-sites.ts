import 'server-only';
import { unstable_cache } from 'next/cache';
import { db } from './supabase';
import type { AvailableSiteRow } from './types';

export const PUBLIC_SITES_CACHE_TAG = 'public-available-sites';

/**
 * Public listings change infrequently. Caching this query avoids a Supabase
 * round trip on every visit while admin actions invalidate it immediately.
 */
export const getPublishedSites = unstable_cache(
  async (): Promise<AvailableSiteRow[]> => {
    const { data, error } = await db()
      .from('available_sites')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as AvailableSiteRow[];
  },
  ['published-available-sites'],
  { revalidate: 300, tags: [PUBLIC_SITES_CACHE_TAG] }
);
