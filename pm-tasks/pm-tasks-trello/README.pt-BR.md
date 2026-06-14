<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>

# @llodev/pm-tasks-trello

Adapter do Trello para a família `@llodev/pm-tasks-*`. Converte planos de implementação em cards do Trello (paste-ready ou publicados via MCP) e opera neles (`checklist.check`, `task.close`, `task.comment.add`, etc.).

## Instalação

```bash
# npm (com skillpm ou Claude Code marketplace)
npm i @llodev/pm-tasks-core @llodev/pm-tasks-trello

# Vercel CLI (instale o core manualmente também)
npx skills add llodev/skills/pm-tasks-core
npx skills add llodev/skills/pm-tasks-trello
```

## Configuração do MCP

Claude Code:

```bash
claude mcp add trello -s project -- npx -y atlassian-trello-mcp
```

Aprove via `/mcp` no chat. Exporte as env vars no seu shell:

```bash
export TRELLO_API_KEY=...
export TRELLO_TOKEN=...
```

Cursor/Windsurf: veja [`references/mcp-config.md`](references/mcp-config.md).

## Configuração do config

```bash
npx @llodev/pm-tasks-trello init
```

Siga os prompts. Escolha onde o config deve viver:

- **local** → `./.trello.json` (recomendado para configs por projeto, pode ser commitado).
- **global** → um default da plataforma, customizável. Defaults:
  - macOS / Linux (XDG): `$XDG_CONFIG_HOME/llodev/pm-tasks/trello.json`, com fallback para `~/.config/llodev/pm-tasks/trello.json`.
  - Windows: `%APPDATA%\llodev\pm-tasks\trello.json`.
  - Sobrescreva em qualquer SO com `LLODEV_PM_TASKS_CONFIG_HOME=/your/path` — o arquivo vai parar em `$LLODEV_PM_TASKS_CONFIG_HOME/trello.json`.

O prompt do `init` imprime o caminho absoluto onde vai escrever, então você sempre vê exatamente onde o arquivo cai.

## Uso

- `"publique esse plano como cards no Trello"` → fluxo de publish
- `"marque item 3 da task X no Trello"` → op CRUD
- `"feche o card Y"` → close
- `"[autonomous] create task in trello from plan @docs/plans/X.md"` → autônomo (exige `autonomous.enabled: true` no config)

## Licença

MIT — veja [LICENSE](./LICENSE).
