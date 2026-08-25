export const VERSION = '0.1.0';

export const SHOPIFY_HEADERS = [
  'Handle','Title','Body (HTML)','Vendor','Product Category','Type','Tags','Published',
  'Option1 Name','Option1 Value','Option2 Name','Option2 Value','Option3 Name','Option3 Value',
  'Variant SKU','Variant Grams','Variant Inventory Tracker','Variant Inventory Qty','Variant Inventory Policy',
  'Variant Fulfillment Service','Variant Price','Variant Compare At Price','Variant Requires Shipping',
  'Variant Taxable','Variant Barcode','Image Src','Image Position','Image Alt Text','Gift Card','SEO Title',
  'SEO Description','Variant Image','Variant Weight Unit','Cost per item','Status'
];

export const FIELD_DEFS = [
  {key:'handle',label:'Existing handle',aliases:['handle','product handle','slug','product url','url slug']},
  {key:'title',label:'Product title',required:true,aliases:['title','name','product name','item name','product title']},
  {key:'description',label:'Description',aliases:['description','body html','body (html)','product description','long description','short description']},
  {key:'sku',label:'SKU',aliases:['sku','variant sku','product sku','item sku','variation sku']},
  {key:'regularPrice',label:'Regular price',required:true,aliases:['regular price','price','variant price','retail price','base price','unit price']},
  {key:'salePrice',label:'Sale price',aliases:['sale price','online sale price','discount price','special price']},
  {key:'onSale',label:'On sale flag',aliases:['on sale','is on sale','sale active']},
  {key:'cost',label:'Cost per item',aliases:['cost per item','cost','unit cost','purchase price','wholesale price']},
  {key:'stock',label:'Inventory quantity',aliases:['stock','inventory','quantity','qty','variant inventory qty','current quantity']},
  {key:'weight',label:'Weight',aliases:['weight','weight kg','weight (kg)','weight lb','weight (lb)','variant grams','grams']},
  {key:'weightUnit',label:'Weight unit',aliases:['weight unit','unit of weight','variant weight unit']},
  {key:'images',label:'Image URLs',aliases:['images','image src','image urls','image url','hosted image urls','product images']},
  {key:'vendor',label:'Vendor',aliases:['vendor','brand','manufacturer','supplier']},
  {key:'productType',label:'Product type',aliases:['product type','type','item type']},
  {key:'category',label:'Product category',aliases:['product category','category','categories','google product category']},
  {key:'tags',label:'Tags',aliases:['tags','labels','keywords']},
  {key:'published',label:'Published',aliases:['published','visible','visibility','online item visibility','is published']},
  {key:'status',label:'Status',aliases:['status','product status','state','archived']},
  {key:'barcode',label:'Barcode',aliases:['barcode','variant barcode','gtin','upc','ean']},
  {key:'option1Name',label:'Option 1 name',aliases:['option1 name','option name 1','attribute 1 name','option 1']},
  {key:'option1Value',label:'Option 1 value',aliases:['option1 value','option value 1','attribute 1 value(s)','attribute 1 values','variation name']},
  {key:'option2Name',label:'Option 2 name',aliases:['option2 name','option name 2','attribute 2 name','option 2']},
  {key:'option2Value',label:'Option 2 value',aliases:['option2 value','option value 2','attribute 2 value(s)','attribute 2 values']},
  {key:'option3Name',label:'Option 3 name',aliases:['option3 name','option name 3','attribute 3 name','option 3']},
  {key:'option3Value',label:'Option 3 value',aliases:['option3 value','option value 3','attribute 3 value(s)','attribute 3 values']},
  {key:'parent',label:'Parent product reference',aliases:['parent','parent sku','parent id','group','product group']},
  {key:'sourceType',label:'Source row type',aliases:['type','product type','row type']},
  {key:'seoTitle',label:'SEO title',aliases:['seo title','meta title','search title']},
  {key:'seoDescription',label:'SEO description',aliases:['seo description','meta description','search description']}
];

const SOURCE_PROFILES = {
  woocommerce: ['type','sku','name','regular price','images','attribute 1 name'],
  squarespace: ['product type','product url','title','option name 1','option value 1','hosted image urls'],
  square: ['token','item name','variation name','sku','reporting category','online sale price'],
  shopify: ['handle','title','variant sku','variant price','image src'],
  generic: []
};

const norm = value => String(value ?? '').trim().toLowerCase().replace(/^\ufeff/,'').replace(/[_/\\-]+/g,' ').replace(/[^a-z0-9() ]+/g,' ').replace(/\s+/g,' ').trim();

export function detectDelimiter(text) {
  const candidates = [',',';','\t'];
  const records = [];
  let record = '';
  let quoted = false;
  for (let i=0; i<text.length && records.length<12; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i+1] === '"') { record += '""'; i++; continue; }
      quoted = !quoted;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (record.trim()) records.push(record);
      record = '';
      if (char === '\r' && text[i+1] === '\n') i++;
    } else record += char;
  }
  if (record.trim()) records.push(record);
  const counts = candidate => records.map(line => {
    let count=0, q=false;
    for(let i=0;i<line.length;i++){
      if(line[i]==='"'){ if(q && line[i+1]==='"'){i++;continue;} q=!q; }
      else if(line[i]===candidate && !q) count++;
    }
    return count;
  });
  let best=','; let bestScore=-Infinity;
  for(const candidate of candidates){
    const values=counts(candidate);
    const nonzero=values.filter(Boolean);
    if(!nonzero.length) continue;
    const average=nonzero.reduce((a,b)=>a+b,0)/nonzero.length;
    const variance=nonzero.reduce((a,b)=>a+Math.abs(b-average),0)/nonzero.length;
    const score=average*4 - variance - (values.length-nonzero.length)*2;
    if(score>bestScore){best=candidate;bestScore=score;}
  }
  return best;
}

export function parseCSV(input, forcedDelimiter) {
  const text=String(input ?? '').replace(/^\ufeff/,'');
  const delimiter=forcedDelimiter || detectDelimiter(text);
  const matrix=[]; let row=[]; let cell=''; let quoted=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(quoted){
      if(char==='"' && text[i+1]==='"'){cell+='"';i++;}
      else if(char==='"') quoted=false;
      else cell+=char;
    } else if(char==='"' && cell==='') quoted=true;
    else if(char===delimiter){row.push(cell);cell='';}
    else if(char==='\n' || char==='\r'){
      if(char==='\r' && text[i+1]==='\n') i++;
      row.push(cell);cell='';
      if(row.some(value=>value.trim()!=='')) matrix.push(row);
      row=[];
    } else cell+=char;
  }
  row.push(cell);
  if(row.some(value=>value.trim()!=='')) matrix.push(row);
  if(!matrix.length) return {headers:[],rows:[],delimiter,warnings:['The file has no rows.']};
  const rawHeaders=matrix.shift().map(value=>value.trim().replace(/^\ufeff/,''));
  const seen=new Map();
  const headers=rawHeaders.map((header,index)=>{
    const base=header || `Column ${index+1}`;
    const count=(seen.get(base)||0)+1; seen.set(base,count);
    return count===1?base:`${base} (${count})`;
  });
  const warnings=[];
  const rows=matrix.map((values,index)=>{
    if(values.length!==headers.length) warnings.push(`Row ${index+2} has ${values.length} cells; the header has ${headers.length}.`);
    const object={}; headers.forEach((header,column)=>object[header]=values[column]??'');
    return object;
  });
  return {headers,rows,delimiter,warnings};
}

export function stringifyCSV(headers, rows) {
  const quote=value=>{
    const text=String(value ?? '');
    return /[",\n\r]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;
  };
  return [headers.map(quote).join(','),...rows.map(row=>headers.map(header=>quote(row[header])).join(','))].join('\r\n');
}

export function detectSource(headers) {
  const normalized=new Set(headers.map(norm));
  let winner='generic', best=0;
  for(const [source,signals] of Object.entries(SOURCE_PROFILES)){
    if(source==='generic') continue;
    const score=signals.filter(signal=>normalized.has(signal)).length / signals.length;
    if(score>best){winner=source;best=score;}
  }
  return {source:best>=0.45?winner:'generic',confidence:Math.round(best*100)};
}

function aliasScore(header,alias){
  const h=norm(header), a=norm(alias);
  if(h===a) return 100;
  if(h.startsWith(`${a} `) || h.endsWith(` ${a}`)) return 70;
  if(a.length>5 && h.includes(a)) return 45;
  return 0;
}

export function inferMapping(headers) {
  const used=new Set(); const mapping={};
  for(const field of FIELD_DEFS){
    let bestHeader='',bestScore=0;
    const allowReuse=field.key==='sourceType';
    for(const header of headers){
      if(used.has(header) && !allowReuse) continue;
      for(const alias of field.aliases){
        const score=aliasScore(header,alias);
        if(score>bestScore){bestHeader=header;bestScore=score;}
      }
    }
    if(bestScore>=45){mapping[field.key]=bestHeader;if(!allowReuse)used.add(bestHeader);}
    else mapping[field.key]='';
  }
  return mapping;
}

export function slugify(value) {
  return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,255) || 'untitled-product';
}

export function normalizeMoney(value) {
  const original=String(value??'').trim();
  if(!original) return {value:'',valid:false,changed:false};
  let text=original.replace(/\s/g,''); const negative=/^\(.*\)$/.test(text);
  text=text.replace(/[()]/g,'').replace(/[^0-9,.-]/g,'');
  const comma=text.lastIndexOf(','), dot=text.lastIndexOf('.');
  if(comma>-1 && dot>-1){
    if(comma>dot) text=text.replace(/\./g,'').replace(',','.');
    else text=text.replace(/,/g,'');
  } else if(comma>-1){
    const decimals=text.length-comma-1;
    text=decimals===2?text.replace(',','.'):text.replace(/,/g,'');
  }
  text=text.replace(/(?!^)-/g,'');
  const number=Number(text);
  if(!Number.isFinite(number)) return {value:'',valid:false,changed:false};
  const final=(negative?-Math.abs(number):number).toFixed(2);
  return {value:final,valid:true,changed:final!==original};
}

function normalizeInteger(value){
  const text=String(value??'').trim(); if(!text) return '';
  const number=Number(text.replace(/[^0-9.-]/g,''));
  return Number.isFinite(number)?String(Math.trunc(number)):'';
}

function normalizeBoolean(value, fallback=false){
  const text=norm(value);
  if(['1','true','yes','y','visible','published','active','in stock','instock'].includes(text)) return true;
  if(['0','false','no','n','hidden','draft','archived','out of stock','outofstock'].includes(text)) return false;
  return fallback;
}

function cleanHtml(value){
  return String(value??'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/javascript\s*:/gi,'').trim();
}

function splitImages(value){
  const text=String(value??'').trim(); if(!text) return [];
  return text.split(/\s*(?:\||;|,(?=\s*https?:\/\/))\s*/).map(item=>item.trim()).filter(Boolean);
}

function weightInGrams(value,header,explicitUnit){
  const number=Number(String(value??'').replace(',','.').replace(/[^0-9.-]/g,''));
  if(!Number.isFinite(number)) return '';
  const unit=norm(explicitUnit || header);
  if(unit.includes('kg')) return String(Math.round(number*1000));
  if(unit.includes('lb') || unit.includes('pound')) return String(Math.round(number*453.59237));
  if(unit.includes('oz')) return String(Math.round(number*28.3495));
  return String(Math.round(number));
}

function valueAt(row,mapping,key){const header=mapping[key];return header?String(row[header]??'').trim():'';}
function emptyShopifyRow(){return Object.fromEntries(SHOPIFY_HEADERS.map(header=>[header,'']));}

export function transformCatalog(parsed, config={}) {
  const mapping={...inferMapping(parsed.headers),...(config.mapping||{})};
  const source=config.source || detectSource(parsed.headers).source;
  const defaultVendor=String(config.defaultVendor||'').trim();
  const defaultStatus=config.defaultStatus==='active'?'active':'draft';
  const issues=[]; const fixes=[]; const rows=[];
  const raw=parsed.rows;
  const parents=new Map();
  raw.forEach((row,index)=>{
    const rowType=norm(valueAt(row,mapping,'sourceType'));
    const sku=valueAt(row,mapping,'sku'); const title=valueAt(row,mapping,'title');
    const id=String(row.ID??row.Id??row.id??'').trim();
    if(rowType==='variable' || rowType==='grouped'){
      const record={row,index,title,sku,id,handle:slugify(valueAt(row,mapping,'handle')||title)};
      [sku,id,title].filter(Boolean).forEach(key=>parents.set(String(key).replace(/^id:/i,''),record));
    }
  });
  const converted=[];
  raw.forEach((row,index)=>{
    const sourceRow=index+2;
    const rowType=norm(valueAt(row,mapping,'sourceType'));
    if((rowType==='variable'||rowType==='grouped') && source==='woocommerce') return;
    const parentRef=valueAt(row,mapping,'parent').replace(/^id:/i,'').trim();
    const parent=parentRef?parents.get(parentRef):null;
    let title=valueAt(row,mapping,'title') || parent?.title || '';
    const explicitHandle=valueAt(row,mapping,'handle');
    const handle=parent?.handle || slugify(explicitHandle || title);
    const regular=normalizeMoney(valueAt(row,mapping,'regularPrice'));
    const sale=normalizeMoney(valueAt(row,mapping,'salePrice'));
    const onSale=normalizeBoolean(valueAt(row,mapping,'onSale'),Boolean(sale.valid));
    const price=onSale&&sale.valid?sale:regular;
    const compare=onSale&&sale.valid&&regular.valid&&Number(regular.value)>Number(sale.value)?regular.value:'';
    const cost=normalizeMoney(valueAt(row,mapping,'cost'));
    const sku=valueAt(row,mapping,'sku');
    const stock=normalizeInteger(valueAt(row,mapping,'stock'));
    const weightHeader=mapping.weight||'';
    const grams=weightInGrams(valueAt(row,mapping,'weight'),weightHeader,valueAt(row,mapping,'weightUnit'));
    const option1Name=valueAt(row,mapping,'option1Name');
    const option1Value=valueAt(row,mapping,'option1Value');
    const option2Name=valueAt(row,mapping,'option2Name');
    const option2Value=valueAt(row,mapping,'option2Value');
    const option3Name=valueAt(row,mapping,'option3Name');
    const option3Value=valueAt(row,mapping,'option3Value');
    const images=splitImages(valueAt(row,mapping,'images'));
    const publishedValue=valueAt(row,mapping,'published');
    const statusValue=norm(valueAt(row,mapping,'status'));
    let status=defaultStatus;
    if(['active','draft','archived'].includes(statusValue)) status=statusValue;
    else if(statusValue==='true'||statusValue==='false') status=normalizeBoolean(statusValue)?'active':'draft';
    else if(statusValue) status=statusValue.includes('archiv')?'archived':statusValue.includes('active')?'active':'draft';
    else if(publishedValue) status=normalizeBoolean(publishedValue)?'active':'draft';
    const output=emptyShopifyRow();
    Object.assign(output,{
      'Handle':handle,'Title':title,'Body (HTML)':cleanHtml(valueAt(row,mapping,'description')),
      'Vendor':valueAt(row,mapping,'vendor')||parent&&valueAt(parent.row,mapping,'vendor')||defaultVendor,
      'Product Category':valueAt(row,mapping,'category')||parent&&valueAt(parent.row,mapping,'category')||'',
      'Type':valueAt(row,mapping,'productType')||'','Tags':valueAt(row,mapping,'tags')||'',
      'Published':status==='active'?'TRUE':'FALSE','Option1 Name':option1Name||'Title','Option1 Value':option1Value||'Default Title',
      'Option2 Name':option2Value?(option2Name||'Option 2'):'','Option2 Value':option2Value,
      'Option3 Name':option3Value?(option3Name||'Option 3'):'','Option3 Value':option3Value,
      'Variant SKU':sku,'Variant Grams':grams,'Variant Inventory Tracker':stock!==''?'shopify':'',
      'Variant Inventory Qty':stock,'Variant Inventory Policy':'deny','Variant Fulfillment Service':'manual',
      'Variant Price':price.valid?price.value:'','Variant Compare At Price':compare,'Variant Requires Shipping':'TRUE',
      'Variant Taxable':'TRUE','Variant Barcode':valueAt(row,mapping,'barcode'),'Image Src':images[0]||'',
      'Image Position':images.length?'1':'','Image Alt Text':title,'Gift Card':'FALSE',
      'SEO Title':valueAt(row,mapping,'seoTitle'),'SEO Description':valueAt(row,mapping,'seoDescription'),
      'Variant Image':'','Variant Weight Unit':grams?'g':'','Cost per item':cost.valid?cost.value:'','Status':status
    });
    const rowIssues=[];
    const add=(severity,code,field,message)=>{const finding={severity,code,field,message,sourceRow,handle};issues.push(finding);rowIssues.push(finding);};
    if(!title) add('critical','missing-title','Title','Product title is required.');
    if(!price.valid) add('critical','invalid-price','Variant Price','A valid price could not be read.');
    if(!sku) add('warning','missing-sku','Variant SKU','No SKU is available for safe matching.');
    if(/^[+-]?\d+(?:\.\d+)?e[+-]?\d+$/i.test(sku)) add('critical','scientific-sku','Variant SKU','The SKU appears to have been converted to scientific notation.');
    if(stock!==''&&Number(stock)<0) add('warning','negative-stock','Variant Inventory Qty','Inventory is negative. Review before import.');
    if(option1Value&&!option1Name) add('warning','unnamed-option','Option1 Name','An option value exists without a source option name; a safe placeholder was added.');
    images.forEach(url=>{if(!/^https:\/\//i.test(url)) add('warning','image-url','Image Src',`Image URL is not a public HTTPS URL: ${url.slice(0,90)}`);});
    if(regular.changed){fixes.push({sourceRow,field:'price',message:`Normalized ${valueAt(row,mapping,'regularPrice')} to ${regular.value}.`});}
    if(sale.changed&&sale.valid){fixes.push({sourceRow,field:'sale price',message:`Normalized ${valueAt(row,mapping,'salePrice')} to ${sale.value}.`});}
    if(cost.changed&&cost.valid){fixes.push({sourceRow,field:'cost',message:`Normalized ${valueAt(row,mapping,'cost')} to ${cost.value}.`});}
    converted.push({output,images,rowIssues,sourceRow});
  });
  const skuMap=new Map(); const optionMap=new Map(); const variantsByHandle=new Map();
  converted.forEach(item=>{
    const output=item.output; const sku=output['Variant SKU'];
    if(sku){
      if(skuMap.has(sku)){
        const finding={severity:'critical',code:'duplicate-sku',field:'Variant SKU',message:`SKU ${sku} appears more than once.`,sourceRow:item.sourceRow,handle:output.Handle};issues.push(finding);item.rowIssues.push(finding);
      } else skuMap.set(sku,item);
    }
    const optionKey=[output.Handle,output['Option1 Value'],output['Option2 Value'],output['Option3 Value']].join('|').toLowerCase();
    if(optionMap.has(optionKey)){
      const finding={severity:'critical',code:'duplicate-variant','field':'Options',message:'This product has a duplicate option combination.',sourceRow:item.sourceRow,handle:output.Handle};issues.push(finding);item.rowIssues.push(finding);
    } else optionMap.set(optionKey,item);
    variantsByHandle.set(output.Handle,(variantsByHandle.get(output.Handle)||0)+1);
  });
  for(const [handle,count] of variantsByHandle){if(count>100) issues.push({severity:'critical',code:'variant-limit',field:'Options',message:`${handle} has ${count} variants; Shopify product imports support at most 100 in the standard model.`,sourceRow:'—',handle});}
  converted.forEach(item=>{
    rows.push(item.output);
    item.images.slice(1).forEach((url,imageIndex)=>{
      const imageRow=emptyShopifyRow(); imageRow.Handle=item.output.Handle; imageRow['Image Src']=url; imageRow['Image Position']=String(imageIndex+2); imageRow['Image Alt Text']=item.output.Title; rows.push(imageRow);
    });
  });
  parsed.warnings.forEach(message=>issues.push({severity:'warning',code:'row-width',field:'CSV structure',message,sourceRow:'—',handle:''}));
  const critical=issues.filter(issue=>issue.severity==='critical').length;
  const warning=issues.filter(issue=>issue.severity==='warning').length;
  const mappingCoverage=FIELD_DEFS.filter(field=>mapping[field.key]).length;
  return {
    version:VERSION,source,mapping,rows,issues,fixes,
    summary:{products:new Set(converted.map(item=>item.output.Handle)).size,variants:converted.length,images:converted.reduce((sum,item)=>sum+item.images.length,0),critical,warning,fixed:fixes.length,mapped:mappingCoverage,totalFields:FIELD_DEFS.length,ready:critical===0},
    preview:converted.map(item=>({sourceRow:item.sourceRow,handle:item.output.Handle,title:item.output.Title,sku:item.output['Variant SKU'],price:item.output['Variant Price'],stock:item.output['Variant Inventory Qty'],status:item.output.Status,issues:item.rowIssues}))
  };
}

export function buildAuditRows(result){
  return result.issues.map(issue=>({Severity:issue.severity.toUpperCase(),Code:issue.code,'Source row':issue.sourceRow,Handle:issue.handle,Field:issue.field,Finding:issue.message}));
}

export function buildRecipe(result,config={}){
  return {product:'CatalogPatch',version:VERSION,createdAt:new Date().toISOString(),source:result.source,mapping:result.mapping,defaults:{vendor:config.defaultVendor||'',status:config.defaultStatus||'draft'},summary:result.summary};
}
