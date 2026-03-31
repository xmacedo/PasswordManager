# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.1.0] - 2026-03-31 - Foundation Setup (current)

### Added
- Monorepo foundation with:
  - `apps/web` (React + Vite);
  - `apps/ios` (Expo / React Native);
  - `packages/core` (shared security utilities).
- Strong password generation utility.
- Encryption/decryption utility with AES-GCM + PBKDF2.
- Initial Web and iOS starter screens.
- Automated tests for core security flows.


# Next

### v0.2.0 - Folder Management & Persistence (planned)

- **Create / Edit / Delete folders**.
- **Explorer-style folder view** (Windows Explorer-like navigation pattern).
- **Persist folders and passwords** to recover data later.
- Password entries linked to folders.

### v0.3.0 - Password Vault UX (planned)

- Create / Edit / Delete password entries.
- Global search and filters.
- Copy-to-clipboard and reveal/hide password controls.
- Empty states and onboarding guidance.

### v0.4.0 - Security Hardening (planned)

- Vault lock timeout and re-authentication.
- Optional biometric unlock (iOS).
- Breach detection integration (e.g., compromised password checks).
- Audit events and security logs.

### v0.5.0 - Sync & Reliability (planned)

- Optional encrypted cloud sync.
- Backup and restore flows.
- Import/export support (CSV/JSON).
Project release notes are maintained in [CHANGELOG.md](./CHANGELOG.md).
