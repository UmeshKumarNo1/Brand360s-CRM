"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { revalidatePath } from "next/cache";
import {
  parseExcelWorkbook,
  groupAndValidateLeads,
  generateSkippedReportBuffer,
} from "@/lib/leads/excel-import-parser";

/**
 * Fetch active salespersons for round-robin assignment
 * Excludes: Admins, Inactive users, Disabled accounts
 */
export async function fetchActiveSalespeopleAction() {
  if (!isSupabaseConfigured()) {
    return [
      { id: "00000000-0000-0000-0000-000000000002", full_name: "Adhithya", email: "sr.consultant.brand360s@gmail.com", role: "employee" },
      { id: "00000000-0000-0000-0000-000000000003", full_name: "Yogeetha", email: "growth.brand360s@gmail.com", role: "employee" },
      { id: "00000000-0000-0000-0000-000000000004", full_name: "Jayasakthi", email: "consultant.brand360s@gmail.com", role: "employee" },
    ];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active")
    .eq("is_active", true)
    .neq("role", "admin")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error || !data) {
    console.error("Error fetching active salespersons:", error);
    return [];
  }

  return data;
}

/**
 * Fetch existing entity IDs from database for fast duplicate detection
 */
export async function fetchExistingEntityIdsAction() {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data: followups } = await supabase
      .from("follow_ups")
      .select("notes, company_name")
      .limit(10000);

    const ids = [];
    (followups || []).forEach((f) => {
      try {
        if (f.notes && f.notes.startsWith("{")) {
          const parsed = JSON.parse(f.notes);
          if (parsed.entityId) ids.push(parsed.entityId);
        }
      } catch {}
    });
    return ids;
  } catch (err) {
    console.error("Error fetching existing entity IDs:", err);
    return [];
  }
}

/**
 * Read current round-robin sequence pointer from Supabase
 */
async function getRoundRobinPointer(supabase, activeSalespeople) {
  try {
    const { data } = await supabase
      .from("lead_round_robin_state")
      .select("id, last_assigned_salesperson_id, last_assigned_index")
      .eq("id", 1)
      .single();

    if (data && typeof data.last_assigned_index === "number") {
      return data.last_assigned_index;
    }
  } catch (err) {
    console.warn("Could not read lead_round_robin_state, starting at -1:", err.message);
  }
  return -1;
}

/**
 * Update round-robin pointer in Supabase
 */
async function updateRoundRobinPointer(supabase, newIndex, lastSalespersonId) {
  try {
    await supabase
      .from("lead_round_robin_state")
      .upsert({
        id: 1,
        last_assigned_salesperson_id: lastSalespersonId,
        last_assigned_index: newIndex,
        updated_at: new Date().toISOString(),
      });
  } catch (err) {
    console.error("Failed to update lead_round_robin_state:", err.message);
  }
}

/**
 * Preview uploaded Excel or CSV file
 */
export async function previewLeadsFileAction(formData) {
  const file = formData.get("file");
  const sheetName = formData.get("sheetName") ? String(formData.get("sheetName")) : undefined;

  if (!file) {
    return { success: false, error: "No file provided for upload." };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { sheetNames, activeSheetName, headers, rawRows } = parseExcelWorkbook(buffer, sheetName);
    const { totalRawRows, uniqueCompanies, groupedLeads, invalidRows } = groupAndValidateLeads(rawRows);

    // Check duplicate entity IDs and company names against follow_ups and clients
    const supabase = await createClient();
    let existingEntityMap = new Set();
    let existingCompanyMap = new Set();

    try {
      const { data: followups } = await supabase
        .from("follow_ups")
        .select("company_name, notes")
        .limit(10000);

      (followups || []).forEach((f) => {
        if (f.company_name) existingCompanyMap.add(f.company_name.trim().toLowerCase());
        try {
          if (f.notes && f.notes.startsWith("{")) {
            const p = JSON.parse(f.notes);
            if (p.entityId) existingEntityMap.add(p.entityId.trim().toUpperCase());
          }
        } catch {}
      });

      const { data: clients } = await supabase
        .from("clients")
        .select("company_name")
        .limit(10000);

      (clients || []).forEach((c) => {
        if (c.company_name) existingCompanyMap.add(c.company_name.trim().toLowerCase());
      });
    } catch (err) {
      console.warn("Could not query existing records for preview duplicate check:", err.message);
    }

    const previewList = groupedLeads.slice(0, 25).map((lead) => ({
      ...lead,
      isDuplicate:
        (lead.entityId && existingEntityMap.has(lead.entityId.toUpperCase())) ||
        (lead.name && existingCompanyMap.has(lead.name.toLowerCase())),
    }));

    const duplicatesCount = groupedLeads.filter(
      (l) =>
        (l.entityId && existingEntityMap.has(l.entityId.toUpperCase())) ||
        (l.name && existingCompanyMap.has(l.name.toLowerCase()))
    ).length;

    return {
      success: true,
      fileName: file.name,
      sheetNames,
      activeSheetName,
      headers,
      totalRawRows,
      uniqueCompanies,
      duplicatesCount,
      invalidCount: invalidRows.length,
      previewLeads: previewList,
    };
  } catch (err) {
    console.error("Error previewing lead spreadsheet:", err);
    return { success: false, error: err.message || "Failed to parse spreadsheet." };
  }
}

/**
 * Execute Excel/CSV bulk import
 * CRITICAL WORKFLOW: Saves records directly to `follow_ups` table.
 * NEVER writes to `clients` table, keeping Clients and Leads 100% separate.
 */
export async function executeLeadsImportAction(formData) {
  const file = formData.get("file");
  const sheetName = formData.get("sheetName") ? String(formData.get("sheetName")) : undefined;
  const initialFollowupDate = formData.get("initialFollowupDate")
    ? String(formData.get("initialFollowupDate"))
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
      })();
  const initialFollowupType = formData.get("initialFollowupType")
    ? String(formData.get("initialFollowupType"))
    : "Phone Call";

  if (!file) {
    return { success: false, error: "Please select an Excel or CSV file to import." };
  }

  const supabase = await createClient();

  // Get current user profile
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user ? user.id : null;

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { rawRows } = parseExcelWorkbook(buffer, sheetName);
    const { totalRawRows, uniqueCompanies, groupedLeads, invalidRows } = groupAndValidateLeads(rawRows);

    if (groupedLeads.length === 0) {
      return { success: false, error: "No valid company leads found in the uploaded file." };
    }

    // 1. Fetch active salespersons for continuous round robin
    const salespeople = await fetchActiveSalespeopleAction();
    if (salespeople.length === 0) {
      return {
        success: false,
        error: "No active salespersons found in profiles table to assign leads.",
      };
    }

    // 2. Fetch existing entity IDs & company names to detect duplicates
    let existingEntitySet = new Set();
    let existingCompanySet = new Set();

    try {
      const { data: followups } = await supabase
        .from("follow_ups")
        .select("company_name, notes")
        .limit(10000);

      (followups || []).forEach((f) => {
        if (f.company_name) existingCompanySet.add(f.company_name.trim().toLowerCase());
        try {
          if (f.notes && f.notes.startsWith("{")) {
            const p = JSON.parse(f.notes);
            if (p.entityId) existingEntitySet.add(p.entityId.trim().toUpperCase());
          }
        } catch {}
      });

      const { data: existingClients } = await supabase
        .from("clients")
        .select("company_name")
        .limit(10000);

      (existingClients || []).forEach((c) => {
        if (c.company_name) existingCompanySet.add(c.company_name.trim().toLowerCase());
      });
    } catch (err) {
      console.warn("Could not query existing records for duplicate check:", err.message);
    }

    // 3. Continuous round robin pointer
    let pointer = await getRoundRobinPointer(supabase, salespeople);

    const leadsToInsert = [];
    const skippedRecords = [...invalidRows];
    const distributionMap = {};
    salespeople.forEach((sp) => {
      distributionMap[sp.full_name] = 0;
    });

    for (const lead of groupedLeads) {
      const isEntityDup = lead.entityId && existingEntitySet.has(lead.entityId.trim().toUpperCase());
      const isNameDup = lead.name && existingCompanySet.has(lead.name.trim().toLowerCase());

      if (isEntityDup || isNameDup) {
        skippedRecords.push({
          companyName: lead.name,
          entityId: lead.entityId || "(No ID)",
          phone: lead.phone || "-",
          email: lead.email || "-",
          reason: isEntityDup ? `Duplicate Entity ID (${lead.entityId})` : `Company name already exists`,
        });
        continue;
      }

      // Valid unique lead consumes 1 round-robin turn
      pointer = (pointer + 1) % salespeople.length;
      const assignedSp = salespeople[pointer];
      distributionMap[assignedSp.full_name] = (distributionMap[assignedSp.full_name] || 0) + 1;

      // Track into memory sets to prevent intra-file duplicates
      if (lead.entityId) existingEntitySet.add(lead.entityId.trim().toUpperCase());
      if (lead.name) existingCompanySet.add(lead.name.trim().toLowerCase());

      leadsToInsert.push({
        leadData: lead,
        assignedSalespersonId: assignedSp.id,
        assignedSalespersonName: assignedSp.full_name,
      });
    }

    if (leadsToInsert.length === 0) {
      return {
        success: true,
        report: {
          fileName: file.name,
          totalRows: totalRawRows,
          uniqueCompanies,
          leadsCreated: 0,
          duplicatesSkipped: skippedRecords.length - invalidRows.length,
          invalidRows: invalidRows.length,
          followupsCreated: 0,
          salespersonDistribution: distributionMap,
          skippedRecords,
        },
      };
    }

    // 4. Batch insert leads directly into follow_ups table (NEVER clients table)
    let leadsCreatedCount = 0;
    const batchId = crypto.randomUUID();
    const BATCH_SIZE = 50;

    for (let i = 0; i < leadsToInsert.length; i += BATCH_SIZE) {
      const chunk = leadsToInsert.slice(i, i + BATCH_SIZE);
      const payloads = chunk.map((item) => {
        const lead = item.leadData;
        const notesObj = {
          entityId: lead.entityId || null,
          entityType: lead.entityType || null,
          district: lead.district || null,
          roc: lead.roc || null,
          nicCode: lead.nicCode || null,
          nicLabel: lead.nicLabel || null,
          dateOfIncorporation: lead.dateOfIncorporation || null,
          paidUpCapital: lead.paidUpCapital || 0,
          authorizedCapital: lead.authorizedCapital || 0,
          classOfCompany: lead.classOfCompany || null,
          falconStatus: lead.falcon_status || null,
          city: lead.city || null,
          state: lead.state || null,
          address: lead.registeredAddress || null,
          email: lead.email || null,
          directors: lead.directors || [],
          importSource: file.name,
          batchId: batchId,
        };

        return {
          company_name: lead.name,
          contact_person: lead.contactPerson || lead.name,
          phone: lead.phone || "",
          service_interested: lead.nicLabel || lead.entityType || "Company Lead",
          title: `Lead Outreach - ${lead.name}`,
          follow_up_type: initialFollowupType || "Phone Call",
          priority: "Medium",
          status: "Pending",
          due_date: initialFollowupDate,
          last_follow_up: "Imported",
          assigned_to: item.assignedSalespersonId,
          assigned_name: item.assignedSalespersonName,
          notes: JSON.stringify(notesObj),
          created_by: currentUserId,
          converted_client_id: null,
        };
      });

      const { data: insertedFollowups, error: insertErr } = await supabase
        .from("follow_ups")
        .insert(payloads)
        .select("id");

      if (insertErr) {
        console.error("Batch insert into follow_ups failed, falling back row-by-row:", insertErr.message);
        for (const p of payloads) {
          const { error: singleErr } = await supabase.from("follow_ups").insert(p);
          if (!singleErr) {
            leadsCreatedCount++;
          } else {
            skippedRecords.push({
              companyName: p.company_name,
              reason: singleErr.message,
            });
          }
        }
      } else {
        leadsCreatedCount += (insertedFollowups || []).length;
      }
    }

    // 5. Persist continuous round-robin pointer
    const lastAssignedSalespersonId = salespeople[pointer]?.id || null;
    await updateRoundRobinPointer(supabase, pointer, lastAssignedSalespersonId);

    // 6. Store import batch record
    try {
      await supabase.from("lead_import_batches").insert({
        id: batchId,
        file_name: file.name,
        total_rows: totalRawRows,
        unique_companies: uniqueCompanies,
        leads_created: leadsCreatedCount,
        duplicates_skipped: skippedRecords.length - invalidRows.length,
        invalid_rows: invalidRows.length,
        followups_created: leadsCreatedCount,
        salesperson_distribution: distributionMap,
        failed_records: skippedRecords,
        imported_by: currentUserId,
      });
    } catch {
      // Ignore if table not yet created
    }

    revalidatePath("/follow-ups");
    revalidatePath("/clients");

    return {
      success: true,
      report: {
        fileName: file.name,
        totalRows: totalRawRows,
        uniqueCompanies,
        leadsCreated: leadsCreatedCount,
        duplicatesSkipped: skippedRecords.length - invalidRows.length,
        invalidRows: invalidRows.length,
        followupsCreated: leadsCreatedCount,
        salespersonDistribution: distributionMap,
        skippedRecords,
      },
    };
  } catch (err) {
    console.error("Error executing leads import:", err);
    return { success: false, error: err.message || "Failed to process bulk import." };
  }
}

/**
 * Fetch all unconverted leads for Follow-ups page
 * Queries `follow_ups` table directly where converted_client_id IS NULL
 */
export async function fetchUnconvertedLeadsAction() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();

  let allRows = [];
  let from = 0;
  const chunkSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("follow_ups")
      .select(`
        id,
        company_name,
        contact_person,
        phone,
        service_interested,
        title,
        follow_up_type,
        priority,
        status,
        due_date,
        due_time,
        last_follow_up,
        assigned_to,
        assigned_name,
        notes,
        created_at,
        converted_client_id
      `)
      .is("converted_client_id", null)
      .neq("status", "Converted to Client")
      .order("created_at", { ascending: false })
      .range(from, from + chunkSize - 1);

    if (error) {
      console.error("Error fetching unconverted leads chunk at", from, error);
      break;
    }
    if (!data || data.length === 0) break;

    allRows.push(...data);
    if (data.length < chunkSize) break;
    from += chunkSize;
  }

  return allRows.map((item) => {
    let parsedNotes = {};
    try {
      if (item.notes && item.notes.startsWith("{")) {
        parsedNotes = JSON.parse(item.notes);
      }
    } catch {
      parsedNotes = {};
    }

    const hasActivityLogged =
      (item.last_follow_up !== "Imported" &&
        item.last_follow_up !== null &&
        item.last_follow_up !== undefined &&
        item.last_follow_up !== "New") ||
      (Array.isArray(parsedNotes.history) && parsedNotes.history.length > 0);

    return {
      id: item.id,
      companyName: item.company_name,
      contactPerson: item.contact_person,
      email: parsedNotes.email || "-",
      phone: item.phone || "-",
      city: parsedNotes.city || "-",
      state: parsedNotes.state || "-",
      address: parsedNotes.address || "-",
      entityId: parsedNotes.entityId || null,
      entityType: parsedNotes.entityType || "-",
      district: parsedNotes.district || "-",
      roc: parsedNotes.roc || "-",
      nicCode: parsedNotes.nicCode || "-",
      nicLabel: parsedNotes.nicLabel || item.service_interested || "-",
      dateOfIncorporation: parsedNotes.dateOfIncorporation || null,
      paidUpCapital: parsedNotes.paidUpCapital || 0,
      authorizedCapital: parsedNotes.authorizedCapital || 0,
      classOfCompany: parsedNotes.classOfCompany || "-",
      falconStatus: parsedNotes.falconStatus || "-",
      directors: Array.isArray(parsedNotes.directors) ? parsedNotes.directors : [],
      leadStatus: item.status || "New",
      leadSource: parsedNotes.importSource || "Excel Import",
      assignedSalespersonId: item.assigned_to,
      assignedSalespersonName: item.assigned_name || "Unassigned",
      createdAt: item.created_at,
      nextFollowupDate: item.due_date,
      nextFollowupType: item.follow_up_type,
      nextFollowupStatus: item.status,
      lastFollowUp: item.last_follow_up || "-",
      hasActivityLogged,
      totalFollowups: 1,
      allFollowups: [
        {
          id: item.id,
          title: item.title,
          follow_up_type: item.follow_up_type,
          due_date: item.due_date,
          status: item.status,
          created_at: item.created_at,
        },
      ],
    };
  });
}

/**
 * Manual Lead-to-Client Conversion
 * Converts a lead record from `follow_ups` table into an Active client in `clients` table.
 */
export async function convertLeadToClientAction(leadFollowupId, completionData = {}) {
  if (!leadFollowupId) {
    return { success: false, error: "Lead ID is required for conversion." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user ? user.id : null;

  try {
    // 1. Fetch the lead from follow_ups
    const { data: leadRecord, error: fetchErr } = await supabase
      .from("follow_ups")
      .select("*")
      .eq("id", leadFollowupId)
      .single();

    if (fetchErr || !leadRecord) {
      return { success: false, error: "Lead record not found in follow-ups." };
    }

    let parsedNotes = {};
    try {
      if (leadRecord.notes && leadRecord.notes.startsWith("{")) {
        parsedNotes = JSON.parse(leadRecord.notes);
      }
    } catch {}

    // 2. Insert into clients table as an Active client
    const clientPayload = {
      company_name: completionData.companyName || leadRecord.company_name,
      company_type: completionData.companyType || parsedNotes.entityType || "Private Limited (Pvt Ltd)",
      contact_person: completionData.contactPerson || leadRecord.contact_person,
      email: completionData.email || parsedNotes.email || null,
      phone: completionData.phone || leadRecord.phone || "+91 0000000000",
      address: completionData.address || parsedNotes.address || parsedNotes.city || "Not provided",
      city: completionData.city || parsedNotes.city || "Not specified",
      state: completionData.state || parsedNotes.state || "Tamil Nadu",
      pincode: completionData.pincode || "600001",
      country: "India",
      client_status: "Active",
      assigned_salesperson: completionData.assignedSalespersonId || leadRecord.assigned_to,
      additional_contacts: parsedNotes.directors || [],
      created_by: currentUserId,
      notes: `Converted from lead. Entity ID: ${parsedNotes.entityId || "-"}. ROC: ${parsedNotes.roc || "-"}.`,
    };

    if (completionData.gstNumber) clientPayload.gst_number = completionData.gstNumber;
    if (completionData.panNumber) clientPayload.pan_number = completionData.panNumber;

    const { data: newClient, error: clientInsertErr } = await supabase
      .from("clients")
      .insert(clientPayload)
      .select("id")
      .single();

    if (clientInsertErr || !newClient) {
      return { success: false, error: `Failed to create client record: ${clientInsertErr?.message}` };
    }

    // 3. Mark the follow-up record as converted with reference to the new client
    const { error: updateErr } = await supabase
      .from("follow_ups")
      .update({
        status: "Converted to Client",
        converted_client_id: newClient.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadFollowupId);

    if (updateErr) {
      console.warn("Could not update follow-up conversion status:", updateErr.message);
    }

    revalidatePath("/clients");
    revalidatePath("/follow-ups");

    return {
      success: true,
      clientId: newClient.id,
      companyName: clientPayload.company_name,
    };
  } catch (err) {
    console.error("Error converting lead to client:", err);
    return { success: false, error: err.message || "Failed to convert lead to client." };
  }
}

/**
 * Update follow-up activity / call outcome
 */
export async function updateLeadFollowupActivityAction(payload) {
  const { leadId } = payload || {};
  if (!leadId) {
    return { success: false, error: "Lead ID required." };
  }

  const finalOutcome = payload.outcome || payload.callOutcome || "Contacted";
  const finalNotes = payload.notes || "";
  const finalNextDate = payload.nextDate || payload.nextDueDate;
  const finalNextType = payload.nextType || payload.nextDueType;
  const finalLeadStatus = payload.leadStatus || "In Progress";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const updateData = {
      last_follow_up: finalOutcome,
      status: finalLeadStatus,
      updated_at: new Date().toISOString(),
    };
    if (finalNextDate) updateData.due_date = finalNextDate;
    if (finalNextType) updateData.follow_up_type = finalNextType;

    const { data: existing } = await supabase
      .from("follow_ups")
      .select("notes, status")
      .eq("id", leadId)
      .single();

    if (existing) {
      try {
        let parsed = existing.notes && existing.notes.startsWith("{") ? JSON.parse(existing.notes) : {};
        parsed.history = parsed.history || [];
        parsed.history.push({
          date: new Date().toISOString(),
          outcome: finalOutcome,
          notes: finalNotes,
          nextDate: finalNextDate || null,
          recordedBy: user ? user.email : "Agent",
        });
        updateData.notes = JSON.stringify(parsed);
      } catch {}
    }

    await supabase.from("follow_ups").update(updateData).eq("id", leadId);

    revalidatePath("/follow-ups");
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || "Failed to record follow-up activity." };
  }
}

/**
 * Download skipped records as Excel buffer
 */
export async function downloadSkippedRecordsBufferAction(skippedRecords) {
  try {
    const buffer = generateSkippedReportBuffer(skippedRecords);
    return {
      success: true,
      base64: buffer.toString("base64"),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
