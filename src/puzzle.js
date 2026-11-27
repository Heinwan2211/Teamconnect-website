/**
 * Team Connect — Puzzle Challenge (online team activity with a live scoreboard).
 *
 * Handles, inside the existing Worker:
 *   GET  /puzzle                       player page   (?client=CODE)
 *   GET  /puzzle/facilitator           facilitator console (sign-in = the DISC dashboard password)
 *   GET  /puzzle/projector?client=CODE big leaderboard for the room screen
 *   /api/puzzle/...                    JSON API (players use a team token, facilitator uses the session cookie)
 *
 * Passwords and answers live in puzzle-content.js and are only ever checked here.
 * All timing is server time. State is kept in D1 (see puzzle-schema.sql).
 */
import * as C from './puzzle-content.js';
import { PLAYER_HTML, FACILITATOR_HTML, PROJECTOR_HTML } from './puzzle-pages.js';

/* ============ ONE PLACE TO CHANGE THE NUMBERS ============ */
const CFG = {
  DURATION_MIN: 40,          // length of the countdown (override with the PUZZLE_DURATION_MIN variable, for testing)
  ADD_TIME_MIN: 5,           // what "ADD 5 MIN" adds
  POINTS_PER_CORRECT: 10,    // per correct answer (12 answers = 120)
  BONUS_PER_MINUTE_LEFT: 1,  // per FULL minute left when a team finishes all 12
  PENALTY_PER_WRONG: 1,      // per wrong password or wrong answer (score never below 0)
  MAX_TEAMS_PER_CLIENT: 60,
  TEAM_NAME_MAX: 30,
  TEST_CLIENT_CODE: 'TEST',
};
/* ========================================================= */

const TOTAL_Q = C.QUESTION_ORDER.length; // 12
const TOTAL_FILES = C.FILES.length;      // 6
const FILE_OF_Q = {};
C.FILES.forEach((f) => f.questions.forEach((q) => { FILE_OF_Q[q] = f.id; }));
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SEEN_THROTTLE_MS = 20000;

const durationMs = (env) => Math.round((Number(env.PUZZLE_DURATION_MIN) || CFG.DURATION_MIN) * 60000);

/* ---------------- responses ---------------- */
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'SAMEORIGIN' };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { ...SEC, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const page = (body) => new Response(body, {
  headers: { ...SEC, 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', 'x-robots-tag': 'noindex, nofollow' },
});

/* ---------------- small helpers ---------------- */
function randHex(bytes) {
  const b = new Uint8Array(bytes); crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
function makeCode() {
  const b = new Uint8Array(5); crypto.getRandomValues(b);
  return [...b].map((x) => CODE_CHARS[x % CODE_CHARS.length]).join('');
}
function cleanText(s, max) {
  return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
const run = (env, sql, ...b) => env.DB.prepare(sql).bind(...b).run();
const one = (env, sql, ...b) => env.DB.prepare(sql).bind(...b).first();
const all = async (env, sql, ...b) => (await env.DB.prepare(sql).bind(...b).all()).results || [];

/* ---------------- clock (all server time) ---------------- */
const elapsed = (cl, t) => Math.max(0, Math.min(cl.elapsed_base + (cl.running_since ? t - cl.running_since : 0), cl.duration_ms));
const timeLeft = (cl, t) => Math.max(0, cl.duration_ms - elapsed(cl, t));

const TICK_SQL = `UPDATE puzzle_clients SET status='ended', elapsed_base=duration_ms, running_since=NULL, ended_at=?1, ended_by='timer'
  WHERE status='running' AND running_since IS NOT NULL AND elapsed_base + (?1 - running_since) >= duration_ms`;

async function ensureTest(env, t) {
  await run(env, `INSERT OR IGNORE INTO puzzle_clients (code,name,test,created_at,duration_ms) VALUES (?,?,1,?,?)`,
    CFG.TEST_CLIENT_CODE, 'Facilitator test (dry run)', t, durationMs(env));
}
async function getClient(env, code, t) {
  code = normCode(code);
  if (!code) return null;
  if (code === CFG.TEST_CLIENT_CODE) await ensureTest(env, t);
  await run(env, TICK_SQL + ` AND code=?2`, t, code);
  return await one(env, `SELECT * FROM puzzle_clients WHERE code=?`, code);
}

async function clockAction(env, cl, action, t) {
  const code = cl.code;
  switch (action) {
    case 'start':
      if (cl.status === 'waiting') await run(env, `UPDATE puzzle_clients SET status='running', running_since=?, started_at=? WHERE code=? AND status='waiting'`, t, t, code);
      else if (cl.status === 'paused') await run(env, `UPDATE puzzle_clients SET status='running', running_since=? WHERE code=? AND status='paused'`, t, code);
      else return `Clock is already ${cl.status}.`;
      return null;
    case 'pause':
      if (cl.status !== 'running') return 'Clock is not running.';
      await run(env, `UPDATE puzzle_clients SET elapsed_base=?, running_since=NULL, status='paused' WHERE code=? AND status='running'`, elapsed(cl, t), code);
      return null;
    case 'add': {
      const d = cl.duration_ms + CFG.ADD_TIME_MIN * 60000;
      if (cl.status === 'ended' && cl.ended_by === 'timer') {
        // time ran out and the facilitator gave more: come back paused so the restart is deliberate
        await run(env, `UPDATE puzzle_clients SET duration_ms=?, status='paused', ended_by=NULL, ended_at=NULL WHERE code=?`, d, code);
      } else await run(env, `UPDATE puzzle_clients SET duration_ms=? WHERE code=?`, d, code);
      return null;
    }
    case 'end':
      if (cl.status === 'ended') return 'Already ended.';
      await run(env, `UPDATE puzzle_clients SET elapsed_base=?, running_since=NULL, status='ended', ended_at=?, ended_by='facilitator' WHERE code=? AND status!='ended'`, elapsed(cl, t), t, code);
      return null;
    case 'reset':
      await env.DB.batch([
        env.DB.prepare(`UPDATE puzzle_clients SET status='waiting', elapsed_base=0, running_since=NULL, started_at=NULL, ended_at=NULL, ended_by=NULL, duration_ms=? WHERE code=?`).bind(durationMs(env), code),
        env.DB.prepare(`DELETE FROM puzzle_progress WHERE team_id IN (SELECT id FROM puzzle_teams WHERE client_code=?)`).bind(code),
        env.DB.prepare(`DELETE FROM puzzle_events WHERE team_id IN (SELECT id FROM puzzle_teams WHERE client_code=?)`).bind(code),
        env.DB.prepare(`UPDATE puzzle_teams SET wrong_pw=0, wrong_ans=0, finish_elapsed=NULL, finish_left=NULL WHERE client_code=?`).bind(code),
      ]);
      return null;
    default:
      return 'Unknown action.';
  }
}

/* ---------------- teams ---------------- */
async function joinTeam(env, cl, rawName, t) {
  const name = cleanText(rawName, CFG.TEAM_NAME_MAX);
  if (!name) return { error: 'Enter a team name.' };
  const key = name.toLowerCase();
  let team = await one(env, `SELECT * FROM puzzle_teams WHERE client_code=? AND name_key=?`, cl.code, key);
  if (team) {
    if (cl.test && cl.status === 'waiting') await clockAction(env, cl, 'start', t);
    return { team, rejoined: true };
  }
  if (cl.status === 'ended') return { error: 'This session has finished.' };
  const n = await one(env, `SELECT COUNT(*) AS n FROM puzzle_teams WHERE client_code=?`, cl.code);
  if (n.n >= CFG.MAX_TEAMS_PER_CLIENT) return { error: 'This session is full.' };
  await run(env, `INSERT OR IGNORE INTO puzzle_teams (id,client_code,name,name_key,token,joined_at,last_seen) VALUES (?,?,?,?,?,?,?)`,
    randHex(5), cl.code, name, key, randHex(18), t, t);
  team = await one(env, `SELECT * FROM puzzle_teams WHERE client_code=? AND name_key=?`, cl.code, key);
  if (cl.test && cl.status === 'waiting') await clockAction(env, cl, 'start', t); // dry-run client starts itself
  return { team };
}
async function teamByToken(env, token, t) {
  if (!token || typeof token !== 'string' || !/^[a-f0-9]{36}$/.test(token)) return null;
  const team = await one(env, `SELECT * FROM puzzle_teams WHERE token=?`, token);
  if (!team) return null;
  const cl = await getClient(env, team.client_code, t);
  return cl ? { cl, team } : null;
}
async function progressOf(env, teamId) {
  const rows = await all(env, `SELECT kind,key,at_ms,shown FROM puzzle_progress WHERE team_id=?`, teamId);
  const files = {}, answers = {};
  for (const r of rows) (r.kind === 'file' ? files : answers)[r.key] = r;
  return { files, answers };
}
const ev = (env, teamId, cl, t, type, text) =>
  env.DB.prepare(`INSERT INTO puzzle_events (team_id,t,at,type,text) VALUES (?,?,?,?,?)`).bind(teamId, elapsed(cl, t), t, type, text);

/* ---------------- scoring ---------------- */
function summarise(cl, tm, filesN, correctN, t) {
  const wrong = tm.wrong_pw + tm.wrong_ans;
  const fin = tm.finish_elapsed != null;
  const bonus = fin ? Math.floor(tm.finish_left / 60000) * CFG.BONUS_PER_MINUTE_LEFT : 0;
  const score = Math.max(0, correctN * CFG.POINTS_PER_CORRECT + bonus - wrong * CFG.PENALTY_PER_WRONG);
  const clockUsed = cl.status === 'waiting' ? 0 : elapsed(cl, t);
  return {
    id: tm.id, name: tm.name, filesUnlocked: filesN, filesTotal: TOTAL_FILES, correct: correctN, total: TOTAL_Q,
    wrongPw: tm.wrong_pw, wrongAns: tm.wrong_ans, wrong, bonus, score,
    timeUsed: fin ? tm.finish_elapsed : clockUsed,
    timeLeft: fin ? tm.finish_left : timeLeft(cl, t),
    finished: fin,
  };
}
async function leaderboard(env, cl, t) {
  const rows = (await all(env,
    `SELECT t.*,
       (SELECT COUNT(*) FROM puzzle_progress p WHERE p.team_id=t.id AND p.kind='file') AS files_n,
       (SELECT COUNT(*) FROM puzzle_progress p WHERE p.team_id=t.id AND p.kind='q') AS correct_n
     FROM puzzle_teams t WHERE t.client_code=?`, cl.code))
    .map((r) => ({ ...summarise(cl, r, r.files_n, r.correct_n, t), joinedAt: r.joined_at, lastSeen: r.last_seen }));
  rows.sort((a, b) => b.score - a.score || a.timeUsed - b.timeUsed || a.wrong - b.wrong || a.name.localeCompare(b.name));
  let rank = 0;
  rows.forEach((r, i) => {
    const p = rows[i - 1];
    if (!p || p.score !== r.score || p.timeUsed !== r.timeUsed || p.wrong !== r.wrong) rank = i + 1;
    r.rank = rank;
  });
  return rows;
}

/* ---------------- player actions ---------------- */
function guard(cl, team) {
  if (cl.status === 'waiting') return 'Waiting for the facilitator to start.';
  if (cl.status === 'paused') return 'The clock is paused.';
  if (cl.status === 'ended') return 'Time is up.';
  if (team.finish_elapsed != null) return 'You have already finished.';
  return null;
}
async function tryUnlock(env, cl, team, fileId, password, t) {
  const f = C.FILES.find((x) => x.id === fileId);
  if (!f) return { status: 400, error: 'Unknown file.' };
  const g = guard(cl, team);
  if (g) return { status: 409, error: g, locked: true };
  const prog = await progressOf(env, team.id);
  if (prog.files[fileId]) return { ok: true };
  if (C.checkPassword(fileId, password)) {
    await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO puzzle_progress (team_id,kind,key,at_ms,shown) VALUES (?,?,?,?,NULL)`).bind(team.id, 'file', fileId, elapsed(cl, t)),
      ev(env, team.id, cl, t, 'unlock', `File ${f.label} unlocked`),
    ]);
    return { ok: true };
  }
  await env.DB.batch([
    env.DB.prepare(`UPDATE puzzle_teams SET wrong_pw = wrong_pw + 1 WHERE id=?`).bind(team.id),
    ev(env, team.id, cl, t, 'wrong-pw', `Wrong password for ${f.label}: "${cleanText(password, 30)}"`),
  ]);
  return { ok: false, error: 'Incorrect password' };
}
async function tryAnswer(env, cl, team, qid, answer, t) {
  const q = C.QUESTIONS[qid];
  if (!q) return { status: 400, error: 'Unknown question.' };
  const g = guard(cl, team);
  if (g) return { status: 409, error: g, locked: true };
  const prog = await progressOf(env, team.id);
  if (!prog.files[FILE_OF_Q[qid]]) return { status: 403, error: 'That file is locked.' };
  if (prog.answers[qid]) return { ok: true };
  if (q.type === 'trio') {
    if (!answer || typeof answer !== 'object' || q.people.some((p) => !q.options.includes(answer[p]))) return { status: 400, error: 'Choose one for each person.' };
  } else if (!String(answer == null ? '' : answer).trim()) return { status: 400, error: 'Type an answer first.' };

  if (C.checkAnswer(qid, answer)) {
    await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO puzzle_progress (team_id,kind,key,at_ms,shown) VALUES (?,?,?,?,?)`).bind(team.id, 'q', qid, elapsed(cl, t), C.shownAnswer(qid, answer)),
      ev(env, team.id, cl, t, 'correct', `${qid} correct`),
    ]);
    const n = await one(env, `SELECT COUNT(*) AS n FROM puzzle_progress WHERE team_id=? AND kind='q'`, team.id);
    if (n.n >= TOTAL_Q) {
      const r = await run(env, `UPDATE puzzle_teams SET finish_elapsed=?, finish_left=? WHERE id=? AND finish_elapsed IS NULL`, elapsed(cl, t), timeLeft(cl, t), team.id);
      if (r.meta && r.meta.changes) await ev(env, team.id, cl, t, 'finish', 'Finished all 12 questions').run();
    }
    return { ok: true };
  }
  const typed = q.type === 'trio' ? C.shownAnswer(qid, answer) : cleanText(answer, 40);
  await env.DB.batch([
    env.DB.prepare(`UPDATE puzzle_teams SET wrong_ans = wrong_ans + 1 WHERE id=?`).bind(team.id),
    ev(env, team.id, cl, t, 'wrong-ans', `${qid} wrong: "${typed}"`),
  ]);
  return { ok: false, error: 'Incorrect answer' };
}

// What a player's phone may see. Never contains passwords or answers.
async function playerState(env, cl0, team0, t) {
  const cl = await getClient(env, cl0.code, t);
  const team = await one(env, `SELECT * FROM puzzle_teams WHERE id=?`, team0.id);
  await run(env, `UPDATE puzzle_teams SET last_seen=?1 WHERE id=?2 AND last_seen < ?1 - ${SEEN_THROTTLE_MS}`, t, team.id);
  const prog = await progressOf(env, team.id);
  const s = summarise(cl, team, Object.keys(prog.files).length, Object.keys(prog.answers).length, t);
  const over = cl.status === 'ended' || team.finish_elapsed != null;
  return {
    serverNow: t,
    client: { name: cl.name, code: cl.code, test: !!cl.test, status: cl.status },
    clock: { status: cl.status, timeLeftMs: timeLeft(cl, t), durationMs: cl.duration_ms },
    team: { id: team.id, name: team.name },
    clues: C.CLUES.map((c) => ({ id: c.id, label: c.label, kind: c.kind, text: c.text, grid: c.grid })),
    files: C.FILES.map((f) => {
      const open = !!prog.files[f.id];
      return {
        id: f.id, label: f.label, unlocked: open, note: f.note || null,
        questions: open ? f.questions.map((qid) => {
          const q = C.QUESTIONS[qid], a = prog.answers[qid];
          return { id: qid, text: q.text, type: q.type, options: q.options || null, people: q.people || null, solved: !!a, shown: a ? a.shown : null };
        }) : null,
      };
    }),
    progress: { answered: s.correct, total: TOTAL_Q, filesOpen: s.filesUnlocked, filesTotal: TOTAL_FILES },
    attempts: { wrongPw: s.wrongPw, wrongAns: s.wrongAns, wrong: s.wrong },
    over,
    result: over ? {
      score: s.score, correct: s.correct, total: TOTAL_Q, bonus: s.bonus, timeUsedMs: s.timeUsed,
      wrongPw: s.wrongPw, wrongAns: s.wrongAns, wrong: s.wrong, reason: team.finish_elapsed != null ? 'finished' : 'time',
    } : null,
  };
}

/* ---------------- facilitator views ---------------- */
function clientSummary(cl, teams, t) {
  return {
    code: cl.code, name: cl.name, test: !!cl.test, status: cl.status, createdAt: cl.created_at, startedAt: cl.started_at,
    teams, durationMs: cl.duration_ms, timeLeftMs: timeLeft(cl, t), elapsedMs: elapsed(cl, t),
  };
}
async function clientDetail(env, cl, t) {
  const teams = await leaderboard(env, cl, t);
  return {
    ...clientSummary(cl, teams.length, t), serverNow: t,
    config: { points: CFG.POINTS_PER_CORRECT, bonus: CFG.BONUS_PER_MINUTE_LEFT, penalty: CFG.PENALTY_PER_WRONG, addMin: CFG.ADD_TIME_MIN },
    teams,
  };
}
const fmt = (ms) => { const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function csvCell(v) {
  let s = String(v == null ? '' : v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function csvResponse(lines, name) {
  return new Response('﻿' + lines.join('\r\n') + '\r\n', {
    headers: { ...SEC, 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="${name}"` },
  });
}
async function resultsCsv(env, cl, t) {
  const head = ['Client', 'Client code', 'Rank', 'Team', 'Score', 'Answers correct', 'Files unlocked', 'Wrong passwords', 'Wrong answers', 'Total wrong', 'Bonus points', 'Finished all 12', 'Time used', 'Time left at finish'];
  const lines = [head.map(csvCell).join(',')];
  for (const r of await leaderboard(env, cl, t)) {
    lines.push([cl.name, cl.code, r.rank, r.name, r.score, r.correct, r.filesUnlocked, r.wrongPw, r.wrongAns, r.wrong, r.bonus,
      r.finished ? 'Yes' : 'No', fmt(r.timeUsed), r.finished ? fmt(r.timeLeft) : ''].map(csvCell).join(','));
  }
  return lines;
}
async function timelineCsv(env, cl, t) {
  const lines = [['Client', 'Team', 'Clock time', 'Event'].map(csvCell).join(',')];
  const rows = await all(env, `SELECT tm.name AS team, e.t AS t, e.text AS text FROM puzzle_events e JOIN puzzle_teams tm ON tm.id=e.team_id WHERE tm.client_code=? ORDER BY tm.name, e.id`, cl.code);
  for (const r of rows) lines.push([cl.name, r.team, fmt(r.t), r.text].map(csvCell).join(','));
  return lines;
}

/* ---------------- facilitator login throttle (used by the login route in index.js) ---------------- */
export async function loginAllowed(env, ip) {
  const since = Date.now() - 10 * 60000;
  await run(env, `DELETE FROM puzzle_login_fail WHERE at < ?`, since);
  const n = await one(env, `SELECT COUNT(*) AS n FROM puzzle_login_fail WHERE ip=? AND at>=?`, ip, since);
  return n.n < 10;
}
export async function loginFailed(env, ip) { await run(env, `INSERT INTO puzzle_login_fail (ip,at) VALUES (?,?)`, ip, Date.now()); }

/* ---------------- router ---------------- */
async function readBody(request) {
  if (request.method !== 'POST') return {};
  const len = Number(request.headers.get('content-length') || 0);
  if (len > 20000) throw new Error('too large');
  const text = await request.text();
  if (!text.trim()) return {};
  try { return JSON.parse(text) || {}; } catch (e) { throw new Error('bad json'); }
}

export async function handlePuzzle(request, env, url, isFac) {
  const path = url.pathname, method = request.method;
  if (method === 'GET' || method === 'HEAD') {
    if (path === '/puzzle' || path === '/puzzle/') return page(PLAYER_HTML);
    if (path === '/puzzle/facilitator') return page(FACILITATOR_HTML);
    if (path === '/puzzle/projector') return page(PROJECTOR_HTML);
  }
  if (!path.startsWith('/api/puzzle/')) return null;
  const t = Date.now();
  let body;
  try { body = await readBody(request); } catch (e) { return json({ error: 'Bad request.' }, 400); }
  let m;

  /* ---- player ---- */
  if (method === 'GET' && (m = path.match(/^\/api\/puzzle\/client\/([A-Za-z0-9]+)$/))) {
    const cl = await getClient(env, m[1], t);
    if (!cl) return json({ error: 'Client code not found.' }, 404);
    return json({ name: cl.name, code: cl.code, status: cl.status, test: !!cl.test });
  }
  if (method === 'POST' && path === '/api/puzzle/join') {
    const cl = await getClient(env, body.code, t);
    if (!cl) return json({ error: 'Client code not found. Check it and try again.' }, 404);
    const r = await joinTeam(env, cl, body.teamName, t);
    if (r.error) return json(r, 400);
    return json({ token: r.team.token, rejoined: !!r.rejoined });
  }
  if (path === '/api/puzzle/state' || path === '/api/puzzle/unlock' || path === '/api/puzzle/answer') {
    const found = await teamByToken(env, request.headers.get('x-team-token'), t);
    if (!found) return json({ error: 'Session not found. Please join again.' }, 401);
    const { cl, team } = found;
    if (method === 'GET' && path === '/api/puzzle/state') return json(await playerState(env, cl, team, t));
    if (method === 'POST' && path === '/api/puzzle/unlock') {
      const r = await tryUnlock(env, cl, team, String(body.fileId || ''), String(body.password || '').slice(0, 80), t);
      return json({ ...r, state: await playerState(env, cl, team, Date.now()) }, r.status || 200);
    }
    if (method === 'POST' && path === '/api/puzzle/answer') {
      let ans = body.answer; if (typeof ans === 'string') ans = ans.slice(0, 200);
      const r = await tryAnswer(env, cl, team, String(body.qid || ''), ans, t);
      return json({ ...r, state: await playerState(env, cl, team, Date.now()) }, r.status || 200);
    }
  }

  /* ---- facilitator (session cookie) ---- */
  if (path.startsWith('/api/puzzle/fac/')) {
    if (!(await isFac(request))) return json({ error: 'Please sign in.' }, 401);
    if (method === 'GET' && path === '/api/puzzle/fac/clients') {
      await ensureTest(env, t);
      await run(env, TICK_SQL, t);
      const rows = await all(env, `SELECT c.*, (SELECT COUNT(*) FROM puzzle_teams x WHERE x.client_code=c.code) AS n FROM puzzle_clients c ORDER BY c.test DESC, c.created_at DESC`);
      return json({ clients: rows.map((c) => clientSummary(c, c.n, t)) });
    }
    if (method === 'POST' && path === '/api/puzzle/fac/clients') {
      const name = cleanText(body.name, 60);
      if (!name) return json({ error: 'Enter a client name.' }, 400);
      for (let i = 0; i < 6; i++) {
        const code = makeCode();
        const r = await run(env, `INSERT OR IGNORE INTO puzzle_clients (code,name,test,created_at,duration_ms) VALUES (?,?,0,?,?)`, code, name, t, durationMs(env));
        if (r.meta && r.meta.changes) return json(clientSummary(await getClient(env, code, t), 0, t));
      }
      return json({ error: 'Could not create a code. Try again.' }, 500);
    }
    if (method === 'GET' && path === '/api/puzzle/fac/key') return json({ key: C.answerKey(), note: 'Chain: Q 8 & 11 password = 81221 - 29774 = 51447.' });

    if ((m = path.match(/^\/api\/puzzle\/fac\/clients\/([A-Za-z0-9]+)(?:\/(.*))?$/))) {
      const cl = await getClient(env, m[1], t);
      if (!cl) return json({ error: 'No such client.' }, 404);
      const rest = m[2] || '';
      if (method === 'GET' && rest === '') return json(await clientDetail(env, cl, t));
      if (method === 'POST' && /^(start|pause|add|end|reset)$/.test(rest)) {
        const err = await clockAction(env, cl, rest, t);
        if (err) return json({ error: err }, 400);
        return json(await clientDetail(env, await getClient(env, cl.code, Date.now()), Date.now()));
      }
      if (method === 'GET' && rest === 'export') {
        const kind = url.searchParams.get('kind');
        const base = `${cl.name.replace(/[^A-Za-z0-9]+/g, '-')}-${cl.code}`;
        return kind === 'timeline'
          ? csvResponse(await timelineCsv(env, cl, t), `${base}-timeline.csv`)
          : csvResponse(await resultsCsv(env, cl, t), `${base}-results.csv`);
      }
      if ((m = rest.match(/^teams\/([a-f0-9]+)$/))) {
        const team = await one(env, `SELECT * FROM puzzle_teams WHERE id=? AND client_code=?`, m[1], cl.code);
        if (!team) return json({ error: 'No such team.' }, 404);
        if (method === 'GET') {
          const events = await all(env, `SELECT t,type,text FROM puzzle_events WHERE team_id=? ORDER BY id`, team.id);
          const summary = (await leaderboard(env, cl, t)).find((r) => r.id === team.id);
          return json({ summary, events, files: [] });
        }
        if (method === 'DELETE') {
          await env.DB.batch([
            env.DB.prepare(`DELETE FROM puzzle_events WHERE team_id=?`).bind(team.id),
            env.DB.prepare(`DELETE FROM puzzle_progress WHERE team_id=?`).bind(team.id),
            env.DB.prepare(`DELETE FROM puzzle_teams WHERE id=?`).bind(team.id),
          ]);
          return json({ ok: true });
        }
      }
    }
    return json({ error: 'Not found.' }, 404);
  }
  return json({ error: 'Not found.' }, 404);
}
