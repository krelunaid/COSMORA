/**
 * Original COSMORA editorial artwork, authored as SVG paths on 2026-10-03.
 * No source photographs, event logos, fictional characters, stock assets,
 * fonts, icon-library paths, raster embeds or network requests are used.
 * Run with Node to regenerate only public/editorial and public/events SVGs.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const editorial = path.join(root, 'public/editorial');
const eventsDirectory = path.join(root, 'public/events');
await mkdir(editorial, { recursive: true });
await mkdir(eventsDirectory, { recursive: true });
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// Each path below was drawn for this project; familiar objects are generic.
const icons = {
  cosplay: '<path d="M55 64Q100 30 145 64L137 102Q121 141 100 145Q79 141 63 102Z"/><path d="M66 77Q82 65 91 82Q79 94 68 83M109 82Q118 65 134 77L132 83Q121 94 109 82Z"/><path d="M90 118Q100 124 110 118M62 108L38 157Q66 166 80 149M138 108L162 157Q134 166 120 149"/>',
  manga: '<path d="M100 58Q64 34 29 48V143Q62 129 100 151Q138 129 171 143V48Q136 34 100 58Z"/><path d="M100 59V151M45 69Q66 64 85 76M45 89Q66 85 85 96M45 109Q66 106 85 116M115 76Q134 64 155 69M115 96Q134 85 155 89M115 116Q134 106 155 109"/>',
  figures: '<ellipse cx="100" cy="159" rx="54" ry="15"/><path d="M46 159V171Q100 194 154 171V159"/><circle cx="100" cy="49" r="23"/><path d="M74 78Q100 69 126 78L136 118L118 124L113 151M82 124L87 151M74 79L64 118L82 124M82 91V124H118V91M92 120L88 148M108 120L112 148"/>',
  cards: '<rect x="63" y="32" width="88" height="132" rx="13" transform="rotate(12 107 98)"/><rect x="45" y="38" width="88" height="132" rx="13" transform="rotate(-10 89 104)" fill="#311450"/><path d="M88 70L96 89L116 93L100 107L101 128L83 118L65 126L69 105L55 90L77 88Z"/><path d="M56 148L80 152M112 53L123 55"/>',
  gaming: '<path d="M56 68Q100 50 144 68Q164 79 173 126Q176 151 157 154Q143 155 127 128H73Q57 155 43 154Q24 151 27 126Q36 79 56 68Z"/><path d="M54 99H80M67 86V112M94 86H106"/><circle cx="133" cy="90" r="4"/><circle cx="147" cy="105" r="4"/>',
  artist: '<path d="M109 46L144 20L161 37L133 73L88 126L71 111Z"/><path d="M71 111Q50 103 44 130Q39 149 25 153Q78 171 88 126M109 46L133 73M55 148Q67 136 65 124"/><circle cx="143" cy="137" r="27"/><circle cx="134" cy="131" r="4"/><circle cx="149" cy="124" r="4"/><circle cx="155" cy="143" r="4"/>',
  crew: '<circle cx="100" cy="66" r="24"/><circle cx="45" cy="86" r="17"/><circle cx="155" cy="86" r="17"/><path d="M60 158V133Q60 103 100 103Q140 103 140 133V158M19 160V139Q19 117 45 117H52M181 160V139Q181 117 155 117H148"/><path d="M78 151H122M29 157H48M152 157H171"/>',
  meetup: '<rect x="30" y="48" width="140" height="119" rx="20"/><path d="M30 81H170M63 32V64M137 32V64"/><path d="M100 107C80 107 75 129 100 150C125 129 120 107 100 107Z"/><circle cx="100" cy="125" r="5"/>',
};
function icon(name, x, y, size) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + size / 200 + ')" fill="none" stroke="#f7eaff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#shadow)">' + icons[name] + '</g>';
}
function artwork(title, body, width = 600, height = 600, accent = '#bd4cff') {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + escape(title) + '">\n'
    + '<title>' + escape(title) + '</title><desc>Original abstract COSMORA editorial illustration; not a photograph or an official event logo.</desc>\n'
    + '<defs><linearGradient id="background" x2="1" y2="1"><stop stop-color="#101126"/><stop offset=".55" stop-color="#281344"/><stop offset="1" stop-color="#4e174b"/></linearGradient>'
    + '<radialGradient id="glow"><stop stop-color="' + accent + '" stop-opacity=".7"/><stop offset="1" stop-color="' + accent + '" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="line"><stop stop-color="#dba5ff"/><stop offset="1" stop-color="#ff73bd"/></linearGradient>'
    + '<filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#04010c" flood-opacity=".6"/></filter></defs>'
    + '<rect width="100%" height="100%" fill="url(#background)"/>'
    + '<ellipse cx="' + width * .67 + '" cy="' + height * .3 + '" rx="' + width * .57 + '" ry="' + height * .65 + '" fill="url(#glow)"/>'
    + '<path d="M0 ' + height * .88 + 'L' + width + ' ' + height * .23 + 'M0 ' + height * 1.02 + 'L' + width + ' ' + height * .37 + '" stroke="#f6b2f1" stroke-opacity=".08" stroke-width="1.5"/>'
    + '<g fill="#f3d9ff"><circle cx="' + width * .14 + '" cy="' + height * .2 + '" r="2.5"/><circle cx="' + width * .83 + '" cy="' + height * .17 + '" r="3"/><circle cx="' + width * .91 + '" cy="' + height * .76 + '" r="2"/><circle cx="' + width * .23 + '" cy="' + height * .79 + '" r="2"/></g>'
    + body + '\n</svg>\n';
}
const labels = { cosplay: 'Cosplay and accessories', manga: 'Comics and books', figures: 'Collectible figures', cards: 'Collectible cards', gaming: 'Video games', artist: 'Creators and artists' };
for (const [index, name] of Object.keys(labels).entries()) {
  const accent = index % 2 ? '#e74bad' : '#a95bff';
  const body = '<circle cx="300" cy="276" r="188" fill="#170f2e" fill-opacity=".32" stroke="#efc7ff" stroke-opacity=".13"/>'
    + '<ellipse cx="300" cy="445" rx="139" ry="23" fill="#050315" fill-opacity=".45"/>'
    + icon(name, 128, 100, 344)
    + '<path d="M480 78V108M465 93H495" stroke="#facaff" stroke-width="3" stroke-linecap="round"/>';
  await writeFile(path.join(editorial, 'category-' + name + '.svg'), artwork(labels[name], body, 600, 600, accent));
}
for (const name of ['crew', 'meetup']) {
  const body = '<circle cx="470" cy="220" r="181" fill="#211130" fill-opacity=".55" stroke="#f6b2ee" stroke-opacity=".13"/>' + icon(name, 302, 46, 330)
    + '<path d="M172 222H230M200 194V250M729 113H757M743 99V127" stroke="#e8bdff" stroke-width="4" stroke-linecap="round"/>';
  await writeFile(path.join(editorial, name + '.svg'), artwork(name === 'crew' ? 'Meet the COSMORA community' : 'Plan a community meetup', body, 940, 520));
}
const hero = '<g fill="none" stroke="url(#line)"><ellipse cx="818" cy="404" rx="320" ry="195" transform="rotate(-32 818 404)" stroke-width="3" opacity=".45"/><ellipse cx="818" cy="404" rx="365" ry="92" transform="rotate(29 818 404)" stroke-width="2" opacity=".35"/><circle cx="818" cy="404" r="140" stroke-width="2" opacity=".22"/></g>'
  + '<circle cx="818" cy="404" r="105" fill="#291944" stroke="#e8beff" stroke-width="2"/>'
  + '<path d="M862 344A76 76 0 1 0 862 463" fill="none" stroke="url(#line)" stroke-width="18" stroke-linecap="round"/>'
  + '<circle cx="1085" cy="274" r="13" fill="#ff8cd1"/><circle cx="524" cy="493" r="8" fill="#dbadff"/>'
  + '<path d="M967 119V158M948 139H986M639 629V653M627 641H651" stroke="#f7ceff" stroke-width="3" stroke-linecap="round"/>';
await writeFile(path.join(editorial, 'hero.svg'), artwork('COSMORA — a universe of shared interests', hero, 1200, 800));
await writeFile(path.join(root, 'public/favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>COSMORA</title><rect width="64" height="64" rx="16" fill="#171027"/><path d="M43 17A20 20 0 1 0 43 47" fill="none" stroke="#ed8bdf" stroke-width="7" stroke-linecap="round"/><circle cx="49" cy="12" r="3" fill="#c5a2ff"/></svg>\n');

const data = await readFile(path.join(root, 'lib/events-data.ts'), 'utf8');
const catalog = [...data.matchAll(/\{ name:'([^']+)'.*?type:'([^']+)'/g)].map((match) => ({ name: match[1], type: match[2] }));
const mappings = new Map([...data.matchAll(/'([^']+)':'\/events\/([^']+)'/g)].map((match) => [match[1], path.parse(match[2]).name]));
for (const [index, event] of catalog.entries()) {
  const filename = mappings.get(event.name);
  if (!filename) throw new Error('Missing editorial event path: ' + event.name);
  const emblem = event.type === 'Gaming' ? 'gaming' : event.type === 'Comics' || event.type === 'Anime' ? 'manga' : 'meetup';
  const body = '<circle cx="722" cy="352" r="260" fill="#221435" fill-opacity=".65" stroke="#efceff" stroke-opacity=".17"/>'
    + '<circle cx="722" cy="352" r="218" fill="none" stroke="#f1bcff" stroke-opacity=".1" stroke-dasharray="4 19" stroke-width="2"/>'
    + icon(emblem, 521, 135, 402)
    + '<path d="M340 149L411 185L340 221M1060 566H1112M1086 540V592" fill="none" stroke="#efb4ff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<circle cx="324" cy="598" r="13" fill="#f883ca"/><circle cx="1085" cy="205" r="7" fill="#dab6ff"/>';
  await writeFile(path.join(eventsDirectory, filename + '.svg'), artwork('COSMORA editorial graphic for ' + event.name, body, 1200, 800, index % 2 ? '#c853dc' : '#9158ea'));
}
console.log('Original SVG editorial assets generated: 9 general covers and ' + catalog.length + ' event covers.');
