// ---- API client ----
const API = {
  async get(path){ const r = await fetch('/api'+path); if(!r.ok) throw new Error(await r.text()); return r.json(); },
  async post(path, body){ const r = await fetch('/api'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); },
  async put(path, body){ const r = await fetch('/api'+path,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); },
  async del(path){ const r = await fetch('/api'+path,{method:'DELETE'}); if(!r.ok) throw new Error(await r.text()); return r.json(); },
};

// ---- Currency / formatting ----
const RIYAL = '﷼';
function money(v){ return (v==null||isNaN(v)) ? '—' : Number(v).toFixed(2)+' '+RIYAL; }
function num(v,d=0){ return (v==null||isNaN(v)) ? '—' : Number(v).toFixed(d); }
function fmtDate(ts){ const d=new Date(ts); return d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); }
function fmtDateTime(ts){ return fmtDate(ts)+' · '+new Date(ts).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}); }
function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---- Type chip ----
function chip(type){
  if(!type) return `<span class="chip dim" style="color:var(--paper-dim)"><span class="dot"></span>Untyped</span>`;
  return `<span class="chip" style="color:${type.color}"><span class="dot"></span>${esc(type.name)}</span>`;
}

// ---- Nav ----
function renderNav(active){
  const links = [
    ['/', 'Dashboard', 'index'],
    ['/collection', 'Collection', 'collection'],
    ['/board', 'The Board', 'board'],
  ];
  return `<nav><div class="nav-inner">
    <a class="logo" href="/">Tuna<span>Ledger</span></a>
    <div class="links">
      ${links.map(([h,l,id])=>`<a href="${h}" class="${id===active?'active':''}">${l}</a>`).join('')}
    </div>
    <div class="cta">
      <a href="/log" class="${active==='log'?'active':''}">＋ Log a Meal</a>
    </div>
  </div></nav>`;
}

function initNav(active){
  document.getElementById('nav').innerHTML = renderNav(active);
}
