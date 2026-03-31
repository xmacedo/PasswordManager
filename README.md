# PasswordManager

Projeto inicial de um **gerenciador de senhas** com foco em uso via **web** e **iPhone (iOS)**.

## Objetivo do produto

Criar um aplicativo que permita:

- Organizar senhas por pastas/categorias.
- Criar novas senhas com sugestão de senhas fortes.
- Armazenar todos os dados sensíveis sempre criptografados.
- Disponibilizar a experiência em Web e iOS.

## Estratégia recomendada (MVP)

Para acelerar o início, a melhor estratégia é usar uma base compartilhada de regras de negócio e criptografia.

- `packages/core`: regras de domínio (geração de senha, criptografia, validações).
- `apps/web`: interface Web.
- `apps/ios`: interface iOS.

## Primeiras entregas já iniciadas neste repositório

1. Estrutura inicial de monorepo.
2. Módulo de geração de senhas fortes em `packages/core/security/passwordGenerator.js`.
3. Módulo de criptografia AES-GCM com derivação de chave PBKDF2 em `packages/core/security/cryptoVault.js`.
4. Testes automatizados iniciais em `tests/security.test.mjs`.
5. Documento de arquitetura em `docs/ARCHITECTURE.md`.

## Como executar os testes

```bash
npm test
```

## Próximos passos sugeridos

- Criar UI inicial (login local + lista de pastas + lista de senhas).
- Definir persistência local segura para cada plataforma.
- Adicionar sincronização opcional com backend (modelo zero-knowledge).
- Implementar biometria no iOS (Face ID/Touch ID).
- Implementar auditoria de senhas fracas/duplicadas/reutilizadas.
