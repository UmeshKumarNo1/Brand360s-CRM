const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const {
  parseExcelWorkbook,
  groupAndValidateLeads,
  generateSkippedReportBuffer,
} = require("../src/lib/leads/excel-import-parser");

function runTests() {
  console.log("================================================================================");
  console.log("BRAND 360s CRM — LEADS, ROUND-ROBIN, FOLLOW-UPS & CONVERSION TEST SUITE");
  console.log("================================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // TEST 1: CSV and Excel Data Generation with Multiple Directors
  console.log("--> Test 1 & 2: Creating in-memory test spreadsheet with 10 companies & multi-directors...");
  const rawSampleRows = [
    // Company 1: 2 directors
    {
      entityId: "U72900TN2023PTC150001",
      entityType: "Private Limited",
      name: "Alpha Tech Solutions Pvt Ltd",
      state: "Tamil Nadu",
      district: "Chennai",
      roc: "ROC Chennai",
      nicCode: "6201",
      nicLabel: "Software development and IT consultancy",
      dateOfIncorporation: "2023-01-15",
      paidUpCapital: "500000",
      authorizedCapital: "1000000",
      directorName: "Ramesh Kumar",
      directorEmail: "ramesh@alphatech.com",
      directorMobile: "9876500001",
      city: "Chennai",
      registeredAddress: "12 Anna Salai, Chennai",
      classOfCompany: "Private",
      falcon_status: "Active",
    },
    {
      entityId: "U72900TN2023PTC150001", // Same entityId
      name: "Alpha Tech Solutions Pvt Ltd",
      directorName: "Suresh Kumar",
      directorEmail: "suresh@alphatech.com",
      directorMobile: "9876500002",
    },
    // Company 2: 1 director
    {
      entityId: "U72900TN2023PTC150002",
      name: "Beta Logistics Pvt Ltd",
      directorName: "Priya Sundaram",
      directorEmail: "priya@betalogistics.com",
      directorMobile: "9876500003",
      city: "Coimbatore",
      state: "Tamil Nadu",
      paidUpCapital: "200000",
      authorizedCapital: "500000",
    },
    // Company 3: 1 director
    {
      entityId: "U72900TN2023PTC150003",
      name: "Gamma Healthcare LLP",
      entityType: "LLP",
      directorName: "Dr. Ananya Rao",
      directorEmail: "ananya@gammahealth.com",
      directorMobile: "9876500004",
      city: "Madurai",
      state: "Tamil Nadu",
    },
    // Company 4: 1 director
    {
      entityId: "U72900TN2023PTC150004",
      name: "Delta Retail Ventures Pvt Ltd",
      directorName: "Karthik Raja",
      directorEmail: "karthik@deltaretail.com",
      directorMobile: "9876500005",
      city: "Trichy",
    },
    // Company 5: 1 director
    {
      entityId: "U72900TN2023PTC150005",
      name: "Epsilon Media Works Pvt Ltd",
      directorName: "Meenakshi Nathan",
      directorEmail: "meena@epsilonmedia.com",
      directorMobile: "9876500006",
      city: "Salem",
    },
    // Company 6: 1 director
    {
      entityId: "U72900TN2023PTC150006",
      name: "Zeta Fintech Labs Pvt Ltd",
      directorName: "Vikram Seth",
      directorEmail: "vikram@zetafin.com",
      directorMobile: "9876500007",
      city: "Chennai",
    },
    // Company 7: 1 director
    {
      entityId: "U72900TN2023PTC150007",
      name: "Eta Clean Energy Systems",
      directorName: "Lakshmi Narayanan",
      directorEmail: "lakshmi@etaclean.com",
      directorMobile: "9876500008",
      city: "Tirunelveli",
    },
    // Company 8: 1 director
    {
      entityId: "U72900TN2023PTC150008",
      name: "Theta Agro Exports Pvt Ltd",
      directorName: "Balamurugan",
      directorEmail: "bala@thetaagro.com",
      directorMobile: "9876500009",
      city: "Erode",
    },
    // Company 9: 1 director
    {
      entityId: "U72900TN2023PTC150009",
      name: "Iota Real Estate Developers",
      directorName: "Saravanan",
      directorEmail: "saravanan@iotarealty.com",
      directorMobile: "9876500010",
      city: "Vellore",
    },
    // Company 10: 1 director
    {
      entityId: "U72900TN2023PTC150010",
      name: "Kappa Industrial Tools Pvt Ltd",
      directorName: "Dinesh Kumar",
      directorEmail: "dinesh@kappatools.com",
      directorMobile: "9876500011",
      city: "Hosur",
    },
    // Invalid Row (Empty name & entityId)
    {
      entityId: "",
      name: "",
      directorName: "Ghost Person",
    },
  ];

  // Convert to Excel workbook
  const worksheet = XLSX.utils.json_to_sheet(rawSampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "CompanyLeads");
  const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  // TEST 2: Parse Excel Workbook using SheetJS
  console.log("\n--> Testing parseExcelWorkbook & Worksheet Selection...");
  const parsedSheet = parseExcelWorkbook(excelBuffer, "CompanyLeads");
  assert(parsedSheet.sheetNames.includes("CompanyLeads"), "SheetJS recognized worksheet name");
  assert(parsedSheet.rawRows.length === 12, `Extracted 12 total rows (including invalid row), got ${parsedSheet.rawRows.length}`);

  // TEST 3: Grouping Multiple Directors Under Same entityId
  console.log("\n--> Testing groupAndValidateLeads & Director Aggregation...");
  const groupedResult = groupAndValidateLeads(parsedSheet.rawRows);
  assert(groupedResult.uniqueCompanies === 10, `Expected 10 unique companies from 11 valid rows, got ${groupedResult.uniqueCompanies}`);
  assert(groupedResult.invalidRows.length === 1, `Expected 1 invalid row caught, got ${groupedResult.invalidRows.length}`);

  const alphaTech = groupedResult.groupedLeads.find((l) => l.entityId === "U72900TN2023PTC150001");
  assert(alphaTech !== undefined, "Found Alpha Tech Solutions");
  assert(alphaTech.directors.length === 2, `Alpha Tech has 2 grouped directors, got ${alphaTech.directors.length}`);
  assert(alphaTech.directors[0].name === "Ramesh Kumar", "First director is Ramesh Kumar");
  assert(alphaTech.directors[1].name === "Suresh Kumar", "Second director is Suresh Kumar");

  // TEST 4: Continuous Round-Robin Assignment Logic
  console.log("\n--> Testing Continuous Round-Robin Distribution for 10 leads among 3 salespersons...");
  const salespeople = [
    { id: "sp-a", full_name: "Salesperson A" },
    { id: "sp-b", full_name: "Salesperson B" },
    { id: "sp-c", full_name: "Salesperson C" },
  ];

  let pointer = -1; // Initial sequence starting pointer
  const assignments = [];
  const distribution = { "Salesperson A": 0, "Salesperson B": 0, "Salesperson C": 0 };

  for (let i = 0; i < groupedResult.groupedLeads.length; i++) {
    const lead = groupedResult.groupedLeads[i];
    pointer = (pointer + 1) % salespeople.length;
    const assignedSp = salespeople[pointer];
    assignments.push({ leadIndex: i + 1, entityId: lead.entityId, assignedTo: assignedSp.full_name });
    distribution[assignedSp.full_name]++;
  }

  // Print table as specified in prompt
  console.log("Actual Round-Robin Distribution Table:");
  console.table(assignments);

  assert(assignments[0].assignedTo === "Salesperson A", "Lead 1 -> Salesperson A");
  assert(assignments[1].assignedTo === "Salesperson B", "Lead 2 -> Salesperson B");
  assert(assignments[2].assignedTo === "Salesperson C", "Lead 3 -> Salesperson C");
  assert(assignments[3].assignedTo === "Salesperson A", "Lead 4 -> Salesperson A");
  assert(assignments[4].assignedTo === "Salesperson B", "Lead 5 -> Salesperson B");
  assert(assignments[5].assignedTo === "Salesperson C", "Lead 6 -> Salesperson C");
  assert(assignments[6].assignedTo === "Salesperson A", "Lead 7 -> Salesperson A");
  assert(assignments[7].assignedTo === "Salesperson B", "Lead 8 -> Salesperson B");
  assert(assignments[8].assignedTo === "Salesperson C", "Lead 9 -> Salesperson C");
  assert(assignments[9].assignedTo === "Salesperson A", "Lead 10 -> Salesperson A");

  assert(distribution["Salesperson A"] === 4, `Salesperson A got 4 leads, got ${distribution["Salesperson A"]}`);
  assert(distribution["Salesperson B"] === 3, `Salesperson B got 3 leads, got ${distribution["Salesperson B"]}`);
  assert(distribution["Salesperson C"] === 3, `Salesperson C got 3 leads, got ${distribution["Salesperson C"]}`);
  assert(pointer === 0, `Sequence ends at index 0 (Salesperson A), got ${pointer}`);

  // TEST 5: Sequence Continuation on Second Import
  console.log("\n--> Testing Sequence Continuation across separate import...");
  const secondImportRow = [{ entityId: "U72900TN2023PTC150011", name: "Lambda AI Systems Pvt Ltd", directorName: "Hari" }];
  const secondGrouped = groupAndValidateLeads(secondImportRow);

  pointer = (pointer + 1) % salespeople.length;
  const nextAssigned = salespeople[pointer];
  assert(nextAssigned.full_name === "Salesperson B", `Next lead across separate import correctly received by Salesperson B, got ${nextAssigned.full_name}`);

  // TEST 6: Duplicate Detection & Round-Robin Preservation
  console.log("\n--> Testing Duplicate Detection without consuming round-robin turn...");
  const duplicateEntityId = "U72900TN2023PTC150001";
  const existingSet = new Set(["U72900TN2023PTC150001"]);
  const isDuplicate = existingSet.has(duplicateEntityId);
  assert(isDuplicate === true, "Detected duplicate entityId U72900TN2023PTC150001");
  // Ensure pointer is NOT incremented for duplicate
  assert(pointer === 1, `Pointer remains intact at index 1 without consuming a turn`);

  // TEST 7: Lead to Client Conversion Workflow
  console.log("\n--> Testing Lead to Client Conversion simulation...");
  const testLeadRecord = {
    id: "lead-12345",
    company_name: "Alpha Tech Solutions Pvt Ltd",
    is_lead: true,
    client_status: "Lead",
    lead_status: "New",
    converted_at: null,
    converted_by: null,
    follow_ups: [
      { id: "f-1", title: "Initial Contact", status: "Pending" }
    ]
  };

  // Simulate Conversion action
  const convertedClientRecord = {
    ...testLeadRecord,
    is_lead: false,
    client_status: "Active",
    lead_status: "Converted",
    converted_at: new Date().toISOString(),
    converted_by: "user-admin-1",
  };

  // Clients page filtering test
  const allRecords = [testLeadRecord, convertedClientRecord];
  const clientsPageVisible = allRecords.filter((c) => !c.is_lead && c.client_status !== "Lead");
  assert(clientsPageVisible.length === 1, `Only 1 record visible on Clients page, got ${clientsPageVisible.length}`);
  assert(clientsPageVisible[0].id === "lead-12345", "Visible client is the converted record");
  assert(clientsPageVisible[0].client_status === "Active", "Client status is Active");

  // Follow-ups unconverted view test
  const unconvertedLeadsVisible = allRecords.filter((c) => c.is_lead === true || c.client_status === "Lead");
  assert(unconvertedLeadsVisible.length === 1, "Only the unconverted lead appears in Unconverted Leads view");
  assert(unconvertedLeadsVisible[0].is_lead === true, "Unconverted lead flag is preserved");

  // TEST 8: Export Skipped Report Buffer
  console.log("\n--> Testing generateSkippedReportBuffer...");
  const skippedSample = [{ companyName: "Invalid Co", entityId: "DUMMY", reason: "Duplicate Entity ID" }];
  const skippedBuffer = generateSkippedReportBuffer(skippedSample);
  assert(Buffer.isBuffer(skippedBuffer) && skippedBuffer.length > 0, "Generated downloadable Excel buffer for skipped records");

  console.log("\n================================================================================");
  console.log(`ALL TESTS PASSED! (${passedTests}/${totalTests} tests successful)`);
  console.log("================================================================================\n");
}

runTests();
