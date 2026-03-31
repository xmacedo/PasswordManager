# PasswordManager

A password manager application focused on **Web** and **iOS**, built as a monorepo.

## Product Vision

Build a secure, user-friendly password manager with:
- modern UX (fast search, folder explorer, clean visual hierarchy);
- strong cryptography by default;
- cross-platform experience (Web + iOS);
- long-term extensibility (shared core package).

## Current Project Status

Implemented monorepo structure:

- `apps/web`: React + Vite app with a working initial screen.
- `apps/ios`: Expo (React Native) app with a working initial screen.
- `packages/core`: shared security package for strong password generation and encryption.

## Repository Structure

```text
.
├─ apps/
│  ├─ web/
│  └─ ios/
├─ packages/
│  └─ core/
├─ tests/
└─ docs/
```

## Implemented Features

- Configurable strong password generation.
- Secret encryption using AES-GCM + PBKDF2.
- Web home screen with:
  - suggested password generation;
  - initial visual folder organization example.
- iOS home screen with a strong password suggestion action.

---

## Changelog

Project release notes are maintained in [CHANGELOG.md](./CHANGELOG.md).

---


## Next Features (including market-driven suggestions)

Below are high-impact features commonly expected in competitive password managers:

1. **Folder CRUD + Explorer UX (priority)**
   - Create, rename, and delete folders.
   - Tree/list navigation inspired by file explorers.
   - Drag-and-drop move for passwords between folders.

2. **Persistent vault storage (priority)**
   - Save folders and encrypted passwords in durable storage.
   - Auto-recovery on app restart.
   - Optional local-first architecture with offline support.

3. **Security features expected by the market**
   - Password health score (weak/reused/old passwords).
   - Breach monitoring and actionable alerts.
   - 2FA/TOTP code support for accounts.

4. **Productivity and adoption features**
   - Autofill integrations (where supported).
   - One-click copy with timeout-based clipboard clearing.
   - Favorites and recent items.

5. **Team and premium features (future)**
   - Shared vaults.
   - Role-based access for teams.
   - Activity history and admin visibility.

---

## Visual Identity Suggestions (organized, scalable)

Recommended direction:

- **Design language**: clean, minimal, trust-focused.
- **Primary palette**:
  - Primary: `#2563EB` (security/trust blue)
  - Secondary: `#0F172A` (deep slate)
  - Accent: `#14B8A6` (success/action)
  - Danger: `#EF4444` (alerts)
  - Background: `#F8FAFC`
- **Typography**:
  - Inter (or SF Pro on iOS fallback).
  - Strong heading hierarchy (H1/H2/H3).
- **Layout system**:
  - 8px spacing scale.
  - Left sidebar folder explorer + main content panel.
  - Consistent card and input components.
- **Iconography**:
  - Outline icons for navigation.
  - Filled icons for status/high-priority actions.
- **Explorer-style folder view**:
  - Expand/collapse folder tree.
  - Breadcrumb at top for navigation context.
  - Context menu: New folder, Rename, Delete.

---

## Non-Functional Requirements

To satisfy the current product expectations, the application must:

- allow **create/edit/delete** of folders;
- provide **folder visualization similar to Windows Explorer**;
- **store passwords and folders** so they can be recovered later;
- keep sensitive data encrypted at rest.

---

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Run Web

```bash
npm run dev:web
```

### 3) Run iOS (Expo)

```bash
npm run dev:ios
```

### 4) Run tests

```bash
npm test
```
