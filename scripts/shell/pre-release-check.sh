#!/usr/bin/env bash
# Quality gate that must pass before `make release-version`.
# Today it only enforces the skill-judge ratchet; more gates can chain here later.
set -euo pipefail

REPO="$(git rev-parse --show-toplevel)"
cd "$REPO"

# Resolve the base branch the release is going against. Defaults to origin/main
# but allows override for forks or alternate flows.
BASE_REF="${PRE_RELEASE_BASE:-origin/main}"

# If origin/main is missing (offline / shallow / first clone), fall back to main.
if ! git rev-parse --verify --quiet "$BASE_REF" >/dev/null; then
  if git rev-parse --verify --quiet main >/dev/null; then
    BASE_REF="main"
  else
    echo "pre-release: no base ref to compare against (tried origin/main, main); skipping gate."
    exit 0
  fi
fi

SKILL_CHANGES="$(git diff --name-only "$BASE_REF"...HEAD -- 'pm-tasks/*/SKILL.md' || true)"
BASELINE_CHANGES="$(git diff --name-only "$BASE_REF"...HEAD -- 'scripts/snapshots/skill-judge-baseline.json' || true)"

if [ -z "$SKILL_CHANGES" ]; then
  echo "pre-release: no SKILL.md changes vs $BASE_REF — skill-judge gate skipped."
else
  if [ -n "$BASELINE_CHANGES" ]; then
    echo "pre-release: SKILL.md changes detected and scripts/snapshots/skill-judge-baseline.json"
    echo "             was updated in the same range. Assuming the gate was run."
  else
    cat <<EOF
─── skill-judge gate ───────────────────────────────────────────────────────
SKILL.md files were modified on this branch but scripts/snapshots/skill-judge-baseline.json
has NOT been updated. The skill-judge contract says the baseline should be
re-evaluated before shipping changes that touch SKILL.md.

Modified SKILL.md files vs $BASE_REF:
$(echo "$SKILL_CHANGES" | sed 's/^/  - /')

Required action — one of:

  (a) Run 'make skill-judge' with current scores piped in. If the scores
      improved meaningfully (Δ ≥ +3), ratchet scripts/snapshots/skill-judge-baseline.json
      and commit it on this branch, then re-run 'make release-version'.

  (b) If you ran the gate and concluded the score drift is within the noise
      band (Δ ∈ [-2, +2]), bypass with SKIP_SKILL_JUDGE_GATE=1:

          SKIP_SKILL_JUDGE_GATE=1 make release-version

      Add a brief justification in the next changeset.

────────────────────────────────────────────────────────────────────────────
EOF

    if [ "${SKIP_SKILL_JUDGE_GATE:-0}" = "1" ]; then
      echo "pre-release: SKIP_SKILL_JUDGE_GATE=1 — gate bypassed by maintainer."
    else
      exit 1
    fi
  fi
fi

echo "─── rubric drift gate ─────────────────────────────────────────────────"
if ! node scripts/checks/skill-judge-rubric-check.mjs; then
  echo "abort: skill-judge rubric changed; ratchet snapshot or revert"
  exit 1
fi
echo "─────────────────────────────────────────────────────────────────────"
