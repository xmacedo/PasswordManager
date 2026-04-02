# PasswordManager

Password manager monorepo focused on **Web** and **iOS**, with shared security/domain logic in `packages/core`.

## Current release

- **Version:** `0.4.0`
- **Date:** `2026-04-02`
- **Theme:** Security Hardening

### v0.4.0 highlights

- Auto-lock timeout + re-authentication flow (Web).
- Optional biometric unlock (iOS).
- Breach detection checks for weak/compromised passwords.
- Audit security events and logs.

See complete details in [CHANGELOG.md](./CHANGELOG.md).

## Monorepo structure

```text
.
├─ apps/
│  ├─ web/      # React + Vite
│  └─ ios/      # Expo + React Native
├─ packages/
│  └─ core/     # Shared security and vault domain logic
├─ tests/       # Core behavior tests
└─ docs/        # Architecture and decisions
```

## Quick start

### 1) Install dependencies

```bash
npm install
```

### 2) Run Web

```bash
npm run dev:web
```

### 3) Run iOS

```bash
npm run dev:ios
```

### 4) Run tests

```bash
npm test
```

## Core capabilities by version

- `v0.1.0`: monorepo foundation + strong password generation + AES-GCM encryption.
- `v0.2.0`: folder CRUD + explorer pattern + persistence.
- `v0.3.0`: credential CRUD + search/filter + copy/reveal UX.
- `v0.4.0`: security hardening (timeout lock, re-auth, breach checks, audit logs).

## Next milestone

- `v0.5.0`: sync and reliability (encrypted sync, backup/restore, import/export).
