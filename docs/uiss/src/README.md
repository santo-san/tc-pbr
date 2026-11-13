# UISS sources

One JSON spec per workbook in `docs/uiss/` (same file name, `.json`). The workbooks are built with the
`anthropic-skills:uiss-generator` skill:

```
python3 <uiss-generator skill dir>/scripts/build_uiss.py docs/uiss/src/UISS_Screen_DTP_Creation.json -o docs/uiss/UISS_Screen_DTP_Creation.xlsx
```

- The specs are the **latest revision** of each UISS. To change a UISS: edit the spec (or write a small patch
  script), append a row to `revisions` (e.g. 0.7 → 0.8 with what changed), rebuild, render-check, commit both the
  `.json` and the `.xlsx`.
- `scripts/` holds the generators / patch scripts used so far (examples of how sections were produced).
- Screen Layout images: the specs point to screenshots taken from the HTML mock-up during the session
  (absolute paths of a temporary folder). When rebuilding in a new session, take the screenshots again from the
  mock-up (Playwright) and update the `image` paths, otherwise the layout pages stay empty.
