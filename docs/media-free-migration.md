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

- Asked owner whether several minutes of publication delay for newly uploaded images is acceptable in exchange for a strictly free static publication model. Await response.
- Preserve panel/member uploads through a free-only staging and publication flow before switching CDN. An assets-only archive alone does not implement dynamic uploads.
- Verify source/destination parity and all new-upload workflows before any CDN or DNS change.
- Recheck inventory immediately before cutover; user tests may add objects after this snapshot.
- Cancel/remove R2 only after safe cutover and explicit confirmation for any irreversible deletion. Do not assume cancelling a subscription preserves objects or eliminates retained-storage billing.
- Existing R2 remains active and usage-billed until that process is complete. Budget notifications and custom counters are not a guaranteed hard billing cap.

Commands accept `--env-file` pointing to the owner's existing local configuration. Never print or commit R2 credentials. `scripts/r2-static-archive.mjs` implements only GET inventory/backup/verification; there are no R2 mutation commands.
