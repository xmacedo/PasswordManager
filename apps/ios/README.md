# PasswordManager iOS (`apps/ios`)

iOS client built with **Expo (React Native)**.

## Version focus

- Current target: **v0.4.0 Security Hardening**
- Main additions:
  - Optional biometric unlock (`expo-local-authentication`).
  - Security-first unlock gate before exposing vault actions.

## Responsibilities

- Mobile-safe vault access flow.
- Biometric unlock UX (when device supports it).
- Shared password generation/security primitives via `@password-manager/core`.

## Local commands

```bash
npm run start --workspace @password-manager/ios
npm run ios --workspace @password-manager/ios
```

## References

- Root changelog: [../../CHANGELOG.md](../../CHANGELOG.md)
- Architecture notes: [../../docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
