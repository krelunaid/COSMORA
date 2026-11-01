import { previewSignature } from '../lib/preview-token.ts';
import { applyReviewFixtureVisibility } from '../lib/server/review-fixture-visibility.ts';
import { isPublicProfileVisible } from '../lib/server/public-profile-visibility.ts';
import { readCommunityPostInteractions } from '../lib/server/community-post-interactions.ts';
import { getBlockedAuthorIds } from '../lib/server/blocked-content.ts';
import { getSupabaseAdmin, requireAuthenticatedUser, type Env } from '../lib/supabase/server.ts';

type FeedPost = {
  id: string;
  author_id: string;
  caption: string;
  country_code: string | null;
  language_code: string | null;
  created_at: string;
  link_label: string | null;
  link_url: string | null;
  post_categories: unknown;
  post_media: Array<{ id: string; storage_path: string; media_type: 'IMAGE' | 'VIDEO'; sort_order: number }>;
  saved_by?: unknown;
};

export async function GET(request: Request, env: Env) {
  const admin = getSupabaseAdmin(env);
  if (!admin)
    return Response.json(
      { error: 'Community non disponibile.' },
      { status: 503 },
    );
  const params = new URL(request.url).searchParams;
  const offset = Math.max(
    0,
    Math.min(10000, Number(params.get('offset')) || 0),
  );
  const auth = await requireAuthenticatedUser(request, env);
  const savedOnly = params.get('saved') === '1';
  if ((request.headers.has('authorization') || savedOnly) && !auth)
    return Response.json({ error: 'Accedi per continuare.' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  let query = admin
    .from('community_posts')
    .select(
      'id, author_id, caption, country_code, language_code, created_at, link_label, link_url, post_categories(label), post_media(id,storage_path,media_type,sort_order)' +
      (savedOnly ? ', saved_by:community_post_saves!inner(user_id)' : ''),
    )
    .eq('status', 'ACTIVE');
  // Inner join limits the main result set, before searching, sorting or paging.
  if (savedOnly && auth) query = query.eq('saved_by.user_id', auth.user.id);
  query = applyReviewFixtureVisibility(query, 'author_id', auth);
  if (params.get('q'))
    query = query.ilike(
      'caption',
      '%' + params.get('q')!.slice(0, 100).replace(/[%_]/g, '') + '%',
    );
  if (auth) {
    const blocks = await getBlockedAuthorIds(admin, auth.user.id);
    if (blocks.error)
      return Response.json(
        { error: 'Community non disponibile.' },
        { status: 503 },
      );
    if (blocks.ids.length)
      query = query.not('author_id', 'in', '(' + blocks.ids.join(',') + ')');
  }
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id')
    .range(offset, offset + 19);
  if (error)
    return Response.json(
      { error: 'Non è stato possibile caricare i post.' },
      { status: 503 },
    );
  const rows = (data ?? []) as unknown as FeedPost[];
  const ids = [...new Set(rows.map(row => row.author_id))];
  const profiles = ids.length
    ? await applyReviewFixtureVisibility(
        admin.from('profiles').select('id,display_name').eq('moderation_hidden', false).in('id', ids),
        'id',
        auth,
      )
    : { data: [], error: null };
  if (profiles.error)
    return Response.json(
      { error: 'Non è stato possibile caricare gli autori dei post.' },
      { status: 503 },
    );
  const interactions = await readCommunityPostInteractions(admin, auth?.user.id, rows.map((post) => post.id));
  if (interactions.error)
    return Response.json(
      { error: 'Non è stato possibile caricare i post. Riprova.' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    );
  const mediaItems = rows.flatMap(row => row.post_media.filter(item => item.media_type === 'IMAGE' && item.id));
  const previewRows = mediaItems.length
    ? await admin.from('community_media_previews').select('media_id,original_path').in('media_id',mediaItems.map(item => item.id))
    : {data:[],error:null};
  const previews = new Map<string,string>();
  if (!previewRows.error) for (const item of mediaItems) {
    if (!previewRows.data?.some(row => row.media_id === item.id && row.original_path === item.storage_path)) continue;
    const expires = Math.floor(Date.now()/1000)+3600;
    const signature = await previewSignature(env.SUPABASE_SERVICE_ROLE_KEY,item.id,expires);
    previews.set(item.id,env.SUPABASE_URL+'/functions/v1/cosmora-community/api/community/thumbnail?'+new URLSearchParams({id:item.id,expires:String(expires),signature}));
  }
  const posts = await Promise.all(
    rows.map(async (post) => {
      const authorProfile = profiles.data?.find((p) => p.id === post.author_id);
      const media = post.post_media.sort((a, b) => a.sort_order - b.sort_order);
      const urls = media.length
        ? await admin.storage.from('community-media').createSignedUrls(
            media.map((item) => item.storage_path),
            3600,
          )
        : { data: [] };
      return {
        ...post,
        link_label: null,
        link_url: null,
        author: authorProfile?.display_name || 'Utente COSMORA',
        author_profile_url: authorProfile && isPublicProfileVisible(authorProfile.id)
          ? '/profile/' + authorProfile.id
          : null,
        post_media: undefined,
        saved_by: undefined,
        liked: interactions.likedIds.has(post.id),
        saved: interactions.savedIds.has(post.id),
        media: media
          .map((item, index) => {
            const thumbnailUrl = previews.get(item.id) || null;
            return { type: item.media_type, url: urls.data?.[index]?.signedUrl || '', thumbnail_url: thumbnailUrl };
          })
          .filter((item) => item.url),
      };
    }),
  );
  return Response.json(
    { posts, hasMore: posts.length === 20, userId: auth?.user.id },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
