const encoder = new TextEncoder();
async function key(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode('COSMORA preview v1:' + secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign','verify']);
}
export async function previewSignature(secret: string, id: string, expiry: number) {
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(id + ':' + expiry)));
  return Array.from(bytes, b => b.toString(16).padStart(2,'0')).join('');
}
export async function validPreviewToken(secret: string, id: string, expiry: number, signature: string, now = Date.now()) {
  if (!/^[0-9a-f-]{36}$/.test(id) || !Number.isSafeInteger(expiry) || expiry <= now/1000 || expiry > now/1000 + 3700 || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const bytes = Uint8Array.from(signature.match(/../g)!, h => parseInt(h,16));
  return crypto.subtle.verify('HMAC', await key(secret), bytes, encoder.encode(id + ':' + expiry));
}
