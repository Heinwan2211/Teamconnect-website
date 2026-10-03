/**
 * Team Connect — DISC assessment Worker.
 *
 * Sits in front of the existing static site. It handles a few new routes
 * and passes everything else to the static assets, so none of the
 * existing pages change.
 *
 *   GET  /assessment?t=TOKEN     branded, token-gated questionnaire
 *   POST /api/submit             score + store a submission
 *   GET  /dashboard              facilitator dashboard (password-gated)
 *   POST /api/login              set the facilitator session
 *   GET  /api/logout             clear it
 *   POST /api/admin/company      create a company           (auth)
 *   POST /api/admin/person       create an individual or shared link (auth)
 *   GET  /api/admin/data         everything for the dashboard (auth)
 *   GET  /report?t=..&a=..       printable branded report   (auth)
 *   GET  /api/results            JSON for Claude            (Bearer key)
 *
 * Bindings (wrangler.jsonc / secrets):
 *   DB                 D1 database
 *   DASHBOARD_PASSWORD secret — the facilitator password
 *   SESSION_SECRET     secret — signs the session cookie
 *   CLAUDE_API_KEY     secret — Bearer token for /api/results
 */

import { score } from './scoring.js';
import { assessmentPage, noticePage, loginPage, dashboardPage, reportPage } from './pages.js';

const html = (body, status = 200) =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

function uid(n = 16) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}
function token() {
  // short, unambiguous, URL-safe
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  const A = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  return [...b].map(x => A[x % A.length]).join('');
}

/* ---------- session cookie (HMAC-signed) ---------- */

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function makeSession(env) {
  const exp = Date.now() + 30 * 24 * 3600 * 1000;
  const sig = await hmac(env.SESSION_SECRET || 'dev', String(exp));
  return `${exp}.${sig}`;
}
async function validSession(env, cookieHeader) {
  const m = /(?:^|;\s*)tc_disc=([^;]+)/.exec(cookieHeader || '');
  if (!m) return false;
  const [exp, sig] = decodeURIComponent(m[1]).split('.');
  if (!exp || !sig || Date.now() > Number(exp)) return false;
  const expect = await hmac(env.SESSION_SECRET || 'dev', exp);
  // constant-ish comparison
  return sig.length === expect.length && sig === expect;
}
function cookieHeader(value, maxAgeSec) {
  const parts = [`tc_disc=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax'];
  parts.push(`Max-Age=${maxAgeSec}`);
  return parts.join('; ');
}

/* ---------- main ---------- */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = url.origin;

    try {
      if (path === '/assessment') return await handleAssessment(request, env, url);
      if (path === '/api/submit' && request.method === 'POST') return await handleSubmit(request, env);

      if (path === '/dashboard') return await handleDashboard(request, env, origin);
      if (path === '/api/login' && request.method === 'POST') return await handleLogin(request, env);
      if (path === '/api/logout') return handleLogout();

      if (path.startsWith('/api/admin/')) return await handleAdmin(request, env, path);
      if (path === '/report') return await handleReport(request, env);
      if (path === '/api/results') return await handleResults(request, env);

      // everything else → the existing static site
      return env.ASSETS.fetch(request);
    } catch (err) {
      return json({ ok: false, error: String(err && err.message || err) }, 500);
    }
  }
};

/* ---------- client assessment ---------- */

async function handleAssessment(request, env, url) {
  const t = url.searchParams.get('t');
  if (!t) return html(noticePage('Link not valid', 'This assessment link is missing its code. Please use the exact link your facilitator sent you.'), 400);
  const person = await env.DB.prepare(
    `SELECT p.*, c.name AS company_name FROM people p JOIN companies c ON c.id=p.company_id WHERE p.token=?`
  ).bind(t).first();
  if (!person) return html(noticePage('Link not valid', 'We could not find this assessment link. Please check the link your facilitator sent you.'), 404);

  if (person.mode === 'individual' && person.status === 'submitted') {
    return html(noticePage('Already completed', 'This assessment has already been submitted. Thank you — your facilitator has your results.'));
  }
  return html(assessmentPage({
    token: t,
    companyName: person.company_name,
    mode: person.mode,
    askName: person.mode === 'company'
  }));
}

async function handleSubmit(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !body.token || !Array.isArray(body.answers)) return json({ ok: false, error: 'Bad request.' }, 400);

  const person = await env.DB.prepare(`SELECT * FROM people WHERE token=?`).bind(body.token).first();
  if (!person) return json({ ok: false, error: 'This link is not valid.' }, 404);
  if (person.mode === 'individual' && person.status === 'submitted') {
    return json({ ok: false, error: 'This assessment has already been submitted.' }, 409);
  }

  // validate answers
  if (body.answers.length !== 24) return json({ ok: false, error: 'Please answer every box.' }, 400);
  for (const a of body.answers) {
    if (!a || typeof a.most !== 'number' || typeof a.least !== 'number' ||
        a.most < 0 || a.most > 3 || a.least < 0 || a.least > 3 || a.most === a.least) {
      return json({ ok: false, error: 'Each box needs one Most and one different Least.' }, 400);
    }
  }

  const sc = score(body.answers);
  const name = person.mode === 'company' ? String(body.name || '').trim().slice(0, 120) : person.name;
  if (person.mode === 'company' && !name) return json({ ok: false, error: 'Please enter your name.' }, 400);

  const aid = uid();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO assessments
      (id, person_id, company_id, token, respondent_name, setting, submitted_at,
       m_d,m_i,m_s,m_c,m_x, l_d,l_i,l_s,l_c,l_x, answers)
     VALUES (?,?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?, ?)`
  ).bind(
    aid, person.id, person.company_id, body.token, name, String(body.setting || '').slice(0, 40), now,
    sc.M.D, sc.M.I, sc.M.S, sc.M.C, sc.M.X,
    sc.L.D, sc.L.I, sc.L.S, sc.L.C, sc.L.X,
    JSON.stringify(body.answers)
  ).run();

  if (person.mode === 'individual') {
    await env.DB.prepare(`UPDATE people SET status='submitted' WHERE id=?`).bind(person.id).run();
  }
  return json({ ok: true, name });
}

/* ---------- facilitator auth ---------- */

async function handleLogin(request, env) {
  const form = await request.formData();
  const pw = String(form.get('password') || '');
  if (!env.DASHBOARD_PASSWORD || pw !== env.DASHBOARD_PASSWORD) {
    return html(loginPage('Incorrect password.'), 401);
  }
  const session = await makeSession(env);
  return new Response(null, {
    status: 302,
    headers: { 'Location': '/dashboard', 'Set-Cookie': cookieHeader(session, 30 * 24 * 3600) }
  });
}
function handleLogout() {
  return new Response(null, { status: 302, headers: { 'Location': '/dashboard', 'Set-Cookie': cookieHeader('', 0) } });
}
async function requireAuth(request, env) {
  return await validSession(env, request.headers.get('Cookie'));
}

async function handleDashboard(request, env, origin) {
  if (!(await requireAuth(request, env))) return html(loginPage(''));
  return html(dashboardPage(origin));
}

/* ---------- admin APIs ---------- */

async function handleAdmin(request, env, path) {
  if (!(await requireAuth(request, env))) return json({ ok: false, error: 'Not signed in.' }, 401);

  if (path === '/api/admin/company' && request.method === 'POST') {
    const b = await request.json();
    const name = String(b.name || '').trim().slice(0, 160);
    if (!name) return json({ ok: false, error: 'Name required.' }, 400);
    const id = uid();
    await env.DB.prepare(`INSERT INTO companies (id,name,created_at) VALUES (?,?,?)`)
      .bind(id, name, new Date().toISOString()).run();
    return json({ ok: true, id });
  }

  if (path === '/api/admin/person' && request.method === 'POST') {
    const b = await request.json();
    const companyId = String(b.companyId || '');
    const mode = b.mode === 'company' ? 'company' : 'individual';
    const name = mode === 'individual' ? String(b.name || '').trim().slice(0, 120) : null;
    if (!companyId) return json({ ok: false, error: 'Company required.' }, 400);
    if (mode === 'individual' && !name) return json({ ok: false, error: 'Name required.' }, 400);
    const co = await env.DB.prepare(`SELECT id FROM companies WHERE id=?`).bind(companyId).first();
    if (!co) return json({ ok: false, error: 'Unknown company.' }, 404);
    const id = uid(), tok = token();
    await env.DB.prepare(
      `INSERT INTO people (id,company_id,name,token,mode,status,created_at) VALUES (?,?,?,?,?,?,?)`
    ).bind(id, companyId, name, tok, mode, 'pending', new Date().toISOString()).run();
    return json({ ok: true, id, token: tok });
  }

  if (path === '/api/admin/data' && request.method === 'GET') {
    return await adminData(env);
  }
  return json({ ok: false, error: 'Not found.' }, 404);
}

async function adminData(env) {
  const companies = (await env.DB.prepare(`SELECT * FROM companies ORDER BY name`).all()).results || [];
  const people = (await env.DB.prepare(`SELECT * FROM people ORDER BY created_at`).all()).results || [];
  const assessments = (await env.DB.prepare(`SELECT * FROM assessments ORDER BY submitted_at`).all()).results || [];

  const aByToken = {};
  for (const a of assessments) (aByToken[a.token] = aByToken[a.token] || []).push(a);

  const toScore = (a) => ({
    assessmentId: a.id,
    M: { D: a.m_d, I: a.m_i, S: a.m_s, C: a.m_c },
    L: { D: a.l_d, I: a.l_i, S: a.l_s, C: a.l_c }
  });

  const out = companies.map(c => {
    const respondents = [];
    for (const p of people.filter(x => x.company_id === c.id)) {
      const subs = aByToken[p.token] || [];
      if (p.mode === 'individual') {
        const a = subs[0];
        respondents.push(a
          ? { name: p.name, token: p.token, mode: 'individual', submitted: true, ...toScore(a) }
          : { name: p.name, token: p.token, mode: 'individual', submitted: false });
      } else {
        // shared company link: always show the link row, plus one per submission
        respondents.push({ name: null, token: p.token, mode: 'company', submitted: false });
        for (const a of subs) {
          respondents.push({ name: a.respondent_name, token: p.token, mode: 'company', submitted: true, ...toScore(a) });
        }
      }
    }
    return { id: c.id, name: c.name, respondents };
  });
  return json({ companies: out });
}

/* ---------- printable report ---------- */

async function handleReport(request, env) {
  if (!(await requireAuth(request, env))) return html(loginPage(''));
  const url = new URL(request.url);
  const aid = url.searchParams.get('a');
  if (!aid) return html(noticePage('Report not found', 'No assessment was specified.'), 400);
  const a = await env.DB.prepare(
    `SELECT a.*, c.name AS company FROM assessments a JOIN companies c ON c.id=a.company_id WHERE a.id=?`
  ).bind(aid).first();
  if (!a) return html(noticePage('Report not found', 'That assessment no longer exists.'), 404);
  return html(reportPage({
    name: a.respondent_name,
    company: a.company,
    setting: a.setting,
    date: new Date(a.submitted_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }),
    M: { D: a.m_d, I: a.m_i, S: a.m_s, C: a.m_c },
    L: { D: a.l_d, I: a.l_i, S: a.l_s, C: a.l_c }
  }));
}

/* ---------- Claude read endpoint ---------- */

async function handleResults(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const m = /^Bearer\s+(.+)$/.exec(auth);
  if (!env.CLAUDE_API_KEY || !m || m[1] !== env.CLAUDE_API_KEY) {
    return json({ ok: false, error: 'Unauthorized.' }, 401);
  }
  const companies = (await env.DB.prepare(`SELECT * FROM companies ORDER BY name`).all()).results || [];
  const assessments = (await env.DB.prepare(`SELECT * FROM assessments ORDER BY submitted_at`).all()).results || [];
  const coName = {}; companies.forEach(c => coName[c.id] = c.name);
  return json({
    ok: true,
    generated_at: new Date().toISOString(),
    assessments: assessments.map(a => ({
      company: coName[a.company_id] || null,
      name: a.respondent_name,
      setting: a.setting,
      submitted_at: a.submitted_at,
      graph1_most: { D: a.m_d, I: a.m_i, S: a.m_s, C: a.m_c },
      graph2_least: { D: a.l_d, I: a.l_i, S: a.l_s, C: a.l_c }
    }))
  });
}
