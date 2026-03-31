# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-31

### Added
- Product requirement definition for folder CRUD operations (create, edit, delete).
- Requirement for Explorer-style folder visualization in Web and iOS experiences.
- Requirement for persistent storage and recovery of folders/passwords.
- Market-driven roadmap items (password health score, breach monitoring, TOTP, autofill, team features).
- Visual identity direction (palette, typography, spacing/layout, iconography).

### Changed
- Moved project version history from `README.md` to this dedicated `CHANGELOG.md`.
- Reorganized project documentation to follow a more standard project structure.

## [0.1.0] - 2026-03-31

### Added
- Monorepo foundation with:
  - `apps/web` (React + Vite);
  - `apps/ios` (Expo / React Native);
  - `packages/core` (shared security utilities).
- Strong password generation utility.
- Encryption/decryption utility with AES-GCM + PBKDF2.
- Initial Web and iOS starter screens.
- Automated tests for core security flows.
