# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-04-02 - Security Hardening

### Added
- Vault session lock with inactivity timeout and explicit re-authentication flow.
- Optional biometric unlock mode on iOS (simulated toggle for app flow validation).
- Breach risk checks for compromised/common passwords.
- Audit event logging for critical security and credential actions.

### Changed
- Web vault UX now surfaces breach warnings per credential.
- Web and iOS apps now expose lock/unlock actions and security status messaging.
- Documentation reorganized by product area and release scope.

## [0.3.0] - 2026-04-01 - Password Vault UX

### Added
- Create / Edit / Delete password entries.
- Global search and filters.
- Copy-to-clipboard and reveal/hide password controls.
- Empty states and onboarding guidance.

## [0.2.0] - 2026-03-31 - Folder Management & Persistence

### Added
- Create / Edit / Delete folders.
- Explorer-style folder navigation.
- Local persistence for folders and passwords.
- Password entries linked to folders.

## [0.1.0] - 2026-03-31 - Foundation Setup

### Added
- Monorepo with:
  - `apps/web` (React + Vite)
  - `apps/ios` (Expo / React Native)
  - `packages/core` (shared security utilities)
- Strong password generator.
- AES-GCM + PBKDF2 encryption utilities.
- Initial Web and iOS screens.
- Automated tests for core security workflows.

## Planned

### [0.5.0] - Sync & Reliability
- Optional encrypted cloud sync.
- Backup and restore flows.
- Import/export support (CSV/JSON).
