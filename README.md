# QuizDeck

A live quiz platform in the Mentimeter / Kahoot mould: a **host** builds a quiz and
puts it on the big screen, the **room** joins from their phones with a 6-digit code,
and a **leaderboard** runs after every single question.

```
┌──────────── presentation screen ────────────┐   ┌──── phone ────┐
│  Question 3 of 5          ⏱ 20              │   │   Pick your   │
│  Which planet has the most moons?           │   │    answer     │
│  ▲ Jupiter     ◆ Saturn                     │   │  ▲ A    ◆ B   │
│  ● Neptune     ■ Uranus                     │   │  ● C    ■ D   │
│                      standings ▸ Ada  1,000 │   │  Ada    974   │
└─────────────────────────────────────────────┘   └───────────────┘
```

## Quick start

```bash
npm run install:all   # installs server + client
npm run dev           # server :4000, client :5173
```

Open <http://localhost:5173>. The host goes to **Host dashboard → Present**; players
open `/play` on their phones (or scan the QR shown in the lobby).

For a single-process production run:

```bash
npm run build         # compiles the server and bundles the client
npm start             # serves API, websockets and the UI from one port (4000)
```

`PORT` overrides the port.

## How a session flows

| Phase | Big screen | Phone |
|---|---|---|
| `lobby` | join code + QR, names popping in | "you're in", waiting count |
| `countdown` | 3 · 2 · 1 | get ready |
| `question` | question + options + live answer counter | four big answer tiles |
| `results` | answer distribution chart, correct answer called out | correct / wrong + points |
| `leaderboard` | top 10 with rank movement | your rank and the top 5 |
| `podium` | top 3 + session stats | your finish |

The host drives with the **Next** button, <kbd>Space</kbd>/<kbd>→</kbd>, or
<kbd>←</kbd> to step back. A question also closes on its own when the timer runs
out or when everyone has answered.

## Scoring

```
correct answer → round(1000 × (0.5 + 0.5 × fractionOfTimeLeft)) × pointsMultiplier
                 + min(streakSoFar × 100, 500)
wrong / no answer → 0, and the streak resets
```

So an instant answer is worth ~1000 and one on the buzzer ~500. Per question the
host can choose **Standard**, **Double** or **No points**.

## Project layout

```
server/
  src/types.ts              shared domain types
  src/quizValidation.ts     what makes a quiz presentable (enforced, not advisory)
  src/store/quizStore.ts    quiz CRUD, persisted to server/data/quizzes.json
  src/routes/quizzes.ts     REST API
  src/game/session.ts       one live room: phases, timers, scoring, tallies
  src/game/sessionManager.ts  room registry, 6-digit codes, idle reaping
  src/game/projection.ts    role-filtered state (players never receive answers early)
  src/game/socket.ts        socket.io event handlers
  src/index.ts              http + socket server, serves client/dist in production
client/
  src/lib/        api, socket, palette, hooks (countdown, animated number)
  src/components/ chart, leaderboard, podium, timer, join panel
  src/pages/      Landing · Dashboard · Editor · Present · Play
```

## Design notes

**Answers are withheld from the phone.** `projection.ts` sends players option
*ids* and *positions* but no option text and no `correct` flag until the reveal.
The question lives on the shared screen; the phone is just the buzzer. This is
also why a player cannot read the answer out of their own devtools.

**Colour is never the only signal.** The four answer colours are the first slots
of a categorical palette validated all-pairs for colour-vision deficiency on a
light surface (worst CVD ΔE 9.2, worst normal-vision ΔE 16.3). Every option
additionally carries a shape (▲ ◆ ● ■) and a letter, so the mapping survives
colour blindness, grayscale projection and a washed-out beamer.

**Reconnects keep your seat.** Players store their id locally and re-claim the
same score on refresh or a dropped connection; the host's room survives a reload
of the presentation screen, so a flaky projector doesn't scatter the lobby.

**Unfinished quizzes can't go live.** `quizValidation.ts` is the single source of
truth for "presentable" — every question needs text, two real options and exactly
one correct answer. The editor shows it as warnings, the dashboard disables
Present, and the server refuses to open a room regardless.

## State and persistence

Quizzes are persisted as JSON under `server/data/`. **Live sessions are in-memory**
and disappear on restart; idle rooms are reaped after 6 hours. That is the right
trade for a single-room-at-a-time tool — swapping `quizStore` for a database and
`SessionManager` for Redis is the path to running multiple server instances.
