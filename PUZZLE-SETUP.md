# Puzzle Challenge — setup and use

An online team activity at **/puzzle**. A client group opens one link on their phones, agrees a plan, and
solves 12 questions behind 6 password-locked files against a 40-minute clock. Hein runs it from
**/puzzle/facilitator** and shows **/puzzle/projector** on the room screen.

It runs inside the existing Worker and D1 database (same as the DISC assessment). No new bindings and **no new secrets**:
the facilitator signs in with the same `DASHBOARD_PASSWORD` as the DISC dashboard.

## One-time setup (before or right after merging)

```bash
npx wrangler d1 execute teamconnect-disc --remote --file=puzzle-schema.sql
```
Safe to re-run. It adds five `puzzle_*` tables; the DISC tables are not touched.

Deploy as usual (merge to `main` → auto-deploy). If you deploy by hand: `rm -rf .wrangler && npx wrangler deploy`.

## Verify after deploying

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://teamconnect.co.za/puzzle                       # expect 200
curl -s https://teamconnect.co.za/api/puzzle/client/TEST                                       # expect {"name":"Facilitator test (dry run)",...}
curl -s -o /dev/null -w "%{http_code}\n" https://teamconnect.co.za/api/puzzle/fac/clients      # expect 401
curl -s -o /dev/null -w "%{http_code}\n" https://teamconnect.co.za/src/puzzle-content.js       # expect 404
```

## Running a session
1. Open `/puzzle/facilitator`, sign in, type the client name under **New client**.
2. Show the QR code or send the player link (`/puzzle?client=CODE`).
3. Teams join with a team name (several phones can join one team by typing the same name).
4. Press **START**. Use PAUSE / ADD 5 MIN / END / RESET as needed. **Projector view** gives the big leaderboard.
5. **Export results CSV** afterwards. Clients stay saved.

Dry run: use the built-in **Facilitator test** client (code `TEST`). Its clock starts when a team joins. The **Answer key** button shows every password and answer.

## Changing things
- Numbers (duration, points, bonus, penalty, add-time): the `CFG` block at the top of `src/puzzle.js`.
- Questions, passwords, accepted answers: `src/puzzle-content.js`.
- Look and feel / page code: `src/puzzle-client/*` then run `node src/puzzle-client/build.mjs` and commit the regenerated `src/puzzle-pages.js`.
- Tests: `test/puzzle-e2e.mjs` (needs `wrangler dev --local`; see the header of that file).

## Open item
Q 4 & 6 accepts **both** Waterval numbers (021 001 3680 and 023 230 0807) until the current landline is confirmed. Once confirmed, remove the wrong one in `src/puzzle-content.js` (file `f46`) and in `answerKey()`.

## Notes
- The page code is public (it has to be); passwords and answers are only in `src/`, which the assets config excludes, and are checked on the server.
- "Sign out" on the puzzle console also signs you out of the DISC dashboard (same session cookie).
- Failed facilitator sign-ins are throttled (10 per 10 minutes per IP).
