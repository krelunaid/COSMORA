import { isModerationRole } from '@/lib/moderation';
import { requireAuthenticatedUser } from '@/lib/supabase/server';

export async function requireModerator(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  return auth && isModerationRole(auth.user.app_metadata?.cosmora_role) ? auth : null;
}
