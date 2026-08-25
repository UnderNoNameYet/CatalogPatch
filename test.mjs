import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,statSync} from 'node:fs';
import {parseCSV,detectDelimiter,detectSource,inferMapping,normalizeMoney,slugify,stringifyCSV,transformCatalog,SHOPIFY_HEADERS,buildAuditRows} from './src/engine.js';
const fixture=name=>readFileSync(new URL(`./fixtures/${name}`,import.meta.url),'utf8');

assert.equal(detectDelimiter('a;b;c\n1;2;3'),';');
const quoted=parseCSV('Name,Description\nThing,"Line one\nLine two"');
assert.equal(quoted.rows[0].Description,'Line one\nLine two');
assert.deepEqual(parseCSV(stringifyCSV(['A','B'],[{A:'x,y',B:'"quoted"'}])).rows,[{A:'x,y',B:'"quoted"'}]);
assert.equal(slugify('  Café & Chair  '),'cafe-and-chair');
assert.deepEqual(normalizeMoney('€1.249,50'),{value:'1249.50',valid:true,changed:true});
const woo=parseCSV(fixture('woocommerce.csv'));assert.equal(detectSource(woo.headers).source,'woocommerce');const wooMap=inferMapping(woo.headers);assert.equal(wooMap.title,'Name');const wooResult=transformCatalog(woo,{source:'woocommerce',mapping:wooMap,defaultStatus:'draft'});assert.equal(wooResult.summary.products,1);assert.equal(wooResult.summary.variants,2);assert.equal(wooResult.summary.critical,0);assert.equal(wooResult.rows[0].Handle,'linen-shirt');assert.equal(wooResult.rows[0]['Variant SKU'],'LINEN-S');assert.equal(wooResult.rows[0]['Variant Price'],'34.99');assert.equal(wooResult.rows[0]['Variant Compare At Price'],'39.99');assert.equal(wooResult.rows[0]['Variant Grams'],'250');assert.equal(wooResult.rows[0].Status,'active');assert.equal(wooResult.rows[1]['Option1 Value'],'Medium');
const squarespace=parseCSV(fixture('squarespace.csv'));assert.equal(detectSource(squarespace.headers).source,'squarespace');const sqResult=transformCatalog(squarespace,{source:'squarespace'});assert.equal(sqResult.summary.products,1);assert.equal(sqResult.summary.variants,2);assert.equal(sqResult.summary.images,3);assert.equal(sqResult.rows.length,3);assert.equal(sqResult.rows[0]['Variant Price'],'24.00');assert.equal(sqResult.rows[0]['Variant Compare At Price'],'28.00');
const square=parseCSV(fixture('square.csv'));assert.equal(detectSource(square.headers).source,'square');const squareResult=transformCatalog(square,{source:'square'});assert.equal(squareResult.summary.variants,2);assert.equal(squareResult.rows[0]['Variant Barcode'],'0123456789012');
const bad=parseCSV(fixture('problem-file.csv'));assert.equal(bad.delimiter,';');assert.equal(detectSource(bad.headers).source,'generic');const badResult=transformCatalog(bad,{defaultStatus:'draft'});assert.ok(badResult.summary.critical>=3);for(const code of ['duplicate-sku','invalid-price','scientific-sku','image-url'])assert.ok(badResult.issues.some(issue=>issue.code===code),`Missing ${code}`);assert.ok(buildAuditRows(badResult).every(row=>row.Severity));assert.ok(SHOPIFY_HEADERS.includes('Variant Price'));

execFileSync('bash',['scripts/build-site.sh'],{stdio:'inherit'});
const required=['index.html','site.css','site.js','app.html','app.css','app.js','src/engine.js','docs.html','privacy.html','terms.html','icon.svg','manifest.webmanifest','sw.js','robots.txt','sitemap.xml','fixtures/woocommerce.csv','fixtures/squarespace.csv','fixtures/square.csv','fixtures/problem-file.csv','release-v1.txt','.nojekyll'];
for(const file of required)assert.ok(statSync(`public/${file}`).isFile(),`Missing public/${file}`);
for(const file of ['site.js','app.js','src/engine.js','sw.js'])execFileSync(process.execPath,['--check',`public/${file}`],{stdio:'inherit'});
const read=file=>readFileSync(`public/${file}`,'utf8');
const manifest=JSON.parse(read('manifest.webmanifest'));assert.equal(manifest.start_url,'./app.html');
const home=read('index.html'),app=read('app.html'),docs=read('docs.html'),privacy=read('privacy.html'),terms=read('terms.html'),sw=read('sw.js');
assert.match(home,/The catalog moved/);assert.match(home,/FOUNDING LICENCE/);assert.match(home,/CHECKOUT NOT ENABLED/);assert.match(home,/app\.html\?sample=problem-file/);assert.doesNotMatch(home,/testimonial|customers trust|guaranteed migration/i);
assert.match(app,/Turn a foreign catalog export/);for(const id of ['fileInput','sourceSelect','mappingGrid','convertButton','previewBody','findingList','downloadShopify','downloadAudit','downloadRecipe'])assert.match(app,new RegExp(`id="${id}"`),`Missing #${id}`);
assert.match(docs,/current upload preview is the final authority/);assert.match(privacy,/does not intentionally upload the file/);assert.match(terms,/not an import guarantee/i);assert.match(sw,/catalogpatch-v1/);assert.match(sw,/release-v1\.txt/);assert.equal(read('release-v1.txt').trim(),'CatalogPatch Product CSV Workbench v1');
for(const page of ['index.html','app.html','docs.html','privacy.html','terms.html']){const html=read(page);const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);assert.equal(ids.length,new Set(ids).size,`Duplicate ids in ${page}`);}
const deployable=required.filter(file=>!file.endsWith('.svg')&&file!=='.nojekyll').map(read).join('\n');assert.doesNotMatch(deployable,/sk_live_|pk_live_|AKIA[0-9A-Z]{16}|buy\.stripe\.com|checkout\.stripe\.com/i);assert.doesNotMatch(deployable,/@outlook\.com|christenamccutchan/i);assert.doesNotMatch(deployable,/Shopify (guarantees|approves|endorses)/i);
console.log(JSON.stringify({ok:true,release:'v1',files:required.length,engine:{woocommerce:wooResult.summary,squarespace:sqResult.summary,square:squareResult.summary,problem:badResult.summary}}));
