# SRV.DEV — Sarvesh Chonde

A live developer portfolio. Project data is read from the GitHub REST API at
request time, normalised, cached and revalidated — there is no hardcoded list of
projects anywhere in this repository. Creating a repo, editing its description
or pushing a commit changes the site.

```
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · GSAP + ScrollTrigger
```

---

## Running it

```bash
npm install
```

```bash
npm run dev
```

Then open <http://localhost:3000>.

| Script              | Does                                     |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Dev server                               |
| `npm run build`     | Production build (also typechecks)       |
| `npm start`         | Serve the production build               |
| `npm run typecheck` | `tsc --noEmit`                           |

### Environment

Copy `.env.example` to `.env.local`. Every variable is server-only — none are
`NEXT_PUBLIC_`-prefixed, so none reach the client bundle.

| Variable                | Required | Purpose                                                                                            |
| ----------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`          | No*      | Raises the GitHub rate limit from **60/hour** (per IP) to **5,000/hour**. A fine-grained token with **no scopes** is enough — this only reads public data. |
| `GITHUB_WEBHOOK_SECRET` | No       | Shared secret for `/api/github/webhook`. **Unset means the webhook rejects everything** (fail closed). |
| `NEXT_PUBLIC_SITE_URL`  | No       | Canonical origin for metadata, OpenGraph and the sitemap.                                          |

\* Not required, but recommended. Without it the site works and degrades
gracefully, but a busy day can exhaust 60 requests/hour and push the UI into its
cached state.

---

## How the GitHub integration works

```
GitHub REST API
      ↓
lib/github/client.ts        auth, timeout, retry, rate-limit accounting
      ↓
lib/github/normalize.ts     raw payloads → portfolio types, categorisation
      ↓
lib/cache/store.ts          TTL cache, single-flight, stale-on-failure
      ↓
app/api/github/*            internal JSON endpoints (validated, rate-limited)
      ↓
React
```

No React component ever calls `api.github.com`. The token could not leak into
the browser even by accident — `lib/github/client.ts` throws if it is imported
in a client context.

### Endpoints

| Route                    | Returns                                                     |
| ------------------------ | ----------------------------------------------------------- |
| `GET /api/github/profile` | Normalised public profile                                   |
| `GET /api/github/repos`   | All surfaced repositories. Optional `category`, `tier`, `q`, `limit` — each validated against a whitelist |
| `GET /api/github/activity`| Recent commits across the most recently pushed repositories |
| `GET /api/github/stats`   | Aggregate counts and language distribution                  |
| `POST /api/github/webhook`| Signature-verified cache invalidation                       |

Every read response is an envelope:

```jsonc
{
  "data": [ /* … */ ],
  "meta": {
    "source": "live",              // or "cache"
    "syncedAt": "2026-08-17T…",    // when GitHub was actually reached
    "degraded": false              // true ⇒ GitHub was unreachable
  }
}
```

`meta.degraded` is what drives the connection indicator in the UI. **There is no
decorative "online" state** — if GitHub cannot be reached, the page says
"GitHub temporarily unavailable · showing cached data" and the timestamp shows
when the data was really fetched.

### Activity: why commits, not events

The obvious source for "latest activity" is `/users/{user}/events/public`. It is
the wrong one. GitHub has trimmed PushEvent payloads for this account down to:

```json
{ "repository_id": …, "push_id": …, "ref": …, "head": …, "before": … }
```

No `commits` array, no `size`. An events-based timeline can therefore report
*that* a push happened but not what was in it. The events feed also only retains
~90 days.

`lib/github/activity.ts` instead reads `/repos/{owner}/{repo}/commits` for the
five most recently pushed repositories, which yields real commit subjects, real
timestamps and a real permalink per commit. That costs 5 requests per refresh,
which is why its cache TTL is the longest of the four (10 minutes ≈ 30
requests/hour, comfortably inside the unauthenticated ceiling).

### Repository status is derived, never declared

`deriveStatus()` in `lib/github/normalize.ts`:

| Condition            | Label              |
| -------------------- | ------------------ |
| `archived` flag      | `ARCHIVED`         |
| pushed ≤ 14 days ago | `ACTIVE`           |
| pushed ≤ 60 days ago | `RECENTLY UPDATED` |
| otherwise            | `STABLE`           |

A repository that has been quiet for months cannot display as `ACTIVE`.

### Webhook (optional)

Without it, data still refreshes — the TTL cache expires within minutes. The
webhook just makes updates immediate.

On GitHub → repository → Settings → Webhooks:

- **Payload URL** — `https://<your-domain>/api/github/webhook`
- **Content type** — `application/json`
- **Secret** — the same value as `GITHUB_WEBHOOK_SECRET`
- **Events** — push, create, delete, repository, release, public

```
PUSH → signature verification → event validation → cache invalidation → revalidation
```

Signatures are compared with `timingSafeEqual`. A plain `===` on the hex digest
leaks the correct prefix length through timing.

---

## The local override layer

GitHub owns the facts. Two files own the things GitHub cannot know:

- **`data/profile.ts`** — name, education, links, certifications, section copy.
  Nothing in this file may assert a metric, an employer or an award.
- **`data/featured.ts`** — which repositories are flagship, their display names,
  accent colours, and category overrides for cases the classifier gets wrong.
  An entry naming a repository that does not exist is **silently ignored**, so a
  renamed repo degrades to absent rather than to a ghost card.

Flagship projects appear in the sticky showcase in the order they are listed in
`data/featured.ts` — that ordering is editorial, not a function of star count.

### Certifications

Only add entries you can evidence. Leave `credentialUrl` as `null` when you
have no public verification link — the UI then renders no "Verify" affordance,
rather than a dead one. Do not invent credential IDs or issue dates.

---

## Animation

Everything lives in `lib/animations/`. Components declare intent through data
attributes; they never build timelines inline.

| File            | Owns                                                        |
| --------------- | ----------------------------------------------------------- |
| `registry.ts`   | Plugin registration, shared durations and easings            |
| `context.ts`    | `useGsap` — scoped `gsap.context` with automatic revert       |
| `hero.ts`       | The intro timeline, pointer parallax, scroll exit            |
| `scroll.ts`     | Batched `[data-anim]` reveals, nav compaction, counters      |
| `projects.ts`   | Sticky showcase scrub, card hover, grid staging              |
| `text.ts`       | Line splitting and masked line reveals                       |
| `transitions.ts`| Boot sequence and route content entrance                     |
| `magnetic.ts`   | Pointer attraction for controls (capped at 8px)              |

Two things worth knowing before editing:

1. **`useGsap` reverts on unmount.** Every animation is built inside a scoped
   `gsap.context`. Without that, route changes leave orphaned ScrollTriggers
   firing against detached nodes.

2. **`[data-anim]` is revealed by one batched pass** in `MotionProvider`, which
   re-runs on every route change. `globals.css` hides `[data-anim]` while
   `.js-anim` is set, so an element the batch never sees stays invisible
   forever. If you add a reveal target, use `data-anim` — do not invent a new
   attribute unless you also animate it.

### Reduced motion

`prefers-reduced-motion: reduce` is honoured at three levels: CSS neutralises
transitions, `useGsap` passes `reduced: true` so timelines resolve to their end
state, and the boot sequence, parallax, magnetic buttons, card tilt, custom
cursor and the looping security-diagram packet are skipped entirely.

---

## Security

The site is meant to demonstrate the thing it talks about.

- **Nonce-based CSP** (`middleware.ts`). A fresh nonce per request with
  `'strict-dynamic'`, so `script-src` never needs `'unsafe-inline'`.
  `style-src` retains `'unsafe-inline'` for server-rendered style attributes;
  GSAP mutates styles through the CSSOM, which CSP does not govern.
- **Security headers** (`next.config.ts`) — HSTS, `nosniff`, `frame-ancestors
  'none'`, a closed `Permissions-Policy`, `X-Frame-Options: DENY`.
- **Server-only secrets.** `lib/github/client.ts` throws if imported client-side.
- **Signed webhooks**, verified in constant time, failing closed.
- **Input validation.** Query parameters are whitelisted; unrecognised values
  are dropped, never echoed back.
- **Rate limiting** on every internal route.
- **Safe external links** — `rel="noopener noreferrer"` throughout, and
  repository `homepage` values are parsed and rejected unless `http(s)`.
- **README rendering** (`components/ui/Markdown.tsx`) emits React elements and
  never an HTML string, so markup embedded in a third-party README cannot
  execute. Link hrefs are additionally restricted to `http`, `https`, `mailto`.

---

## Deploying

This app needs a Node runtime. It uses middleware, route handlers, ISR and
server-side rendering, so **it cannot be hosted on GitHub Pages or any other
static-file host** — `next export` would drop the middleware, the API layer and
the revalidation that make the portfolio live.

Vercel is the path of least resistance:

1. Import the repository.
2. Add `GITHUB_TOKEN`, `NEXT_PUBLIC_SITE_URL`, and `GITHUB_WEBHOOK_SECRET` if
   you are using the webhook.
3. Deploy.

Any Node host works — Netlify, Render, Fly, a container — as long as it runs
`next build && next start`.

---

## Structure

```
app/
  api/github/        internal endpoints + webhook
  projects/[slug]/   case-study route
  layout.tsx         fonts, metadata, shell
  page.tsx           the single-page composition
components/
  motion/            MotionProvider — boot state, global reveals, magnetics
  preloader/  navigation/  hero/  about/
  projects/   github/      stack/  security/  contact/  footer/  ui/
lib/
  animations/        the GSAP system
  github/            client, normalisation, categorisation, aggregation
  cache/             TTL cache with stale-on-failure
  security/          webhook verification, rate limiting
  api/  utils/
data/
  profile.ts         identity
  featured.ts        curation + overrides
  sections.ts        the page spine (nav and progress rail read from this)
```
