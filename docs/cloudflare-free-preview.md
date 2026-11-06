# Cloudflare Free Preview

Date: 2026-11-05. Branch: `codex/cloudflare-free-preview`.

This is a read-only compatibility and CPU-limit experiment, not a production migration.

## Cost Guardrails

- Account Workers subscription verified as **Workers Free / Active** in the dashboard.
- Separate Worker name: `konseycomics-free-preview`; `workers.dev` only, no custom domain or routes.
- The account is on Workers Free, which enforces its own invocation CPU limit. Do not add a custom `limits.cpu_ms`: the Free plan rejects that setting, even when set to 10ms (API code 100328).
- No R2, Images, KV, D1, Queue, Durable Object, AI, container or paid cache bindings.
- No subscription upgrades, payment changes, DNS edits, production deployment changes or media uploads.
- The pre-existing R2 subscription is usage-billed. Dashboard observed usage was within included limits: $0.00, approximately 5.6k Class B operations, 108 Class A operations and 0.09 GB-month storage. This snapshot is not a future hard spending cap. The experiment does not write R2 objects.

## Isolation

The experiment lives in a separate worktree at `/tmp/konseycomics-cloudflare-free`. Production branches remain unchanged. Only the public Supabase URL and anonymous key are copied into ignored local environment files. No service-role key, R2 credentials, admin password or other private environment values are copied or deployed.

The wrapper denies all non-GET/HEAD methods, every API route, admin, sign-in, auth callbacks, password reset and profile editing. Every dynamic response carries noindex/nofollow/noarchive; robots.txt disallows all crawling. Visitor writes and Vercel telemetry are removed from the preview layout. Sharp is replaced by a preview-only throwing module; upload handling is not implemented or validated for Cloudflare. An image optimization service is deliberately not attached, so previews use original assets rather than on-demand resizing.

## Adapter

Vinext 1.4.3 with React 19.3.1 and Vite 8.3.6, running through Cloudflare's Vite plugin and workerd. This is an adapter compatibility experiment; it does not establish production equivalence with Next.js. The automated scanner reports 97% compatibility with image optimization as partial. That percentage is not a test success rate or a CPU-capacity estimate.

## Checks Completed

- Production Workers build succeeded.
- Wrangler deployment dry run succeeded: 219 modules, about 3997 KiB raw / 1575 KiB gzip. No deployment performed by the dry run.
- Local workerd GETs for home, archive, reader and robots.txt returned 200 and preview/noindex headers.
- POST media upload and forum topic creation, GET admin and sign-in returned 403 as intended.
- 27 focused reader, archive, relative-time and SEO tests passed.
- Desktop (1440px) and mobile (390px) browser checks passed for home, archive, series detail, reader and forum. Archive search, fullscreen and next-page book turning worked; no page errors or horizontal overflow in those checks.
- Browser writes to Supabase were intercepted in tests. No publishing, authenticated sessions, real uploads or data migrations tested.

Artifacts: `/tmp/konsey-cloudflare-preview/`, including `results.json` and screenshots. The first browser run waited for networkidle and timed out on a series page despite HTTP 200; the final run uses explicit DOM/interaction checks instead. External browser/database requests can outlive rendering.

## Real Cloudflare Free Results

Preview: https://konseycomics-free-preview.konseycomics.workers.dev

Version: `8bcce4ad-f6bc-4020-a9c6-7da08ab71fdc`. Deployed on the existing Workers Free account. Custom domains and routes remain absent; only static Assets and the two public Supabase settings are attached. No R2/Images/KV/D1 bindings or paid subscription was added.

All 15 sequential HTML probes across five public paths returned 200 in three rounds. Both desktop and mobile browser runs then passed home, archive, series detail, reader and forum checks, including search/fullscreen/page-turn interactions. Edge screenshots and browser results are at `/tmp/konsey-cloudflare-edge/`.

Wrangler tail captured **18 representative route invocations**, including HTML/browser navigation requests. **16 exceeded 10ms CPU**, with a maximum of **104ms**. Early direct-request examples: archive 42ms; series detail 32ms; reader 25ms; forum 33ms; warm home 24-28ms. These are actual trace `cpuTime` values, not wall-time estimates. All captured outcomes were `ok`; no `exceededCpu` outcome was observed in this small sample. Tail connected after the first probe, so these traces are not an exhaustive count of every probe or browser request. Sanitized measurements: `/tmp/konsey-cloudflare-edge-cpu.json`.

Cloudflare documents per-isolate flexibility for occasional limit overruns. Successful small-sample responses therefore do not establish sustained Free-plan suitability. This unoptimized full-SSR prototype is **not approved for production cutover** under the user's zero-spend constraint. Main domain remained on Vercel (HTTP 402 DEPLOYMENT_DISABLED at the final check).

Wrangler authorization completed through the user's browser. The current CLI additionally required `workers_scripts:write` for the version publishing API; the user explicitly approved that extra permission. No R2-write, billing-write or domain-route permission was requested. An initial deployment failed because the Free plan rejects custom CPU-limit configuration (100328); a second failed for the missing script permission. Those failures did not trigger a paid upgrade.

The CLI tail session was stopped after measurements. Local preview server may remain on port 8787 for inspection. OAuth and Supabase private credentials must never be copied into the repository.

## Next Steps

1. Do not switch DNS based on these results; CPU headroom is insufficiently demonstrated.
2. If continuing the zero-spend design, investigate build-time generation/static delivery and a minimal API layer instead of rendering all public HTML for every request. Preserve publication scheduling, freshness, canonical URLs and authorization boundaries.
3. Image upload processing, persistent caching and authenticated-flow validation remain separate required work. Existing upload endpoints are intentionally blocked in this prototype.
4. Repeat real-edge CPU measurements after architectural changes, without increasing the plan or attaching paid services. Production cutover requires a separate readiness review.

Reference for CPU interpretation: https://developers.cloudflare.com/workers/platform/limits/#cpu-time .
# Static HTML experiment (2026-11-05)

The isolated preview now prerenders published public catalog/series/chapter routes
with vinext's Static Assets adapter. The latest build rendered 107 routes with no
render errors, including 100 home/archive/local/series/reader HTML snapshots.
`generateStaticParams` only uses currently published series and chapters. Drafts
and future schedules are excluded by the existing public data loaders.

The native adapter still incurred excessive CPU on some cache hits. A narrow HTML
fast path therefore streams the framework-generated public HTML from ASSETS before
loading the renderer. It excludes RSC/navigation requests and requests carrying
cookies or Authorization. It reuses the existing security headers. Private snapshot
URLs are denied externally. Public immutable index metadata is the only isolate
cache; no user state is stored there.

Archive filters use client-side URL history and initialize after hydration, so
query URLs can share the same public HTML without rendering every search. Initial
structured data describes the canonical unfiltered archive. Reload tests cover
search state; broader back/forward and authenticated navigation checks remain.

`npm run build:vinext` now validates required pages/no private snapshots/no render
errors and prepares the direct-delivery index. This is NOT automatic publication:
Static Assets ignores runtime invalidations. A fresh build and preview deployment
is required after new publications, unpublishing/deletion, ratings changes, or a
scheduled release. An automated update pipeline has NOT been enabled. Do not
cut over production until publication scheduling and removals are reliable.

Preview version: `d87825a6-c882-4b0b-8764-93ed7d6f7de0`.
Initial direct HTML edge samples recorded CPU rounded to 0 ms for the home,
archive, example series and reader. This is a small sample, not a capacity
guarantee. Native RSC navigation still reached 30 ms, and forum HTML 68-86 ms.
Consequently the complete application still does NOT meet the Free CPU budget.
Login, uploads, account actions and moderation remain deliberately blocked.
No new paid bindings, billing changes, domain changes or production pushes.

## Follow-up: forum and account trial (2026-11-06)

The temporary worktree was removed outside this task. Work was recovered in
`/Users/keremcemsacli/.codex/worktrees/konseycomics-cloudflare-free`; production
worktree remains unchanged. Forum changes that were already running in preview
were restored from the recorded patch and verified again.

- Public forum loaders can use the anonymous server client when no admin key is
  present. They retain explicit active/published predicates and public projections.
- Forum home, categories, topics, Planet articles and the official profile now
  generate snapshots. The previous verified build contained 133 rendered routes
  and 126 directly served public HTML pages, including real forum topics.
- Trial `next/link` uses document navigation instead of RSC/prefetch; home search,
  logout and reader chapter selection also use document navigation.
- Common static assets bypass the renderer, and the application icon is copied
  into the assets bundle rather than invoking a dynamic metadata image route.
- User explicitly approved storing the existing Supabase service-role key only
  as a Worker secret, and adding the exact preview `/auth/callback` redirect. The
  secret and callback entry were confirmed on resume; no secret is in Git.
- `KONSEY_PREVIEW_ACCOUNTS=1` permits account pages and only the login/profile-sync
  POST handlers. Other API mutations, media uploads and server actions stay blocked.
  The shared browser Supabase client additionally rejects trial REST writes, to
  prevent accidental live content edits during panel inspection. This guard is
  not a replacement for database RLS or server-side role checks.
- Next and sharp were updated in this trial branch; production-package audit now
  reports zero high/critical findings, but seven low/moderate findings remain.
  Do not describe the project as vulnerability-free or production approved.

Remaining blockers: real Google/password login and panel verification, compatible
upload optimization (native sharp is disabled on Workers), and an automated
publication/removal/scheduling pipeline. Static snapshots do not update themselves.
No full-production migration or main-domain cutover is approved by these tests.

Account-test deployment: `052c941e-47cd-4bbd-80a0-c09578f99806`.
The restored/updated build passed 31 focused Node tests, desktop/mobile public
browser checks (including real topic navigation), and unauthenticated account
boundary checks. Missing login fields return 400; missing profile token returns
400; an invalid profile token returns 401. Uploads and forum publishing return
403; internal snapshot files return 404. These checks do not establish successful
authenticated login or upload support. The user was handed the login screen for
their own Google/account sign-in; no authenticated session has been verified yet.

The trial login handler no longer falls back to listing up to 2,000 auth users
for unknown usernames. Email login remains available to legacy accounts whose
profile username is missing. The deployment bundle is near the Free compressed
script-size ceiling; any additional server modules require renewed size checks.
