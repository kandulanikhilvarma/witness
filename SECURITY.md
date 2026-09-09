# Security policy

## Reporting a vulnerability

Report privately. Do not open a public issue for a security bug.

- Email the maintainer via the address on the GitHub profile
  [@kandulanikhilvarma](https://github.com/kandulanikhilvarma).
- Include: affected route or component, reproduction, and impact.
- Expect an acknowledgement within 7 days and a status update within 30.

## Tenant data isolation

Witness is multi-tenant. The stance, enforced in code (phase 1 onward):

- Every row that belongs to a tenant carries `tenant_id`, guarded by Postgres
  Row-Level Security. A query without a tenant scope returns nothing.
- Uploaded images, crops, heatmaps, and per-tenant PatchCore memory banks are
  stored under a tenant-scoped prefix and are never pooled across tenants.
- A tenant's enrolment data trains only that tenant's detector. No shared model
  is trained on customer images.

## Supported versions

The `master` branch is the supported version during pre-1.0 development.
