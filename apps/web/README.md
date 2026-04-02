# PasswordManager Web (`apps/web`)

Web client built with **React + Vite**.

## Version focus

- Current target: **v0.4.0 Security Hardening**
- Main additions:
  - Auto-lock timeout and re-authentication.
  - Breach warning checks during credential flows.
  - Local audit event log for sensitive actions.

## Responsibilities

- Explorer navigation for folders.
- Credential CRUD and search/filter UX.
- Security interaction flows (copy/reveal, lock/unlock, security feedback).

## Local commands

```bash
npm run dev --workspace @password-manager/web
npm run build --workspace @password-manager/web
```

## References

- Root changelog: [../../CHANGELOG.md](../../CHANGELOG.md)
- Architecture notes: [../../docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
