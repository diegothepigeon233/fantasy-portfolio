# Fantasy Portfolio

An archive of my fantasy sports seasons (FPL, F1 Fantasy, World Cup, UEFA…).
Astro + Tailwind, data in a spreadsheet in this repo, hosted on Vercel.

## The monthly routine

1. Open `data/fantasy-portfolio.xlsx` and update the numbers.
2. Save and close it.
3. Commit and push:

```bash
git add -A
git commit -m "Update: January standings"
git push
```

Vercel rebuilds automatically and the site is live in ~30 seconds.
Because the spreadsheet is in git, `git log` is a full history of every change.

---

## The spreadsheet

Two sheets (tabs), named exactly `leagues` and `seasons`. Row 1 is the header
row — **don't rename or reorder the headers**, the site matches on those names.

### Sheet: `leagues`

One row per competition you play.

| Column | Notes |
|---|---|
| `slug` | Short id, no spaces. Becomes the URL: `fpl` → `/leagues/fpl`. |
| `name` | Display name, e.g. Fantasy Premier League. |
| `category` | Homepage section heading, e.g. `Soccer Official`, `F1 Official`, `Others`. |
| `sport` | e.g. Soccer, Motorsport. |
| `accent` | Hex colour for the league's dot, e.g. `#38bdf8`. |
| `blurb` | Optional one-liner shown under the title. |

Adding a whole new league is just a new row here — no code changes.

**About `category`:** it's free text, so a brand-new category is just a new
value typed into the cell. Sections appear on the homepage in the order their
category *first shows up* in this sheet — so to move "Others" above
"F1 Official", move its rows up. Blank means `Others`.

This is where draft leagues, mini-leagues and custom-rules leagues go as you
add them.

### Sheet: `seasons`

One row per season, per league. Only `league` and `season` are required;
leave anything else blank and it renders as `—`, never as `0`.

| Column | Notes |
|---|---|
| `league` | **Required.** Must match a `slug` from the `leagues` sheet. |
| `season` | **Required.** e.g. `2025-26`. |
| `points` | |
| `overall_rank` | |
| `pct_finish` | e.g. `6%` → shown as "Top 6%". |
| `total_players` | Only needed if you *don't* fill in `pct_finish` — then the percentile gets calculated for you. |
| `team_name` | Your squad name that season. |
| `mini_league`, `mini_league_rank`, `mini_league_size` | Head-to-head with friends. |
| `result` | Short badge text, e.g. `Won mini-league`. |
| `highlight` | `TRUE` pins the season to the homepage trophy case. |
| `notes` | Free text — a sentence on how the season went. |

### Sheet: `private-mini-leagues` (optional)

Private leagues with friends. These render in their own section at the bottom
of the relevant league page, grouped by season. The sheet is optional — delete
it and the site just builds without those sections.

| Column | Notes |
|---|---|
| `league` | **Required.** Must match a `slug` from the `leagues` sheet. |
| `season` | e.g. `2026-27`. Doesn't need a matching row in `seasons`. |
| `mini_league_host` | Who runs it, e.g. 企鹅联赛. |
| `mini_league_format` | The ruleset, e.g. 队长vs, 无Big6. |
| `team_name` | Your squad name in that mini-league. |
| `mini_league_result` | How it ended. **Leave blank while it's ongoing** — blank shows a blue "In progress" badge instead. |

> **On `pct_finish`:** that column is formatted as *text* on purpose. Excel
> normally converts `6%` into the number `0.06`, which would display as
> "Top 0.06%". The site defends against this too, but leave the column
> formatting alone and it can't happen.

---

## Running it locally

```bash
npm install
npm run dev
```

Then open the URL it prints (usually http://localhost:4321).

If you edit the spreadsheet while `npm run dev` is running, restart it —
the workbook is read once at startup.

Close the file in Excel before building. Excel holds a lock on open `.xlsx`
files and the build will fail to read it.

---

## Deploying (first time only)

1. Push this folder to a new GitHub repo.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import that repo.
3. Accept the defaults and deploy. There's nothing to configure — no
   environment variables, no API keys, no database.

Every `git push` after that redeploys automatically.

---

## Where things live

| Path | What it does |
|---|---|
| `data/fantasy-portfolio.xlsx` | **All your data.** The only file you edit month to month. |
| `src/lib/data.ts` | Reads and parses the workbook. All data logic is here. |
| `src/pages/index.astro` | Homepage: trophy case + league cards. |
| `src/pages/leagues/[slug].astro` | One page per league, season by season. |
| `src/layouts/Layout.astro` | Shared page shell (header, footer, `<head>`). |
| `src/styles/global.css` | Tailwind import + colour theme. |
