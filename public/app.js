const header=document.querySelector('#header'),nav=document.querySelector('#navigation'),menu=document.querySelector('.menu-toggle'),service=document.querySelector('.service-toggle'),dropdown=document.querySelector('#services-menu');
function closeServices(){service.setAttribute('aria-expanded','false');dropdown.hidden=true;}
function closeMenu(){menu.setAttribute('aria-expanded','false');nav.classList.remove('open');closeServices();}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);header.classList.remove('header-hidden');if(!open)closeServices();});
service.addEventListener('click',()=>{const open=service.getAttribute('aria-expanded')!=='true';service.setAttribute('aria-expanded',String(open));dropdown.hidden=!open;header.classList.remove('header-hidden');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!dropdown.hidden){closeServices();service.focus();}else if(nav.classList.contains('open')){closeMenu();menu.focus();}}});
document.addEventListener('click',e=>{if(!e.target.closest('.services-nav'))closeServices();if(!e.target.closest('#header'))closeMenu();});
document.querySelector('.services-nav').addEventListener('focusout',e=>{if(!e.currentTarget.contains(e.relatedTarget))closeServices();});
window.matchMedia('(min-width:761px)').addEventListener('change',closeMenu);
let previous=window.scrollY;
window.addEventListener('scroll',()=>{const y=window.scrollY;const hold=nav.classList.contains('open')||!dropdown.hidden||header.contains(document.activeElement);header.classList.toggle('header-hidden',y>150&&y>previous+2&&!hold);previous=y;},{passive:true});
header.addEventListener('focusin',()=>header.classList.remove('header-hidden'));
document.querySelectorAll('.faq button').forEach(button=>button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));const answer=document.getElementById(button.getAttribute('aria-controls'));answer.classList.toggle('open',open);answer.inert=!open;}));
const form=document.querySelector('#inquiry-form');
if(form){const feedback=document.querySelector('#form-feedback'),submit=form.querySelector('[type=submit]');let ready=false;
 const tell=(message,error=true)=>{feedback.textContent=message;feedback.classList.toggle('error',error);feedback.classList.toggle('success',!error);};
 async function token(){const response=await fetch('/api/csrf',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error('The secure form could not be initialized. Please retry or contact MohFam directly.');const data=await response.json();form.elements.csrf.value=data.token;ready=true;}
 token().then(()=>{feedback.textContent='Email delivery is disabled in this local preview.';}).catch(e=>tell(e.message));
 form.addEventListener('submit',async event=>{event.preventDefault();if(!form.reportValidity())return;submit.disabled=true;feedback.className='form-feedback';feedback.textContent='Checking your inquiry…';
 try{if(!ready)await token();const fields=Object.fromEntries(new FormData(form));fields.consent=form.elements.consent.checked;const response=await fetch('/api/inquiry',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(fields)});const result=await response.json();if(!response.ok){tell(result.message||'Your inquiry could not be submitted. Your entries are still here.');if(response.status===403){ready=false;await token();}return;}tell(result.message,false);form.reset();ready=false;await token();}
 catch{tell('Connection problem. Your inquiry was not confirmed and your entries are still here. Please retry or contact MohFam directly.');}
 finally{submit.disabled=false;}
 });
}
