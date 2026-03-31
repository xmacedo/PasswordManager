# PasswordManager

Aplicativo de gerenciamento de senhas com foco em **Web** e **iOS**.

## ✅ O que já foi iniciado

Estrutura real de projeto em monorepo:

- `apps/web`: app React + Vite com tela inicial funcional.
- `apps/ios`: app Expo (React Native) com tela inicial funcional.
- `packages/core`: biblioteca compartilhada com geração de senha forte e criptografia.

## Estrutura

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

## Funcionalidades iniciais implementadas

- Geração de senha forte configurável.
- Criptografia de segredos com AES-GCM + PBKDF2.
- Tela inicial Web com:
  - criação de senha sugerida;
  - organização visual por pastas (exemplo inicial).
- Tela inicial iOS com botão para sugerir senha forte.

## Como rodar

### 1) Instalar dependências

```bash
npm install
```

### 2) Rodar Web

```bash
npm run dev:web
```

### 3) Rodar iOS (Expo)

```bash
npm run dev:ios
```

### 4) Rodar testes

```bash
npm test
```
