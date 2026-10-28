import fs from 'node:fs/promises';
import path from 'node:path';
import { privacyMessages, PRIVACY_UPDATED_AT } from '../lib/i18n/privacy.ts';

const target = process.argv[2];
if (!target) throw new Error('Usage: node --experimental-strip-types scripts/export-privacy.mjs <output-directory>');
const root = path.resolve(target);
const escape = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const locales = ['it', 'en', 'fr', 'de', 'es'];
const providerHeadings = { it:'Informazioni dei fornitori', en:'Provider information', fr:'Informations des prestataires', de:'Informationen der Anbieter', es:'Información de los proveedores' };
const names = { it:'Italiano', en:'English', fr:'Français', de:'Deutsch', es:'Español' };
const providers = [
 ['Supabase','https://supabase.com/privacy'],
 ['Supabase: subprocessors','https://supabase.com/legal/customer-resources/subprocessor-list'],
 ['Cloudflare','https://www.cloudflare.com/privacypolicy/'],
 ['Aruba','https://www.aruba.it/informativa_arubaspa.pdf'],
 ['Apple','https://www.apple.com/legal/privacy/'],
 ['Google / Firebase','https://firebase.google.com/support/privacy'],
 ['OpenStreetMap','https://osmfoundation.org/wiki/Privacy_Policy'],
 ['Stripe','https://stripe.com/privacy'],
];
for (const locale of locales) {
 const copy = privacyMessages[locale];
 const suffix = locale === 'it' ? '' : locale + '/';
 const canonical = 'https://software.kreluna.it/cosmora/privacy/' + suffix;
 const nav = locales.map(l => `<a lang="${l}" hreflang="${l}" href="/cosmora/privacy/${l === 'it' ? '' : l + '/'}"${l === locale ? ' aria-current="page"' : ''}>${names[l]}</a>`).join('');
 const sections = copy.sections.map(([heading, body], index) => `<section id="section-${index+1}"><h2>${escape(heading)}</h2><p>${escape(body)}</p></section>`).join('\n');
 const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(copy.heading)} — COSMORA</title><meta name="robots" content="noindex,follow"><meta name="description" content="${escape(copy.heading)} — COSMORA, Kreluna Software"><meta name="privacy-version" content="${PRIVACY_UPDATED_AT}"><link rel="canonical" href="${canonical}">${locales.map(l=>`<link rel="alternate" hreflang="${l}" href="https://software.kreluna.it/cosmora/privacy/${l==='it'?'':l+'/'}">`).join('')}<style>html{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0b0a19;color:#f7f3fc;font:17px/1.7 system-ui,sans-serif}main{max-width:850px;margin:auto;padding:32px 22px 72px}nav{display:flex;flex-wrap:wrap;gap:10px 20px;margin:18px 0 32px}a{color:#e7b6f9;text-underline-offset:3px}a:focus-visible{outline:2px solid #e7b6f9;outline-offset:4px}h1{font-size:clamp(28px,6vw,42px);line-height:1.2}h2{font-size:22px;line-height:1.35;margin:32px 0 8px}p{margin:0 0 18px}.brand{letter-spacing:.12em;font-weight:800}.updated{color:#c8bbd5;font-size:15px}nav [aria-current]{font-weight:800;text-decoration:none}</style></head><body><main><p class="brand">COSMORA · Kreluna Software</p><nav aria-label="Languages">${nav}</nav><h1>${escape(copy.heading)}</h1><p class="updated"><time datetime="${PRIVACY_UPDATED_AT}">${escape(copy.updated)}</time></p>${sections}<section><h2>${providerHeadings[locale]}</h2><ul>${providers.map(([name,url])=>`<li><a href="${url}" rel="noreferrer">${escape(name)}</a></li>`).join('')}</ul></section><p><a href="mailto:info@kreluna.it?subject=%5BCOSMORA%5D%20Privacy">${escape(copy.contact)}</a></p><p><a href="https://cosmora.kreluna.it/account/delete">${escape(copy.deleteAccount)}</a></p><p><a href="https://www.garanteprivacy.it/">${escape(copy.authority)}</a></p></main></body></html>`;
 const dest = path.join(root, suffix, 'index.html');
 await fs.mkdir(path.dirname(dest),{recursive:true});
 await fs.writeFile(dest,html+'\n');
}
console.log(`Exported ${locales.length} notices, version ${PRIVACY_UPDATED_AT}`);
