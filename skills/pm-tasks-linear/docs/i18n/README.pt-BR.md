<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-linear/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-linear/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-linear/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-linear

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-linear?color=blue)](https://www.npmjs.com/package/@llodev/pm-tasks-linear)
[![Licença: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

Adaptador do Linear para a família `@llodev/pm-tasks-*`. Publica cards genéricos como issues do Linear e despacha operações CRUD via [Linear MCP](https://linear.app/docs/mcp). O **primeiro** adaptador da família pm-tasks a implementar `task.sprint.set` (via ciclos do Linear).

## Instalação

```bash
npm install @llodev/pm-tasks-linear @llodev/pm-tasks-core
# ou
pnpm add @llodev/pm-tasks-linear @llodev/pm-tasks-core
```

## Setup do MCP

O Linear utiliza o **Linear MCP** via Streamable-HTTP em `https://mcp.linear.app/mcp`. O MCP gerencia o OAuth — o adaptador nunca acessa tokens.

Para qualquer agente compatível com MCP (Claude Code, Cursor, Codex, Windsurf, Cline, Roo Code):

- **Claude Code**: `claude mcp add linear -s project -- npx -y @linear/mcp-server` (ou siga o [guia de setup do MCP do Linear](https://linear.app/docs/mcp)) e aprove o fluxo OAuth no seu navegador.
- **Cursor / Windsurf / Cline / Roo Code**: adicione uma entrada MCP nas configurações do agente apontando para `https://mcp.linear.app/mcp`.
- **Codex**: adicione uma entrada `[mcp_servers.linear]` em `~/.codex/config.toml`.

No Claude Code, verifique com `claude mcp list` — `linear` deve aparecer como autenticado.

## Setup da config

O script `init` enumera seu time do Linear, estados, labels, membros e configurações de estimativa, e então escreve um `.linear.json`. Execute-o a partir de uma sessão de agente que já tenha o Linear MCP conectado, ou de forma independente com uma chave de API do Linear.

**Modo MCP (recomendado):**

```bash
npx @llodev/pm-tasks-linear init
```

Siga os prompts. O script usa o Linear MCP para descobrir os metadados do seu time — sem credenciais adicionais.

**GraphQL standalone (sem MCP):**

Crie uma chave de API pessoal em [linear.app/settings/api](https://linear.app/settings/api), depois:

```bash
export LINEAR_API_KEY=lin_api_...
npx @llodev/pm-tasks-linear init
```

Escolha onde salvar a config:

- **local** → `./.linear.json` (recomendado para configurações por projeto, pode ser commitado).
- **global** → padrão da plataforma:
  - macOS / Linux (XDG): `$XDG_CONFIG_HOME/llodev/pm-tasks/linear.json`, ou `~/.config/llodev/pm-tasks/linear.json`.
  - Windows: `%APPDATA%\llodev\pm-tasks\linear.json`.
  - Personalizar com `LLODEV_PM_TASKS_CONFIG_HOME=/seu/caminho`.

O prompt do init exibe o caminho absoluto onde o arquivo será salvo.

Execute verificações de saúde do workspace a qualquer momento com:

```bash
npx @llodev/pm-tasks-linear init --doctor
```

> [!IMPORTANTE]
> A chave de API é usada **apenas** pelo `init` para descobrir os metadados do time. O Linear MCP usa OAuth — nunca coloque a chave de API no `.linear.json`.

## Uso

| Exemplo de prompt                                                         | O que o agente faz                                                         |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `"publique este plano como issues do Linear"`                             | Publicação Phase 5 — issue pai + sub-issues + labels em lote               |
| `"marque a sub-issue LEO-43"`                                             | CRUD Phase 6 — `checklist.check` (move a sub-issue para estado completado) |
| `"feche LEO-42"`                                                          | CRUD Phase 6 — `task.close` (estado resolvido por tipo `completed`)        |
| `"defina a estimativa de LEO-42 como 5 pontos"`                           | CRUD Phase 6 — `task.estimate.set` (esforço → pontos + label `est:`)       |
| `"mova LEO-42 para baixo de LEO-12"`                                      | CRUD Phase 6 — `task.parent.set` (profundidade arbitrária)                 |
| `"atribua o ciclo 3 a LEO-42"`                                            | CRUD Phase 6 — `task.sprint.set` (resolve ciclo por número)                |
| `"[autonomous] crie issues do Linear a partir do plano @docs/plans/X.md"` | Phase 5b autônomo (requer `autonomous.enabled: true`)                      |

## Notas específicas do Linear

**Sub-issues como checklists:** O Linear não tem checklists nativas. Os itens de checklist do card genérico se tornam **sub-issues** (`save_issue { parentId }`). `checklist.check` move a sub-issue para o estado completado.

**Estados por tipo:** O adaptador resolve estados por tipo (`unstarted`, `started`, `completed`, `canceled`) — nunca por nome. Os nomes de estado são dependentes de idioma e podem ser personalizados pelo time.

**Atribuição única:** O Linear suporta apenas um responsável por issue. `task.assignee.add` é uma operação de definição — substitui o responsável atual.

**Labels como conjunto de substituição:** Qualquer escrita de labels sobrescreve toda a lista. O adaptador sempre lê as labels atuais antes de escrever (leitura-modificação-escrita).

**Ciclos = sprints:** `task.sprint.set` atribui uma issue a um ciclo do Linear. Ciclos são específicos do time — ative-os nas Configurações do time antes de usar. Retorna `NOT_APPLICABLE` quando ciclos estão desabilitados.

**Upsert com save_issue:** Quando `id` está ausente, `save_issue` **cria** uma nova issue. Sempre passe `id` em atualizações — omiti-lo cria silenciosamente uma duplicata.

## Documentação

- [`SKILL.md`](../../SKILL.md) — referência completa do skill (roteamento, modelo do Linear, todas as fases, verbos CRUD, envelope de resultado)
- [`references/operations.md`](../../references/operations.md) — mapeamento verbo → ferramenta MCP, resolução de task-ref, códigos de erro
- [`references/estimation.md`](../../references/estimation.md) — estratégias de estimativa, idempotência da label `est:<slug>`
- [`references/autonomous.md`](../../references/autonomous.md) — escopo do modo autônomo do Linear e lista de permissões
- [`anti-patterns/linear.md`](../../anti-patterns/linear.md) — regras NUNCA para o Linear
- [`schemas/config.json`](../../schemas/config.json) — schema do `.linear.json`

## Licença

MIT
