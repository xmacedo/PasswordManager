# Arquitetura

## 1. Visão geral

O repositório é um monorepo com duas aplicações cliente (`web` e `ios`) e um pacote central compartilhado (`packages/core`).

## 2. Apps

- `apps/web`: React + Vite para UX de cofre, exploração de pastas e operações de credenciais.
- `apps/ios`: Expo/React Native para fluxo mobile com desbloqueio biométrico opcional.

## 3. Core compartilhado (`packages/core`)

### Segurança criptográfica
- `security/passwordGenerator.js`: geração de senha forte.
- `security/cryptoVault.js`: criptografia/descriptografia com AES-GCM + PBKDF2.

### Hardening de sessão (v0.4.0)
- `security/vaultSession.js`: estado de sessão, timeout de bloqueio automático e reautenticação.
- `security/breachDetection.js`: verificação local de senhas fracas/comprometidas.
- `security/auditLog.js`: criação e persistência de eventos de auditoria de segurança.

### Domínio de cofre
- `storage/vaultStore.js`: CRUD de pastas e credenciais, hierarquia e persistência local.

## 4. Fluxos de segurança (v0.4.0)

1. Usuário autentica/desbloqueia cofre.
2. Sessão registra atividade e aplica timeout de auto-lock.
3. Ao criar/editar senha, o sistema valida risco de comprometimento.
4. Ações sensíveis (unlock, copy, reveal, delete, etc.) geram eventos de auditoria.

## 5. Próxima evolução (v0.5.0)

- Sincronização criptografada opcional.
- Backup e restore.
- Import/export CSV/JSON.
