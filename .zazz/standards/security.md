---
last_updated_at: 2026-06-19
---

# Security

This standard governs dependency-vulnerability remediation and the review evidence expected for security-focused
dependency changes in this repository. Broader application-security design belongs in the layer-specific standards
until this document is expanded.

## Production dependency audit baseline

Dependency remediation work MUST start with the production dependency view:

```bash
npm audit --omit=dev
```

Run the command from each package surface whose lockfile can affect runtime installation:

- repo root, for the npm workspace lockfile used by CI
- `api/`, because `api/Dockerfile` installs inside the API package
- `client/`, because the client package has its own install and lockfile

Dev-only audit findings MAY be handled in a separate maintenance pass. A PR that claims to remediate runtime security
findings MUST report the `npm audit --omit=dev` result for every affected package surface.

### Desired ✅

```text
npm audit --omit=dev          # root workspace
cd api && npm audit --omit=dev
cd client && npm audit --omit=dev
```

### Not desired ❌

```text
npm audit
# reports dev-tool vulnerabilities and runtime vulnerabilities together;
# useful for maintenance triage, but too noisy as the acceptance gate for
# a runtime remediation PR.
```

## Remediation order

When a production audit finding has a fix available, prefer the smallest durable fix in this order:

1. Upgrade the direct vulnerable dependency to the latest compatible release.
2. Upgrade the direct parent dependency that owns the vulnerable transitive.
3. Add a focused npm `overrides` entry only when the latest direct dependency still resolves a vulnerable transitive.

Do not use `npm audit fix --force` as the default remediation path. It can introduce broad major-version churn and must
be reserved for cases where the team intentionally accepts that blast radius.

### Desired ✅

```json
{
  "dependencies": {
    "axios": "^1.18.0"
  },
  "overrides": {
    "form-data": "4.0.6"
  }
}
```

The direct dependency is current, and the override names one vulnerable transitive that the latest direct release still
does not lift.

### Not desired ❌

```json
{
  "overrides": {
    "form-data": "*",
    "fast-uri": "*",
    "**": "*"
  }
}
```

Broad overrides hide why a package is being forced and make later dependency review harder.

## Focused overrides

Focused npm overrides are acceptable for runtime vulnerability remediation when all of the following are true:

- `npm audit --omit=dev` shows the vulnerable package is transitive.
- The relevant direct dependency has already been upgraded to the latest appropriate release.
- `npm ls <package> --omit=dev` identifies the dependency path that still pulls the vulnerable version.
- The override pins the minimum known patched version or the current latest patched version.
- Verification reruns production audit and normal lint/test checks after the override.

Overrides MUST be removed later when upstream direct dependencies naturally resolve to patched transitives and the
override no longer changes the lockfile.

### Desired ✅

```bash
npm ls form-data --omit=dev
npm view form-data version
npm audit --omit=dev
```

```json
{
  "overrides": {
    "form-data": "4.0.6"
  }
}
```

### Not desired ❌

```json
{
  "overrides": {
    "form-data": "4.0.6"
  }
}
```

```text
# No `npm ls`, no audit evidence, and no direct dependency upgrade attempt.
```

## Review evidence

Security dependency PRs MUST include:

- the package surfaces audited
- the production audit result after remediation
- direct dependency versions changed
- each override added, with the vulnerable transitive and parent path it addresses
- lint/test commands run
- any tests intentionally skipped and why

Database-backed test suites MUST NOT be reset or reseeded as part of dependency-audit remediation unless the
remediation itself changes schema, seed behavior, or test fixtures and the user explicitly approves the data reset.

## Related standards

- [pr-process.md](./pr-process.md) — CVE title format and PR scoping.
- [testing.md](./testing.md) — backend test commands and database safety.
- [docs-hygiene.md](./docs-hygiene.md) — standards-document voice and examples.
