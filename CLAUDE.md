# Working agreements (tc-pbr)

- **Every change to the mock-up must also update the related UISS** (`docs/uiss/<NN_Function>/*.xlsx`) in the same piece of work:
  bump the revision (new row in `revisions` with what changed), update items / operation / messages / data map /
  screen layout as needed, rebuild with the `anthropic-skills:uiss-generator` skill, render-check, commit.
  Check also the UISS of other functions affected by the change (e.g. a DTP record column touches DTP Creation,
  DTP Excel Upload, DTP Queue Processing and DTP Switching).
- Layout: one folder per function `docs/uiss/<NN_Function>/` = UISS workbooks + rules / spec `.md` + `src/<UISS name>.json`
  (latest spec of every workbook) + `src/img/<UISS name>/` (screenshots, paths relative to `src/`). Update the source JSON
  together with the workbook; rebuild with `python3 docs/uiss/scripts/build_all.py <UISS name>`; shared scripts in `docs/uiss/scripts/`.
- Database = existing ELIPS schema `docs/db/ELIPS_Schema.sql` (dictionary `docs/db/schema-dictionary.md`): use its tables / columns /
  types; never invent tables or columns. Anything not confirmed by schema / code is written
  "TBD - Not confirmed from existing schema/data/code"; differences go to `docs/review/07-gap-analysis.md` (no silent change of the app).
- Keep the rules documents (`docs/uiss/<NN_Function>/*.md`) in line with the mock-up (rule IDs, open questions).
- Push to `main`. Replies to the user in Indonesian; UISS and specs in English.
- Mock-up: static HTML/JS (`index.html`, `master.html`, …); pure rule modules are tested with Node:
  `for t in tests/*.test.js; do node $t; done`.
