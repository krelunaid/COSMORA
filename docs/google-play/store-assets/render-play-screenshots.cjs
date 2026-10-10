const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('/Users/andreagadducci/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');

// Compose store artwork from complete, unchanged captures of the real app.
// No device status bar, simulated controls or invented app screens are added.
const output = __dirname;
const width = 1080;
const height = 1920;
const maxScale = 1.5;
const frameTop = 490;
const frameMaxWidth = 918;
const frameMaxHeight = 1158;
const screens = [
  {input:'01-home.jpg',name:'play-01-home',title:['Le tue passioni,','in un solo posto']},
  {input:'02-esplora.jpg',name:'play-02-esplora',title:['Trova la tua','community']},
  {input:'03-eventi.jpg',name:'play-03-eventi',title:['Esplora gli eventi']},
  {input:'04-guida-evento.jpg',name:'play-04-guida-evento',title:['Informazioni','e link ufficiali']},
];

async function exists(file) {try {await fs.access(file); return true;} catch {return false;}}

async function main() {
  const availability = await Promise.all(screens.map(screen=>exists(path.join(output,screen.input))));
  if (process.argv.includes('--require-all') && availability.some(value=>!value)) {
    throw new Error('Missing real app captures: '+screens.filter((_,i)=>!availability[i]).map(screen=>screen.input).join(', '));
  }
  const manifest = [];
  for (const [index,screen] of screens.entries()) {
    if (!availability[index]) continue;
    const source = await fs.readFile(path.join(output,screen.input));
    const sourceMeta = await sharp(source).metadata();
    if (!sourceMeta.width || !sourceMeta.height) throw new Error('Invalid capture: '+screen.input);
    const scale = Math.min(maxScale,frameMaxWidth/sourceMeta.width,frameMaxHeight/sourceMeta.height);
    const captureWidth = Math.round(sourceMeta.width*scale);
    const captureHeight = Math.round(sourceMeta.height*scale);
    const x = Math.round((width-captureWidth)/2);
    const y = frameTop + Math.round((frameMaxHeight-captureHeight)/2);
    const imageData = `data:image/${sourceMeta.format === 'jpeg' ? 'jpeg' : 'png'};base64,${source.toString('base64')}`;
    const title = screen.title.map((line,lineIndex)=>`<text x="540" y="${screen.title.length===1 ? 292 : 260+lineIndex*76}" text-anchor="middle" font-size="68" font-weight="700" fill="#fff">${line}</text>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <defs>
      <linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0a0a1b"/><stop offset=".56" stop-color="#17112b"/><stop offset="1" stop-color="#090a17"/></linearGradient>
      <radialGradient id="glow"><stop stop-color="#7b30b7" stop-opacity=".35"/><stop offset="1" stop-color="#7b30b7" stop-opacity="0"/></radialGradient>
      <linearGradient id="brand" x1="0" x2="1"><stop stop-color="#fff"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#d152e8"/></linearGradient>
      <linearGradient id="accent" x1="0" x2="1"><stop stop-color="#ed3ea8"/><stop offset=".6" stop-color="#9d36e1"/><stop offset="1" stop-color="#76d3ef"/></linearGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#background)"/>
    <ellipse cx="870" cy="1050" rx="920" ry="1090" fill="url(#glow)"/>
    <g fill="none" stroke="#af8fd6" stroke-opacity=".09" stroke-width="2"><ellipse cx="10" cy="1530" rx="900" ry="420" transform="rotate(-35 10 1530)"/><ellipse cx="10" cy="1530" rx="980" ry="465" transform="rotate(-35 10 1530)"/></g>
    <g font-family="Helvetica, Arial, sans-serif">
      <text x="540" y="139" text-anchor="middle" font-size="48" font-weight="700" letter-spacing="8" fill="url(#brand)">COSMORA</text>
      ${title}
    </g>
    <rect x="468" y="369" width="144" height="5" rx="2.5" fill="url(#accent)"/>
    <rect x="${x-4}" y="${y-4}" width="${captureWidth+8}" height="${captureHeight+8}" rx="70" fill="#000" fill-opacity=".32"/>
    <image x="${x}" y="${y}" width="${captureWidth}" height="${captureHeight}" preserveAspectRatio="xMidYMid meet" href="${imageData}"/>
    <rect x="${x-1}" y="${y-1}" width="${captureWidth+2}" height="${captureHeight+2}" rx="66" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>
    </svg>`;
    await fs.writeFile(path.join(output,screen.name+'.svg'),svg);
    await sharp(Buffer.from(svg)).flatten({background:'#090a17'}).removeAlpha().png().toFile(path.join(output,screen.name+'.png'));
    const fileMeta = await sharp(path.join(output,screen.name+'.png')).metadata();
    const stat = await fs.stat(path.join(output,screen.name+'.png'));
    manifest.push({file:screen.name+'.png',sourceCapture:screen.input,sourceWidth:sourceMeta.width,sourceHeight:sourceMeta.height,scale,width:fileMeta.width,height:fileMeta.height,channels:fileMeta.channels,hasAlpha:fileMeta.hasAlpha,bytes:stat.size,title:screen.title.join(' '),composition:'Complete real app capture, brand header and decorative background; no additional device or app UI.'});
  }
  await fs.writeFile(path.join(output,'play-screenshot-manifest.json'),JSON.stringify({version:'1.0.1 (39)',requestedScreens:4,renderedScreens:manifest.length,files:manifest},null,2)+'\n');
  if (manifest.length === 4) {
    const thumbnails = await Promise.all(manifest.map(async (item,index)=>({input:await sharp(path.join(output,item.file)).resize(270,480).png().toBuffer(),left:index*270,top:0})));
    await sharp({create:{width:1080,height:480,channels:3,background:'#090a17'}}).composite(thumbnails).png().toFile(path.join(output,'play-screenshots-contact-sheet.png'));
  }
  console.log(JSON.stringify(manifest,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
