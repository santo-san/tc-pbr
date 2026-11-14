# Delivery Note

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): DM-12..DM-14, INT-03  
Code: delivery-note.js, dn-rules.js, dn-pdf.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Report_Delivery_Note](uiss/UISS_Report_Delivery_Note.xlsx) | report | 0.4 (14-Nov-26) | [uiss/src/UISS_Report_Delivery_Note.json](uiss/src/UISS_Report_Delivery_Note.json) | 1 |
| [UISS_Batch_ELIPS_PAS_GR_Attachment](uiss/UISS_Batch_ELIPS_PAS_GR_Attachment.xlsx) | batch | 0.3 (14-Nov-26) | [uiss/src/UISS_Batch_ELIPS_PAS_GR_Attachment.json](uiss/src/UISS_Batch_ELIPS_PAS_GR_Attachment.json) | 0 |

Rules / specification (`uiss/`):

- [TC-PBR_Delivery_Note.md](uiss/TC-PBR_Delivery_Note.md)
- [TC-PBR_Delivery_Note.xlsx](uiss/TC-PBR_Delivery_Note.xlsx)
- [delivery-note-spec.md](uiss/delivery-note-spec.md)
- [elips-pas-gr-attachment-spec.md](uiss/elips-pas-gr-attachment-spec.md)

ST test scripts (`test/`, generated with the uiss-test-script skill; spec JSON in `test/src/`):

- [ST-ELIPS_TBD_Delivery_Note_Surat_Jalan.xlsx](test/ST-ELIPS_TBD_Delivery_Note_Surat_Jalan.xlsx)
- [ST-ELIPS_TBD_ELIPS_Surat_Jalan_PDF_to_PAS_FTP_for_Auto_GR_Talend.xlsx](test/ST-ELIPS_TBD_ELIPS_Surat_Jalan_PDF_to_PAS_FTP_for_Auto_GR_Talend.xlsx)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.LOG_ITGPAS`, `ielp.MS_DRIVER`, `ielp.MS_LOCATION`, `ielp.ORDER_CYCLE`, `ielp.ORDER_FILES`, `ielp.SA_DETAIL`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/functions/scripts/build_all.py UISS_Report_Delivery_Note UISS_Batch_ELIPS_PAS_GR_Attachment`
