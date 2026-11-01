import { z } from 'zod';
import { requireAuthenticatedUser, type Env } from '../lib/supabase/server.ts';
import { getBlockedAuthorIds } from '../lib/server/blocked-content.ts';
import { applyReviewFixtureVisibility } from '../lib/server/review-fixture-visibility.ts';
import { communityInteractionTables } from '../lib/server/community-post-interactions.ts';

const schema = z
  .object({
    postId: z.uuid(),
    action: z.enum(['like', 'save']),
    active: z.boolean(),
  })
  .strict();

const headers = { 'Cache-Control': 'private, no-store' };

export async function PUT(request: Request, env: Env) {
  const auth = await requireAuthenticatedUser(request, env);
  if (!auth)
    return Response.json(
      { error: 'Accedi per continuare.' },
      { status: 401, headers },
    );
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return Response.json(
      { error: 'Operazione non valida.' },
      { status: 400, headers },
    );

  const { postId, action, active } = input.data;
  const blocks = await getBlockedAuthorIds(auth.admin, auth.user.id);
  if (blocks.error)
    return Response.json(
      { error: 'Post non disponibile. Riprova.' },
      { status: 503, headers },
    );

  let query = applyReviewFixtureVisibility(
    auth.admin
      .from('community_posts')
      .select('id,author_id')
      .eq('id', postId)
      .eq('status', 'ACTIVE'),
    'author_id',
    auth,
  );
  if (blocks.ids.length)
    query = query.not('author_id', 'in', '(' + blocks.ids.join(',') + ')');
  const post = await query.maybeSingle();
  if (post.error)
    return Response.json(
      { error: 'Post non disponibile. Riprova.' },
      { status: 503, headers },
    );
  if (!post.data)
    return Response.json(
      { error: 'Post non disponibile.' },
      { status: 404, headers },
    );

  // The verified token supplies the owner. Clients can never choose another user.
  // PUT expresses a desired state, so retries cannot toggle or duplicate a record.
  const table = communityInteractionTables[action];
  const result = active
    ? await auth.admin
        .from(table)
        .upsert(
          { user_id: auth.user.id, post_id: postId },
          { onConflict: 'user_id,post_id', ignoreDuplicates: true },
        )
    : await auth.admin
        .from(table)
        .delete()
        .eq('user_id', auth.user.id)
        .eq('post_id', postId);
  if (result.error)
    return Response.json(
      { error: 'Operazione non riuscita. Riprova.' },
      { status: 503, headers },
    );
  return Response.json({ postId, action, active }, { headers });
}
