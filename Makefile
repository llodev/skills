.DEFAULT_GOAL := help
.PHONY: help install hooks fmt fmt-check validate contract-check version-sync changeset pre-release release-version release-publish init-asana init-trello skill-judge test typecheck build clean

help:
	@awk 'BEGIN{FS=":.*##"; printf "Targets:\n"} /^[a-zA-Z_-]+:.*?##/ {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## pnpm install (recursive across workspace)
	pnpm install

hooks: ## install lefthook git hooks (run once per clone)
	@if command -v lefthook >/dev/null 2>&1; then \
		lefthook install; \
	else \
		pnpm dlx lefthook install; \
	fi

fmt: ## prettier --write across the repo
	pnpm format

fmt-check: ## prettier --check (CI guard)
	pnpm format:check

validate: ## frontmatter + schema + link checks
	pnpm validate

contract-check: ## pm-tasks contract conformance check
	pnpm contract:check

version-sync: ## sync package.json versions across workspace
	pnpm version:sync

changeset: ## record a new changeset (interactive)
	pnpm changeset

pre-release: ## quality gate before release-version (skill-judge ratchet check)
	@bash scripts/shell/pre-release-check.sh

release-version: pre-release ## apply changesets + bump versions (runs pre-release first)
	pnpm changeset:version

release-publish: ## publish to npm (gated by CI/auth)
	pnpm changeset:publish

init-asana: ## run pm-tasks-asana init (needs LLODEV_PM_TASKS_ASANA_PAT)
	node pm-tasks/pm-tasks-asana/scripts/init.mjs

init-trello: ## run pm-tasks-trello init (needs TRELLO_API_KEY/TOKEN)
	node pm-tasks/pm-tasks-trello/scripts/init.mjs

skill-judge: ## skill-judge:check — reads scores from stdin as JSON {path: score}
	pnpm skill-judge:check

build: ## typescript build (tsc -b with project references)
	pnpm build

typecheck: ## typescript type check only (no emit)
	pnpm typecheck

test: ## run vitest suite
	pnpm test

clean: ## remove build artefacts and pnpm caches in node_modules
	rm -rf node_modules pm-tasks/*/node_modules
