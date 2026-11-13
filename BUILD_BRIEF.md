# Rat's Kitchen — v4.1 build brief (online playtest build)

Written 13 Nov 2026 for a fresh session. Designer: **Koko**. Read all of this
before touching code.

## 0. The job

Koko wants to play Rat's Kitchen online with friends to playtest it, and
collect data on how people actually play. Starting from **v4.0.1** (in this
repo), build **v4.1.0**:

- **A. Play-data logging** with a **download button**. No survey.
- **B. A rebuilt web client**, mobile-first, that friends can join from a link.
- **C. Online-play fixes** — already done in v4.0.1 (section 6). Keep them
  working in the new client.

**Do not change the game.** Rules, numbers, card text and bot policy are
locked. If you find a game bug, write it down and ask Koko; don't fix it
silently.

## 1. Where things are

- Repo: `github.com/antoniofranjesko-create/ratsKitchen-v3` (public, branch
  `main`). Latest commit should be **v4.0.1** (or v4.0.0). If HEAD is still
  v3.9.5, stop and tell Koko: he hasn't pushed v4 yet.
- This session can almost certainly **read but not push**. Deliver one zip
  (folder structure intact) plus exact git commands. Koko pushes from
  `/mnt/c/Users/anton/Downloads/files8_v3` (WSL bash). Render auto-deploys on
  push. Koko checks the corner `BUILD vX.Y.Z` tag and `/version` in an
  incognito tab before trusting a deploy.
- Stack: Node + Express + Socket.io, plain JavaScript, **no build step**.

| File | What it is |
|---|---|
| `game/engine.js` | Rules data: cards, rats, deck building, stats, Market Days, Alley helpers |
| `game/actions.js` | Turn flow, `legalActions`, `apply`, `resolveDraw`, bot policy |
| `server.js` | Rooms, lobby, per-viewer state projection (hands stay private), bot pacing |
| `public/index.html` | Current client — one file, plain JS |
| `sweep.js` | Balance sim (`node sweep.js`) |
| `RATS_KITCHEN_RULES_v4.0.0.md` | Player-facing rules. Where it disagrees with the code, the code is right |

## 2. How v4.0.0 came to exist (context, not a task)

v4.0.0 was built on 9 Sep but never pushed. It was regenerated on 13 Nov on
top of the pushed v3.9.5 from that session's record. Its changes over v3.9.5:

- **The Alley** — 3 rats face-up beside the bins (`g.alley`,
  `refillAlley`, `takeFromAlley`). Special Delivery, Pelican, Breeder, the
  Rat Release Market Day and Dodgy Inspector take from it.
- **Dodgy Inspector** (card key `desperate`, 3 copies) — lose 1 star, take
  any alley rat.
- **Feeding** — Runner (draw 1), Sow (draw 2), Larder (eat it, +1 star),
  Spice (clear a chilli) each cost 1 Food, once per turn per rat
  (`p._fed`). Breeder is free once per turn.
- **Rat set** — Street 9→4, ability rats 3 each; 47 rats, 15 per colour.
- **Rat King at weight 7** (was 6). Stars 4.

Sim baseline for v4.0.0 (bots, not humans). Target band: attrition 30–60%,
winner turns 12–16.

| Players | Attrition | Winner turns | Rounds |
|---|---|---|---|
| 3 | 44% | 11 | 9.3 |
| 4 | 42% | 13 | 10.5 |
| 5 | 47% | 16 | 11.2 |
| 6 | 59% | 19 | 12.5 |

Run `node sweep.js` before you start and after each part. The numbers must
stay the same within sim noise (a few points). If they move, you changed the
game.

## 3. Hard constraints

- **Engine logic is locked.** You may add a **read-only observer hook**
  (e.g. call `g._obs && g._obs(event)` at points in `actions.js` /
  `engine.js`) so logging can see bot actions and internal events. It must
  never change an outcome. Prove it with the sweep.
- **No build step, no in-browser Babel.** An inline-Babel syntax error once
  blanked the whole app. Plain JS and CSS; ES modules are fine. Any CDN
  library must be pinned to an exact version.
- **Kitchens are public, hands are private.** Never send or show another
  player's hand; counts only. Keep the per-viewer projection in `server.js`.
- **UK English** in everything players see.
- **Version:** bump to `4.1.0` in `server.js`, `package.json` and the client
  corner tag.
- Anything outside this brief: propose it to Koko first, don't build it.

## 4. Part A — play-data logging

### How
- New module `game/telemetry.js`, attached per room in `server.js`.
- Human actions arrive through the socket `act` / `endTurn` handlers. Bot
  actions happen inside `actions.js` (`botTurn` calls `apply` directly), so
  use the observer hook to see them. Tag every event `bot: true/false`.
- Server timestamps (`Date.now()`) on every event.
- One JSON log per game. A restart in the same room is a new game.
- Document the schema in `LOGGING.md`.

### What to record

**Per game:** version, player count, humans vs bots, seat order, start and
end time, winner, win type (Rat King / last standing), rounds, **the
winner's personal turn count** (Koko's main balance measure), elimination
order with round, and who dealt each knockout.

**Per turn:** player, round, turn number; real seconds spent on the turn
(humans only); seconds from turn start to first action; cards played that
turn; stars, weight, heat and hand size at start and end; what was drawn
(action card / rat / Snap Inspection fired).

**Per card instance** (track by card id): when it entered the hand and how
(deal, draw, steal, Recycle, Gambit); its fate — played (which turn), stolen,
discarded at hand limit, lost at elimination, or still held at game end;
turns spent in hand; target type (self, the leader, the weakest player,
other); result (damage, whiff, blocked by Wok/Cat/Board Up).

**Playable but not chosen:** at every human decision, snapshot
`legalActions(g, p)` and record which card types were playable and which one
was chosen. This tells Koko whether a card is weak or just situational.

**Inspections:** armed → fired / expired / greased; turns from arming to
firing; colours; damage per firing; whiff rate.

**Rats and interaction:** every player's weight each round (and the gap
between leader and second); who attacks whom; revenge attacks (A hits B,
B hits A on B's next turn); every rat move, with the card that caused it and
the rat type; which Market Day fired, with standings before and after.

**Confusion and connection:** every tap on an unplayable card and the
reason shown (client sends a `uiEvent`); pickers opened then cancelled;
disconnects and rejoins.

### Download
- **Every player** gets a "Download game log" button on the end-of-game
  screen, plus "Download log so far" in a menu during play (in case the game
  crashes or someone leaves).
- Server serves the in-memory log at `GET /log/:room`.
- Render's free tier wipes the server's disk on every restart, redeploy or
  15-minute idle spin-down, so logs live in memory only. Tell players on the
  end screen: download before leaving.
- One line in the lobby: "Games are logged for playtesting: actions and
  timings, plus the name you type."

### Analysis
`tools/analyse_logs.js <folder>` reads a folder of logs and writes CSV plus a
short markdown summary:
- per card type: drawn, played, play rate, mean turns in hand, never-played
  %, passed over when playable %;
- per game: winner turns, win type, rounds, elimination order;
- human turn times (median, p90) by player count;
- attack matrix and revenge rate;
- leader gap per round;
- armed-inspection outcomes;
- blocked-tap reasons ranked.

Test it on logs generated from bot games.

## 5. Part B — client rebuild, mobile-first

### First: inventory
Before changing anything, list every socket event and every `act` type with
its parameters (`type, id, target, ratId, theirRatId, cols, named, pickId,
keepId`) from `server.js`, `actions.js` and `index.html`. Keep the protocol.
Every flow in the old client must exist in the new one. Show Koko the list.

### Must-have
- **Lobby:** create or join a room by code, add bots, seat list, start.
  The share link (`?table=CODE`) fills in the code — keep it.
- **Table:** your kitchen (rats with colour, weight, heat and ability
  markers); rivals in a compact view (stars, weight out of 7, rats, hand
  count, armed inspection, placed cards such as Territorial, Rat Trap,
  Pelican, Inheritance, Hot Chilli); the alley; deck and bins counts; the
  current Market Day; round and whose turn.
- **Hand:** readable on a phone; tap to select; clear playable or unplayable
  state; tapping an unplayable card shows why.
- **Every targeting flow:** pick a kitchen; pick a rat (theirs, yours, or
  one of each for Switcheroo); pick an alley rat; pick a colour; Gambit
  keep-one; Shakedown name-a-card; Recycle pick.
- **Armed inspection:** a fire button and a loud "fire now — expires this
  turn" warning.
- Rat info on tap, a readable log (keep the v3.9.3 formatting), an
  end-of-game screen, the version tag.

### Look
- Night-market table. Category frame colours: Attack red, Defence blue,
  Engine orange, Control purple, Nerf crimson, Buff green, When-Drawn grey.
  Card titles in Bebas Neue.
- Rat colours red, blue, green **must also carry a shape or symbol** —
  colourblind-safe (the inspector is a colourblind heron, so this fits).
- Card art: if `public/art/<cardKey>.png` exists, use it; otherwise a styled
  placeholder in the category colour. List the expected filenames for Koko.
- Touch targets at least 44px, no sideways scrolling, usable one-handed in
  portrait, also good in landscape and on desktop.

## 6. Part C — online-play fixes (DONE in v4.0.1 — keep them working)

Built and tested on 13 Nov with two real browsers plus a bot. The new client
must support all of it:

- **Seat token.** The client keeps `rk_token` and the current table code
  `rk_room` in `localStorage`. `create` and `join` send `{name, token}`. On
  every socket `connect` the client emits `rejoin {code, token}`; the server
  re-attaches the seat (lobby or mid-game) and re-sends `room`, `begin` and
  `state`, or replies `rejoinFail` (client forgets the table). Exit to menu
  clears `rk_room`.
- **Offline seats.** A disconnect mid-game keeps the seat. `state.players[i].connected`
  is false while they're gone; the old client shows an OFFLINE badge and a
  "Hand to a bot" button, which emits `botify {playerId}`. Any connected
  human may do this for an offline seat; if it was their turn, the bot
  finishes it. In the lobby an offline seat is held 30 s, then dropped.
- **Bots auto-advance** with a pause per bot turn (`BOT_DELAY_MS`, default
  1500). `setStep {on}` toggles step mode; `state.stepMode` and
  `state.awaitingStep` drive the "Next player" button and the toggle label.
- **Lobby "YOU"** — each socket now gets its own id in `room` (it used to
  receive the newest joiner's id).
- Render's free tier holds the first request for about a minute after 15
  idle minutes; the app can't show anything during that. Tell Koko to warn
  friends the first load can be slow.

## 7. Testing

- Playwright and Chromium are preinstalled (don't reinstall). Script a full
  game: one human seat driven through socket.io-client plus bots, on
  390×844, 844×390 and 1280×800. Screenshots at each milestone, zero console
  errors. Log which `act` types were exercised; every type must be hit at
  least once.
- Test rejoin: refresh mid-turn and confirm the seat comes back with its
  hand.
- Sweep before and after (section 2).
- Send Koko screenshots as the UI takes shape so he can redirect early.

## 8. Known gaps — list them, don't fix them

- Pelican lands on the first alley rat; the player doesn't choose
  (`_pelicanPick` is never set).
- Sim at 6 players: winner turns 19, above the 12–16 target.
- Wok Block and Cat resolve automatically inside inspection and steal code;
  there's no reaction prompt.

## 9. Out of scope

The streamlining ideas (heat = weight, cutting the immunity rats, merging
rat-movers); the food/meld redesign; marinating and a 2-card limit; bringing
back Russian Roulette as a card; the Magawa game.

## 10. Deliver

1. A zip of the full repo folder, v4.1.0.
2. `LOGGING.md` (schema) and `tools/analyse_logs.js`.
3. Exact push commands:
   ```bash
   cd /mnt/c/Users/anton/Downloads/files8_v3
   git status
   # copy the new files in, then:
   git add -A
   git commit -m "v4.1.0: play-data logging, mobile client"
   git push
   ```
4. A short note: what changed, sweep before and after, the art filenames,
   and anything you flagged.
