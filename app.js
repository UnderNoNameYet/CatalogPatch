import {FIELD_DEFS,SHOPIFY_HEADERS,parseCSV,detectSource,inferMapping,transformCatalog,stringifyCSV,buildAuditRows,buildRecipe} from './src/engine.js';

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const state={step:1,fileName:'',encoding:'',parsed:null,source:null,mapping:{},result:null,filter:'all'};
const labelForSource={woocommerce:'WooCommerce',squarespace:'Squarespace',square:'Square',shopify:'Shopify',generic:'Generic CSV'};

function notify(message){const toast=$('#toast');toast.textContent=message;toast.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove('show'),2800);}
function safeBase(){return (state.fileName||'catalog').replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'catalog';}
function download(name,content,type='text/csv;charset=utf-8'){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),500);}

function goStep(next){
  if(next>1&&!state.parsed){notify('Load a source file first.');return;}
  if(next>3&&!state.result){notify('Run the conversion first.');return;}
  state.step=next;
  $$('.step-pane').forEach(pane=>pane.classList.toggle('active',Number(pane.dataset.step)===next));
  $$('#stepRail li').forEach(item=>{const number=Number(item.dataset.stepLink);item.classList.toggle('active',number===next);item.classList.toggle('complete',number<next);const button=$('button',item);button.disabled=number>Math.max(state.parsed?2:1,state.result?4:1);});
  $('#progressLine').style.transform=`scaleX(${next/4})`;
  scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}

async function decodeFile(file){
  if(file.size>30*1024*1024)throw new Error('Use a catalog file smaller than 30 MB for this browser beta.');
  const buffer=await file.arrayBuffer();
  try{return {text:new TextDecoder('utf-8',{fatal:true}).decode(buffer),encoding:'UTF-8'};}
  catch{return {text:new TextDecoder('windows-1252').decode(buffer),encoding:'Windows-1252 fallback'};}
}

function sourceLabel(source){return labelForSource[source]||'Generic CSV';}
function delimiterLabel(value){return value==='\t'?'TAB':value===';'?'SEMICOLON':'COMMA';}

function loadText(text,name,encoding='UTF-8'){
  const parsed=parseCSV(text);
  if(!parsed.headers.length||!parsed.rows.length){notify('No usable catalog rows were found.');return;}
  const detected=detectSource(parsed.headers);
  state.fileName=name;state.encoding=encoding;state.parsed=parsed;state.source=detected;state.mapping=inferMapping(parsed.headers);state.result=null;
  $('#railFile').textContent=name;$('#railSource').textContent=sourceLabel(detected.source);$('#railRows').textContent=String(parsed.rows.length);$('#railState').textContent='Map fields';
  $('#fileName').textContent=name;$('#fileMeta').textContent=`${parsed.rows.length.toLocaleString()} data rows / ${parsed.headers.length} columns`;
  $('#sourceReadout').textContent=sourceLabel(detected.source);$('#confidenceReadout').textContent=`${detected.confidence}% header match — verify below`;
  $('#structureReadout').textContent=`${delimiterLabel(parsed.delimiter)} DELIMITER`;$('#encodingReadout').textContent=encoding;
  $('#sourceSelect').value=detected.source;
  renderMapping();goStep(2);
}

async function loadFile(file){
  if(!file)return;
  try{const decoded=await decodeFile(file);loadText(decoded.text,file.name,decoded.encoding);}
  catch(error){notify(error.message||'The file could not be read.');}
}

function renderMapping(){
  const grid=$('#mappingGrid');
  const groups=[
    ['PRODUCT IDENTITY',['handle','title','description','vendor','productType','category','tags']],
    ['COMMERCE',['sku','regularPrice','salePrice','onSale','cost','stock','status','published','barcode']],
    ['VARIANTS',['option1Name','option1Value','option2Name','option2Value','option3Name','option3Value','parent','sourceType']],
    ['MEDIA + SEARCH',['weight','weightUnit','images','seoTitle','seoDescription']]
  ];
  grid.innerHTML=groups.map(([group,keys])=>`<section><header><span>${group}</span><b>${keys.length} TARGETS</b></header>${keys.map(key=>{
    const field=FIELD_DEFS.find(item=>item.key===key);const selected=state.mapping[key]||'';
    const options=['<option value="">Skip this field</option>',...state.parsed.headers.map(header=>`<option value="${escapeHtml(header)}" ${header===selected?'selected':''}>${escapeHtml(header)}</option>`)].join('');
    return `<label class="map-row ${selected?'mapped':''} ${field.required?'required':''}"><span><b>${escapeHtml(field.label)}</b><small>${field.required?'REQUIRED':'OPTIONAL'}</small></span><i>←</i><select data-map="${field.key}">${options}</select></label>`;
  }).join('')}</section>`).join('');
  $$('[data-map]',grid).forEach(select=>select.addEventListener('change',()=>{state.mapping[select.dataset.map]=select.value;select.closest('.map-row').classList.toggle('mapped',Boolean(select.value));updateCoverage();}));
  updateCoverage();
}

function updateCoverage(){
  const mapped=FIELD_DEFS.filter(field=>state.mapping[field.key]).length;
  $('#coverageValue').textContent=`${mapped} / ${FIELD_DEFS.length}`;
  $('#coverageBar').style.transform=`scaleX(${mapped/FIELD_DEFS.length})`;
}

function currentConfig(){return {source:$('#sourceSelect').value,mapping:{...state.mapping},defaultVendor:$('#defaultVendor').value.trim(),defaultStatus:$('#defaultStatus').value};}
function runConversion(){
  const required=FIELD_DEFS.filter(field=>field.required&&!state.mapping[field.key]);
  if(required.length){notify(`Map ${required.map(field=>field.label).join(' and ')} before conversion.`);return;}
  state.result=transformCatalog(state.parsed,currentConfig());state.filter='all';
  $('#railState').textContent=state.result.summary.ready?'Export ready':'Review findings';
  renderResult();goStep(3);
}

function renderResult(){
  const {summary}=state.result;
  $('#metricProducts').textContent=summary.products;$('#metricVariants').textContent=summary.variants;$('#metricCritical').textContent=summary.critical;$('#metricWarnings').textContent=summary.warning;$('#metricFixed').textContent=summary.fixed;
  $('#exportProducts').textContent=summary.products;$('#exportVariants').textContent=summary.variants;$('#exportState').textContent=summary.ready?'READY FOR SHOPIFY PREVIEW':'REVIEW REQUIRED';
  const banner=$('#resultBanner');banner.classList.toggle('blocked',!summary.ready);banner.classList.toggle('ready',summary.ready);
  $('#resultState').textContent=summary.ready?'PREFLIGHT CLEAR':'REVIEW REQUIRED';
  $('#resultMessage').textContent=summary.ready?'No deterministic blocker was found. Shopify’s own upload preview is still required.':`${summary.critical} critical finding${summary.critical===1?'':'s'} must be understood before relying on this worksheet.`;
  $$('.filter-tabs button').forEach(button=>button.classList.toggle('active',button.dataset.filter==='all'));
  renderPreview();renderFindings();
}

function rowMatches(row){
  if(state.filter==='all')return true;
  if(state.filter==='clean')return !row.issues.length;
  return row.issues.some(issue=>issue.severity===state.filter);
}
function badgeFor(row){
  const critical=row.issues.filter(issue=>issue.severity==='critical').length;const warnings=row.issues.filter(issue=>issue.severity==='warning').length;
  if(critical)return `<span class="finding-badge critical">${critical} CRITICAL</span>`;
  if(warnings)return `<span class="finding-badge warning">${warnings} WARNING${warnings===1?'':'S'}</span>`;
  return '<span class="finding-badge clean">CLEAN</span>';
}
function renderPreview(){
  const visible=state.result.preview.filter(rowMatches);
  $('#visibleCount').textContent=`${visible.length} row${visible.length===1?'':'s'}`;
  $('#previewBody').innerHTML=visible.length?visible.slice(0,250).map(row=>`<tr class="${row.issues.some(issue=>issue.severity==='critical')?'has-critical':row.issues.length?'has-warning':'is-clean'}"><td>${row.sourceRow}</td><td><b>${escapeHtml(row.title||'Untitled')}</b><small>${escapeHtml(row.handle)}</small></td><td>${escapeHtml(row.sku||'—')}</td><td>${escapeHtml(row.price||'—')}</td><td>${escapeHtml(row.stock||'—')}</td><td>${escapeHtml(row.status)}</td><td>${badgeFor(row)}</td></tr>`).join(''):'<tr><td colspan="7" class="empty-row">No rows match this filter.</td></tr>';
}
function renderFindings(){
  const findings=state.result.issues;
  $('#findingCount').textContent=`${findings.length} FINDING${findings.length===1?'':'S'}`;
  $('#findingList').innerHTML=findings.length?findings.slice(0,300).map(issue=>`<article class="${issue.severity}"><span>${issue.severity.toUpperCase()}</span><b>${escapeHtml(issue.code.replace(/-/g,' '))}</b><p>${escapeHtml(issue.message)}</p><small>ROW ${issue.sourceRow} / ${escapeHtml(issue.field)}</small></article>`).join(''):'<article class="empty"><span>CLEAR</span><b>No deterministic blockers</b><p>The file still needs Shopify’s current import preview and a manual spot check.</p><small>PLATFORM REVIEW REQUIRED</small></article>';
}

function escapeHtml(value){return String(value??'').replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));}
function runSummary(){const s=state.result.summary;return `CatalogPatch run\nSource: ${sourceLabel(state.result.source)}\nInput: ${state.fileName}\nProducts: ${s.products}\nVariants: ${s.variants}\nCritical findings: ${s.critical}\nWarnings: ${s.warning}\nNormalized values: ${s.fixed}\nState: ${s.ready?'Preflight clear — Shopify preview still required':'Review required before import'}`;}
function reset(){state.step=1;state.fileName='';state.encoding='';state.parsed=null;state.source=null;state.mapping={};state.result=null;$('#fileInput').value='';$('#railFile').textContent='Not loaded';$('#railSource').textContent='Unknown';$('#railRows').textContent='—';$('#railState').textContent='Waiting';goStep(1);}

async function loadSample(name){try{const response=await fetch(`fixtures/${name}.csv`);if(!response.ok)throw new Error();loadText(await response.text(),`${name}.csv`,'UTF-8 fixture');}catch{notify('The fixture could not be loaded. Use a local CSV instead.');}}

$('#fileInput').addEventListener('change',event=>loadFile(event.target.files[0]));
const drop=$('#dropZone');
['dragenter','dragover'].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.add('dragging');}));
['dragleave','drop'].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.remove('dragging');}));
drop.addEventListener('drop',event=>loadFile(event.dataTransfer.files[0]));
$$('[data-sample]').forEach(button=>button.addEventListener('click',()=>loadSample(button.dataset.sample)));
$$('[data-go]').forEach(button=>button.addEventListener('click',()=>goStep(Number(button.dataset.go))));
$$('#stepRail button').forEach(button=>button.addEventListener('click',()=>goStep(Number(button.closest('li').dataset.stepLink))));
$('#convertButton').addEventListener('click',runConversion);
$('#sourceSelect').addEventListener('change',event=>{$('#railSource').textContent=sourceLabel(event.target.value);});
$$('.filter-tabs button').forEach(button=>button.addEventListener('click',()=>{state.filter=button.dataset.filter;$$('.filter-tabs button').forEach(item=>item.classList.toggle('active',item===button));renderPreview();}));
$('#downloadShopify').addEventListener('click',()=>{download(`${safeBase()}-shopify-ready.csv`,stringifyCSV(SHOPIFY_HEADERS,state.result.rows));notify('Shopify worksheet downloaded.');});
$('#downloadAudit').addEventListener('click',()=>{const rows=buildAuditRows(state.result);const headers=['Severity','Code','Source row','Handle','Field','Finding'];download(`${safeBase()}-catalogpatch-findings.csv`,stringifyCSV(headers,rows));notify('Finding register downloaded.');});
$('#downloadRecipe').addEventListener('click',()=>{download(`${safeBase()}-catalogpatch-recipe.json`,JSON.stringify(buildRecipe(state.result,currentConfig()),null,2),'application/json');notify('Mapping recipe downloaded.');});
$('#copySummary').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(runSummary());notify('Run summary copied.');}catch{notify('Clipboard access was blocked.');}});
$('#newRun').addEventListener('click',reset);

addEventListener('keydown',event=>{if(event.key==='Escape'&&state.step>1)goStep(state.step-1);});
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{}));
goStep(1);
const requestedSample=new URLSearchParams(location.search).get('sample');
if(['woocommerce','squarespace','square','problem-file'].includes(requestedSample))loadSample(requestedSample);
