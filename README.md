# HaggleBot - Prompt Arena Round 4

A one-link bargaining game. Each team opens the link on their own phone, enters their
team name, and bargains with an AI shopkeeper (SoundMax Pro headphones, MRP Rs 4,999,
secret floor price hidden in the server-side prompt). 7 minutes, 12 messages, deal ends
the round, final screen is screenshot-ready for judging.

## How it works
- `public/index.html` - the whole participant page (start screen, chat, timer, message
  counter, live price, end screen with team name + final price for the screenshot).
- `api/chat.js` - Vercel serverless function. Holds the shopkeeper prompt server-side
  (participants can never see it), enforces the 12-message limit, calls Gemini.
- `api/prompt.js` - the hardened shopkeeper prompt (generated from
  prompt-arena-build/hagglebot/shopkeeper_prompt.txt).
- `server.mjs` - local-only dev server (`npm start`, then http://localhost:3000).

## Model
Google Gemini via its OpenAI-compatible endpoint. Env vars:
- `GEMINI_API_KEY` (required) - free key from Google AI Studio.
- `GEMINI_MODEL` (optional, default `gemini-2.5-flash`).

## Deploy on Vercel (one time, ~3 minutes)
1. Push this folder to a GitHub repo, or drag the folder into https://vercel.com/new
2. In the Vercel project: Settings -> Environment Variables -> add `GEMINI_API_KEY`
   with the key value. (Never commit the key; `.env` is gitignored for this reason.)
3. Deploy. You get a link like `https://hagglebot-xxxx.vercel.app`.
4. Send that one link to all teams (WhatsApp) and/or make a QR code of it and project it.
5. Before the event, open the link once yourself and play a test round.

## Event-day judging
- All teams start on the organizer's signal.
- A finished team screenshots its end screen (team name, deal price, messages used)
  and sends it to the organizers.
- Scoring: price marks out of 70 by distance from MRP 4,999 toward the floor 3,499,
  +15 for a deal within 8 messages, +15 for fair play (no injection tricks - the
  prompt is hidden, so tricks only show up as weird chat behaviour on their screens).

## Notes
- Free Gemini quota is per Google account per day and is shared across all teams.
  A full event (about 12 teams x up to 13 calls) is roughly 160 calls; if quota
  errors appear ("shopkeeper is busy"), wait a bit or switch `GEMINI_MODEL` to
  `gemini-2.5-flash-lite`, which has a larger free quota.
- The page is stateless; refreshing restarts that team's round. Volunteers handle disputes.
