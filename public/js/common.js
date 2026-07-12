// ---- API client (attaches the current user's access token) ----
const API = {
  async _headers(extra = {}) {
    const token = await Auth.getAccessToken();
    return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
  },
  async get(path){ const r = await fetch('/api'+path, { headers: await API._headers() }); if(!r.ok) throw new Error(await r.text()); return r.json(); },
  async post(path, body){ const r = await fetch('/api'+path,{method:'POST',headers: await API._headers({'Content-Type':'application/json'}),body:JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); },
  async put(path, body){ const r = await fetch('/api'+path,{method:'PUT',headers: await API._headers({'Content-Type':'application/json'}),body:JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); },
  async del(path){ const r = await fetch('/api'+path,{method:'DELETE', headers: await API._headers()}); if(!r.ok) throw new Error(await r.text()); return r.json(); },
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
function renderNav(active, email){
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
      ${email ? `<span class="user-email">${esc(email)}</span><button type="button" id="logoutBtn" class="logout-btn">Log out</button>` : ''}
    </div>
  </div></nav>`;
}

// Guards the page (redirects to /login if signed out), mounts the nav with
// the current user's email, and wires the logout button. Returns the
// session, or null if the page is about to redirect.
async function initNav(active){
  const session = await Auth.guard();
  if(!session) return null;
  document.getElementById('nav').innerHTML = renderNav(active, session.user.email);
  document.getElementById('logoutBtn').onclick = () => Auth.signOut();
  return session;
}
