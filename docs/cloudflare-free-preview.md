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

### CAPTCHA failure found during real login

The user encountered the Turkish CAPTCHA verification error. The account trial
was built without `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, so Supabase correctly rejected
password login while the frontend did not render Turnstile. The existing widget
was found in the Cloudflare dashboard; it currently allows only the two production
hostnames. Its public site key was added to ignored trial environment files, but
its secret and the Supabase protection configuration were NOT changed.

An account-enabled build now fails before bundling when the public CAPTCHA key is
missing. Three regression tests cover this boundary (34 focused tests pass in
total). The rebuilt artifact includes the key, but is NOT deployed yet: adding
only the exact preview hostname to the existing widget requires the requested
user confirmation. Do not claim login is fixed until this is saved, the artifact
is deployed, the real widget renders, and the user retries login.

User subsequently approved the exact preview hostname. The existing widget was
saved with three hostnames, managed mode and no pre-clearance unchanged. No widget
secret was viewed, rotated, or copied; Supabase CAPTCHA remains enabled.
Deployment `56c74dda-0526-4d1a-a0a3-b800f07fcbb6` includes the public site key and
widget readiness/error feedback. The local mock loader test passes both delayed
API readiness and script failure, without tokens or auth submissions. Remote
unauthenticated boundary/HTML checks pass.

Real CAPTCHA verification remains pending: the controlled Chrome session reports
Cloudflare error 300030 (generic challenge failure/bot detection). Do not bypass
this with test keys or disabling protection. Ask the user to retry manually in a
normal browser or on their phone. During repeated preview deployments, the same
controlled tab also reported a failed dynamic import, although the referenced
asset exists locally and returns HTTP 200 remotely. A clean-browser test and
deployment asset-cache/version checks are still required; do not call the full
login flow verified.

### November 7: preview page loading / asset versions

The user confirmed the inaccessible URL was the preview, not the production
domain. Their controlled Chrome login tab reproduced a failed dynamic import
for `DB0J34oy.js`. The remote file and its transitive imports returned 200 and
matched the previous local build, so cache/version skew was investigated rather
than claiming a missing remote file was established.

Builds now assign a single generated release ID before bundling and use that ID
as the local asset prefix and deployment ID. Public compiled assets from the
previous three builds are retained; HTML snapshots and server files are never
included in this history. The ignored history directory and release file stay
local. Wrangler's old-asset-ttl flag is not used: its implementation concerns
legacy Workers Sites rather than the Static Assets binding used here.

Deployment `c2681e02-702d-48c9-aaca-df7618e9ca1d` passed 37 focused tests,
local and remote desktop/mobile public browser checks, local mocked Turnstile
loader tests, and remote unauthenticated account boundaries. Both retained legacy
and current prefixed assets return 200. The local account boundary test cannot
complete profile-sync checks without the deliberately absent local service key;
the remote checks passed using the existing Worker secret.

Reloading the originally broken Chrome tab now keeps the login form visible
without another dynamic-import failure. Turnstile still reports a visible load
failure in that controlled browser. Real manual sign-in remains unverified and
must be retried by the user on their own browser/phone. No CAPTCHA bypass,
production domain change, new paid binding, or successful-upload claim was made.
Compressed Worker size is 3056.62 KiB, close to the Free ceiling: further server
additions must be size-checked. Publication refresh and uploads remain unfinished.

### Turnstile async loader correction

The in-app browser reproduced the blank widget and a ready() warning. Inspection
of the current official api.js confirmed ready() throws error 3857 when the script
was loaded with async/defer. The component already awaits the script load event,
so it now calls render() directly rather than ready(render). The local regression
fixture now throws from ready(), matching this vendor restriction; both rendering
and visible script-failure tests pass without generating tokens or submitting auth.
No backend verification or CAPTCHA configuration was weakened.
Deployment b989924d-9aeb-478f-9f94-fa3d227780f3 was checked in the in-app browser:
the real widget automatically completed and the page displayed "Guvenlik
dogrulandi". No challenge was clicked, credentials entered, or login submitted.
The widget is now verified to render and complete; full account login is still
pending the user's own test.

### Isolated administrator upload trial

The user confirmed real login and registration, then explicitly approved granting
the preview Worker write access to the existing media bucket for isolated tests.
The MEDIA_PREVIEW binding points to konseycomics-media; no new bucket, paid plan,
or R2 access-key transfer is required. R2 bindings are bucket-wide capabilities;
the handler itself restricts all writes to randomly named preview-uploads keys,
with a conditional put preventing overwrite. There is no delete or list endpoint.

KONSEY_PREVIEW_UPLOADS enables only the media POST route. Supabase verifies the
bearer session, then the server checks current role and suspension; only active
founders/managers pass. Cross-origin browser requests, unknown categories, MIME
signature mismatches and bodies over the bounded limit are rejected. SVG is not
accepted. Input image processing uses browser-native decoding/canvas only on the
exact preview hostname; PNG/JPEG/WebP are converted to JPEG/WebP, preserving the
existing panel resize targets. Output is capped at 4 MB. Existing Vercel upload
behavior is unchanged. Profile/forum uploads are still outside this trial.

Local tests cover roles, missing/invalid auth, suspension, forged MIME, category
traversal, origin, size and upstream failures; a separate real-browser canvas test
checks conversion and dimensions. These tests use mocked storage only, not R2.
Actual authenticated upload, CDN rendering and CPU behavior need a user test.
Database writes/publication remain blocked, so upload preview must not be confused
with successfully saving a series. Existing R2 billing/allowances still apply;
this change does not impose an account-wide spending cap or guarantee zero fees.
Upload-trial deployment: 9cc0d13b-1541-4d1c-84ee-648f155c4a5e. The 42 focused Node
tests and browser image-conversion checks pass; compressed Worker size is 3058.31
KiB. No real authenticated upload has been performed by the agent.

### New test-series draft insertion

The user confirmed upload previews work and approved a narrow draft-save trial.
Only POST /api/preview/series is enabled by KONSEY_PREVIEW_DRAFTS. The server
verifies the session and current active staff role using the shared upload
authorization helper. It then inserts through the caller's JWT/anon-key client,
not the service-role key, preserving database write RLS. Payload fields are
allowlisted; ID updates, relationships and caller publication flags are omitted.
The server generates preview-test UUID slugs and [TEST] titles, forces taslak,
null publication date and no featured placement. Only isolated preview upload
cover URLs are accepted. The JSON body is bounded to 16 KB.

The preview-only Seriler > Yeni Seri save path calls this endpoint and skips title,
writer, artist and site-setting mutations. Existing-series edits still fail and
direct database mutations remain blocked. Chapter creation, publishing-center
saves, scheduling, real publication and automatic snapshot refresh are NOT enabled.
No test record is created by automated tests; the next positive save requires the
user's own active staff session. Shared authorization and bounded-body extraction
are covered again by the existing upload tests plus draft-specific security tests.
Deployment 15b40300-0199-4708-ae33-a58c57f82c96 passed 46 focused tests and remote
unauthenticated boundaries, including 401 for the draft endpoint. Compressed size
is 3060.22 KiB. Positive draft insertion remains pending the user's manual test.

### Test chapter draft transaction (SQL setup required)

The user confirmed test-series insertion and requested chapter/page testing.
POST /api/preview/chapters now forwards an allowlisted request to the invoker-RLS
konsey_preview_chapter_draft RPC. The supplied migration is
supabase/preview_chapter_draft_v1.sql; it has NOT been applied by the agent.
The function checks active staff, locks only a draft preview-test/[TEST] parent,
forces the chapter to draft with a null publication date, and inserts ordered
page rows within the same transaction. Only isolated preview-uploads images and
1-50 pages are accepted. No existing chapter update/delete, download links,
notifications, slider changes or publication is enabled. Authenticated execution
is granted; anonymous/public execution is revoked. SECURITY INVOKER preserves RLS.

The panel's Bolumler > Yeni Bolum branch uses a retained UUID request identifier
for safe retries. Repeated successful calls return the existing test chapter
instead of inserting duplicate pages. Same-number chapters are rejected while
holding the parent-row lock. A missing RPC returns an explicit setup-required
error rather than a false success. The original non-preview save path is unchanged.

50 focused Node tests pass, including RPC payload/role/size/URL/error boundaries
and SQL contract assertions. SQL contract tests are not a live PostgreSQL execution;
the user must apply the SQL and test an authenticated save before success is claimed.
Prepared deployment: 6af1a1fc-6f72-4c56-a9e2-e404c4873052; compressed size
3060.56 KiB. No database migration or authenticated chapter insertion was performed.

### Cloudflare Builds connection preparation

The user confirmed chapter insertion, then approved pushing only the trial branch
and connecting it to Cloudflare Builds. Main/domain cutover remains forbidden.
Remote builds now export an exact three-key public-settings allowlist into an
ignored deploy input; service-role, hook, API tokens and legacy admin values are
never exported. deploy:vinext uses Wrangler with minification and no autoconfig.
Previous compiled assets and release IDs now live under .next/cache, a supported
Cloudflare Builds cache directory. Each successful build checkpoints its own assets
for the following build; cache retention is best-effort and must be checked remotely.

Dashboard connection settings: repository konseycomics/konseycomics; production
branch codex/cloudflare-free-preview; root /; build npm run build:vinext; deploy
npm run deploy:vinext; no other branch builds. Build variables need only
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY.
Enable build caching. The private Supabase runtime secret is already on the Worker
and is not needed by the anonymous public build. A git connection/deploy hook and
a real remote build remain pending dashboard login/verification. A Git push alone
does not enable automatic rebuilds on database publication or scheduled changes.
