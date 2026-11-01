import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
const port = 3189;
const origin = 'https://vanguardchess.com.br';
const child = spawn(process.execPath, ['dist/server.cjs'], {env:{...process.env,NODE_ENV:'production',PORT:String(port),FIRESTORE_DATABASE_ID:'demo-vanguard-chess'},stdio:['ignore','pipe','pipe']});
let logs='';
child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
const timeout=setTimeout(()=>{child.kill(); console.error('SEO test exceeded 30 seconds');process.exit(1);},30000);
const get=async path=>{const response=await fetch(`http://127.0.0.1:${port}${path}`,{signal:AbortSignal.timeout(2000)});assert.equal(response.status,200,path);return response.text();};
try {
 let ready=false;
 for(let i=0;i<50;i++){try{await get('/');ready=true;break;}catch{await new Promise(r=>setTimeout(r,100));}}
 assert.ok(ready,logs);
 for(const path of ['/','/sobre/']){
  const html=await get(path);
  assert.ok(html.includes(`<link rel="canonical" href="${origin}${path}"`),`canonical: ${path}`);
  assert.match(html,/<title>[^<]*Vanguard Chess Brasil/);
  for(const key of ['description','og:title','og:description','og:url','og:site_name','og:image'])assert.ok(html.includes(`="${key}"`),`${key}: ${path}`);
  const scripts=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  const graph=scripts.flatMap(s=>s['@graph']||[s]);
  for(const type of ['WebSite','Organization']){
   const entity=graph.find(x=>x['@type']===type);assert.equal(entity?.name,'Vanguard Chess Brasil');assert.equal(entity?.url,`${origin}/`);
  }
  console.log(`PASS: ${path} metadata and structured data`);
 }
 const response=await fetch(`http://127.0.0.1:${port}/sobre`,{redirect:'manual'});assert.equal(response.status,301);assert.match(response.headers.get('location'),/\/sobre\/$/);
 const sitemap=await get('/sitemap.xml');
 for(const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)){
  const url=new URL(match[1]);assert.equal(url.origin,origin);await get(url.pathname);
 }
 const robots=await get('/robots.txt');assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));assert.ok(robots.includes('Disallow: /api/'));assert.ok(sitemap.includes(`${origin}/sobre/`));
 console.log('PASS: /sobre redirect, sitemap routes and robots.txt');
} finally {clearTimeout(timeout);child.kill();}

