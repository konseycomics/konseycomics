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
