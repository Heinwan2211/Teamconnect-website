/**
 * Branded HTML for the DISC assessment feature.
 * Team Connect colours: deep green #1a4a2e, gold #c9a84c.
 * All pages are self-contained (inline CSS/JS) so they need no build step.
 */

import { BOXES } from './scoring.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const BRAND_CSS = `
  :root{
    --green:#1a4a2e; --green-dark:#123520; --gold:#c9a84c; --gold-dark:#a8893a;
    --ink:#1f2a24; --muted:#6b7a72; --line:#e4ebe7; --bg:#f6f8f7; --card:#ffffff;
    --d:#c0392b; --i:#e2a93b; --s:#2e8b57; --c:#2c6fb0;
  }
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    margin:0;background:var(--bg);color:var(--ink);line-height:1.5;-webkit-font-smoothing:antialiased}
  .wrap{max-width:860px;margin:0 auto;padding:24px 16px 72px}
  .brandbar{background:var(--green);color:#fff;padding:14px 16px}
  .brandbar .inner{max-width:860px;margin:0 auto;display:flex;align-items:center;gap:12px}
  .brandbar .logo{font-weight:800;letter-spacing:.3px;font-size:18px}
  .brandbar .tag{color:#d7e4db;font-size:12px}
  h1{font-size:22px;margin:18px 0 4px;color:var(--green)}
  h2{font-size:16px;color:var(--green);margin:28px 0 10px}
  .sub{color:var(--muted);font-size:14px;margin:0 0 18px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin:0 0 16px;box-shadow:0 1px 2px rgba(20,53,32,.04)}
  label{font-size:14px;font-weight:600;color:var(--ink)}
  input[type=text],input[type=password],select{width:100%;padding:10px 12px;border:1px solid var(--line);
    border-radius:8px;font-size:15px;background:#fff;margin-top:6px}
  .btn{display:inline-block;background:var(--green);color:#fff;border:none;border-radius:8px;
    padding:11px 18px;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none}
  .btn:hover{background:var(--green-dark)}
  .btn.gold{background:var(--gold);color:#2a2410}
  .btn.gold:hover{background:var(--gold-dark)}
  .btn.ghost{background:#eef3f0;color:var(--green)}
  .muted{color:var(--muted);font-size:13px}
  .box{border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:0 0 14px;background:#fff}
  .box .bx-h{font-weight:700;color:var(--green);font-size:13px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  @media(max-width:600px){.grid2{grid-template-columns:1fr}}
  .opt{display:flex;align-items:flex-start;gap:8px;padding:6px 0;font-size:14px;font-weight:400;cursor:pointer}
  .opt input{margin-top:3px}
  .col-h{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:4px}
  .col-h.most{color:var(--green)} .col-h.least{color:var(--gold-dark)}
  .err{color:#b00;font-size:13px}
  .pill{display:inline-block;padding:2px 9px;border-radius:100px;font-size:12px;font-weight:600}
  .pill.pending{background:#fbf2e3;color:#9a6b12}
  .pill.submitted{background:#e6f4ec;color:#1e7a44}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{text-align:left;padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:top}
  .bars{display:flex;gap:12px;align-items:flex-end;height:84px;margin:8px 0 2px}
  .bcol{display:flex;flex-direction:column;align-items:center;width:40px}
  .bval{font-size:11px;font-weight:700}
  .bar{width:26px;border-radius:4px 4px 0 0}
  .blab{font-size:11px;color:var(--muted);margin-top:4px;font-weight:700}
  .bD{background:var(--d)} .bI{background:var(--i)} .bS{background:var(--s)} .bC{background:var(--c)}
  .linkbox{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .linkbox input{font-family:monospace;font-size:12px}
  .foot{color:var(--muted);font-size:12px;margin-top:24px;border-top:1px solid var(--line);padding-top:14px}
`;

function brandBar() {
  return `<div class="brandbar"><div class="inner">
    <span class="logo">TEAM CONNECT</span>
    <span class="tag">Cohesion through Experience</span>
  </div></div>`;
}

/* ------------------------------------------------------------------ */
/* Client assessment page                                             */
/* ------------------------------------------------------------------ */

export function assessmentPage({ token, companyName, mode, askName }) {
  const boxesHtml = BOXES.map((box, i) => {
    const most = box.map((p, j) =>
      `<label class="opt"><input type="radio" name="m${i}" value="${j}"> ${esc(p.t)}</label>`
    ).join('');
    const least = box.map((p, j) =>
      `<label class="opt"><input type="radio" name="l${i}" value="${j}"> ${esc(p.t)}</label>`
    ).join('');
    return `<div class="box" data-box="${i}">
      <div class="bx-h">Box ${i + 1}</div>
      <div class="grid2">
        <div><div class="col-h most">Most like me</div>${most}</div>
        <div><div class="col-h least">Least like me</div>${least}</div>
      </div>
      <div class="err" id="err${i}" style="display:none">Pick one Most and one Least — and they must be different phrases.</div>
    </div>`;
  }).join('');

  const nameField = askName
    ? `<div class="card"><label for="respName">Your full name</label>
        <input type="text" id="respName" placeholder="e.g. Thandi Mokoena" autocomplete="name"></div>`
    : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DISC Profile — Team Connect</title>
<meta name="robots" content="noindex,nofollow">
<style>${BRAND_CSS}</style></head><body>
${brandBar()}
<div class="wrap">
  <h1>DISC Personality Profile</h1>
  <p class="sub">${companyName ? esc(companyName) + ' · ' : ''}For each box below, choose the phrase that is <b>most</b> like you and the one that is <b>least</b> like you. Pick the setting your answers should reflect, go with your first instinct, and aim for about seven minutes. Your answers are confidential and reviewed with your facilitator.</p>

  <div class="card">
    <label for="setting">Answer as you are at…</label>
    <select id="setting">
      <option value="Work">Work</option>
      <option value="Home">Home</option>
      <option value="Social">Social</option>
      <option value="Other">Other</option>
    </select>
  </div>
  ${nameField}

  <form id="discForm">${boxesHtml}</form>

  <div class="card">
    <div class="err" id="formErr" style="display:none;margin-bottom:10px"></div>
    <button class="btn gold" id="submitBtn" type="button">Submit my assessment</button>
    <span class="muted" id="progress" style="margin-left:12px"></span>
  </div>
  <div class="foot">Team Connect · Synergistic Consultants (Pty) Ltd t/a Team Connect · Tulbagh, Western Cape</div>
</div>
<script>
  var TOKEN=${JSON.stringify(token)}, ASK_NAME=${askName ? 'true' : 'false'}, N=${BOXES.length};
  function countDone(){var d=0;for(var i=0;i<N;i++){if(document.querySelector('input[name="m'+i+'"]:checked')&&document.querySelector('input[name="l'+i+'"]:checked'))d++;}return d;}
  function updateProgress(){document.getElementById('progress').textContent=countDone()+' of '+N+' boxes done';}
  document.getElementById('discForm').addEventListener('change',updateProgress);
  updateProgress();
  document.getElementById('submitBtn').addEventListener('click',function(){
    var answers=[],bad=-1;
    for(var i=0;i<N;i++){
      var m=document.querySelector('input[name="m'+i+'"]:checked');
      var l=document.querySelector('input[name="l'+i+'"]:checked');
      var e=document.getElementById('err'+i);
      if(!m||!l||m.value===l.value){e.style.display='block';if(bad<0)bad=i;answers.push(null);}
      else{e.style.display='none';answers.push({most:+m.value,least:+l.value});}
    }
    var fe=document.getElementById('formErr');
    if(bad>=0){fe.style.display='block';fe.textContent='Please finish every box — check the ones in red.';document.getElementById('err'+bad).scrollIntoView({behavior:'smooth',block:'center'});return;}
    var name=ASK_NAME?(document.getElementById('respName').value||'').trim():'';
    if(ASK_NAME&&!name){fe.style.display='block';fe.textContent='Please enter your name.';window.scrollTo({top:0,behavior:'smooth'});return;}
    fe.style.display='none';
    var btn=document.getElementById('submitBtn');btn.disabled=true;btn.textContent='Submitting…';
    fetch('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({token:TOKEN,setting:document.getElementById('setting').value,name:name,answers:answers})})
    .then(function(r){return r.json();})
    .then(function(res){
      if(res.ok){document.querySelector('.wrap').innerHTML='<h1>Thank you '+(res.name?esc(res.name):'')+'</h1><p class="sub">Your DISC assessment has been received. Your facilitator will take you through the results during your session.</p><div class="foot">Team Connect · Cohesion through Experience</div>';window.scrollTo(0,0);}
      else{btn.disabled=false;btn.textContent='Submit my assessment';fe.style.display='block';fe.textContent=res.error||'Something went wrong — please try again.';}
    })
    .catch(function(){btn.disabled=false;btn.textContent='Submit my assessment';fe.style.display='block';fe.textContent='Network error — please try again.';});
    function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  });
</script>
</body></html>`;
}

/* ------------------------------------------------------------------ */
/* Invalid / already-done states                                      */
/* ------------------------------------------------------------------ */

export function noticePage(title, message) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — Team Connect</title><meta name="robots" content="noindex,nofollow">
<style>${BRAND_CSS}</style></head><body>${brandBar()}
<div class="wrap"><h1>${esc(title)}</h1><p class="sub">${esc(message)}</p>
<div class="foot">Team Connect · Cohesion through Experience</div></div></body></html>`;
}

/* ------------------------------------------------------------------ */
/* Facilitator login                                                  */
/* ------------------------------------------------------------------ */

export function loginPage(error) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Facilitator sign in — Team Connect</title><meta name="robots" content="noindex,nofollow">
<style>${BRAND_CSS}</style></head><body>${brandBar()}
<div class="wrap" style="max-width:420px">
  <h1>Facilitator sign in</h1>
  <p class="sub">DISC dashboard — Team Connect facilitators only.</p>
  <form class="card" method="POST" action="/api/login">
    <label for="pw">Password</label>
    <input type="password" id="pw" name="password" autofocus>
    ${error ? `<div class="err" style="margin-top:8px">${esc(error)}</div>` : ''}
    <div style="margin-top:14px"><button class="btn" type="submit">Sign in</button></div>
  </form>
  <div class="foot">Team Connect · Cohesion through Experience</div>
</div></body></html>`;
}

/* ------------------------------------------------------------------ */
/* Facilitator dashboard (admin + viewer)                             */
/* ------------------------------------------------------------------ */

export function dashboardPage(origin) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DISC Dashboard — Team Connect</title><meta name="robots" content="noindex,nofollow">
<style>${BRAND_CSS}
  .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
  .company{border:1px solid var(--line);border-radius:12px;margin:0 0 16px;overflow:hidden}
  .company>summary{list-style:none;cursor:pointer;padding:14px 18px;background:#fff;font-weight:700;color:var(--green);display:flex;justify-content:space-between;align-items:center}
  .company>summary::-webkit-details-marker{display:none}
  .company .body{padding:6px 18px 18px}
  .ov{display:flex;gap:4px;align-items:center;margin:2px 0}
  .ovbar{height:11px;border-radius:3px}
</style></head><body>${brandBar()}
<div class="wrap" style="max-width:1000px">
  <div class="row" style="justify-content:space-between">
    <div><h1 style="margin-bottom:0">DISC Dashboard</h1><p class="muted">Facilitator view · clients never see scores here.</p></div>
    <a class="btn ghost" href="/api/logout">Sign out</a>
  </div>

  <div class="card">
    <h2 style="margin-top:4px">Create links</h2>
    <div class="row">
      <input type="text" id="coName" placeholder="Company name" style="flex:1;min-width:180px">
      <button class="btn" id="addCo">Add company</button>
    </div>
    <div id="coSelectWrap" style="margin-top:14px;display:none">
      <div class="row">
        <select id="coSelect" style="flex:1;min-width:180px"></select>
      </div>
      <div class="row" style="margin-top:10px">
        <input type="text" id="personName" placeholder="Person's name (individual link)" style="flex:1;min-width:180px">
        <button class="btn gold" id="addPerson">Create individual link</button>
        <button class="btn ghost" id="addCompanyLink">Create shared company link</button>
      </div>
      <div id="newLink" class="muted" style="margin-top:8px"></div>
    </div>
  </div>

  <h2>Companies &amp; results</h2>
  <div id="companies"><p class="muted">Loading…</p></div>

  <div class="foot">Team Connect · Synergistic Consultants (Pty) Ltd t/a Team Connect</div>
</div>
<script>
  var ORIGIN=${JSON.stringify(origin)};
  var DATA={companies:[]};
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function bar(letter,val,max){var h=Math.max(4,Math.round((val/(max||1))*62));
    return '<div class="bcol"><div class="bval">'+val+'</div><div class="bar b'+letter+'" style="height:'+h+'px"></div><div class="blab">'+letter+'</div></div>';}
  function graph(title,sc){var max=Math.max(sc.D,sc.I,sc.S,sc.C,1);
    return '<div><div class="muted" style="font-weight:700">'+title+'</div><div class="bars">'+bar('D',sc.D,max)+bar('I',sc.I,max)+bar('S',sc.S,max)+bar('C',sc.C,max)+'</div></div>';}

  function load(){
    fetch('/api/admin/data').then(function(r){return r.json();}).then(function(d){
      DATA=d;renderCompanies();renderSelect();
    }).catch(function(){document.getElementById('companies').innerHTML='<p class="err">Could not load data.</p>';});
  }

  function renderSelect(){
    var sel=document.getElementById('coSelect');
    if(!DATA.companies.length){document.getElementById('coSelectWrap').style.display='none';return;}
    document.getElementById('coSelectWrap').style.display='block';
    sel.innerHTML=DATA.companies.map(function(c){return '<option value="'+c.id+'">'+esc(c.name)+'</option>';}).join('');
  }

  function renderCompanies(){
    var el=document.getElementById('companies');
    if(!DATA.companies.length){el.innerHTML='<p class="muted">No companies yet — add one above to create your first link.</p>';return;}
    el.innerHTML=DATA.companies.map(function(c){
      var done=c.respondents.filter(function(r){return r.submitted;});
      var rows=c.respondents.map(function(r){
        var res='<span class="muted">not submitted</span>';
        if(r.submitted){res='<div class="row" style="gap:28px">'+graph('Most',r.M)+graph('Least',r.L)+'</div>'+
          '<a class="btn ghost" style="padding:5px 10px;font-size:13px" href="/report?t='+encodeURIComponent(r.token)+'&a='+r.assessmentId+'" target="_blank">Open PDF report</a>';}
        var link=ORIGIN+'/assessment?t='+encodeURIComponent(r.token);
        var linkCell=r.submitted?'—':'<div class="linkbox"><input type="text" readonly value="'+esc(link)+'" onclick="this.select()" style="width:230px"><button class="btn ghost" style="padding:5px 10px;font-size:12px" onclick="navigator.clipboard.writeText(\\''+esc(link)+'\\');this.textContent=\\'Copied\\'">Copy</button></div>';
        return '<tr><td>'+esc(r.name||'(awaiting name)')+'<div class="muted">'+(r.mode==='company'?'shared link':'individual')+'</div></td>'+
          '<td>'+(r.submitted?'<span class="pill submitted">done</span>':'<span class="pill pending">pending</span>')+'</td>'+
          '<td>'+linkCell+'</td><td>'+res+'</td></tr>';
      }).join('');
      var overlay=done.length?teamOverlay(done):'<p class="muted">No results yet.</p>';
      return '<details class="company"><summary><span>'+esc(c.name)+'</span><span class="muted">'+done.length+' of '+c.respondents.length+' done</span></summary>'+
        '<div class="body"><table><thead><tr><th>Person</th><th>Status</th><th>Link</th><th>Results (Graph 1 / Graph 2)</th></tr></thead><tbody>'+rows+'</tbody></table>'+
        '<h2>Team overlay — Graph 1 (Most)</h2>'+overlay+'</div></details>';
    }).join('');
  }

  function teamOverlay(done){
    var max=1;done.forEach(function(r){['D','I','S','C'].forEach(function(k){if(r.M[k]>max)max=r.M[k];});});
    return ['D','I','S','C'].map(function(letter){
      var rows=done.map(function(r){var v=r.M[letter];var w=Math.max(4,Math.round((v/max)*280));
        return '<div class="ov"><div class="muted" style="width:120px">'+esc(r.name||'—')+'</div><div class="ovbar b'+letter+'" style="width:'+w+'px"></div><div style="margin-left:6px;font-size:12px">'+v+'</div></div>';}).join('');
      return '<div style="margin-bottom:12px"><b>'+letter+'</b>'+rows+'</div>';
    }).join('');
  }

  document.getElementById('addCo').addEventListener('click',function(){
    var name=document.getElementById('coName').value.trim();if(!name)return;
    fetch('/api/admin/company',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name})})
      .then(function(r){return r.json();}).then(function(){document.getElementById('coName').value='';load();});
  });
  document.getElementById('addPerson').addEventListener('click',function(){
    var companyId=document.getElementById('coSelect').value;var name=document.getElementById('personName').value.trim();
    if(!companyId||!name)return;
    fetch('/api/admin/person',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({companyId:companyId,name:name})})
      .then(function(r){return r.json();}).then(function(res){showNew(res);document.getElementById('personName').value='';load();});
  });
  document.getElementById('addCompanyLink').addEventListener('click',function(){
    var companyId=document.getElementById('coSelect').value;if(!companyId)return;
    fetch('/api/admin/person',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({companyId:companyId,mode:'company'})})
      .then(function(r){return r.json();}).then(function(res){showNew(res);load();});
  });
  function showNew(res){if(!res.token)return;var link=ORIGIN+'/assessment?t='+encodeURIComponent(res.token);
    document.getElementById('newLink').innerHTML='New link: <input type="text" readonly value="'+esc(link)+'" onclick="this.select()" style="width:260px;font-family:monospace;font-size:12px"> <button class="btn ghost" style="padding:4px 10px;font-size:12px" onclick="navigator.clipboard.writeText(\\''+esc(link)+'\\');this.textContent=\\'Copied\\'">Copy</button>';}

  load();
</script>
</body></html>`;
}

/* ------------------------------------------------------------------ */
/* Printable single-person report (browser "Save as PDF")             */
/* ------------------------------------------------------------------ */

export function reportPage(a) {
  function graph(title, sc) {
    const max = Math.max(sc.D, sc.I, sc.S, sc.C, 1);
    const bar = (letter, v) => {
      const h = Math.max(6, Math.round((v / max) * 120));
      return `<div class="bcol"><div class="bval">${v}</div><div class="bar b${letter}" style="height:${h}px"></div><div class="blab">${letter}</div></div>`;
    };
    return `<div class="gcard"><div class="gtitle">${esc(title)}</div>
      <div class="bars" style="height:150px">${bar('D', sc.D)}${bar('I', sc.I)}${bar('S', sc.S)}${bar('C', sc.C)}</div></div>`;
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DISC Report — ${esc(a.name || 'Participant')}</title><meta name="robots" content="noindex,nofollow">
<style>${BRAND_CSS}
  .gcard{flex:1;border:1px solid var(--line);border-radius:12px;padding:16px;text-align:center}
  .gtitle{font-weight:700;color:var(--green);margin-bottom:6px}
  .bars{justify-content:center;gap:18px}
  .bar{width:34px}
  .report-head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid var(--gold);padding-bottom:10px}
  @media print{.noprint{display:none}body{background:#fff}.wrap{padding-top:8px}}
</style></head><body>
<div class="wrap">
  <div class="report-head">
    <div><div style="font-weight:800;font-size:22px;color:var(--green)">TEAM CONNECT</div>
      <div class="muted">Cohesion through Experience · Bringing Teams Together</div></div>
    <div class="noprint"><button class="btn gold" onclick="window.print()">Save as PDF</button></div>
  </div>
  <h1>DISC Personality Profile</h1>
  <table style="max-width:420px"><tbody>
    <tr><td style="font-weight:600;border:none;padding:3px 0">Name</td><td style="border:none;padding:3px 0">${esc(a.name || '—')}</td></tr>
    <tr><td style="font-weight:600;border:none;padding:3px 0">Company</td><td style="border:none;padding:3px 0">${esc(a.company || '—')}</td></tr>
    <tr><td style="font-weight:600;border:none;padding:3px 0">Setting</td><td style="border:none;padding:3px 0">${esc(a.setting || '—')}</td></tr>
    <tr><td style="font-weight:600;border:none;padding:3px 0">Date</td><td style="border:none;padding:3px 0">${esc(a.date || '')}</td></tr>
  </tbody></table>
  <h2>Graph 1 — “This is expected of me” (Most)</h2>
  <div class="row" style="display:flex;gap:18px">${graph('D I S C', a.M)}</div>
  <h2>Graph 2 — “This is me” (Least)</h2>
  <div class="row" style="display:flex;gap:18px">${graph('D I S C', a.L)}</div>
  <div class="foot">Facilitated by Team Connect · Synergistic Consultants (Pty) Ltd t/a Team Connect · Tulbagh, Western Cape</div>
</div></body></html>`;
}
