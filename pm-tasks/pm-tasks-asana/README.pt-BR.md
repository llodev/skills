<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-asana/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-asana/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-asana/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>

# @llodev/pm-tasks-asana

Adapter do Asana para a família `@llodev/pm-tasks-*`. Converte planos de implementação em parent tasks + subtasks do Asana (paste-ready ou publicados via MCP) e opera neles (`checklist.check`, `task.close`, `task.comment.add`, etc.).

## Instalação

```bash
# npm (com skillpm ou Claude Code marketplace)
npm i @llodev/pm-tasks-core @llodev/pm-tasks-asana

# Vercel CLI (instale o core manualmente também)
npx skills add llodev/skills/pm-tasks-core
npx skills add llodev/skills/pm-tasks-asana
```

## Configuração do MCP

O Asana usa OAuth via o MCP `claude.ai Asana`. Se você já conectou sua conta do Asana nas configurações do Cursor ou Claude Code, está pronto — nenhuma etapa adicional.

Para qualquer agente capaz de MCP (Claude Code, Cursor, Codex, Windsurf, Cline, Roo Code):

1. Abra as configurações de MCP do agente.
2. Habilite / registre `claude.ai Asana` (ou o MCP equivalente do Asana no seu agente).
3. Aprove o fluxo OAuth no seu navegador.

No Claude Code, verifique com `claude mcp list` — `claude.ai Asana` deve aparecer como autenticado. Outros agentes têm seus próprios comandos de listagem; veja a doc de MCP do seu agente.

## Configuração do config

O script `init` roda **fora** do MCP, então precisa de um Personal Access Token para enumerar seus workspaces / projects / sections / custom fields. Gere um em https://app.asana.com/0/my-apps, e então:

```bash
export LLODEV_PM_TASKS_ASANA_PAT=...
npx @llodev/pm-tasks-asana init
```

Siga os prompts. Escolha onde o config deve viver:

- **local** → `./.asana.json` (recomendado para configs por projeto, pode ser commitado).
- **global** → um default da plataforma, customizável. Defaults:
  - macOS / Linux (XDG): `$XDG_CONFIG_HOME/llodev/pm-tasks/asana.json`, com fallback para `~/.config/llodev/pm-tasks/asana.json`.
  - Windows: `%APPDATA%\llodev\pm-tasks\asana.json`.
  - Sobrescreva em qualquer SO com `LLODEV_PM_TASKS_CONFIG_HOME=/your/path` — o arquivo vai parar em `$LLODEV_PM_TASKS_CONFIG_HOME/asana.json`.

O prompt do `init` imprime o caminho absoluto onde vai escrever, então você sempre vê exatamente onde o arquivo cai.

O PAT é usado **apenas** pelo `init`. O MCP em si usa OAuth — nunca coloque tokens no JSON.

## Uso

- `"publique esse plano como tasks no Asana"` → fluxo de publish (parent + subtasks)
- `"marque subtask 3 da task X no Asana"` → op CRUD
- `"feche a task Y"` → close
- `"comente na task X: ..."` → comment
- `"[autonomous] create task in asana from plan @docs/plans/X.md"` → autônomo (exige `autonomous.enabled: true` no config)

## Notas específicas do Asana

- **Subtasks têm um nível de profundidade** — o adapter achata checklists aninhadas em uma única camada de subtask.
- **Custom fields NÃO herdam por padrão** — liste os IDs dos fields em `subtaskDefaults.inheritParentFields` para que o adapter os copie do parent para as subtasks no momento do create.
- **Assignee é um campo único** — use `task.assignee.add` para adicionar followers; o assignee primário substitui em caso de conflito.

## Licença

MIT — veja [LICENSE](./LICENSE).
