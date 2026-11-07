# Media Free Migration - Preparation

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
