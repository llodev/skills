<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/django-schema-design/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/django-schema-design/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/django-schema-design/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/django-schema-design

> Projete esquemas de banco de dados Django prontos para produção — estratégia de chave primária, índices, constraints e migrações seguras — com os trade-offs não óbvios que um especialista aprendeu na prática, não sintaxe básica de ORM.

[![npm](https://img.shields.io/npm/v/@llodev/django-schema-design?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/django-schema-design)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte da família `@llodev/django-*`.

O que você ganha:

- **Estratégia de PK que nomeia o eixo real** — não "único ou não" (todos são únicos), e sim **posicionamento aleatório (UUIDv4) vs. sequencial (UUIDv7 / incremental)**, e por que usar v4 como PK em tabela de escrita intensa fragmenta o índice enquanto o v7 mantém a localidade de inserção.
- **Um roteiro para interrogar o domínio** — identidade, cardinalidade/posse, ciclo de vida, caminhos de acesso — a resolver antes de qualquer campo existir.
- **Uma camada especialista de índices e constraints** — ordem de colunas em índices compostos, índices de cobertura (`include`) e parciais, constraints `Unique`/`Check`/`Exclusion`, escolha entre B-tree/GIN/GiST/BRIN, e quando desnormalizar em vez de adicionar mais um índice.
- **Segurança em migrações** — backfills em lote, criação concorrente de índice em tabela ativa, reversibilidade e o procedimento de troca de PK em etapas.
- **Uma lista `NEVER`** com os motivos que só a experiência ensina (erro de arredondamento de `FloatField` em dinheiro, PK sequencial → IDOR, v4 em tabelas quentes, troca de PK in-place, `on_delete` implícito).

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/django-schema-design

# Vercel CLI
npx skills add llodev/skills/skills/django-schema-design
```

Sem MCP, sem config, sem init — é uma skill de conhecimento puro. Após instalar, ela é ativada por prompts como os abaixo.

## Uso

| Exemplo de prompt                                       | O que o agente faz                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| `"design Django models for invoices and line items"`    | Aplica o roteiro de domínio + fluxo de decisão de PK, gera `models.py`      |
| `"should this event table use UUID or auto increment?"` | Aplica os eixos de exposição + localidade de inserção → UUIDv7 com o porquê |
| `"migration to switch users to a UUID PK"`              | Procedimento em etapas, reversível: add→backfill→repoint→swap               |
| `"review this schema"`                                  | Verifica PK, `on_delete`, constraints e ordem de índices contra a lista     |

## Conteúdo

| Arquivo                                  | Conteúdo                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| `SKILL.md`                               | Roteiro de domínio, fluxo de decisão de PK, lista NEVER e checklist.         |
| `references/pk-strategy.md`              | Incremental vs UUIDv4 vs UUIDv7, storage/collation e migração de PK.         |
| `references/indexing-and-constraints.md` | Índices compostos/cobertura/parciais, constraints, tipos de índice, EXPLAIN. |

## Licença

MIT — veja [LICENSE](../../LICENSE).
