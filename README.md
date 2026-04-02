# PasswordManager

Password manager monorepo focused on **Web** and **iOS** clients with a shared **core security package**.

## Current Release

- **Version:** `0.4.0`
- **Release date:** `2026-04-02`
- **Theme:** Security Hardening (session lock, breach checks, audit log)

For full release notes, see [CHANGELOG.md](./CHANGELOG.md).

## Monorepo Structure

```text
.
├─ apps/
│  ├─ web/          # React + Vite vault UI
│  └─ ios/          # Expo React Native app
├─ packages/
│  └─ core/         # shared security + vault domain logic
├─ tests/           # node:test suites (core and release behavior)
└─ docs/
```

## v0.4.0 Highlights

1. **Vault lock timeout + re-authentication**
   - Session is automatically locked after inactivity.
   - Users can lock immediately and unlock through an authentication flow.

2. **Breach detection integration**
   - Credentials are checked against a compromised/common-password baseline.
   - Risk labels are shown in app flows.

3. **Audit events and security log**
   - Sensitive actions emit events for traceability.
   - Recent security actions are visible in app UI.

4. **iOS optional biometric unlock path**
   - Optional biometric mode is available as a flow toggle (simulated behavior in v0.4.0).

## Development

### Install

```bash
npm install
```

### Run web

```bash
npm run dev:web
```

### Run iOS (Expo)

```bash
npm run dev:ios
```

### Run tests

```bash
npm test
```
