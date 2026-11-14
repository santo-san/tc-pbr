// CURRENT (AS-IS) Talend tJava code: ELIPS TC-PBR JSON -> PAS PR (reference for the DB-to-DB redesign).
// Source: provided by the user on 05-Nov-2026. Kept unchanged for traceability; see docs/pas-interface/elips-pas-pr-interface-spec.md
// (section "Analysis of the current tJava code") for the observations. Line comments with "[OBS-xx]" are NOT in the original.

//HEADER

Connection conn = (Connection) globalMap.get("conn_tDBConnection_2");
ObjectMapper mapper = new ObjectMapper();
String json = input_row.Body;

try {

  JsonNode root = mapper.readTree(json);

  for (JsonNode resObj: root.path("resObj")) {
    String saNumber = resObj.path("SA_NUMBER").asText();
    String tcCode = resObj.path("TC_VENDOR_CD").asText();
    String tcName = resObj.path("TC_NAME").asText();
    String createdBy = resObj.path("CREATED_BY").asText();

    // Get PROCESS_ID
    String processId = "";
    try (PreparedStatement ps = conn.prepareStatement("SELECT dbo.fn_get_last_process_id()")) {
      ResultSet rs = ps.executeQuery();
      if (rs.next()) processId = rs.getString(1);
    }

	String sqlLogH =
		"INSERT INTO [dbo].[TB_R_LOG_H] " +
		"(PROCESS_ID, MODULE_ID, FUNCTION_ID, START_DT, END_DT, PROCESS_STATUS, " +
		"CREATED_BY, CREATED_DT, CHANGED_BY, CHANGED_DT) " +
		"SELECT ?, '1', '1', GETDATE(), GETDATE(), 1, 'ils.talend', GETDATE(), NULL, NULL";

	PreparedStatement psLogH = conn.prepareStatement(sqlLogH);
	psLogH.setString(1, processId);
	psLogH.executeUpdate();

    // Extract FIX_PARAMETER
    String prNo = "", prType = "", prItemNo = "", itemType = "", isParent = "", procurementPurpose = "";
    String matNo = "", matDesc = "", wbsNo = "", wbsName = "";
    String itemClass = "", itemClassDesc = "", valuationClass = "", valuationClassDesc = "";
    String sourceType = "", buyerCd = "", docType = "", packingType = "", partColorSfx = "";
    String specialProcType = "", unitOfMeasureCd = "", oriCurrCd = "", localCurrCd = "";
    String deliveryPlanDt = "", glAccount = "", prStatus = "", prNextStatus = "", isRejected = "";
    String assetCategory = "", assetClass = "", assetLocation = "", assetNo = "";
    String vendorCd = "", vendorName = "", completion = "", releaseFlag = "";
    String changedBy = "", budgetRef = "", deliveryAddr = "";
    String cancelQty = "", divisionId = "", divisionName = "", plantCd = "", slocCd = "";
    String prCoordinator = "", procMonth = "", cancelFlag = "", prNotes = "", defaultValues = "";
    String poNo = "", prItemStatus = "";

    BigDecimal prQty = BigDecimal.ZERO;
    BigDecimal pricePerUom = BigDecimal.ZERO;
    BigDecimal oriAmount = BigDecimal.ZERO;
    BigDecimal exchangeRate = BigDecimal.ONE;
    BigDecimal localAmount = BigDecimal.ZERO;
    BigDecimal openQty = BigDecimal.ZERO;
    BigDecimal usedQty = BigDecimal.ZERO;
    BigDecimal subItemQty = BigDecimal.ZERO;

    for (JsonNode param: resObj.path("FIX_PARAMETER")) {

      String column = param.path("COLUMN").asText();
      String value = param.path("VALUE").asText();

      if ("PR_ITEM_NO".equals(column)) prItemNo = value;
      else if ("PR_TYPE".equals(column)) prType = value;
      else if ("ITEM_TYPE".equals(column)) itemType = value;
      else if ("IS_PARENT".equals(column)) isParent = value;
      else if ("PROCUREMENT_PURPOSE".equals(column)) procurementPurpose = value;
      else if ("MAT_NO".equals(column)) matNo = value;
      else if ("MAT_DESC".equals(column)) matDesc = value;

      else if ("WBS_NO".equals(column)) wbsNo = value;
      else if ("WBS_NAME".equals(column)) wbsName = value;
      else if ("ITEM_CLASS".equals(column)) itemClass = value;
      else if ("ITEM_CLASS_DESC".equals(column)) itemClassDesc = value;
      else if ("VALUATION_CLASS".equals(column)) valuationClass = value;
      else if ("VALUATION_CLASS_DESC".equals(column)) valuationClassDesc = value;
      else if ("SOURCE_TYPE".equals(column)) sourceType = value;
      else if ("BUYER_CD".equals(column)) buyerCd = value;
      else if ("DOC_TYPE".equals(column)) docType = value;
      else if ("PACKING_TYPE".equals(column)) packingType = value;
      else if ("PART_COLOR_SFX".equals(column)) partColorSfx = value;
      else if ("SPECIAL_PROC_TYPE".equals(column)) specialProcType = value;
      else if ("UNIT_OF_MEASURE_CD".equals(column)) unitOfMeasureCd = value;
      else if ("ORI_CURR_CD".equals(column)) oriCurrCd = value;
      else if ("LOCAL_CURR_CD".equals(column)) localCurrCd = value;
//      else if ("DELIVERY_PLAN_DT".equals(column)) deliveryPlanDt = value;
      else if ("DELIVERY_PLAN_DT".equals(column)) {
        // Format tanggal saat ini menjadi yyyymmdd
        java.text.SimpleDateFormat sdfdlv = new java.text.SimpleDateFormat("yyyy-MM-dd");
        String dlv = sdfdlv.format(new java.util.Date());

        // Susun nilai PR_NOTES seperti PR_NOTES_20250630_0
        deliveryPlanDt = dlv;
      }
      else if ("PR_STATUS".equals(column)) prStatus = value;
      else if ("PRITEM_STATUS".equals(column)) prItemStatus = value;
      else if ("PR_NEXT_STATUS".equals(column)) prNextStatus = value;
      else if ("IS_REJECTED".equals(column)) isRejected = value;
      else if ("ASSET_CATEGORY".equals(column)) assetCategory = value;
      else if ("ASSET_CLASS".equals(column)) assetClass = value;
      else if ("ASSET_LOCATION".equals(column)) assetLocation = value;
      else if ("ASSET_NO".equals(column)) assetNo = value;
      else if ("COMPLETION".equals(column)) completion = value;
      else if ("RELEASE_FLAG".equals(column)) releaseFlag = value;
      else if ("CREATED_BY".equals(column)) createdBy = value;
      else if ("CHANGED_BY".equals(column)) changedBy = value;
      else if ("BUDGET_REF".equals(column)) budgetRef = value;
      else if ("DELIVERY_ADDR".equals(column)) deliveryAddr = value;
      else if ("CANCEL_QTY".equals(column)) cancelQty = value;
      else if ("DIVISION_ID".equals(column)) divisionId = value;
      else if ("DIVISION_NAME".equals(column)) divisionName = value;
      else if ("PLANT_CD".equals(column)) plantCd = value;
      else if ("SLOC_CD".equals(column)) slocCd = value;
      else if ("PR_COORDINATOR".equals(column)) prCoordinator = value;

      else if ("PROC_MONTH".equals(column)) {
        // Format tanggal saat ini menjadi yyyymmdd
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyyMM");
        String prcMnth = sdf.format(new java.util.Date());

        // Susun nilai PR_NOTES seperti PR_NOTES_20250630_0
        procMonth = prcMnth;
      }
      else if ("PR_QTY".equals(column)) prQty = new BigDecimal(value);
      else if ("PRICE_PER_UOM".equals(column)) pricePerUom = new BigDecimal(value);
      else if ("ORI_AMOUNT".equals(column)) oriAmount = new BigDecimal(value);
      else if ("EXCHANGE_RATE".equals(column)) exchangeRate = new BigDecimal(value);
      else if ("LOCAL_AMOUNT".equals(column)) localAmount = new BigDecimal(value);
      else if ("OPEN_QTY".equals(column)) openQty = new BigDecimal(value);
      else if ("USED_QTY".equals(column)) usedQty = new BigDecimal(value);
      else if ("SUBITEM_QTY".equals(column)) subItemQty = new BigDecimal(value);
      else if ("CANCEL_FLAG".equals(column)) cancelFlag = value;

      else if ("PR_NOTES".equals(column)) {
        // Format tanggal saat ini menjadi yyyymmdd
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyyMMdd");
        String today = sdf.format(new java.util.Date());

        // Susun ILSTC_20250630_0
        prNotes = "ILSTC_" + today + "_1";
      }
      else if ("PO_NO".equals(column)) poNo = value;
      else if ("DEFAULT_VALUES".equals(column)) defaultValues = value;
    }

    // Generate PR_NO
    String query = "DECLARE @@PR_PREFIX VARCHAR(4), @@MSG VARCHAR(MAX), @@TEMP_LOG LOG_TEMP, @@MODULE VARCHAR(10) = '2', " +
      "@@FUNCTION VARCHAR(20) = '201002', @@LOCATION VARCHAR(512) = 'Generating New PR Number', @@MSG_ID VARCHAR(12), " +
      "@@EXIST INT, @@PR_NO VARCHAR(MAX), @@PR_TYPE_DESC VARCHAR(50), @USER_ID VARCHAR(50) = '" + createdBy + "', " +
      "@PROCESS_ID VARCHAR(50) = '" + processId + "', @PR_TYPE VARCHAR(50) = '" + prType + "'; SET NOCOUNT ON; BEGIN TRY " +
      "SET @@MSG = 'Generate New PR Number Started'; SET @@MSG_ID = 'MSG0000002'; EXEC dbo.sp_PutLog @@MSG, @USER_ID, @@LOCATION, @PROCESS_ID , @@MSG_ID, 'INF', @@MODULE, @@FUNCTION, 1; " +
      "SELECT @@PR_PREFIX = NUMBERING_PREFIX FROM TB_M_PROCUREMENT_TYPE WHERE PROCUREMENT_TYPE = @PR_TYPE; " +
      "IF EXISTS(SELECT 1 FROM TB_M_DOC_NUMBERING WHERE NUMBERING_PREFIX = SUBSTRING(@@PR_PREFIX, 1, 2) AND VARIANT = SUBSTRING(@@PR_PREFIX, 3, 4)) BEGIN DECLARE @@STATUS VARCHAR(10) = 'FALSE'; WHILE(@@STATUS = 'FALSE') BEGIN DECLARE @@NEW_SEQ INT; " +
      "SELECT @@NEW_SEQ = CAST(CURRENT_NUMBER AS INT) + 1 FROM TB_M_DOC_NUMBERING WHERE NUMBERING_PREFIX = SUBSTRING(@@PR_PREFIX, 1, 2) AND VARIANT = SUBSTRING(@@PR_PREFIX, 3, 4); " +
      "SELECT @@PR_NO = NUMBERING_PREFIX + REPLICATE('0', 8-LEN(CAST(@@NEW_SEQ AS VARCHAR(8)))) + CAST(@@NEW_SEQ AS VARCHAR(8)) FROM TB_M_DOC_NUMBERING WHERE NUMBERING_PREFIX = SUBSTRING(@@PR_PREFIX, 1, 2) AND VARIANT = SUBSTRING(@@PR_PREFIX, 3, 4); " +
      "IF EXISTS (SELECT 1 FROM TB_M_DOC_NUMBERING WHERE NUMBERING_PREFIX = SUBSTRING(@@PR_PREFIX, 1, 2) AND VARIANT = SUBSTRING(@@PR_PREFIX, 3, 4) AND MAXIMUM_RANGE = SUBSTRING(@@PR_NO, 3, LEN(@@PR_NO))) BEGIN SET @@MSG = 'Doc. Numbering for this prefix already reach maximum range'; RAISERROR(@@MSG, 16, 1); END " +
      "SELECT @@EXIST = COUNT(1) FROM TB_H_DOCUMENT_NUMBER WHERE DOC_NO = @@PR_NO AND PROCESS_ID <> @PROCESS_ID AND USED_STATUS = 'Y'; IF(@@EXIST = 0) BEGIN UPDATE TB_M_DOC_NUMBERING SET CURRENT_NUMBER = SUBSTRING(@@PR_NO, 3, LEN(@@PR_NO)) WHERE NUMBERING_PREFIX = SUBSTRING(@@PR_PREFIX, 1, 2) AND VARIANT = SUBSTRING(@@PR_PREFIX, 3, 4); " +
      "SET @@STATUS = 'TRUE'; INSERT INTO [dbo].[TB_H_DOCUMENT_NUMBER] ([DOC_NO], [PROCESS_ID], [USED_STATUS], [CREATED_BY], [CREATED_DT], [CHANGED_BY], [CHANGED_DT]) VALUES (@@PR_NO, @PROCESS_ID, 'Y', @USER_ID, GETDATE(), null, null); END END END " +
      "ELSE BEGIN SELECT @@PR_TYPE_DESC = PROCUREMENT_DESC FROM TB_M_PROCUREMENT_TYPE WHERE PROCUREMENT_TYPE = @PR_TYPE; SET @@MSG = 'Prefix for procurement type ' + @@PR_TYPE_DESC + ' not registered yet in doc. numbering master'; RAISERROR(@@MSG, 16, 1); END " +
      "SET @@MSG = 'Success Generate New PR Number ' + @@PR_NO; SET @@MSG_ID = 'MSG0000003'; EXEC dbo.sp_PutLog @@MSG, @USER_ID, @@LOCATION, @PROCESS_ID , @@MSG_ID, 'SUC', @@MODULE, @@FUNCTION, 2; END TRY BEGIN CATCH SET @@MSG = ERROR_MESSAGE(); " +
      "SET @@MSG_ID = 'EXCEPTION'; EXEC dbo.sp_PutLog @@MSG, @USER_ID, @@LOCATION, @PROCESS_ID, @@MSG_ID, 'ERR', @@MODULE, @@FUNCTION, 3; SET @@PR_NO = 'FAILED'; END CATCH; SELECT @@PR_NO AS PR_NO;";

    try (Statement stmt = conn.createStatement()) {
      ResultSet rs = stmt.executeQuery(query);
      if (rs.next()) prNo = rs.getString("PR_NO");
    }

    // Set ke output
    output_row.PR_DESC = saNumber;
    output_row.CREATED_BY = createdBy;
    output_row.PR_TYPE = prType;
    output_row.PROCESS_ID = processId;
    output_row.PROC_MONTH = procMonth;
    output_row.PR_STATUS = prStatus;
    output_row.PLANT_CD = plantCd;
    output_row.SLOC_CD = slocCd;
    output_row.PR_COORDINATOR = prCoordinator;
    output_row.DIVISION_ID = divisionId;
    output_row.DIVISION_NAME = divisionName;
    output_row.LOCAL_CURR_CD = localCurrCd;
    output_row.RELEASED_FLAG = releaseFlag;
    output_row.DELIVERY_PLAN_DT = deliveryPlanDt;
    output_row.CANCEL_FLAG = cancelFlag;
    output_row.DOC_DT = new Date();
    output_row.CREATED_DT = new Date();
    output_row.PR_NO = prNo;

    // SQL Insert Execution
    try (PreparedStatement insertStmt = conn.prepareStatement(
      "INSERT INTO TB_R_PR_H (PR_DESC, CREATED_BY, PR_TYPE, PR_NO, PROCESS_ID, PROC_MONTH, PR_STATUS, PLANT_CD, SLOC_CD, PR_COORDINATOR, DIVISION_ID, DIVISION_NAME, LOCAL_CURR_CD, RELEASED_FLAG, DELIVERY_PLAN_DT, CANCEL_FLAG, DOC_DT, CREATED_DT, LOCAL_AMOUNT, PR_NOTES) " +
 //      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)")) {
      "SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,? " +
      "WHERE NOT EXISTS ( SELECT 1 FROM TB_R_PR_H WHERE PR_DESC = ? ) ")) {
      insertStmt.setString(1, saNumber);
      insertStmt.setString(2, createdBy);
      insertStmt.setString(3, prType);
      insertStmt.setString(4, prNo);
      insertStmt.setString(5, processId);
      insertStmt.setString(6, procMonth);
      insertStmt.setString(7, prStatus);
      insertStmt.setString(8, plantCd);
      insertStmt.setString(9, slocCd);
      insertStmt.setString(10, prCoordinator);
      insertStmt.setString(11, divisionId);
      insertStmt.setString(12, divisionName);
      insertStmt.setString(13, localCurrCd);
      insertStmt.setString(14, releaseFlag);
      insertStmt.setString(15, deliveryPlanDt);
      insertStmt.setString(16, cancelFlag);
      insertStmt.setTimestamp(17, new java.sql.Timestamp(output_row.DOC_DT.getTime()));
      insertStmt.setTimestamp(18, new java.sql.Timestamp(output_row.CREATED_DT.getTime()));
      insertStmt.setBigDecimal(19, localAmount);
//      insertStmt.setString(20, prNotes);
      insertStmt.setString(20, null);
      insertStmt.setString(21, saNumber);

      insertStmt.executeUpdate();

      String sqlHeader =
        "INSERT INTO [dbo].[TB_T_PR_H] " +
        "(PROCESS_ID, PR_NO, DOC_DT, PR_DESC, PR_TYPE, PR_STATUS, " +
        " PLANT_CD, SLOC_CD, PR_COORDINATOR, DIVISION_ID, DIVISION_NAME, " +
        " PROJECT_NO, URGENT_DOC, PR_NOTES, DELIVERY_PLAN_DT, " +
        " CREATED_BY, CREATED_DT, CHANGED_BY, CHANGED_DT) " +
        "SELECT PROCESS_ID, PR_NO, DOC_DT, PR_DESC, PR_TYPE, PR_STATUS, " +
        " PLANT_CD, SLOC_CD, PR_COORDINATOR, DIVISION_ID, DIVISION_NAME, " +
        " PROJECT_NO, URGENT_DOC, PR_NOTES, DELIVERY_PLAN_DT, " +
        " CREATED_BY, CREATED_DT, CHANGED_BY, CHANGED_DT " +
        "FROM TB_R_PR_H " +
        "WHERE PR_NO = ? AND PROCESS_ID = ?" ;

      PreparedStatement psHeader = conn.prepareStatement(sqlHeader);

      psHeader.setString(1, prNo);
      psHeader.setString(2, processId);

      psHeader.executeUpdate();

      //				  System.out.println("insert t head");

      for (JsonNode paramitem: resObj.path("DETAIL_ITEM")) {
        String sItemNo = paramitem.path("ITEM_NO").asText();
        String saDetNumber = paramitem.path("SA_DET_NUMBER").asText();
        BigDecimal cost = new BigDecimal(paramitem.path("COST").asText());
        String finishDateTime = paramitem.path("ORDER_FINISH_DATE").asText();
        String routeCode = paramitem.path("ROUTE").asText();
        String orderNo = paramitem.path("ORDER_NO").asText();

        // Convert to only date (yyyy-MM-dd)
        String finishDate = finishDateTime.split(" ")[0];

        String sqlitem = "INSERT INTO TB_R_PR_ITEM (" +
          "PR_NO, PR_ITEM_NO, ITEM_TYPE, IS_PARENT, MAT_NO, MAT_DESC, " +
          "WBS_NO, WBS_NAME, ITEM_CLASS, ITEM_CLASS_DESC, VALUATION_CLASS, VALUATION_CLASS_DESC, " +
          "SOURCE_TYPE, DOC_TYPE, PR_QTY, UNIT_OF_MEASURE_CD, ORI_CURR_CD, " +
          "PRICE_PER_UOM, ORI_AMOUNT, LOCAL_CURR_CD, EXCHANGE_RATE, LOCAL_AMOUNT, " +
          "DELIVERY_PLAN_DT, GL_ACCOUNT, PR_STATUS, PR_NEXT_STATUS, IS_REJECTED, " +
          "ASSET_CATEGORY, VENDOR_CD, VENDOR_NAME, COMPLETION, OPEN_QTY, USED_QTY, " +
          "PROCESS_ID, RELEASE_FLAG, CREATED_BY, CREATED_DT, BUDGET_REF, PO_NO, " +
          "PROCUREMENT_PURPOSE, COST_CENTER_CD, BUYER_CD, " +
          "PACKING_TYPE, PART_COLOR_SFX, SPECIAL_PROC_TYPE" +
          ") SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? " +
          "  WHERE EXISTS ( SELECT 1 FROM TB_R_PR_H WHERE PR_NO = ? ) ";

        PreparedStatement insertStmtItem = conn.prepareStatement(sqlitem);
//        DebuggablePreparedStatement insertStmtItem = new DebuggablePreparedStatement(conn, sqlitem);

        // Set parameter sesuai urutan kolom (45 total)
        insertStmtItem.setString(1, prNo);
        insertStmtItem.setString(2, sItemNo);
        insertStmtItem.setString(3, itemType);
        insertStmtItem.setString(4, isParent);
        insertStmtItem.setString(5, defaultValues);
//        insertStmtItem.setString(6, saDetNumber + ";" + routeCode);
        insertStmtItem.setString(6, orderNo + ";" + routeCode);
        insertStmtItem.setString(7, defaultValues);
        insertStmtItem.setString(8, defaultValues);
        insertStmtItem.setString(9, itemClass);
        insertStmtItem.setString(10, itemClassDesc);
        insertStmtItem.setString(11, valuationClass);
        insertStmtItem.setString(12, valuationClassDesc);
        insertStmtItem.setString(13, sourceType);
        insertStmtItem.setString(14, docType);
        insertStmtItem.setBigDecimal(15, prQty);
        insertStmtItem.setString(16, unitOfMeasureCd);
        insertStmtItem.setString(17, oriCurrCd);
        insertStmtItem.setBigDecimal(18, cost);
        insertStmtItem.setBigDecimal(19, cost);
        insertStmtItem.setString(20, localCurrCd);
        insertStmtItem.setBigDecimal(21, exchangeRate);
        insertStmtItem.setBigDecimal(22, cost);
        insertStmtItem.setString(23, finishDate);
        insertStmtItem.setString(24, defaultValues);
        insertStmtItem.setString(25, prItemStatus);
        insertStmtItem.setString(26, prNextStatus);
        insertStmtItem.setString(27, isRejected);
        insertStmtItem.setString(28, assetCategory);
        insertStmtItem.setString(29, tcCode);
        insertStmtItem.setString(30, tcName);
        insertStmtItem.setString(31, completion);
        insertStmtItem.setBigDecimal(32, openQty);
        insertStmtItem.setBigDecimal(33, usedQty);
        insertStmtItem.setString(34, processId);
        insertStmtItem.setString(35, releaseFlag);
        insertStmtItem.setString(36, createdBy);
        insertStmtItem.setTimestamp(37, new java.sql.Timestamp(System.currentTimeMillis()));
        insertStmtItem.setString(38, budgetRef);
        insertStmtItem.setString(39, poNo);
        insertStmtItem.setString(40, procurementPurpose);
        insertStmtItem.setString(41, defaultValues);
        insertStmtItem.setString(42, buyerCd);
        insertStmtItem.setString(43, packingType);
        insertStmtItem.setString(44, partColorSfx);
        insertStmtItem.setString(45, specialProcType);
       insertStmtItem.setString(46, prNo); // terakhir, sesuai jumlah kolom

//		System.out.println(insertStmtItem.getFilledSQL(sqlitem));

        // Eksekusi insert
        insertStmtItem.executeUpdate();

        String sqlItem =
          "INSERT INTO TB_T_PR_ITEM (" +
          "PROCESS_ID, ITEM_NO, ITEM_TYPE, IS_PARENT, PROCUREMENT_PURPOSE, MAT_NO, MAT_DESC, " +
          "COST_CENTER_CD, WBS_NO, WBS_NAME, GL_ACCOUNT, ITEM_CLASS, ITEM_CLASS_DESC, " +
          "VALUATION_CLASS, VALUATION_CLASS_DESC, SOURCE_TYPE, PACKING_TYPE, PART_COLOR_SFX, " +
          "SPECIAL_PROC_TYPE, CAR_FAMILY_CD, MAT_TYPE_CD, MAT_GRP_CD, ORI_ITEM_QTY, NEW_ITEM_QTY, " +
          "ITEM_UOM, ORI_CURR_CD, ORI_PRICE_PER_UOM, NEW_PRICE_PER_UOM, ORI_AMOUNT, NEW_AMOUNT, " +
          "LOCAL_CURR_CD, EXCHANGE_RATE, ORI_LOCAL_AMOUNT, NEW_LOCAL_AMOUNT, DELIVERY_PLAN_DT, " +
          "VENDOR_CD, VENDOR_NAME, RELEASE_FLAG, QUOTA_FLAG, ASSET_CATEGORY, ASSET_CLASS, " +
          "ASSET_LOCATION, ASSET_NO, PR_NEXT_STATUS, COMPLETION, OPEN_QTY, USED_QTY, " +
          "NEW_FLAG, UPDATE_FLAG, DELETE_FLAG, CREATED_BY, CREATED_DT, CHANGED_BY, CHANGED_DT, " +
          "BUDGET_REF, OLD_WBS_NO, OLD_WBS_NAME, DELIVERY_ADDR) " +
          "SELECT PROCESS_ID, PR_ITEM_NO, ITEM_TYPE, IS_PARENT, PROCUREMENT_PURPOSE, MAT_NO, MAT_DESC, " +
          "COST_CENTER_CD, WBS_NO, WBS_NAME, GL_ACCOUNT, ITEM_CLASS, ITEM_CLASS_DESC, VALUATION_CLASS, " +
          "VALUATION_CLASS_DESC, SOURCE_TYPE, PACKING_TYPE, PART_COLOR_SFX, SPECIAL_PROC_TYPE, " +
          "CAR_FAMILY_CD, MAT_TYPE_CD, MAT_GRP_CD, PR_QTY, PR_QTY, UNIT_OF_MEASURE_CD, ORI_CURR_CD, " +
          "PRICE_PER_UOM, PRICE_PER_UOM, ORI_AMOUNT, ORI_AMOUNT, LOCAL_CURR_CD, EXCHANGE_RATE, " +
          "LOCAL_AMOUNT, LOCAL_AMOUNT, DELIVERY_PLAN_DT, VENDOR_CD, VENDOR_NAME, RELEASE_FLAG, " +
          "QUOTA_FLAG, ASSET_CATEGORY, ASSET_CLASS, ASSET_LOCATION, ASSET_NO, PR_NEXT_STATUS, " +
          "COMPLETION, OPEN_QTY, USED_QTY, 'N', 'N', 'N', CREATED_BY, CREATED_DT, CHANGED_BY, " +
          "CHANGED_DT, BUDGET_REF, WBS_NO, WBS_NAME, DELIVERY_ADDR " +
          "FROM TB_R_PR_ITEM A WHERE PR_NO = ? AND PROCESS_ID = ?" +
          "	AND NOT EXISTS (" +
          "		SELECT 1" +
          "		FROM TB_T_PR_ITEM B " +
          "		WHERE A.PROCESS_ID = B.PROCESS_ID " +
          "			AND A.PR_ITEM_NO = B.ITEM_NO ) ";

        PreparedStatement psItem = conn.prepareStatement(sqlItem);

        psItem.setString(1, prNo);
        psItem.setString(2, processId);

        psItem.executeUpdate();

        for (JsonNode paramsubitem: paramitem.path("DETAIL_SUBITEM")) {
          String subItemNo = paramsubitem.path("SUB_ITEM").asText();
          String subWBSNo = paramsubitem.path("WBS_NO").asText();
//		  String subWBSNo = "F3.Y2022.0021.51899P0100";
          String serviceType = paramsubitem.path("SERVICE_TYPE").asText();
          BigDecimal priceSub = new BigDecimal(paramsubitem.path("TARIF").asText());
          String glAccountSub = paramsubitem.path("GL_ACCOUNT").asText();
          String costCenterCd = paramsubitem.path("COST_CENTER_CD").asText();

          String sqlSub = "INSERT INTO TB_R_PR_SUBITEM (" +
            "PR_NO, PR_ITEM_NO, PR_SUBITEM_NO, MAT_NO, MAT_DESC, COST_CENTER_CD, WBS_NO, GL_ACCOUNT, " +
            "SUBITEM_QTY, SUBITEM_UOM, PRICE_PER_UOM, ORI_AMOUNT, LOCAL_AMOUNT, " +
            "CREATED_BY, CREATED_DT, CHANGED_BY, CHANGED_DT) " +
            "SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? " +
            "WHERE EXISTS ( SELECT 1 FROM TB_R_PR_H WHERE PR_NO = ? ) ";

          PreparedStatement stmtSub = conn.prepareStatement(sqlSub);

          stmtSub.setString(1, prNo);
          stmtSub.setString(2, sItemNo); // item number
          stmtSub.setString(3, subItemNo);
          stmtSub.setString(4, matNo);
//          stmtSub.setString(5, matDesc);
		  stmtSub.setString(5, orderNo + ";" + routeCode);
          stmtSub.setString(6, costCenterCd);
          stmtSub.setString(7, subWBSNo);
          stmtSub.setString(8, glAccountSub);
          stmtSub.setBigDecimal(9, subItemQty);
          stmtSub.setString(10, unitOfMeasureCd);
          stmtSub.setBigDecimal(11, priceSub);
          stmtSub.setBigDecimal(12, priceSub);
          stmtSub.setBigDecimal(13, priceSub);
          stmtSub.setString(14, createdBy);
          stmtSub.setTimestamp(15, new java.sql.Timestamp(System.currentTimeMillis()));
          stmtSub.setNull(16, java.sql.Types.VARCHAR);
          stmtSub.setNull(17, java.sql.Types.TIMESTAMP);
         stmtSub.setString(18, prNo);

          stmtSub.executeUpdate();

          String sqlSubItem =
            "INSERT INTO TB_T_PR_SUBITEM (" +
            "PROCESS_ID, ITEM_NO, SUBITEM_NO, MAT_NO, MAT_DESC, COST_CENTER_CD, WBS_NO, GL_ACCOUNT, " +
            "ORI_SUBITEM_QTY, NEW_SUBITEM_QTY, SUBITEM_UOM, ORI_PRICE_PER_UOM, NEW_PRICE_PER_UOM, " +
            "ORI_AMOUNT, NEW_AMOUNT, ORI_LOCAL_AMOUNT, NEW_LOCAL_AMOUNT, " +
            "NEW_FLAG, UPDATE_FLAG, DELETE_FLAG, CREATED_BY, CREATED_DT, CHANGED_BY, CHANGED_DT, OLD_WBS_NO) " +
            "SELECT ?, PR_ITEM_NO, PR_SUBITEM_NO, MAT_NO, MAT_DESC, COST_CENTER_CD, WBS_NO, GL_ACCOUNT, " +
            "SUBITEM_QTY, SUBITEM_QTY, SUBITEM_UOM, PRICE_PER_UOM, PRICE_PER_UOM, " +
            "ORI_AMOUNT, ORI_AMOUNT, LOCAL_AMOUNT, LOCAL_AMOUNT, " +
            "'N', 'N', 'N', CREATED_BY, CREATED_DT, CHANGED_BY, CHANGED_DT, WBS_NO " +
            "FROM TB_R_PR_SUBITEM A WHERE PR_NO = ? " +
            "			AND NOT EXISTS ( " +
            "								SELECT 1 " +
            "								FROM TB_T_PR_SUBITEM B " +
            "								WHERE B.PROCESS_ID = ? " +
            "									AND A.PR_ITEM_NO = B.ITEM_NO " +
            "									AND A.PR_SUBITEM_NO = B.SUBITEM_NO " +
            ")";

          PreparedStatement psSubItem = conn.prepareStatement(sqlSubItem);

          psSubItem.setString(1, processId); // WHERE PR_NO
          psSubItem.setString(2, prNo); // @PROCESS_ID
          psSubItem.setString(3, processId); // @PROCESS_ID

          psSubItem.executeUpdate();

        }
      }

      System.out.println("PR: " + prNo + " ProcessId: " + processId);

      String callSPSubItem = "{call dbo.[SP_ILS_GENERATE_PR_ITEM](?)}";
	try (CallableStatement csSubItem = conn.prepareCall(callSPSubItem)) {
    	csSubItem.setString(1, processId);

    boolean hasResult = csSubItem.execute();
    if (hasResult) {
        try (ResultSet rs = csSubItem.getResultSet()) {
            while (rs.next()) {
                //String prNoNo = rs.getString("PR_NO");
                //int itemCount = rs.getInt("ITEM_COUNT");
				String result = rs.getString("RESULT");
                System.out.println("result: " + result );
            	}
        	}
    	}
	}

      String callSP = "{call dbo.[sp_prcreation_budgetProcessing](?, ?, ?, ?, ?, ?, ?, ?)}";
      try (CallableStatement cs = conn.prepareCall(callSP)) {
        cs.setString(1, processId); // @PROCESS_ID
        cs.setInt(2, Integer.parseInt(divisionId)); // 21 (DIVISION ID), atau langsung 21
        cs.setString(3, prNo); // @@PR_NO
        cs.setString(4, saNumber); // PR_DESC, sesuaikan jika ingin dinamis
        cs.setString(5, createdBy); // @USER_ID
        cs.setString(6, "NEW_COMMIT"); // TYPE
        cs.setInt(7, 0); // FLAG
        cs.setString(8, "SC"); // SOURCE

        cs.execute();
        //conn.commit();
        System.out.println("Stored Procedure sp_prcreation_budgetProcessing berhasil dijalankan.");
      }

      String insertAutoPO =
        "INSERT INTO TB_T_JOB_AUTOPO ([TYPE], DOCUMENT_NO, PROCESS_ID, CREATED_BY, CREATED_DT, COUNT_RETRY, IS_SUCCESS) " +
        "SELECT DISTINCT 'PR', ?, NULL, ?, GETDATE(), 0, 0 " +
        "FROM TB_R_PR_ITEM pri " +
        "INNER JOIN TB_M_VALUATION_CLASS vc ON pri.VALUATION_CLASS = vc.VALUATION_CLASS " +
        "INNER JOIN ( " +
        "   SELECT DISTINCT splitdata AS SYSTEM_VALUE " +
        "   FROM TB_M_SYSTEM, dbo.fnSplitString( " +
        "       (SELECT SYSTEM_VALUE FROM TB_M_SYSTEM WHERE FUNCTION_ID = 'AUTOPO' AND SYSTEM_CD = 'PURCHASING_GROUP_CD'), ',' " +
        "   ) " +
        ") pgc ON vc.PURCHASING_GROUP_CD = pgc.SYSTEM_VALUE " +
        "WHERE pri.PR_NO = ? " +
        "AND SOURCE_TYPE IN (SELECT SYSTEM_VALUE FROM TB_M_SYSTEM WHERE FUNCTION_ID = 'SRCILS')";

      try (PreparedStatement psAutoPO = conn.prepareStatement(insertAutoPO)) {
        psAutoPO.setString(1, prNo); // untuk SELECT 'PR', ?, ...
        psAutoPO.setString(2, "ILSTC"); // untuk SELECT 'PR', ?, ...
        psAutoPO.setString(3, prNo); // untuk WHERE pri.PR_NO = ?

        int inserted = psAutoPO.executeUpdate();
        // //conn.commit();
        //System.out.println("Auto PO job inserted: " + inserted + " row(s).");
      }

     conn.commit(); // COMMIT jika semua berhasil

    }
  }
} catch (Exception e) {

  System.err.println("Gagal menjalankan proses: " + e.getMessage());
}
