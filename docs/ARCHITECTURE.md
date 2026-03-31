# Arquitetura inicial

## Visão geral

O projeto começa com foco em **segurança por padrão** e compartilhamento de lógica entre plataformas.

- **Apps**
  - `apps/web`: front-end web.
  - `apps/ios`: front-end iOS.
- **Core compartilhado**
  - `packages/core/security`: funções de criptografia e geração de senha forte.

## Segurança

- Criptografia de dados com **AES-GCM 256 bits**.
- Chave derivada de uma senha-mestra com **PBKDF2 (SHA-256)** e salt aleatório.
- Vetor de inicialização (IV) aleatório por operação de criptografia.
- Formato de payload serializado para persistência segura.

## Modelo de dados sugerido (MVP)

- `Folder`
  - `id`
  - `name`
  - `createdAt`
- `Credential`
  - `id`
  - `folderId`
  - `title`
  - `username`
  - `passwordEncrypted`
  - `url`
  - `notesEncrypted`
  - `createdAt`
  - `updatedAt`

## Fluxo de criação de senha

1. Usuário define tamanho e regras (maiúsculas, números, símbolos).
2. Sistema gera senha forte pseudoaleatória.
3. Usuário confirma e salva.
4. Antes de persistir, conteúdo sensível é criptografado localmente.

## Próximos marcos

1. Criar camadas de repositório e casos de uso no core.
2. Construir protótipo UI web.
3. Construir protótipo UI iOS.
4. Adicionar testes de integração e validação de segurança.
