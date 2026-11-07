# Cloudflare Live Cutover - 2026-11-08

Owner authorized publishing the existing tested Cloudflare application on the main domain. Owner explicitly chose continued R2 use instead of delayed free-media publication.

## Live Routing

- Account: `8494c13b77031af3f835c47c1fca6611`; zone: `fff778a71d95603f1055cef1de8083b2`.
- Existing Workers Free service: `konseycomics-free-preview` now serves `www.konseycomics.com` and redirects apex to HTTPS www.
- Two exact zone routes were added in Cloudflare UI: `konseycomics.com/*` and `www.konseycomics.com/*`, both targeting that Worker, with Free quota fail-closed behavior.
- Only proxy status changed on the two existing web DNS records: apex A `76.76.21.21` and www CNAME `cname.vercel-dns.com`, DNS-only to proxied. Original targets remain solely for rollback; Worker handles requests without forwarding to Vercel.
- Existing CDN/R2, email/MX/TXT, registrar and nameservers were not changed. There are still 11 DNS records.
- Original web DNS state is saved outside Git in `.media-migration/live-cutover-dns-backup.json`.
- Routes are UI-managed, deliberately absent from wrangler config: deployment credential remains scoped to this Worker, without new DNS permissions. Installed Wrangler 4.156.1 skips route publication when no routes are configured; verify routes persist after later deployments. Do not populate route config without reviewing credential scope.

## Application Changes

- Explicit production host flag allows indexing ONLY on HTTPS www public pages. Trial host stays noindex/disallowed in robots. Admin/auth/API/internal files stay noindex. Existing canonical URLs and paths are preserved.
- Apex and HTTP requests redirect 308 to canonical HTTPS www, preserving path/query.
- Block direct internal snapshot/media-index requests. Preserve Search Console verification file through static asset fallback.
- Public nonpersonal snapshots also serve visitors with cookies; no authentication/role data is embedded in those snapshots. Authorization-bearing requests and live forum bypass that path.

### Publication freshness

- Home and archive hydrate with their fast static snapshot, then refresh public lists directly from Supabase on every page mount. Publishing visibility no longer waits for the background deployment. No polling, new paid service or per-visit full-page server rendering is introduced.
- Refreshes use a separate anonymous client with session persistence and URL-session detection disabled. Published/due-scheduled content only; failures preserve the existing usable snapshot. Lists paginate beyond the database row limit.
- Reader chapter navigation also refreshes on mount without resetting page position or zoom. Runtime series/reader loaders no longer retain cached missing content or old chapter lists across requests; existing static pages remain fast.
- Static HTML, metadata and sitemap still follow the background build queue and its existing limits. This change is immediate visitor-side freshness, not instant regeneration of search-engine snapshots.
- Verified locally: 85 unit tests; successful production build (107 prerendered routes); isolated headless-browser checks injected a new publication absent from the build into home/archive responses, verified it appeared and a draft did not, with zero page errors. These checks did not write to the database.
- Restore existing first-party Supabase visitor tracker on www only, without Vercel Analytics/Speed Insights. Trial visits remain uncounted.
- Image preprocessing now follows the Cloudflare build mode on both preview and production hosts, not a preview-only hostname check. Existing role/auth checks and R2 uploads remain intact.

## Permanent Refresh Registration

- Main received ONLY a registration-only workflow at `.github/workflows/cloudflare-free-preview.yml`, commit `e82f2e4`; main application code was not replaced.
- Deployment application remains on `codex/cloudflare-free-preview`. Its guarded workflow contains actual build/deploy steps. Main registration has no permissions and a permanently skipped job; it cannot deploy main accidentally.
- Runtime now uses workflow dispatch with fixed deployment ref, instead of age/attempt-limited reruns. It retains repository, branch, workflow identity checks, durable lease/debounce and six automatic starts/day. Existing scoped Actions token and Cloudflare credential remain unchanged.
- Dispatch behavior is unit-tested; a live authenticated panel-triggered dispatch after cutover still needs owner confirmation. Do not confuse successful push deployments with a positive runtime dispatch test.

## Verified

- 81 focused tests passed before cutover. Live-preparation commit `cb1819d`, GitHub run `42418798835`, Success 1m59s. Visitor-tracker intermediate queued run was superseded, but is included in cb1819d.
- HTTPS www HTTP 200: home, archive, forum, series detail, reader, login, sitemap and Google verification file. Public pages have no forced noindex; login remains noindex. Robots allow public paths and reference canonical sitemap.
- Apex/query preservation and HTTP-to-HTTPS www redirects returned 308 as expected.
- Home visibly rendered with actual R2 media, no horizontal overflow. Screenshot saved in ignored `.media-migration/konseycomics-live-2026-11-08.png`.
- Unauthenticated API probes all returned expected 401/403. Final internal-file probe identified a missing noindex header on already-blocked 404 paths; patch `9d4e2ec` / GitHub run `42419300373` is being verified next.
- That patch deployed successfully (run `42419300373`, deploy job 1m44s). Live routing persisted through redeployment with no routes declared in wrangler config. Final live auth-boundary and canonical/robots/sitemap checks were repeated afterwards.
- Primary legacy checkout now has an untracked `AGENTS.md` pointing future work to the active Cloudflare worktree/branch, preventing accidental edits to the old Vercel application. No legacy application source was changed there.
- No positive new sign-in, authenticated publication or upload was performed by the agent on the live hostname. Owner should verify these with their own account.

## Costs and Rollback

- No paid Workers plan, new paid service, payment change or R2 cancellation. Existing R2 remains usage-billed, including potential overages. Supabase remains Free.
- Workers Free request/CPU limits are still real and production traffic capacity is not guaranteed by these tests. Prior account-level CPU P90 was 32 ms, not attributed to this Worker; no error was shown there. Keep monitoring actual live usage rather than asserting capacity certainty.
- Preserve R2 backups and all production data. In an application regression prefer a previous known-good Worker version, which keeps zone routing. To revert hosting, restore both web DNS proxy statuses to DNS-only; old Vercel service may still be paused, so confirm it is usable before any rollback.
