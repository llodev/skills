<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-clickup/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-clickup/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-clickup/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-clickup

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-clickup?color=blue)](https://www.npmjs.com/package/@llodev/pm-tasks-clickup)
[![Licença: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

Adaptador do ClickUp para a família `@llodev/pm-tasks-*`. Publica planos como tarefas do ClickUp com subtarefas e executa nove verbos CRUD em tarefas existentes via ClickUp MCP. Funciona para um gestor que publica um plano, para um membro do time que publica ou atualiza tarefas e para um agente de IA que executa um plano de forma autônoma, com os mesmos verbos.

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm install @llodev/pm-tasks-clickup @llodev/pm-tasks-core
# or
pnpm add @llodev/pm-tasks-clickup @llodev/pm-tasks-core

# Vercel CLI (instale o core manualmente também)
npx skills add llodev/skills/skills/pm-tasks-core
npx skills add llodev/skills/skills/pm-tasks-clickup
```

## Configurar o MCP

Os verbos de runtime passam pelo servidor ClickUp MCP em `https://mcp.clickup.com/mcp`. O MCP cuida do OAuth: o adaptador nunca vê uma credencial para os verbos.

- Agentes que aceitam uma URL de MCP remoto (Cursor, Windsurf, Cline, Roo Code e outros): adicione uma entrada MCP chamada `clickup` apontando para `https://mcp.clickup.com/mcp` e aprove o fluxo OAuth no navegador.
- Agentes que executam servidores MCP como comandos locais: faça a ponte com `mcp-remote`:

```json
{
  "mcpServers": {
    "clickup": { "command": "npx", "args": ["-y", "mcp-remote", "https://mcp.clickup.com/mcp"] }
  }
}
```

As ferramentas aparecem como `clickup_*` (seu agente pode acrescentar um prefixo de servidor).

## Configurar a config

O `init` descobre seu workspace, suas listas e seus status, e escreve o `.clickup.json`. A descoberta é somente leitura: nada é escrito no ClickUp. Há duas formas de executá-lo.

**(a) Em um terminal, com um token de API pessoal.** Crie o token em ClickUp → Settings → Apps → API Token, coloque-o no seu ambiente e execute o init:

```bash
export CLICKUP_API_TOKEN=<your personal token>
npx @llodev/pm-tasks-clickup init
```

Os prompts escolhem o idioma de narração, o workspace (só quando você tem mais de um), as listas a usar, o status de andamento (`wip`) de cada lista, um cache opcional de membros, uma estratégia de estimativa e um bloco autônomo opcional. O arquivo vai para `./.clickup.json`, ou para `--output <path>`. Se o arquivo já existir, você é consultado antes de sobrescrevê-lo.

**(b) Dentro de uma sessão de agente com o ClickUp MCP conectado.** Sem token, a CLI para e pede que você execute o init dentro de uma sessão de agente. Isso significa: peça ao agente que configure o `.clickup.json`. O agente lê a hierarquia, os status de cada lista e os membros via MCP, pede que você escolha as listas e o status `wip` de cada uma, escreve o arquivo seguindo o `schemas/config.json` e depois executa o doctor.

## Verbos

| Verbo               | O que faz no ClickUp                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `task.create`       | Cria uma tarefa em uma lista (nome, descrição em Markdown, tags, prioridade, data de entrega, status inicial pelo nome) |
| `task.move`         | Muda o status para o `open`, `wip` ou `done` fixado da lista; ou move uma tarefa raiz para outra lista pelo id          |
| `checklist.check`   | Conclui ou reabre um item de checklist, que é uma subtarefa (status `done` / `open`)                                    |
| `task.close`        | Aplica o status `done` fixado da lista; uma tarefa já concluída ou cancelada fica como está                             |
| `task.due-date.set` | Define a data de entrega (um dia do calendário, `YYYY-MM-DD`)                                                           |
| `task.assignee.add` | Adiciona um responsável (id, `"me"`, e-mail ou nome de usuário) e mantém os atuais                                      |
| `task.comment.add`  | Publica um comentário; com um token de idempotência, ele é publicado uma única vez                                      |
| `task.parent.set`   | Torna a tarefa subtarefa de outra (o ClickUp a move para a lista da tarefa pai)                                         |
| `task.estimate.set` | Registra o esforço: estimativa de tempo nativa em tarefas sem subtarefas, mais uma tag `est:`                           |

Quando nada precisa mudar, `task.move` e `checklist.check` respondem `ALREADY_IN_STATE`, que significa "nada a fazer", não um erro. Os outros verbos respondem `ok: true` sem escrever.

## Modos

| Modo               | Quando                                                 | O que acontece                                                                                                         |
| ------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Pronto para colar  | Nenhum MCP conectado                                   | Uma descrição em Markdown com o checklist em linhas `- [ ]`, pronta para colar no ClickUp                              |
| Publicação via MCP | MCP conectado e `.clickup.json` presente               | Prévia, aprovação e depois a tarefa e uma subtarefa por item de checklist                                              |
| Autônomo           | `[autonomous]` / `--auto` e `autonomous.enabled: true` | Escreve sem aprovação a cada ação, dentro de `autonomous.allow` e `autonomous.scope.lists`                             |
| Execução de plano  | Um arquivo ou slug de plano mais o `.clickup.json`     | Encontra as tarefas abertas do plano nas listas configuradas e mantém o status delas em dia conforme o trabalho avança |

## Uso

| Exemplo de prompt                                                    | O que o agente faz                                                                                               |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `"publique este plano no ClickUp"`                                   | Publicação via MCP: tarefa mais subtarefas, após a sua aprovação                                                 |
| `"mova a tarefa de login para em andamento"`                         | `task.move` para o status `wip` fixado da lista                                                                  |
| `"marque a subtarefa 'escrever testes'"`                             | `checklist.check` nessa subtarefa                                                                                |
| `"feche a tarefa de login"`                                          | `task.close` (status `done` fixado)                                                                              |
| `"data de entrega da tarefa de login: próxima sexta"`                | `task.due-date.set`, com "próxima sexta" calculada pelo relógio do ClickUp                                       |
| `"me atribua à tarefa de login"`                                     | `task.assignee.add` com `"me"`                                                                                   |
| `"estime a tarefa de login em 3 horas ideais"`                       | `task.estimate.set` (`ideal_hours`, tarefa sem subtarefas: `time_estimate` de 180 minutos + `est:3-ideal-hours`) |
| `"[autonomous] execute docs/plans/X.md e mantenha o ClickUp em dia"` | Execução autônoma do plano (requer `autonomous.enabled: true`)                                                   |

## Referência da config

```jsonc
{
  "version": "1",
  "locale": "en-US", // narration language: en-US, pt-BR or es-ES
  "workspace": { "id": "<workspace_id>", "name": "<workspace name>" },
  "lists": [
    {
      "id": "<list_id>",
      "name": "Backlog",
      "space": "<space name>",
      "statuses": {
        "open": "to do",
        "wip": "in progress",
        "done": "complete",
        "closed": "cancelled",
      },
    },
  ],
  "defaultListId": "<list_id>",
  "members": [{ "id": "<user_id>", "name": "<name>", "alias": "<alias>" }], // optional cache
  "estimation": {
    "enabled": true,
    "strategy": "ideal_hours",
    "clickupTarget": "time",
    "hoursPerDay": 6,
  },
  "defaults": { "assigneeAlias": "me", "escalateToAlias": "<alias>" },
  "autonomous": {
    "enabled": false,
    "allow": ["task.create", "task.move", "checklist.check", "task.close", "task.comment.add"],
    "scope": { "lists": ["<list_id>"] },
    "rateLimit": { "writesPerMinute": 30, "commentsPerMinute": 10 },
    "auditLog": "./logs/clickup/audit.log",
  },
}
```

| Campo              | Significado                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lists[].statuses` | Nomes de status fixados por lista e por papel. `open` e `done` são obrigatórios; `wip` é escolha sua; `closed` é o status do tipo `closed` quando difere do `done` |
| `defaultListId`    | Onde as novas tarefas são criadas quando nenhuma lista é indicada                                                                                                  |
| `members`          | Cache opcional com valores de `alias` únicos; a atribuição também funciona sem ele                                                                                 |
| `estimation`       | Opcional. Ausente ou com `enabled: false` → `task.estimate.set` não se aplica                                                                                      |
| `defaults`         | `"me"` ou um `members[].alias`                                                                                                                                     |
| `autonomous`       | O `init` escreve `enabled: false`; mude para `true` você mesmo quando quiser que o agente escreva sem perguntar                                                    |
| `attribution`      | Bloco opcional do `@llodev/pm-tasks-core` que registra a identidade do agente nas descrições e nos comentários                                                     |

Nenhuma credencial é guardada neste arquivo.

## Doctor

```bash
npx @llodev/pm-tasks-clickup init --doctor
```

Executa as verificações compartilhadas do pm-tasks mais as verificações do ClickUp: config presente, id do workspace, cada lista fixa `open` e `done`, estimativa coerente, escopo autônomo e aliases padrão resolvidos. Com `CLICKUP_API_TOKEN` definido, verifica também ao vivo que o workspace está acessível e que cada status fixado ainda existe na sua lista (um status renomeado ou apagado no ClickUp aparece aqui, com a lista e o papel a corrigir). Sem token, as verificações ao vivo são puladas com um aviso. Flags: `--json`, `--fix-hints-only`, `--config <path>`.

## Notas específicas do ClickUp

**Os status são fixados, não adivinhados.** No ClickUp os status pertencem a cada lista e têm um tipo (`open`, `custom`, `done`, `closed`), mas nenhum tipo significa "em andamento", então você escolhe o `wip` de cada lista no `init`. Nomes localizados e personalizados funcionam. Se você renomear um status depois, execute o doctor e depois o `init` de novo.

**Itens de checklist são subtarefas.** O ClickUp MCP não consegue escrever checklists nativos, então cada item de checklist vira uma subtarefa, e marcar um item aplica o status `done` à subtarefa.

**Responsáveis são adicionados, nunca substituídos.** A atualização do ClickUp substitui a lista inteira de responsáveis; o adaptador lê os responsáveis atuais e os escreve de volta junto com o novo.

**As estimativas não contam em dobro.** A estimativa de tempo nativa é escrita só em tarefas sem subtarefas, porque o ClickUp pode somar as estimativas das subtarefas na tarefa pai. A tag `est:` é sempre escrita, e resta exatamente uma.

**Datas são dias do calendário no fuso horário da conta.** Datas relativas são calculadas pelo relógio do ClickUp, não pelo do agente. A data de entrega continua sendo o plano no fechamento; a conclusão é o status `done`.

**Conta de pessoa ou de agente, mesmo comportamento.** `"me"` é quem estiver autenticado no MCP. Uma conta dedicada ao agente para execuções autônomas é uma opção, não um requisito.

**Os limites de plano vêm do ClickUp, não do adaptador.** O ClickUp limita alguns recursos por plano: tetos de uso por recurso e ClickApps (como Tasks in Multiple Lists ou Sprints) que um admin do workspace precisa ativar. O adaptador não conhece os limites do seu plano, e eles podem mudar; confira-os para o seu plano antes de depender de um verbo. Quando o ClickUp recusa uma chamada por causa do plano, o verbo falha com a mensagem de erro do próprio ClickUp (por exemplo `Your plan is limited to … usages of feature`). A causa é a conta, não a sua config.

## Limitações conhecidas

- Não há verbo de sprint. O MCP do ClickUp não tem nenhuma ação de sprint. Um sprint é uma lista, e a única forma de colocar uma tarefa numa segunda lista é o `clickup_add_task_to_list` do MCP, que exige o ClickApp Tasks in Multiple Lists e um plano que o permita. A leitura de tarefas do MCP também não tem um campo para as listas extras de uma tarefa, então uma atribuição não poderia ser lida de volta. `task.move` com o id da lista do sprint move uma tarefa raiz para lá, mas a tarefa sai da sua lista de origem, e as mudanças de status nela falham até você registrar essa lista com o `init`.
- Checklists nativos do ClickUp podem ser lidos, mas não escritos.
- Não é possível limpar uma data de entrega pelo adaptador.
- Uma subtarefa não pode ser desvinculada da tarefa pai pelo MCP.
- Se um status `done` fixado foi renomeado no ClickUp, desmarcar uma subtarefa informa "nada a fazer"; execute o doctor.
- O ClickUp não tem atualização condicional, então uma mudança feita entre a leitura e a escrita do adaptador não é detectada.
- A idempotência de comentários olha só a primeira página de comentários.
- O `init` descobre apenas spaces, pastas e listas não arquivados.
- Os limites de requisições dependem do seu plano do ClickUp.

## Segurança

O `CLICKUP_API_TOKEN` é usado apenas pelo `init` e pelo doctor, lido apenas do ambiente e só para descoberta somente leitura. Nunca o cole em um chat, uma issue, um commit ou no `.clickup.json`. Os verbos usam o OAuth do MCP, não o token.

## Documentação

- [`SKILL.md`](../../SKILL.md): o skill completo (roteamento, modelo do ClickUp, todas as fases, verbos, envelope de resultado)
- [`references/operations.md`](../../references/operations.md): mapeamento verbo → ferramenta MCP, resultados, motivos de erro, idempotência
- [`references/estimation.md`](../../references/estimation.md): estratégias, estimativa só em tarefas sem subtarefas, tag `est:`
- [`references/autonomous.md`](../../references/autonomous.md): lista de permissões, escopo e log de auditoria do modo autônomo
- [`anti-patterns/clickup.md`](../../anti-patterns/clickup.md): regras NUNCA para o ClickUp
- [`schemas/config.json`](../../schemas/config.json): o schema do `.clickup.json`

## Licença

MIT
