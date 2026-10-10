const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('/Users/andreagadducci/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');

const source = '/Users/andreagadducci/Documents/Codex/2026-09-27/l-x20/work/COSMORA/public';
const output = __dirname;
const image = async (relative) => `data:image/png;base64,${(await fs.readFile(path.join(source, relative))).toString('base64')}`;
const categories = [
  {file:'category-cosplay-v2.png', label:'Cosplay'},
  {file:'category-manga-v2.png', label:'Manga e fumetti'},
  {file:'category-figures-v2.png', label:'Action figure'},
  {file:'category-cards-v2.png', label:'Carte collezionabili'},
  {file:'category-gaming-v2.png', label:'Videogiochi'},
  {file:'category-artist-v2.png', label:'Persone e venditori'},
];

async function main() {
  await sharp(path.join(source, 'brand/cosmora-app-icon.png')).resize(512,512).removeAlpha().png().toFile(path.join(output,'cosmora-icon-512.png'));
  const logo = await image('brand/cosmora-app-icon.png');
  const tiles = [];
  for (let index = 0; index < categories.length; index++) {
    const item = categories[index];
    const x = 528 + (index % 3) * 156;
    const y = 48 + Math.floor(index / 3) * 208;
    tiles.push(`<g clip-path="url(#tile${index})"><image x="${x}" y="${y}" width="144" height="194" preserveAspectRatio="xMidYMid slice" href="${await image(`editorial/${item.file}`)}"/><rect x="${x}" y="${y+130}" width="144" height="64" fill="url(#shade)"/><text x="${x+12}" y="${y+177}" font-size="${item.label.length > 15 ? 12 : 14}" font-weight="600" fill="#fff">${item.label}</text></g><rect x="${x}" y="${y}" width="144" height="194" rx="18" fill="none" stroke="#fff" stroke-opacity=".17"/>`);
  }
  const clips = categories.map((_, index) => `<clipPath id="tile${index}"><rect x="${528+(index%3)*156}" y="${48+Math.floor(index/3)*208}" width="144" height="194" rx="18"/></clipPath>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="background" x1="0" x2="1"><stop stop-color="#09091a"/><stop offset="1" stop-color="#151127"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#812bc4" stop-opacity=".36"/><stop offset="1" stop-color="#812bc4" stop-opacity="0"/></radialGradient>
    <linearGradient id="word" x1="0" x2="1"><stop stop-color="#f9fbff"/><stop offset=".49" stop-color="#f9fbff"/><stop offset="1" stop-color="#da56ea"/></linearGradient>
    <linearGradient id="line" x1="0" x2="1"><stop stop-color="#f83caf"/><stop offset=".6" stop-color="#9629fe"/><stop offset="1" stop-color="#54d4ef"/></linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#09091a" stop-opacity="0"/><stop offset="1" stop-color="#09091a" stop-opacity=".88"/></linearGradient>
    <clipPath id="icon"><rect x="56" y="74" width="114" height="114" rx="26"/></clipPath>
    ${clips}
  </defs>
  <rect width="1024" height="500" fill="url(#background)"/>
  <ellipse cx="224" cy="394" rx="490" ry="330" fill="url(#glow)"/>
  <g fill="none" stroke="#b293e4" stroke-opacity=".12"><ellipse cx="195" cy="450" rx="305" ry="170" transform="rotate(-24 195 450)"/><ellipse cx="195" cy="450" rx="340" ry="208" transform="rotate(-24 195 450)"/></g>
  <g font-family="Helvetica, Arial, sans-serif">
    <image x="56" y="74" width="114" height="114" href="${logo}" clip-path="url(#icon)"/>
    <rect x="56" y="74" width="114" height="114" rx="26" fill="none" stroke="#fff" stroke-opacity=".16"/>
    <text x="56" y="278" font-size="66" font-weight="700" letter-spacing="2" fill="url(#word)">COSMORA</text>
    <text x="59" y="320" font-size="24" font-weight="400" fill="#e2dcef">Eventi • Cosplay • Community</text>
    <rect x="59" y="353" width="126" height="4" rx="2" fill="url(#line)"/>
    ${tiles.join('')}
  </g>
  </svg>`;
  await fs.writeFile(path.join(output,'cosmora-feature-graphic.svg'),svg);
  await sharp(Buffer.from(svg)).flatten({background:'#09091a'}).removeAlpha().png().toFile(path.join(output,'cosmora-feature-graphic-1024x500.png'));
  const metadata = {};
  for (const name of ['cosmora-icon-512.png','cosmora-feature-graphic-1024x500.png']) {
    const data = await sharp(path.join(output,name)).metadata();
    const stat = await fs.stat(path.join(output,name));
    metadata[name] = {width:data.width,height:data.height,format:data.format,channels:data.channels,hasAlpha:data.hasAlpha,bytes:stat.size};
  }
  await fs.writeFile(path.join(output,'asset-manifest.json'),JSON.stringify({createdFor:'Google Play listing',applicationVersion:'1.0.1 (39)',sourceAssets:['brand/cosmora-app-icon.png',...categories.map(item=>`editorial/${item.file}`)],files:metadata},null,2)+'\n');
  console.log(JSON.stringify(metadata,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
