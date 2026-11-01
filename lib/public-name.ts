/** Public nicknames only: legal names and private authentication data stay separate. */
export function normalizePublicName(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
}
export function validPublicName(value: string): boolean {
  const name = normalizePublicName(value);
  // Count Unicode code points, matching PostgreSQL char_length.
  const length = Array.from(name).length;
  return length >= 2 && length <= 80 && !/[\p{Cc}\p{Cf}]/u.test(name);
}
export function isPublicNameConflict(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === '23505' && !!error.message?.includes('profiles_public_name_unique');
}
export const PUBLIC_NAME_TAKEN = 'Nome già in uso. Aggiungi qualcosa o scegli un altro nome.';
