# Assignment 3 — Submission

**Course:** Design, Build, Ship (MPCS 51238, Spring 2026)
**Project:** PaperTrade — Paper Trading Platform

---

## Deliverables

| | Link |
|---|---|
| **Vercel (Live Site)** | https://paper-trade-six-gamma.vercel.app |
| **GitHub Repository** | https://github.com/Shahzaib-Jamali/dbs-assignment-3 |

---

## Reflection Questions

### 1. Trace a request: a user searches, saves, and views it on their profile. What systems are involved?

- **Search:** Browser → Next.js API route (`/api/search`) → Alpha Vantage `SYMBOL_SEARCH` endpoint → results returned to the browser. Clerk session cookie is verified server-side on every API call.
- **Save (watchlist):** Browser → `/api/watchlist` (POST) → Supabase `watchlist` table (INSERT/UPSERT with the user's `clerk_user_id`). No external API needed.
- **View on profile (`/watchlist` page):** Browser → Next.js server component → Supabase (SELECT from `watchlist` WHERE `clerk_user_id` = user) → for each row, Alpha Vantage quote endpoint is called server-side to get live price → fully-rendered HTML sent to browser.

Systems involved: **Clerk** (auth), **Supabase** (persistence), **Alpha Vantage** (live prices), **Vercel** (compute/hosting), **Next.js** (routing + server rendering).

---

### 2. Why should your app call the external API from the server (API route) instead of directly from the browser?

Three reasons:

- **Secret protection:** The Alpha Vantage API key would be visible in the browser's network tab if called client-side. By routing through `/api/search`, `/api/quote`, `/api/chart`, the key only ever exists in the server environment.
- **Rate limiting control:** All requests funnel through our server, so we can cache, throttle, or queue calls before they reach Alpha Vantage's free-tier limits.
- **CORS:** Alpha Vantage does not allow direct browser requests from arbitrary origins. The server acts as a proxy that has no such restriction.

---

### 3. A classmate signs up on your app. What data does Clerk store vs. what does Supabase store? How are they connected?

| | Clerk | Supabase |
|---|---|---|
| **Stores** | Email, password hash, OAuth tokens, session JWTs, MFA settings, device history | `portfolios` row (cash balance), `holdings`, `trades`, `watchlist` |
| **Does NOT store** | Any trading data | Passwords or auth credentials |

**Connection:** Clerk issues a `userId` (e.g. `user_2abc...`) upon sign-up. Every Supabase row stores that string as `clerk_user_id`. On every server request, `await auth()` from `@clerk/nextjs/server` extracts the `userId` from the session cookie — that same string is used as the WHERE clause in every Supabase query, scoping all data to that user. There is no foreign key; the link is purely by matching the string.

---

### 4. Ask Claude (with MCP) to describe your database. Paste the response. Does it match your mental model?

**Claude's response via Supabase MCP:**

> The database has 4 tables in the public schema:
>
> **portfolios** — One row per user. Stores `clerk_user_id` (unique), `cash_balance` (numeric, default 50000), and `created_at`. This is the user's virtual wallet.
>
> **holdings** — Current open positions. Each row has `clerk_user_id`, `symbol`, `name`, `asset_type` (constrained to 'stock' or 'forex'), `quantity`, and `avg_cost`. Represents what the user currently owns.
>
> **trades** — Immutable trade log. Each row records a completed BUY or SELL: `symbol`, `name`, `asset_type`, `trade_type` (BUY/SELL), `quantity`, `price`, and `total`. This is never deleted — it's the history.
>
> **watchlist** — Symbols the user is monitoring without owning. Stores `clerk_user_id`, `symbol`, `name`, `asset_type`, and `added_at`. Has a UNIQUE constraint on `(clerk_user_id, symbol)` to prevent duplicates.
>
> All tables use UUID primary keys and are scoped per user by `clerk_user_id`. RLS is disabled — access control is enforced in application code using the Clerk session.

**Does it match the mental model?** Yes, exactly. The four tables map cleanly to the four concerns: wallet (portfolios), current positions (holdings), audit trail (trades), and watch queue (watchlist). The only nuance is that `holdings` rows are never truly deleted — quantity is reduced to 0 on a full SELL, and the dashboard filters by `quantity > 0`. Everything else is exactly as designed.

---

## Note on AI-Assisted Development

This project was built using **Claude Code** with MCP integrations (Supabase, Vercel, Playwright, GitHub). While the AI assistance was genuinely useful for scaffolding, debugging, and generating boilerplate, there were notable inefficiencies that complicated the development process.

### Context Window Limitations

Claude Code operates within a fixed context window — as the conversation grew longer (debugging sessions, Playwright diagnostics, brainstorming, plan writing, and implementation all in one thread), the context filled up and the session had to be compacted mid-work. This meant Claude lost access to earlier decisions and had to re-read files it had already seen, wasting tokens and time. Towards the end, entire prior conversations were summarized into a paragraph, meaning nuanced decisions made early in the session were no longer accessible.

### Subagent Overhead

When implementing the three Webull features, Claude used a "subagent-driven development" approach — spawning a fresh AI agent per task, then spawning two more agents to review spec compliance and code quality. While this sounds rigorous, in practice it was extremely slow. Each agent invocation had its own cold start, had to re-read the relevant files from scratch, and the review agents occasionally hallucinated failures (one declared the trade page had no chart integration when it clearly did). The overhead of coordinating agents outweighed the benefit for a project of this size.

### Accumulated Errors from Agents

Because multiple subagents edited the same files independently, they introduced duplicate code — `TradeForm.tsx` ended up with two `export default` declarations and duplicate state variables in `trade/page.tsx`. These bugs were invisible to individual agents since each only saw its own task. The main Claude session had to manually detect and fix them after the fact, which required reading full files again and burning more context.

### What Worked Well

- **MCP tools** (Supabase, Vercel, GitHub) allowed Claude to directly create tables, deploy to production, and push to GitHub without manual copy-paste steps.
- **Playwright MCP** enabled real browser-based diagnosis of the live site, catching auth redirect bugs and DB column mismatches that would have taken much longer to find manually.
- **Structured planning** (brainstorm → spec → implementation plan) kept the features well-defined even when execution was messy.

### Takeaway

Claude Code is effective for well-scoped, isolated tasks. It struggles with long sessions that accumulate context, and the multi-agent approach adds coordination overhead that is only worth it at a larger scale. For a project like this, direct inline execution with frequent commits would have been faster than the subagent review pipeline.
