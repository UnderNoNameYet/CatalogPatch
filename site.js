(() => {
  const header=document.querySelector('.site-header');
  const menu=document.querySelector('.menu-button');
  menu?.addEventListener('click',()=>{const open=header.classList.toggle('menu-open');menu.setAttribute('aria-expanded',String(open));});
  document.querySelectorAll('#siteNav a').forEach(link=>link.addEventListener('click',()=>{header?.classList.remove('menu-open');menu?.setAttribute('aria-expanded','false');}));
  const meter=document.querySelector('#siteMeter');
  const update=()=>{const max=document.documentElement.scrollHeight-innerHeight;if(meter)meter.style.transform=`scaleX(${max>0?scrollY/max:0})`;};
  addEventListener('scroll',update,{passive:true});update();
  const demos={woocommerce:{label:'WOOCOMMERCE',headers:'Type, SKU, Name, Regular price',sku:'LINEN-S',price:'39.99'},squarespace:{label:'SQUARESPACE',headers:'Product Type, Product URL, Title, Price',sku:'MUG-CREAM',price:'24.00'},square:{label:'SQUARE',headers:'Token, Item Name, Variation Name, Price',sku:'LAMP-BRASS',price:'69.00'}};
  document.querySelectorAll('[data-source-demo]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-source-demo]').forEach(item=>item.classList.toggle('active',item===button));const data=demos[button.dataset.sourceDemo];document.querySelector('#machineSource').textContent=data.label;document.querySelector('#rawHeaders').textContent=data.headers;document.querySelector('#demoSku').textContent=data.sku;document.querySelector('#demoPrice').textContent=data.price;document.querySelector('.hero-machine').animate([{opacity:.72,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:260,easing:'ease-out'});}));
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{}));
})();
