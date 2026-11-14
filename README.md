# Cryptus · Mini App (PAPER)

Static Telegram Mini App that shows a **paper-trading** (simulated, no real money) Solana memecoin desk live:
total and per-portfolio equity, charts, agents, activity feed, open positions and Lab experiments, in Italian.

* Pure static files (`index.html`, `app.js`, `style.css`), hosted on GitHub Pages. No build step, no backend.
* Live data arrives over public relays (MQTT over WSS on `public.cloud.shiftr.io`, fallback `ntfy.sh`) as
  **AES-256-GCM encrypted**, gzip-compressed messages. The channel name and key are passed in the URL fragment
  (`#t=…&k=…`), which browsers never send to any server; nothing secret is stored in this repository.
* Opens inside Telegram (via the bot's "Apri app" button) or in any modern mobile browser with the full link.
* Read-only: the app cannot place trades or change anything on the desk.
