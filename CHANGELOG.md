# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-04-02 - Security Hardening (current)

### Added
- Vault lock timeout and mandatory re-authentication flow in Web.
- Optional biometric unlock flow in iOS via LocalAuthentication.
- Breach detection checks for weak/known-compromised passwords.
- Audit events and security logs persisted locally.
- Session security primitives in `packages/core/security/vaultSession.js`.
- Breach and audit helpers in `packages/core/security/breachDetection.js` and `packages/core/security/auditLog.js`.

### Changed
- Reorganized documentation (`README.md`, app READMEs, and architecture notes) for clearer version scope and roadmap.

## [0.3.0] - 2026-04-01 - Password Vault UX

### Added
- Create / Edit / Delete password entries.
- Global search and filters.
- Copy-to-clipboard and reveal/hide password controls.
- Empty states and onboarding guidance.

## [0.2.0] - 2026-03-31 - Folder Management & Persistence

### Added
- Create / Edit / Delete folders.
- Explorer-style folder view (Windows Explorer-like navigation pattern).
- Persistent folders and passwords storage.
- Password entries linked to folders.

## [0.1.0] - 2026-03-31 - Foundation Setup

### Added
- Monorepo foundation with:
  - `apps/web` (React + Vite)
  - `apps/ios` (Expo / React Native)
  - `packages/core` (shared security utilities)
- Strong password generation utility.
- Encryption/decryption utility with AES-GCM + PBKDF2.
- Initial Web and iOS starter screens.
- Automated tests for core security flows.

---

## Roadmap

### v0.5.0 - Sync & Reliability (planned)
- Optional encrypted cloud sync.
- Backup and restore flows.
- Import/export support (CSV/JSON).
