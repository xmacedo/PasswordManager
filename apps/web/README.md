# PasswordManager Web App

React + Vite client for the PasswordManager vault.

## Release Scope (v0.4.0)

- Inactivity timeout with lock screen and re-authentication.
- Manual lock control for immediate session protection.
- Breach-risk alert per credential.
- Security audit trail panel for recent actions.

## User Flows

1. Open vault and navigate folder tree.
2. Manage folders and credentials.
3. Search globally or by current folder.
4. View security warnings for weak/compromised passwords.
5. Lock and unlock vault session.

## Commands

```bash
npm run dev --workspace @password-manager/web
npm run build --workspace @password-manager/web
```

## Related Docs

- Root changelog: [../../CHANGELOG.md](../../CHANGELOG.md)
- Root overview: [../../README.md](../../README.md)
