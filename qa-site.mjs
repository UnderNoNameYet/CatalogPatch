import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const executablePath=execFileSync('which',['chromium'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
const base='http://127.0.0.1:4175';
const report={pages:[],errors:[],failures:[]};
async function inspect(path,viewport,label,screenshot){
  const page=await browser.newPage({viewport});
  page.on('console',message=>{if(message.type()==='error')report.errors.push(`${label}: ${message.text()}`);});
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  page.on('requestfailed',request=>report.failures.push(`${label}: ${request.url()} ${request.failure()?.errorText}`));
  const response=await page.goto(`${base}/${path}`,{waitUntil:'networkidle'});assert.equal(response?.ok(),true,`${label} response`);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.equal(overflow,0,`${label} overflow`);
  report.pages.push({label,title:await page.title(),overflow});
  if(screenshot)await page.screenshot({path:screenshot,fullPage:true});
  return page;
}
const desktop={width:1440,height:1000},mobile={width:390,height:844};
const home=await inspect('index.html',desktop,'home-desktop','site-desktop.png');
assert.match(await home.locator('h1').innerText(),/The catalog moved/);assert.equal(await home.locator('.price-card button').isDisabled(),true);await home.locator('[data-source-demo="square"]').click();assert.equal(await home.locator('#machineSource').innerText(),'SQUARE');assert.equal(await home.locator('#demoSku').innerText(),'LAMP-BRASS');
const homeMobile=await inspect('index.html',mobile,'home-mobile','site-mobile.png');await homeMobile.locator('.menu-button').click();assert.equal(await homeMobile.locator('#siteNav').isVisible(),true);
const docs=await inspect('docs.html',desktop,'docs-desktop');assert.match(await docs.locator('h1').innerText(),/Know exactly what/);assert.ok(await docs.locator('table').count()>=3);
const privacy=await inspect('privacy.html',mobile,'privacy-mobile');assert.match(await privacy.locator('h1').innerText(),/stays/);
const terms=await inspect('terms.html',mobile,'terms-mobile');assert.match(await terms.locator('h1').innerText(),/not an import guarantee/i);
const app=await inspect('app.html?sample=problem-file',desktop,'app-query-desktop','app-query-desktop.png');await app.locator('[data-step="2"]').waitFor({state:'visible'});assert.equal(await app.locator('#fileName').innerText(),'problem-file.csv');await app.locator('#convertButton').click();await app.locator('[data-step="3"]').waitFor({state:'visible'});assert.ok(Number(await app.locator('#metricCritical').innerText())>=3);assert.match(await app.locator('#resultState').innerText(),/REVIEW REQUIRED/);
const appMobile=await inspect('app.html?sample=woocommerce',mobile,'app-query-mobile','app-query-mobile.png');await appMobile.locator('[data-step="2"]').waitFor({state:'visible'});await appMobile.locator('#convertButton').click();await appMobile.locator('[data-step="3"]').waitFor({state:'visible'});assert.equal(await appMobile.locator('#metricProducts').innerText(),'1');assert.equal(await appMobile.locator('#metricCritical').innerText(),'0');
for(const page of [home,homeMobile,docs,privacy,terms,app,appMobile])await page.close();
assert.deepEqual(report.errors,[]);assert.deepEqual(report.failures,[]);await browser.close();console.log(JSON.stringify(report,null,2));
