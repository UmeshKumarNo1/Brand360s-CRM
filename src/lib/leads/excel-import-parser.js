import * as XLSX from "xlsx";

/**
 * Normalizes column header keys to standard property names
 */
function normalizeHeader(header) {
  if (!header || typeof header !== "string") return "";
  const clean = header.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (clean === "entityid" || clean === "cin" || clean === "companyid" || clean === "registrationno") {
    return "entityId";
  }
  if (clean === "entitytype" || clean === "type") {
    return "entityType";
  }
  if (clean === "name" || clean === "companyname" || clean === "companylegalname" || clean === "company") {
    return "name";
  }
  if (clean === "state") return "state";
  if (clean === "district") return "district";
  if (clean === "roc") return "roc";
  if (clean === "niccode" || clean === "nic") return "nicCode";
  if (clean === "niclabel" || clean === "nicdescription" || clean === "activity") return "nicLabel";
  if (clean === "dateofincorporation" || clean === "doi" || clean === "incorporationdate") {
    return "dateOfIncorporation";
  }
  if (clean === "paidupcapital" || clean === "paidupcap" || clean === "paidcapital") {
    return "paidUpCapital";
  }
  if (clean === "authorizedcapital" || clean === "authcapital" || clean === "authcap") {
    return "authorizedCapital";
  }
  if (clean === "directorname" || clean === "contactperson" || clean === "director") {
    return "directorName";
  }
  if (clean === "directoremail" || clean === "email" || clean === "emailid") {
    return "directorEmail";
  }
  if (clean === "directormobile" || clean === "mobile" || clean === "phone" || clean === "contactno") {
    return "directorMobile";
  }
  if (clean === "city") return "city";
  if (clean === "registeredaddress" || clean === "address" || clean === "regaddress") {
    return "registeredAddress";
  }
  if (clean === "classofcompany" || clean === "class" || clean === "companyclass") {
    return "classOfCompany";
  }
  if (clean === "falconstatus" || clean === "status") {
    return "falcon_status";
  }

  return header.trim();
}

/**
 * Formats Excel date values (number serials or date strings) to YYYY-MM-DD
 */
function formatExcelDate(rawDate) {
  if (!rawDate) return null;
  if (typeof rawDate === "number") {
    // Excel date serial
    try {
      const parsed = XLSX.SSF.parse_date_code(rawDate);
      if (parsed) {
        const y = parsed.y;
        const m = String(parsed.m).padStart(2, "0");
        const d = String(parsed.d).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
    } catch {
      // Fallback
    }
  }

  const str = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD-MM-YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      // DD/MM/YYYY
      const d = parts[0].padStart(2, "0");
      const m = parts[1].padStart(2, "0");
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
  }

  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    const dt = new Date(timestamp);
    return dt.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Parses buffer into raw worksheets and rows
 */
function parseExcelWorkbook(buffer, selectedSheetName) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetNames = workbook.SheetNames || [];

  if (sheetNames.length === 0) {
    throw new Error("No worksheets found in spreadsheet.");
  }

  const activeSheetName = selectedSheetName && sheetNames.includes(selectedSheetName)
    ? selectedSheetName
    : sheetNames[0];

  const worksheet = workbook.Sheets[activeSheetName];
  if (!worksheet) {
    throw new Error(`Worksheet "${activeSheetName}" could not be read.`);
  }

  const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "", header: 1 });
  if (rawJson.length < 2) {
    return {
      sheetNames,
      activeSheetName,
      headers: [],
      rawRows: [],
    };
  }

  const headerRow = rawJson[0] || [];
  const normalizedHeaders = headerRow.map((h) => normalizeHeader(String(h)));

  const rawRows = [];
  for (let r = 1; r < rawJson.length; r++) {
    const rowArray = rawJson[r];
    if (!rowArray || rowArray.length === 0) continue;

    // Check if entire row is empty
    const hasData = rowArray.some((cell) => cell !== "" && cell !== null && cell !== undefined);
    if (!hasData) continue;

    const rowObj = {};
    for (let c = 0; c < headerRow.length; c++) {
      const standardKey = normalizedHeaders[c];
      if (standardKey) {
        rowObj[standardKey] = rowArray[c] !== undefined ? String(rowArray[c]).trim() : "";
      }
    }
    rawRows.push(rowObj);
  }

  return {
    sheetNames,
    activeSheetName,
    headers: normalizedHeaders,
    rawRows,
  };
}

/**
 * Groups multiple director rows sharing the same entityId into one company lead
 */
function groupAndValidateLeads(rawRows) {
  const companyMap = new Map();
  const invalidRows = [];

  let rowCounter = 0;
  for (const row of rawRows) {
    rowCounter++;
    const companyName = (row.name || "").trim();
    const entityId = (row.entityId || "").trim();

    if (!companyName && !entityId) {
      invalidRows.push({
        rowNumber: rowCounter,
        companyName: companyName || "(Unnamed)",
        entityId: entityId || "(No ID)",
        reason: "Missing both Company Name and Entity ID",
      });
      continue;
    }

    // Grouping key: Prefer entityId, fallback to normalized company name
    const groupKey = entityId ? `ENTITY_${entityId.toUpperCase()}` : `NAME_${companyName.toLowerCase()}`;

    const directorObj = {
      name: (row.directorName || "").trim(),
      email: (row.directorEmail || "").trim().toLowerCase(),
      mobile: (row.directorMobile || "").replace(/\D/g, ""),
      designation: (row.classOfCompany || "").trim() || "Director",
    };

    if (!companyMap.has(groupKey)) {
      companyMap.set(groupKey, {
        entityId: entityId,
        entityType: (row.entityType || "").trim() || "Private Limited (Pvt Ltd)",
        name: companyName,
        state: (row.state || "").trim() || "Tamil Nadu",
        district: (row.district || "").trim(),
        roc: (row.roc || "").trim(),
        nicCode: (row.nicCode || "").trim(),
        nicLabel: (row.nicLabel || "").trim(),
        dateOfIncorporation: formatExcelDate(row.dateOfIncorporation),
        paidUpCapital: Number(String(row.paidUpCapital || "0").replace(/[^0-9.]/g, "")) || 0,
        authorizedCapital: Number(String(row.authorizedCapital || "0").replace(/[^0-9.]/g, "")) || 0,
        city: (row.city || "").trim(),
        registeredAddress: (row.registeredAddress || "").trim(),
        classOfCompany: (row.classOfCompany || "").trim(),
        falcon_status: (row.falcon_status || "").trim(),
        directors: [],
        rawRowCount: 0,
      });
    }

    const leadRecord = companyMap.get(groupKey);
    leadRecord.rawRowCount++;

    // Add director if name or contact provided
    if (directorObj.name || directorObj.email || directorObj.mobile) {
      const alreadyHas = leadRecord.directors.some(
        (d) =>
          (directorObj.name && d.name.toLowerCase() === directorObj.name.toLowerCase()) ||
          (directorObj.email && d.email === directorObj.email)
      );
      if (!alreadyHas) {
        leadRecord.directors.push(directorObj);
      }
    }
  }

  const groupedLeads = Array.from(companyMap.values()).map((lead) => {
    // Primary contact defaults to first director
    const primaryDirector = lead.directors[0] || {};
    return {
      ...lead,
      contactPerson: primaryDirector.name || lead.name,
      email: primaryDirector.email || "",
      phone: primaryDirector.mobile || "",
    };
  });

  return {
    totalRawRows: rawRows.length,
    uniqueCompanies: groupedLeads.length,
    groupedLeads,
    invalidRows,
  };
}

/**
 * Generates an Excel buffer containing skipped / failed rows for download
 */
function generateSkippedReportBuffer(skippedRows) {
  const exportData = (skippedRows || []).map((row, idx) => ({
    "SL No": idx + 1,
    "Company Name": row.companyName || "-",
    "Entity ID / CIN": row.entityId || "-",
    "Director": row.directorName || row.contactPerson || "-",
    "Phone / Mobile": row.phone || row.directorMobile || "-",
    "Email": row.email || row.directorEmail || "-",
    "Reason for Skipping": row.reason || "Skipped by validation or duplicate check",
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Skipped & Failed Records");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export {
  parseExcelWorkbook,
  groupAndValidateLeads,
  generateSkippedReportBuffer,
  normalizeHeader,
};
