# Skills

Workspace para autoria, versionamento e publicação de **Agent Skills** — pacotes portáteis de instruções/contexto que estendem o comportamento de agentes de IA (Claude Code, Cursor, Copilot, Codex, Gemini CLI, Windsurf, Cline, Roo Code, etc.).

> Cada subpasta deste diretório é **uma skill independente**, com seu próprio ciclo de vida, versionamento e repositório git remoto. Este diretório-mãe é apenas um *workspace local* para edição.

---

## 1. O que é uma Skill (em 30 segundos)

Uma skill é, no mínimo, **uma pasta com um arquivo `SKILL.md`**. O `SKILL.md` é um markdown com **frontmatter YAML** que o agente lê para decidir *quando* ativar a skill e *como* executar a tarefa.

O formato é um **padrão aberto** publicado pela Anthropic em `agentskills.io` (dez/2025), e é suportado por 40+ agentes. Vercel mantém `skills.sh` como o diretório/leaderboard público; SkillsMP indexa via GitHub (~350k skills em 2026); skillpm e skills-npm trazem o modelo para a npm registry.

Existem **três trilhos de distribuição** funcionando hoje — você pode usar um, dois ou os três pra mesma skill:

| Trilho                             | Como instala                                             | Quando usar                                                                     |
| ---------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Git + skills.sh** (Vercel)       | `npx skills add owner/repo`                              | Default. Sem flow de submissão; aparece no skills.sh via telemetria de install. |
| **npm + skillpm/skills-npm**       | `npx skillpm install <pkg>` ou bundle via `node_modules` | Quando a skill acompanha um SDK/lib; dá semver, lockfile, audit, npm registry.  |
| **Claude Code plugin marketplace** | `/plugin marketplace add <repo>`                         | Quando você quer empacotar skills + hooks + MCP + agents juntos.                |

---

## 2. Anatomia de uma Skill

### 2.1 Layout mínimo

```
minha-skill/
└── SKILL.md
```

### 2.2 Layout recomendado (skill "de verdade")

```
minha-skill/
├── SKILL.md           # obrigatório — frontmatter + instruções principais
├── README.md          # documentação humana (não é lida pelo agente)
├── LICENSE            # MIT ou Apache-2.0 (ver seção 5)
├── package.json       # opcional — só se publicar via npm/skillpm
├── scripts/           # opcional — helpers executáveis (bash, node, python)
├── references/        # opcional — docs longas, checklists, templates carregados sob demanda
├── assets/            # opcional — templates estáticos, configs de exemplo, diagramas
└── examples/          # opcional — pares input/output
```

**Por que separar?** O `SKILL.md` entra no contexto do agente toda vez que a skill é considerada. Coisas longas/condicionais ficam em `references/` e só são carregadas quando a instrução do `SKILL.md` mandar — economia direta de tokens.

### 2.3 Frontmatter do `SKILL.md`

**Obrigatório:**

```yaml
---
name: minha-skill                       # kebab-case, único no seu escopo
description: Faz X para projetos Y. Use quando o usuário pedir X ou mencionar Y.
---
```

- `name` — identificador kebab-case (minúsculas + hífens).
- `description` — **explica o que faz E quando usar**. É essa string que o agente lê pra decidir se ativa a skill. Comece com o verbo, mencione gatilhos.

**Opcional (parte do spec portátil):**

```yaml
license: MIT
compatibility:
  agents: ["claude-code", "cursor", "codex"]
metadata:
  version: 1.2.0                        # semver — o spec não exige, mas convenção forte
  tags: ["typescript", "ddd"]
allowed-tools: ["Read", "Edit", "Bash"] # experimental, suporte varia por agente
```

### 2.4 Corpo do `SKILL.md`

Estrutura que funciona bem:

```markdown
# Nome da Skill

Uma linha sobre o objetivo.

## Quando usar
- Gatilho 1
- Gatilho 2
- NÃO usar quando...

## Passo a passo
1. ...
2. ...

## Exemplos
- Input: ... → Output: ...

## Referências
- Ver references/<arquivo>.md para o caso X
```

---

## 3. Como este workspace está organizado

Cada pasta abaixo deste diretório é **uma skill independente**, com seu próprio repositório git remoto:

```
~/Workspace/skills/
├── README.md                          # este arquivo
├── skill-um/                          # repo separado: github.com/llodev/skill-um
│   ├── .git/
│   ├── SKILL.md
│   ├── LICENSE
│   ├── package.json                   # se publicar no npm
│   └── ...
├── skill-dois/                        # repo separado: github.com/llodev/skill-dois
│   └── ...
```

Cada skill tem:
- Versionamento próprio (tags git, semver)
- Releases próprios (GitHub Releases / npm publish)
- Issues, CI e documentação isolados

> Decisão consciente: **não é monorepo**. Cada skill é instalável independentemente via `npx skills add llodev/skill-um` ou `npm i @llodev/skill-um`.

---

## 4. Convenções

| Item                       | Padrão                                                                      |
| -------------------------- | --------------------------------------------------------------------------- |
| Nome da skill (e da pasta) | `kebab-case`, sem prefixo (`auth-flow` ✅ não `agent-skill-auth-flow` ❌)     |
| Versionamento              | **semver** (`1.0.0`) em git tags e/ou `package.json`/`metadata.version`     |
| Branch principal           | `main`                                                                      |
| Repositório git            | 1 repo por skill, público no GitHub (necessário pra `skills.sh` indexar)    |
| README humano              | sim, separado do `SKILL.md` (esse é pra agente, não pra humano)             |
| Changelog                  | `CHANGELOG.md` em "Keep a Changelog" — opcional mas recomendado             |
| CI                         | GitHub Actions com lint do `SKILL.md` (frontmatter válido, links quebrados) |

---

## 5. Licença

Ecosistema convergiu em duas opções:

- **MIT** — usado por `skillpm`, maioria das skills da comunidade. Mais permissivo. **Recomendado** se você só quer máxima adoção.
- **Apache-2.0** — usado pelas skills oficiais open-source da Anthropic. Tem cláusula explícita de patentes — recomendado se a skill tem qualquer coisa potencialmente patenteável.

**Evite:** GPL/AGPL — fricção em uso comercial, baixa adoção em skill ecosystem.

Coloque um `LICENSE` na raiz da skill **e** o campo `license: MIT` (ou `Apache-2.0`) no frontmatter do `SKILL.md`.

---

## 6. Passo a passo: do zero ao publicado

### 6.1 Pré-requisitos

```bash
# nada precisa estar instalado globalmente — tudo via npx
node --version    # >= 18
git --version
gh --version      # GitHub CLI, opcional mas ajuda
```

### 6.2 Scaffold da skill

Dentro deste workspace:

```bash
cd ~/Workspace/skills
npx skills init minha-skill
cd minha-skill
```

Isso cria `minha-skill/SKILL.md` com o template do Vercel.

### 6.3 Edita o `SKILL.md`

Preencha frontmatter (`name`, `description`) e o corpo. Mantenha o `SKILL.md` enxuto — mova detalhes pra `references/`.

### 6.4 Adiciona arquivos extras conforme necessário

```bash
mkdir scripts references assets examples
touch README.md LICENSE CHANGELOG.md
```

### 6.5 Inicializa o repositório git

```bash
git init -b main
git add .
git commit -m "feat: initial commit"

# Cria o repo no GitHub (precisa do gh CLI logado)
gh repo create llodev/minha-skill --public --source=. --remote=origin --push
```

### 6.6 Publica (escolha um ou mais trilhos)

#### Trilho A — Git + skills.sh (default, mais simples)

Não tem comando de "publish". Basta o repo público existir. A partir desse momento qualquer um instala via:

```bash
npx skills add llodev/minha-skill
```

O `skills.sh` pega o repo via telemetria de instalação. Para forçar aparecer mais rápido, faça você mesmo o primeiro install em um projeto qualquer.

#### Trilho B — npm via skillpm (semver, lockfile)

Adicione `package.json` na raiz da skill:

```json
{
  "name": "@llodev/minha-skill",
  "version": "0.1.0",
  "description": "Faz X para projetos Y.",
  "license": "MIT",
  "files": ["SKILL.md", "scripts", "references", "assets"],
  "repository": "github:llodev/minha-skill",
  "keywords": ["agent-skill", "claude-code", "cursor"]
}
```

Publique:

```bash
npm login
npm publish --access public
```

Usuários instalam com:

```bash
npx skillpm install @llodev/minha-skill
# ou, com skills-npm (antfu): adiciona no package.json e roda
npx skills-npm
```

#### Trilho C — Claude Code plugin marketplace

Para empacotar a skill como plugin (junto com hooks/MCP/agents, se quiser), crie `.claude-plugin/marketplace.json` em um repo "marketplace" agregador:

```json
{
  "name": "llodev",
  "owner": { "name": "llodev", "email": "lloliveira.dev@gmail.com" },
  "plugins": [
    {
      "name": "minha-skill",
      "source": "github:llodev/minha-skill",
      "description": "Faz X para projetos Y.",
      "version": "0.1.0"
    }
  ]
}
```

Usuários adicionam com:

```
/plugin marketplace add llodev/skills
/plugin install minha-skill
```

### 6.7 Releases subsequentes

```bash
# bump da versão (atualiza package.json E metadata.version do SKILL.md)
npm version patch     # ou minor/major

git push --follow-tags
npm publish           # se usando trilho B

# cria GitHub Release com notas
gh release create v0.1.1 --generate-notes
```

Para automatizar o ciclo (changelog AI-generated + npm publish + GitHub release), use a skill `autoship` do próprio Vercel:

```bash
npx skills add vercel-labs/autoship
```

---

## 7. Comandos úteis do `skills` CLI

```bash
npx skills init [nome]              # scaffold de uma skill nova
npx skills add <owner/repo>         # instala uma skill no agente atual
npx skills use <source>             # usa sem instalar
npx skills list                     # lista skills instaladas (alias: ls)
npx skills find [termo]             # busca interativa ou por keyword
npx skills remove [nome]            # remove
npx skills check                    # verifica updates disponíveis
npx skills update [nome]            # atualiza pra última versão
```

---

## 8. Qualidade & validação

Antes de tornar uma skill pública, rode:

1. **Lint do frontmatter** — `name` único, `description` clara com gatilhos.
2. **Teste em pelo menos 2 agentes** diferentes (Claude Code + Cursor, por exemplo).
3. **Descrição passa no teste do "1%"** — agente decide ativar com uma chance ≥1% em prompts relevantes? Se não, reescreva.
4. **Tamanho do `SKILL.md`** — se passar de ~200 linhas, mova detalhe pra `references/`.
5. **Sem PII, sem segredos** — `git secrets` ou `trufflehog` no CI.

Use a skill `skill-judge` (já instalada neste agente) pra auditar:

```
/skill-judge minha-skill/SKILL.md
```

---

## 9. Discovery e marketing

- **skills.sh** — leaderboard oficial Vercel. Telemetria de install rankeia.
- **agentskills.io** — registro do spec aberto Anthropic.
- **SkillsMP** — crawler de GitHub. Indexa qualquer `SKILL.md` público.
- **Claude Plugins directory** (`claude-plugins.dev`, `claudemarketplaces.com`) — se publicar via marketplace.
- **Tags no `package.json`/topics no GitHub** — `agent-skill`, `claude-code`, `cursor`, `mcp` ajudam descoberta.

---

## 10. Referências

- [Vercel — Agent Skills docs](https://vercel.com/docs/agent-resources/skills)
- [Vercel — Creating, Installing, Sharing skills (KB)](https://vercel.com/kb/guide/agent-skills-creating-installing-and-sharing-reusable-agent-context)
- [vercel-labs/skills (CLI fonte)](https://github.com/vercel-labs/skills)
- [Anthropic — Agent Skills (engineering)](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [anthropics/skills (referência oficial + spec)](https://github.com/anthropics/skills)
- [agentskills.io (spec aberto)](https://agentskills.io/home)
- [Claude Code — Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [skillpm — package manager npm-nativo](https://github.com/sbroenne/skillpm)
- [antfu/skills-npm — install via npm](https://github.com/antfu/skills-npm)
- [skills (CLI no npm)](https://www.npmjs.com/package/skills)
