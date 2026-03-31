# Arquitetura inicial

## Apps

- `apps/web`: React + Vite para interface web.
- `apps/ios`: Expo/React Native para iPhone.

## Core compartilhado

- `packages/core/security/passwordGenerator.js`: geração de senha forte.
- `packages/core/security/cryptoVault.js`: criptografia/descriptografia com AES-GCM + PBKDF2.

## Segurança

- AES-GCM 256 bits.
- KDF: PBKDF2-SHA256 (310.000 iterações).
- Salt e IV aleatórios por criptografia.

## Próximos passos de produto

1. Cadastro de pastas dinâmicas.
2. CRUD de credenciais (título, usuário, URL, notas).
3. Persistência local segura por plataforma.
4. Biometria no iOS (Face ID/Touch ID).
5. Sincronização opcional com backend zero-knowledge.
