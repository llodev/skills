---
name: study-abstract
description: >-
  Turns any study material into a didactic abstract the reader can use with
  the source closed: a spoken overview, one diagram when the argument has a
  shape, unpacked concepts, contrast tables, a one-line glossary, mix-ups,
  and hidden self-check answers. Use when summarizing or revising lectures,
  readings, notes, slides, notebooks, code, papers, transcripts, or a set of
  files of any format and any count, including a correction note or errata.
  Write in the language the user used, unless the user names a language.
  Triggers include abstract, study summary, resumo, glossary, glossário,
  pegadinha, mix-up, errata, Mermaid, and transcript.
license: MIT
metadata:
  version: 0.1.0
  tags:
    - agent-skill
    - study
    - abstract
    - glossary
  family: study
  role: skill
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---

# Study abstracts

Produce a summary the reader can study with the source closed. A sentence that only names a term is not an explanation. Do not assume a unit count, a file extension, a naming scheme, or a correction file.

Do not use this skill to transcribe a source, to dump slides, or to compute a result the source does not contain.

## Language

1. If the user names a language in the invocation, write the whole abstract in that language, headings included.
2. Otherwise use the language of the user's message.
3. The source language does not decide.

Canonical headings, in order: **Title and source**, **In 30 seconds**, **Map**, **Key concepts**, **Reference tables**, **Quick glossary**, **Easy to mix up**, **Self-check**, **Connections**. Use these words when the output is English. Translate them otherwise, and keep the order.

## How many abstracts

| What the user pointed at | Write |
| --- | --- |
| One unit (lecture, chapter, paper, notebook, article) | One abstract, even if that unit is split across files |
| Assets of a unit (figures, notes, a correction that names only that unit) | Inside that unit's abstract |
| A set | One abstract per unit, plus a short index |
| A mixed folder | One abstract per unit. No index |
| One review of a set | The index only, after the unit abstracts exist. Do not fold the units into one file |

A set is what the user called one course, or what the sources mark as one sequence by numbering or cross-reference. A mixed folder is files that only share a directory. Co-location is not membership. Do not invent a thread for it.

Put files where the user asked. If they named no path, write one markdown file per unit next to the source. Match filenames already used in an existing summary folder. The index lists the question each unit answers. Add a sequence diagram only if the source itself orders the units. For the index shape, read [examples/index.md](examples/index.md). Do not read it for a single unit or a mixed folder.

## Sections

Always, in this order: **Title and source** (what it is, who produced it, where it is; point at a correction note when one contradicts the source), **In 30 seconds** (four or five sentences that can be spoken in one breath), **Key concepts** (one heading per theme, in source order; the idea, then its limit or the contrast), **Quick glossary** (every acronym and technical term in the file, one line on what it does), **Self-check** (short questions; the answer hidden in `<details>`, with the summary label translated).

| Section | Slot | Include when | Omit when |
| --- | --- | --- | --- |
| Map | after In 30 seconds | A process, a taxonomy, states, or an ordered exchange | The source is a flat list of definitions |
| Reference tables | after Key concepts | Two terms, formulas, dates, or source-versus-correction the reader will swap | Nothing is paired |
| Easy to mix up | after Quick glossary | Two ideas are actually confused. Name both, define both, say which account each side comes from | You would have to invent the pair |
| Connections | last | Other units in the same set exist | The piece is standalone |

## Before the first sentence

**MANDATORY — read [anti-patterns/prose.md](anti-patterns/prose.md) entire, from start to finish.** Do not draft the opening, the glossary, or a diagram before that.

On first use, the full name precedes the acronym. Author and year appear only on a claim this source attributes to someone. Do not add a locator the source does not cite.

## When accounts disagree

Apply every matching row. Do not merge the two sides into one sentence.

| What you are holding | Write |
| --- | --- |
| Source and a correction disagree | Both sentences, each labeled |
| Prose and a figure disagree | Both, and which is which |
| Another document differs in year, formula, count, or walkthrough | This source only |
| The source announces N items and lists a different N | The mismatch. Do not drop an item to force the announcement |
| Extraction breaks a token (`10 120`) | The tokens you saw. Label a usual reading as a reading |
| A metric comes from one run, one dialogue, or one table | A single run or a single example, in the output language |
| A printed example contradicts its own definition | Both, unfinished |

When more than one row matches, or one correction note covers several units, **read [references/conflicts.md](references/conflicts.md) entire**. Do not read it when every fact has a single account.

## When the source is not plain text

**Read [references/sources.md](references/sources.md) entire** for a picture, scan, chart, notebook, slide deck, spreadsheet, code, audio, video, or a text extraction that dropped a cited figure's labels. Do not read it for markdown, a typed document, or an extraction that already contains those labels.

## Diagram

One, and only inside Map. The diagram type follows the argument. A node label is a short phrase in the output language, not a bare acronym. An arrow is a dependency the source states. Delete any other arrow.

## Before handing off

- The abstract is in the language chosen above, headings included.
- Every acronym in the file has a glossary line.
- Every number, year, and formula is in this source, in its correction note, or marked as a reading of broken extraction.
- The map introduces no step the concepts section does not explain.
- The opening still makes sense with the source closed.
- An optional section that would be empty was omitted.
- Every matching conflict row was applied, not only the first.
