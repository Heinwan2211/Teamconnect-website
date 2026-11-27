// End-to-end test of the Puzzle Challenge against a running `wrangler dev` (local D1).
//   1) npx wrangler d1 execute teamconnect-disc --local --file=schema.sql && ... --file=puzzle-schema.sql
//   2) .dev.vars needs DASHBOARD_PASSWORD, SESSION_SECRET
//   3) npx wrangler dev --local --port 8799     then:   BASE=http://localhost:8799 PW=<password> node test/puzzle-e2e.mjs
import { execSync } from 'node:child_process';
const BASE = process.env.BASE || 'http://localhost:8799';
const PW = process.env.PW || 'testpass-424242';
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('  FAIL:', msg); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(m, p, body, hdr = {}) {
  const r = await fetch(BASE + p.replace(/^\/api\//, '/api/puzzle/'), { method: m, headers: { 'Content-Type': 'application/json', ...hdr }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { raw: t }; } j._s = r.status; j._h = r.headers; return j;
}
(async () => {
  // ---- facilitator auth (cookie, same as DISC dashboard)
  let r = await call('GET', '/api/fac/clients'); ok(r._s === 401, 'fac API closed without sign-in');
  r = await call('POST', '/api/fac/login', { password: 'wrong' }); ok(r._s === 401, 'wrong password rejected');
  r = await call('POST', '/api/fac/login', { password: PW }); ok(r._s === 200, 'login ok');
  const cookie = (r._h.get('set-cookie') || '').split(';')[0]; ok(cookie.startsWith('tc_disc='), 'session cookie set');
  const F = { Cookie: cookie };
  r = await call('POST', '/api/fac/clients', { name: 'Acme Ltd' }, F); ok(r._s === 200 && r.code.length === 5, 'client created');
  const code = r.code;
  r = await call('GET', '/api/fac/clients', null, F); ok(r.clients.some((c) => c.code === 'TEST' && c.test), 'test client exists'); ok(r.clients.some((c) => c.code === code), 'client listed');

  // ---- join
  r = await call('POST', '/api/join', { code: 'nope1', teamName: 'X' }); ok(r._s === 404, 'bad code 404');
  r = await call('POST', '/api/join', { code: code.toLowerCase(), teamName: '  Team   Blue ' }); ok(r._s === 200, 'join (lowercase code)');
  const tokA = r.token; const A = { 'x-team-token': tokA };
  r = await call('POST', '/api/join', { code, teamName: 'team blue' }); ok(r.token === tokA, 'same name rejoins same team');
  r = await call('POST', '/api/join', { code, teamName: 'Team Red' }); const B = { 'x-team-token': r.token };
  r = await call('POST', '/api/join', { code, teamName: 'Team Green' }); const Cc = { 'x-team-token': r.token };

  // ---- state does not leak
  let st = await call('GET', '/api/state', null, A);
  const raw = JSON.stringify(st).toLowerCase();
  ok(st.clock.status === 'waiting', 'waiting before start');
  for (const secret of ['81221', '58228', '29774', '51447', '0210013680', '0232300807', 'nopassword', 'backrub', 'tightrope', '1024', 'thursday"']) ok(!raw.includes(secret), 'no leak of ' + secret);
  ok(st.files.every((f) => !f.unlocked && f.questions === null), 'files locked, no questions sent');
  ok(st.clues.length === 6 && st.clues.filter((c) => c.kind === 'sudoku').length === 3, '6 clues, 3 sudokus');
  ok(st.clues.find((c) => c.label === 'Q 8 & 11').text === 'MINUS YOUR ANSWER FROM Q 7 & 2 FROM YOUR ANSWER IN Q 2 & 10 THIS WILL BE THE PASSWORD FOR Q 8 & 11', 'Q8&11 clue wording exact');
  r = await call('POST', '/api/unlock', { fileId: 'f15', password: 'NO PASSWORD' }, A); ok(r._s === 409, 'cannot unlock before start');
  r = await call('GET', '/api/state'); ok(r._s === 401, 'state needs token');

  // ---- start
  r = await call('POST', `/api/fac/clients/${code}/start`, null, F); ok(r.status === 'running', 'started');
  r = await call('POST', `/api/fac/clients/${code}/start`, null, F); ok(r._s === 400, 'double start refused');

  // ---- Team A plays everything
  r = await call('POST', '/api/answer', { qid: 'Q1', answer: 'dog' }, A); ok(r._s === 403, 'cannot answer locked file');
  r = await call('POST', '/api/unlock', { fileId: 'f15', password: 'password' }, A); ok(r.ok === false && r.error === 'Incorrect password', 'wrong password message');
  r = await call('POST', '/api/unlock', { fileId: 'f15', password: ' no-PASSWORD ' }, A); ok(r.ok === true, 'NO PASSWORD variants accepted');
  ok(r.state.files[0].unlocked && r.state.files[0].questions.length === 2, 'file opened with 2 questions');
  r = await call('POST', '/api/answer', { qid: 'Q1', answer: 'cats' }, A); ok(r.ok === false, 'wrong answer');
  r = await call('POST', '/api/answer', { qid: 'Q1', answer: 'The Dogs!' }, A); ok(r.ok === true, 'The Dogs! accepted');
  r = await call('POST', '/api/answer', { qid: 'Q5', answer: 'a Turtle' }, A); ok(r.ok === true, 'Q5');
  const steps = [
    ['unlock', 'f210', '81221'], ['Q2', 'Tight-Rope'], ['Q10', 'Thursday'],
    ['unlock', 'f39', '5 8 2 2 8'], ['Q3', 'Back Rub'], ['Q9', '$40'],
    ['unlock', 'f46', '(021) 001-3680'], ['Q4', 'looking at CLOUDS'], ['Q6', 'Mouse movement'],
    ['unlock', 'f712', '29774'], ['Q7', '1,024'], ['Q12', '6'],
  ];
  for (const s of steps) {
    r = s[0] === 'unlock' ? await call('POST', '/api/unlock', { fileId: s[1], password: s[2] }, A) : await call('POST', '/api/answer', { qid: s[0], answer: s[1] }, A);
    ok(r.ok === true, 'step ' + s.join(' '));
  }
  r = await call('POST', '/api/unlock', { fileId: 'f46', password: '023 230 0807' }, B); ok(r.ok === false, 'old Waterval number no longer accepted');
  r = await call('POST', '/api/unlock', { fileId: 'f811', password: '81221' }, A); ok(r.ok === false, 'Q8&11 not openable with wrong pw');
  r = await call('POST', '/api/unlock', { fileId: 'f811', password: '51447' }, A); ok(r.ok === true, 'Q8&11 opens with 51447');
  r = await call('POST', '/api/answer', { qid: 'Q8', answer: '1:1' }, A); ok(r.ok === true, 'Q8 1:1');
  r = await call('POST', '/api/answer', { qid: 'Q11', answer: { Alex: 'Knight', Ben: 'Knave', Cody: 'Spy' } }, A); ok(r.ok === false, 'Q11 wrong trio');
  r = await call('POST', '/api/answer', { qid: 'Q11', answer: { Alex: 'Knight', Ben: 'Spy', Cody: 'Knave' } }, A); ok(r.ok === true, 'Q11 right trio');
  st = r.state;
  ok(st.over && st.result.reason === 'finished' && st.result.correct === 12, 'team A finished');
  console.log('  Team A result:', JSON.stringify(st.result));
  ok(st.result.wrong === 4 && st.result.bonus === 39 && st.result.score === 155, 'score arithmetic 120+39-4=155');
  r = await call('POST', '/api/answer', { qid: 'Q1', answer: 'dog' }, A); ok(r._s === 409, 'finished team locked');

  // ---- Team B: wrong attempts only -> score never below 0 (B already opened f46 above: +0 correct)
  for (let i = 0; i < 5; i++) await call('POST', '/api/unlock', { fileId: 'f210', password: 'bad' + i }, B);
  st = await call('GET', '/api/state', null, B); ok(st.attempts.wrongPw === 5, 'wrong attempts counted (no limit)');
  r = await call('GET', `/api/fac/clients/${code}`, null, F);
  const tb = r.teams.find((t) => t.name === 'Team Red'); ok(tb.score === 0 && tb.wrong === 5, 'score floored at 0');
  ok(r.teams[0].name === 'Team Blue' && r.teams[0].rank === 1, 'ranking: A first');

  // ---- Team C partial, pause / add / end
  await call('POST', '/api/unlock', { fileId: 'f15', password: 'nopassword' }, Cc);
  await call('POST', '/api/answer', { qid: 'Q1', answer: 'dogs' }, Cc);
  r = await call('POST', `/api/fac/clients/${code}/pause`, null, F); ok(r.status === 'paused', 'paused');
  const left1 = r.timeLeftMs; await sleep(700); r = await call('GET', `/api/fac/clients/${code}`, null, F); ok(r.timeLeftMs === left1, 'clock frozen while paused');
  r = await call('POST', '/api/answer', { qid: 'Q5', answer: 'turtle' }, Cc); ok(r._s === 409, 'answers refused while paused');
  r = await call('POST', `/api/fac/clients/${code}/add`, null, F); ok(r.durationMs === 45 * 60000, 'added 5 min');
  r = await call('POST', `/api/fac/clients/${code}/start`, null, F); ok(r.status === 'running', 'resumed');
  const green = r.teams.find((t) => t.name === 'Team Green');
  r = await call('GET', `/api/fac/clients/${code}/teams/${green.id}`, null, F); ok(r.events.length === 2 && r.events[0].text.includes('unlocked'), 'timeline events');
  let csv = await fetch(`${BASE}/api/puzzle/fac/clients/${code}/export`, { headers: F }).then((x) => x.text()); ok(/Team Blue/.test(csv) && /155/.test(csv), 'results CSV');
  csv = await fetch(`${BASE}/api/puzzle/fac/clients/${code}/export?kind=timeline`, { headers: F }).then((x) => x.text()); ok(/Q11 correct/.test(csv), 'timeline CSV');
  r = await call('POST', `/api/fac/clients/${code}/end`, null, F); ok(r.status === 'ended', 'ended');
  r = await call('POST', '/api/answer', { qid: 'Q5', answer: 'turtle' }, Cc); ok(r._s === 409 && /up/.test(r.error), 'locked after end');
  st = await call('GET', '/api/state', null, Cc); ok(st.over && st.result.reason === 'time', 'finish screen for unfinished team');
  r = await call('POST', `/api/fac/clients/${code}/reset`, null, F); ok(r.status === 'waiting' && r.teams.length === 3 && r.teams.every((t) => t.score === 0 && t.correct === 0 && t.filesUnlocked === 0), 'reset keeps teams, clears progress');
  r = await call('DELETE', `/api/fac/clients/${code}/teams/${green.id}`, null, F); ok(r.ok, 'remove team');
  r = await call('GET', '/api/fac/key', null, F); ok(r.key.length === 6, 'answer key');

  // ---- site hygiene
  for (const p of ['/src/puzzle-content.js', '/src/puzzle.js', '/puzzle-schema.sql']) { const x = await fetch(BASE + p); ok(x.status === 404 || !(await x.text()).includes('checkPassword'), p + ' not public'); }
  for (const p of ['/puzzle', '/puzzle/facilitator', '/puzzle/projector']) { const x = await fetch(BASE + p); const tx = await x.text(); ok(x.status === 200 && /noindex/.test(tx) && !/81221|51447|nopassword/i.test(tx), p + ' page ok, noindex, no secrets'); }
  r = await fetch(BASE + '/'); ok(r.status === 200, 'existing home page still served');
  r = await fetch(BASE + '/api/results'); ok(r.status === 401 || r.status === 403 || r.status === 400, 'existing DISC route still guarded');

  // ---- auto-end on timer (shorten the TEST client's clock directly in the local DB)
  r = await call('POST', '/api/join', { code: 'TEST', teamName: 'Dry run' }); const D = { 'x-team-token': r.token };
  st = await call('GET', '/api/state', null, D); ok(st.clock.status === 'running' && st.client.test, 'test client auto-starts on join');
  execSync(`npx wrangler d1 execute teamconnect-disc --local --persist-to /tmp/wr-state --command "UPDATE puzzle_clients SET duration_ms=1200 WHERE code='TEST'"`, { stdio: 'ignore', cwd: new URL('..', import.meta.url).pathname });
  await sleep(1800);
  st = await call('GET', '/api/state', null, D); ok(st.clock.status === 'ended' && st.over, 'auto-ends when time runs out');
  r = await call('POST', '/api/unlock', { fileId: 'f15', password: 'nopassword' }, D); ok(r._s === 409, 'locked at timeout');
  r = await call('POST', '/api/fac/clients/TEST/add', null, F); ok(r.status === 'paused', 'ADD after timeout comes back paused');
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
