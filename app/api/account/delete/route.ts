import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/supabase/server';

export async function DELETE(request: Request) {
  const auth = await requireAuthenticatedUser(request, true);
  if (!auth) return NextResponse.json({ error: 'Accedi per eliminare il tuo account.' }, { status: 401 });
  const input = await request.json().catch(() => null);
  if (!input || typeof input !== 'object' || !('confirmation' in input) || input.confirmation !== 'ELIMINA') return NextResponse.json({ error: 'Scrivi ELIMINA per confermare.' }, { status: 400 });
  const { admin, user } = auth;
  // Never accept a target user ID from the caller.
  const participants = `buyer_id.eq.${user.id},seller_id.eq.${user.id}`;
  const live = await admin.from('marketplace_orders').select('id').or(participants).eq('is_test', false).limit(1);
  if (live.error) return NextResponse.json({ error: 'Verifica dei dati non riuscita. Nessun dato è stato eliminato.' }, { status: 503 });
  if (live.data.length) return NextResponse.json({ error: 'Sono presenti operazioni reali da gestire. Contatta info@kreluna.it con oggetto [COSMORA] Eliminazione account per completare la richiesta.' }, { status: 409 });

  // A failed attempt is resumable; other app mutations reject this account.
  const pending = await admin.auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, deletion_pending: true } });
  if (pending.error) return NextResponse.json({ error: 'Impossibile avviare l’eliminazione. Riprova.' }, { status: 503 });
  try {
    // Storage paths are exclusively rooted in the authenticated UUID. Listing
    // from offset zero after each removal also covers orphaned upload files.
    for (const bucket of ['listing-images', 'community-media']) {
      const storage = admin.storage.from(bucket);
      async function clearFolder(prefix: string, depth = 0): Promise<void> {
        if (depth > 10 || !prefix.startsWith(user.id + '/')) throw new Error('Invalid storage prefix');
        for (let page = 0; page < 100; page++) {
          const listed = await storage.list(prefix, { limit: 100, offset: 0 });
          if (listed.error) throw listed.error;
          if (!listed.data.length) return;
          const files: string[] = [];
          for (const entry of listed.data) {
            if (entry.name.includes('/') || entry.name === '..' || entry.name === '.') throw new Error('Invalid object');
            const key = prefix + entry.name;
            if (entry.id) files.push(key);
            else await clearFolder(key + '/', depth + 1);
          }
          if (files.length) {
            const removed = await storage.remove(files);
            if (removed.error) throw removed.error;
          }
        }
        throw new Error('Continue cleanup on retry');
      }
      await clearFolder(user.id + '/');
    }
    const slots = await admin.from('squad_character_slots').update({ assigned_user_id: null }).eq('assigned_user_id', user.id);
    if (slots.error) throw slots.error;
    const moderation = await admin.from('moderation_actions').update({ moderator_id: null }).eq('moderator_id', user.id);
    if (moderation.error) throw moderation.error;
    const orders = await admin.from('marketplace_orders').delete().or(participants).eq('is_test', true);
    if (orders.error) throw orders.error;
    const token = request.headers.get('authorization')!.slice(7);
    const revoked = await admin.auth.admin.signOut(token, 'global');
    if (revoked.error) throw revoked.error;
    // FK cascades remove profile, seller details, posts, listings, messages,
    // memberships and owned crews. Storage must be cleared first.
    const deleted = await admin.auth.admin.deleteUser(user.id);
    if (deleted.error) throw deleted.error;
    return NextResponse.json({ deleted: true, appleManualRevocation: user.identities?.some((identity) => identity.provider === 'apple') ?? false }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Eliminazione non completata. Alcuni dati potrebbero essere già stati rimossi. Riprova da questa pagina; se il problema continua scrivi a info@kreluna.it con oggetto [COSMORA] Eliminazione account.' }, { status: 503 });
  }
}
