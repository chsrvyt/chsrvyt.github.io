# SRV.DEV — Sarvesh Chonde

A live developer portfolio. Project data comes from the GitHub REST API — there
is no hardcoded list of projects anywhere in this repository. Creating a repo,
editing its description or pushing a commit changes the site.

```
Next.js 15 (static export) · React 19 · TypeScript · Tailwind CSS v4 · GSAP + ScrollTrigger
```

Deployed to GitHub Pages at **https://chsrvyt.github.io/**

---

## How it stays live on a static host

GitHub Pages serves files, not a Node process. "Live data" therefore has two
halves, and neither is decorative:

```
   BUILD TIME                          RUNTIME (the visitor's browser)
   ──────────                          ──────────────────────────────
   next build reads the GitHub API     lib/github/browser.ts re-reads
   and bakes real repos, commits       api.github.com directly and
   and counts into the HTML            replaces the baked-in data
        |                                       |
        +- crawlers and first paint get         +- a repo created since the
        |  real content, never a spinner        |  last rebuild still appears
        |                                       |
   .github/workflows/deploy.yml            LiveDataProvider owns this;
   reruns it on push, every 6h,            components never fetch for
   and on demand                           themselves
```

The browser can call GitHub directly because the REST API sends
`Access-Control-Allow-Origin: *` for public, unauthenticated reads.

**No token is ever shipped to the client.** A token in client-side code is a
published token. That caps the runtime refresh at GitHub's unauthenticated
limit — but that limit is *per visitor IP*, not per site, and the refresh costs
two requests every 15 minutes, so no visitor comes close to it.

`GITHUB_TOKEN` is used only during `next build`, where it lifts the build off
the 60/hour ceiling. In CI, Actions supplies it automatically.

---

## Running it

```bash
npm install
```

```bash
npm run dev
```

| Script              | Does                                                       |
| ------------------- | ---------------------------------------------------------- |
| `npm run dev`       | Dev server on :3000                                        |
| `npm run build`     | Typechecks, builds, exports to `out/`, verifies the export  |
| `npm run typecheck` | `tsc --noEmit`                                              |

To serve the real export locally:

```bash
python -m http.server 4173 --directory out
```

### Environment

Copy `.env.example` to `.env.local`.

| Variable               | Required | Purpose                                                            |
| ---------------------- | -------- | ------------------------------------------------------------------ |
| `GITHUB_TOKEN`         | No*      | Build-time only. Raises the API ceiling from 60/hour to 5,000/hour. |
| `NEXT_PUBLIC_SITE_URL` | No       | Canonical origin for metadata, OpenGraph and the sitemap.          |

\* Without it the build still works and degrades gracefully, but a build that
reads ~30 endpoints can exhaust 60 requests/hour on a shared IP.

---

## Deploying

The workflow is already committed. One manual step is required, once:

> **Repo → Settings → Pages → Build and deployment → Source → GitHub Actions**

Until that is switched, Pages keeps serving from a branch and will render this
README instead of the site.

After that, `.github/workflows/deploy.yml` handles everything: it builds, asserts
the export is servable, and deploys. It runs on push to `main`, every 6 hours,
and on demand via **Actions → Build and deploy to GitHub Pages → Run workflow**.

### Two things that silently break a Pages deploy

1. **`public/.nojekyll` must exist.** Without it Pages runs Jekyll, Jekyll
   ignores every directory beginning with an underscore, and the entire
   `_next` bundle disappears. The deploy "succeeds" and the site renders as
   unstyled HTML. `scripts/postbuild.mjs` fails the build if it is missing.

2. **`trailingSlash: true` is load-bearing.** It emits
   `projects/<slug>/index.html` rather than `projects/<slug>.html`. Pages
   resolves directory URLs reliably; extensionless file resolution is not
   something to depend on.

The OpenGraph card is a static `app/opengraph-image.png` rather than a generated
`opengraph-image.tsx`, for the same class of reason: the generated form emits an
extensionless URL, and on Pages the extension *is* the content type, so scrapers
were served `application/octet-stream` and rejected it.

---

## The GitHub layer

```
lib/github/
  client.ts        build-time fetch: auth, timeout, retry, rate-limit accounting
  browser.ts       runtime fetch: unauthenticated, CORS, two requests
  normalize.ts     raw payloads -> portfolio types
  categorize.ts    heuristic classification
  aggregate.ts     pure stats + selectors, shared by BOTH paths
  activity.ts      commit history (see below)
  readme.ts        per-repo README for case studies
```

`aggregate.ts` exists specifically so the build path and the browser path apply
*identical* filtering, ranking and aggregation. Two implementations would drift,
and the drift would show up as numbers changing when the client refresh lands.

### Activity: why commits, not events

The obvious source for "latest activity" is `/users/{user}/events/public`. It is
the wrong one. GitHub has trimmed PushEvent payloads for this account to:

```json
{ "repository_id": 0, "push_id": 0, "ref": "", "head": "", "before": "" }
```

No `commits` array. An events-based timeline can report *that* a push happened
but not what was in it — which is the interesting part. The feed also only
retains ~90 days.

`lib/github/activity.ts` reads `/repos/{owner}/{repo}/commits` for the five most
recently pushed repositories instead: real commit subjects, real timestamps, a
real permalink each. It is build-time only — refreshing it costs one request per
repository, which is not a sensible spend against a per-visitor rate limit for
content that changes far more slowly than the repo list.

### Status is derived, never declared

`deriveStatus()` in `lib/github/normalize.ts`:

| Condition            | Label              |
| -------------------- | ------------------ |
| `archived` flag      | `ARCHIVED`         |
| pushed <= 14 days    | `ACTIVE`           |
| pushed <= 60 days    | `RECENTLY UPDATED` |
| otherwise            | `STABLE`           |

A repository quiet for months cannot display as `ACTIVE`.

### The connection indicator is not decoration

`SyncMeta.source` has three states and the UI shows the real one:

- `build` — showing data baked in by the last rebuild; timestamp is the build
- `live` — the browser re-read GitHub successfully; timestamp is that moment
- `cache` — a re-read was attempted and failed. It says
  "GitHub temporarily unavailable · showing cached data" and **keeps the build
  timestamp**, rather than claiming a sync that did not happen.

---

## The local override layer

GitHub owns the facts. Two files own what GitHub cannot know:

- **`data/profile.ts`** — name, education, links, certifications, section copy.
  Nothing here may assert a metric, an employer or an award.
- **`data/featured.ts`** — which repos are flagship, display names, accent
  colours, category overrides. An entry naming a repo that does not exist is
  **silently ignored**, so a renamed repo degrades to absent, never to a ghost
  card. Flagship order is the array order — that is editorial, not a function
  of star count.

### Certifications

Leave `credentialUrl` as `null` when there is no public verification link; the
UI then renders no "Verify" affordance rather than a dead one. Do not invent
credential IDs or dates.

---

## Animation

Everything lives in `lib/animations/`. Components declare intent through data
attributes and never build timelines inline.

| File             | Owns                                                    |
| ---------------- | ------------------------------------------------------- |
| `registry.ts`    | Plugin registration, shared durations and easings        |
| `context.ts`     | `useGsap` — scoped `gsap.context` with automatic revert  |
| `hero.ts`        | Intro timeline, pointer parallax, scroll exit            |
| `scroll.ts`      | Batched `[data-anim]` reveals, nav compaction, counters  |
| `projects.ts`    | Sticky showcase scrub, card hover, grid staging          |
| `text.ts`        | Line splitting and masked line reveals                   |
| `transitions.ts` | Boot sequence and route content entrance                 |
| `magnetic.ts`    | Pointer attraction for controls (capped at 8px)          |

Two things to know before editing:

1. **`useGsap` reverts on unmount.** Every animation is built inside a scoped
   `gsap.context`. Without it, route changes leave orphaned ScrollTriggers
   firing against detached nodes.
2. **`[data-anim]` is revealed by one batched pass** in `MotionProvider`, which
   re-runs on every route change. `globals.css` hides `[data-anim]` under
   `.js-anim`, so an element the batch never sees stays invisible forever. Use
   `data-anim` — do not invent a new attribute unless you also animate it.

### Reduced motion

`prefers-reduced-motion: reduce` is honoured three ways: CSS neutralises
transitions, `useGsap` passes `reduced: true` so timelines resolve to their end
state, and the boot sequence, parallax, magnetics, card tilt, custom cursor and
the looping security-diagram packet are skipped entirely.

---

## Security

Hosting on Pages costs real security controls. Naming them beats pretending
otherwise:

**Lost by moving off a Node host**

- Nonce-based CSP. A static export has no per-request nonce, so `script-src`
  needs `'unsafe-inline'` for Next's bootstrap scripts.
- `frame-ancestors`, HSTS, `Permissions-Policy`, `X-Frame-Options` — all
  response headers, and Pages does not let you set them.
- The server-side API proxy that kept the token off the wire and put one shared
  cache in front of GitHub.

**Still in place**

- A `<meta>` CSP with a closed `default-src`, `object-src 'none'`, locked
  `base-uri` and `form-action`, and an explicit allow-list of the only
  third-party origins the site contacts.
- No token in the client bundle, by construction — the runtime path is
  deliberately unauthenticated.
- Safe external links (`rel="noopener noreferrer"` throughout) and repository
  `homepage` values parsed and rejected unless `http(s)`.
- `components/ui/Markdown.tsx` renders third-party READMEs by emitting React
  elements, never an HTML string, so embedded markup cannot execute. Link hrefs
  are restricted to `http`, `https`, `mailto`.

If any of that matters more than the hosting convenience, deploying to Vercel or
any Node host restores all of it — revert `output: "export"` and reinstate
`middleware.ts` and `app/api/`, both of which are in this repository's git
history.

---

## Structure

```
app/
  projects/[slug]/   case-study route, one per public repo
  layout.tsx         fonts, metadata, meta CSP, shell
  page.tsx           the single-page composition
components/
  github/            LiveDataProvider - owns "what GitHub currently says"
  motion/            MotionProvider - boot state, global reveals, magnetics
  preloader/  navigation/  hero/  about/
  projects/   stack/  security/  contact/  footer/  ui/
lib/
  animations/        the GSAP system
  github/            build-time + browser clients, normalisation, aggregation
  cache/             TTL cache with stale-on-failure (build-time dedupe)
  utils/
data/
  profile.ts         identity
  featured.ts        curation + overrides
  sections.ts        the page spine (nav and progress rail read from this)
scripts/
  postbuild.mjs      asserts the export is actually servable
```
