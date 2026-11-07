# Media Free Migration - Preparation

## Latest Owner Decision: Keep R2

Owner rejected delayed publication and explicitly requested continuing with R2. Disable `KONSEY_FREE_MEDIA` and restore the existing `MEDIA_PREVIEW` R2 binding. Do not cancel R2, migrate CDN/DNS or upgrade any plan. Workers remains Free; existing R2 usage billing/overage exposure remains unchanged and must not be described as a hard-zero-cost service.

Live ready-staging inventory was checked before reversal: zero objects, zero bytes. No user media depends on the delayed publication path. Keep backups, SQL staging bucket/ledger and inactive tools intact; do not delete data. CI should skip the inactive static-media check rather than require the archive to remain deployed.

Owner requires no usage-based media billing, even if service must stop at a limit.

## Verified on 2026-11-07

- Cloudflare dashboard: Workers Free active; R2 usage billed subscription active. R2 current billing period shows $0.00.
- Full signed, read-only S3 inventory: 2,006 image objects, 457,816,040 bytes. Every object is below 25 MiB; count is below the static asset limit with headroom.
- Exact originals backed up under ignored `.media-migration/r2-static-archive/files/`. Paths are preserved. `inventory.json` and `checksums.json` are outside the deployable files directory.
- A second pass verified all files against source size, single-part ETag checksums, and saved SHA-256. Source inventory remained unchanged during backup.
- Assets-only candidate config `cloudflare/media-static/wrangler.jsonc` passed Wrangler dry run. No R2 binding, runtime code, custom domain, or paid resource is configured. It has NOT been deployed.
- Account billing/domain settings, original bucket, main branch and production URLs remain unchanged. Backup is preparation, NOT a spending cap or completed migration.

## Pending Decisions and Work

- Owner accepted publication delay in exchange for prioritizing zero usage-based billing.
- Preserve panel/member uploads through a free-only staging and publication flow before switching CDN. An assets-only archive alone does not implement dynamic uploads.
- Verify source/destination parity and all new-upload workflows before any CDN or DNS change.
- Recheck inventory immediately before cutover; user tests may add objects after this snapshot.
- Cancel/remove R2 only after safe cutover and explicit confirmation for any irreversible deletion. Do not assume cancelling a subscription preserves objects or eliminates retained-storage billing.
- Existing R2 remains active and usage-billed until that process is complete. Budget notifications and custom counters are not a guaranteed hard billing cap.

Commands accept `--env-file` pointing to the owner's existing local configuration. Never print or commit R2 credentials. `scripts/r2-static-archive.mjs` implements only GET inventory/backup/verification; there are no R2 mutation commands.

## Free Staging and Combined Asset Build - Prepared, Not Activated

- `supabase/free_media_staging_v1.sql` creates one public-image staging bucket and a private, service-only reservation ledger. A row-locked, cumulative 250 MiB allocation cap stops uploads conservatively, including failed-upload reservations. It is not a Cloudflare R2 spending cap. Supabase Free plan and existing storage usage must be verified before activation.
- Public metadata exposes only keys, byte sizes and SHA-256 for ready media. No direct browser writes, role grants or service credentials are exposed.
- `free-media-storage.js` reserves space, uploads without overwrite and queues a rebuild only after upload succeeds. It never falls back to R2. New URLs point at the existing preview Worker until CDN cutover is ready.
- `prepare-free-media.mjs` merges the verified legacy manifest with ready staging rows, verifies size/checksum for every copied image, and enforces a combined site/media file-count ceiling. Existing media is fetched from the last deployed free static copy; newly staged media is read from Supabase only when not already published. There is no R2 source fallback.
- Use the existing application Worker's static Assets for combined media publication: this preserves the existing scoped GitHub deployment credential and avoids adding another credential recipient or paid binding. The separate assets-only candidate config remains an unused reference, not a deployed service.
- The first combined deployment must be seeded locally from the verified backup BEFORE pushing an enabled config to GitHub; otherwise CI cannot fetch the initial free archive. Subsequent runs use the previous successful public static deployment as the source. A failed source or checksum aborts publication.
- Feature remains OFF until the owner applies SQL and an authenticated upload test passes. `KONSEY_FREE_MEDIA` has not been added to live config; R2 remains active. Asked owner to run the SQL file. Do not claim billing risk removed.
- Existing six-starts/day rebuild cap still applies: delays can exceed a few minutes once that cap is exhausted. This restriction must be clearly disclosed or redesigned within GitHub's existing zero-paid-usage budget before wider use.
- No automatic staging cleanup is implemented. The cumulative cap eventually stops new uploads; approved cleanup/reclamation or another free publication pipeline is needed for long-term operation. Never silently reset the ledger while retained files remain in storage.

## SQL Applied and Seed Build Verified - Awaiting Plan Confirmation

- Owner ran `free_media_staging_v1.sql`, result `Free media staging ready`.
- Live anonymous probes: public ready-media view returns 200 with zero rows; private budget/object tables and both mutation RPCs return 401. No upload was created by these probes.
- Source inventory rechecked: still 2,006 objects, 457,816,040 bytes.
- Local config now enables `KONSEY_FREE_MEDIA` and removes the R2 binding. This config has NOT been deployed or pushed.
- Local full build succeeded, copying and hash-verifying all 2,006 legacy images into `dist/client` alongside the site. Added final content-revision check after media preparation. 76 focused tests pass.
- Supabase dashboard in IAB redirected to sign-in. Asked owner to confirm current Free plan and Storage Size in their already-open browser. Do NOT enable new uploads before confirming free-only staging; no paid-plan assumption is acceptable for this task.
- Hold initial local deployment and Git push until plan confirmed. First deployment must seed the public free source before CI can fetch it. Existing R2/production URLs remain unchanged and usage-billed in the meantime.

## Free Plan Confirmed and Initial Seed Deployed

- Supabase dashboard confirmed current Free plan, no overage billing, storage 0.376/1 GB, database 0.061/0.5 GB, uncached egress 0.288/5 GB, cached egress 0/5 GB; no exceeded quota. Billing cycle 29 Oct-29 Nov 2026. UI figures can lag refresh.
- Local deployment succeeded: `f0045ee5-1d2c-47c1-acad-07cf8c3863b5`. `KONSEY_FREE_MEDIA=1`; only ASSETS and existing vars/secrets, no R2 binding. Existing encrypted secrets preserved. No plan or DNS changes.
- All legacy images seeded into the existing preview Worker's static Assets; this unlocks CI's R2-free source for future builds. Full remote checksum verification and CI rebuild are being checked next.
- New upload positive test is still pending. Owner must upload a small new test image, then verify the ready-media ledger and eventual static publication. Do not cancel R2 or claim all billing risks removed before this succeeds and CDN cutover is verified.
- Existing `cdn.konseycomics.com` remains attached to R2. Legacy image URLs still use that CDN until cutover; R2 subscription/storage remains usage-billed. New free upload URLs point to the preview Worker's free-uploads path.

## Remote Verification and CI Complete

- Full remote image verification succeeded at `2026-11-07T20:07:31.225Z`: all 2,006 originals, 457,816,040 bytes, matched expected SHA-256 from the free preview static delivery. Proof stored in ignored `.media-migration/r2-static-archive/remote-verification.json`.
- GitHub run `42409268091` (commit `eb12ddc`) succeeded in 3m1s, including preparing media from the public free source with no R2 binding/credentials.
- Fixed storage upload cache-control to match the installed Supabase SDK (`max-age=3600`). Added only the exact free image host to image CSP for eventual main-domain compatibility.
- GitHub run `42409422924` (commit `9eaa9a1`) succeeded in 3m52s total / 2m36s deploy job. CI includes auth boundaries and sampled static image hash checks. No paid services/budgets/plans changed.
- Unknown `free-uploads` path returns 404, allowing the builder's explicit Supabase staging fallback for not-yet-published media. `_konsey_media/index.json` is not publicly served (404).
- Awaiting owner positive test: reload preview panel, upload one small real image, report result. Then inspect ready-media view and publication queue, wait for automatic build and verify new image content hash. Do not claim this flow verified before test.
- Main domain, CDN attachment and R2 subscription are still unchanged. Zero R2 billing risk is NOT established until verified CDN cutover and safe R2 cancellation/removal are complete.
