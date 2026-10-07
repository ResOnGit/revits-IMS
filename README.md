# revits -- IMS

Inventory kiosk for warung(s). React UI + a small Node API + SQLite.

```
Browser  →  /api/...  →  Node (Express)  →  server/data/revits.db
```

In development Vite (port 5173) proxies `/api` to the API (port 3001).
In production one Node process serves both the built UI and the API.

2026 Res @Revits. All rights reserved.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env`. Set `SMTP_PASS` to a Gmail App Password for the mailbox in `SMTP_USER`. For local dev without email, set `OTP_LOG_TO_CONSOLE=1` to print codes in the API terminal.

## Daily use

| Command            | What it does                                               |
| ------------------ | ---------------------------------------------------------- |
| `npm run dev`      | API + Vite; use `localhost:5173` on the dev PC             |
| `npm run build`    | Build the UI into `dist/`                                  |
| `npm start`        | Serve UI + API from `dist/` (run `build` first)            |
| `npm run db:reset` | Wipe SQLite tables and re-seed a blank shop + REVITS Admin |
| `npm run lint`     | ESLint                                                     |

Open **http://localhost:5173** while developing.

**LAN / tablet on `:5173`:** API writes may return `Permintaan ditolak.` — use `npm run build && npm start` and **http://PC-IP:3001** instead, or develop on the same machine.

Production: `npm run build && npm start`, then open **http://YOUR-IP:3001** (or your reverse-proxy URL once `BASE_PATH` is configured).

## Login & roles

- Login is **email OTP** + an HttpOnly cookie (`revits_session`). First-boot Admin: `miihendraa@gmail.com` (REVITS Admin).
- **Admin** — full access including Pengguna and Toko.
- **Karyawan** — inventori + katalog; cannot open Pengguna or Toko.
- **Operator** — read-only (transactions, katalog, jurnal).

## Features

- **Katalog** — add/edit barang (kode, nama, satuan, harga). Stok changes only via Barang Masuk / Terjual / Cari Selisih.
- **Barang Masuk** — quick-add new barang from the picker if not in katalog yet.
- **Jurnal** — server-side pagination and filters (recent slice still on Dashboard).
- **Pengguna** — Admin can add/edit users and assign email for OTP login.

## Data

- Database file: `server/data/revits.db` (gitignored). Copy that file to back up.
- First start with an empty DB seeds a blank shop and one Admin (`miihendraa@gmail.com`). No catalogue or jurnal.
- One SQLite file per toko. Set `DB_PATH` for a second instance.

## Deploy (self-host)

- **Simple LAN kiosk:** `build` + `start` on the shop PC.
- **Behind reverse proxy on a shared host:** subpath support (`BASE_PATH`) is planned — see `reslogs/how2/reverse-proxy-subpath.md`.
- **Remote access:** Tailscale to the server; avoid public port-forward. Set `COOKIE_SECURE=1` over HTTPS.
- **Updates on server:** `git pull` → `npm ci` → `npm run build` → restart — not `npm update`. See `reslogs/how2/deploy-debian.md`.

## Security

- API checks `Origin` on mutating requests (no wide-open CORS).
- Set `HOST=127.0.0.1` when a reverse proxy or Tailscale Serve is the only front door.
- Do not set `OTP_LOG_TO_CONSOLE=1` in production.
- Set `COOKIE_SECURE=1` when served over HTTPS.

SQL queries use parameterized statements (`better-sqlite3` prepare/bind).

## Layout

- `src/` — React screens
- `shared/` — role matrix and jurnal limits (used by client + server)
- `server/index.js` — HTTP
- `server/db.js` — SQLite schema + writes
- `server/security.js` — headers, origin checks, OTP rate limit
- `server/seed.js` — blank toko + REVITS Admin, only if the DB has no users yet

Operator / deploy notes: **`reslogs/README.md`** (Res-only, not for public GitHub ops).
