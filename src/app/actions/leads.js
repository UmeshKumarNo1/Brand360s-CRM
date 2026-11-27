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

    // Check duplicate entity IDs against database
    const supabase = await createClient();
    const entityIds = groupedLeads.map((l) => l.entityId).filter(Boolean);

    let existingEntityMap = new Set();
    if (entityIds.length > 0) {
      const { data: matchedClients } = await supabase
        .from("clients")
        .select("entity_id, company_name")
        .in("entity_id", entityIds);

      if (matchedClients) {
        matchedClients.forEach((c) => {
          if (c.entity_id) existingEntityMap.add(c.entity_id.toUpperCase());
        });
      }
    }

    const previewList = groupedLeads.slice(0, 25).map((lead) => ({
      ...lead,
      isDuplicate: lead.entityId ? existingEntityMap.has(lead.entityId.toUpperCase()) : false,
    }));

    const duplicatesCount = groupedLeads.filter((l) =>
      l.entityId ? existingEntityMap.has(l.entityId.toUpperCase()) : false
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
    : "Call";

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

    // 1. Fetch active salespersons for round robin
    const salespeople = await fetchActiveSalespeopleAction();
    if (salespeople.length === 0) {
      return {
        success: false,
        error: "No active salespersons found in profiles table to assign leads.",
      };
    }

    // 2. Fetch existing entity IDs & company names to detect duplicates
    const allEntityIds = groupedLeads.map((l) => l.entityId).filter(Boolean);
    let existingEntitySet = new Set();
    let existingCompanySet = new Set();

    if (allEntityIds.length > 0) {
      const { data: existingLeads } = await supabase
        .from("clients")
        .select("entity_id, company_name")
        .or(`entity_id.in.(${allEntityIds.map((id) => `"${id}"`).join(",")})`);

      if (existingLeads) {
        existingLeads.forEach((c) => {
          if (c.entity_id) existingEntitySet.add(c.entity_id.trim().toUpperCase());
          if (c.company_name) existingCompanySet.add(c.company_name.trim().toLowerCase());
        });
      }
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

    // 4. Insert leads into clients table
    let leadsCreatedCount = 0;
    let followupsCreatedCount = 0;
    const batchId = crypto.randomUUID();

    for (const item of leadsToInsert) {
      const lead = item.leadData;

      // Build payload supporting both dedicated columns and JSONB fallback
      const insertPayload = {
        company_name: lead.name,
        company_type: lead.entityType || "Private Limited (Pvt Ltd)",
        contact_person: lead.contactPerson || lead.name,
        email: lead.email || null,
        phone: lead.phone || "+91 0000000000",
        address: lead.registeredAddress || lead.city || "Not provided",
        city: lead.city || "Not specified",
        state: lead.state || "Tamil Nadu",
        pincode: "600001",
        country: "India",
        assigned_salesperson: item.assignedSalespersonId,
        client_status: "Lead",
        is_lead: true,
        lead_status: "New",
        lead_source: "Excel Import",
        entity_id: lead.entityId || null,
        entity_type: lead.entityType || null,
        district: lead.district || null,
        roc: lead.roc || null,
        nic_code: lead.nicCode || null,
        nic_label: lead.nicLabel || null,
        date_of_incorporation: lead.dateOfIncorporation || null,
        paid_up_capital: lead.paidUpCapital || 0,
        authorized_capital: lead.authorizedCapital || 0,
        class_of_company: lead.classOfCompany || null,
        falcon_status: lead.falcon_status || null,
        directors: lead.directors || [],
        additional_contacts: lead.directors || [],
        import_batch_id: batchId,
        created_by: currentUserId,
        notes: `Imported from ${file.name}. ROC: ${lead.roc || "-"}, NIC: ${lead.nicLabel || "-"}.`,
      };

      let insertedId = null;
      const { data: insertedClient, error: insertErr } = await supabase
        .from("clients")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertErr) {
        // Fallback without new columns if migration hasn't been executed
        console.warn("Insert with new columns failed, falling back to basic columns:", insertErr.message);
        const fallbackPayload = {
          company_name: lead.name,
          company_type: lead.entityType || "Private Limited (Pvt Ltd)",
          contact_person: lead.contactPerson || lead.name,
          email: lead.email || null,
          phone: lead.phone || "+91 0000000000",
          address: lead.registeredAddress || lead.city || "Not provided",
          city: lead.city || "Not specified",
          state: lead.state || "Tamil Nadu",
          pincode: "600001",
          country: "India",
          assigned_salesperson: item.assignedSalespersonId,
          client_status: "Pending Onboarding",
          additional_contacts: lead.directors || [],
          created_by: currentUserId,
          notes: `[LEAD: ${lead.entityId || "NoID"}] Imported from ${file.name}. Directors: ${lead.directors.length}`,
        };

        const { data: fallbackClient, error: fbErr } = await supabase
          .from("clients")
          .insert(fallbackPayload)
          .select("id")
          .single();

        if (fbErr || !fallbackClient) {
          skippedRecords.push({
            companyName: lead.name,
            entityId: lead.entityId,
            reason: `Database insert failed: ${fbErr?.message || insertErr.message}`,
          });
          continue;
        }
        insertedId = fallbackClient.id;
      } else {
        insertedId = insertedClient.id;
      }

      leadsCreatedCount++;

      // 5. Automatically create Initial Follow-up for the assigned salesperson
      if (insertedId) {
        const { error: fErr } = await supabase.from("follow_ups").insert({
          client_id: insertedId,
          assigned_to: item.assignedSalespersonId,
          title: `Initial Contact - ${lead.name}`,
          follow_up_type: initialFollowupType || "Call",
          due_date: initialFollowupDate,
          priority: "Medium",
          status: "Pending",
          contact_person: lead.contactPerson || lead.name,
          contact_method: "Phone",
          created_by: currentUserId,
          notes: `Lead imported from ${file.name} (Entity ID: ${lead.entityId || "-"}). Initial outreach assigned via Round-Robin.`,
        });

        if (!fErr) {
          followupsCreatedCount++;
        } else {
          console.error("Failed to create initial follow-up:", fErr.message);
        }
      }
    }

    // 6. Persist continuous round-robin pointer
    const lastAssignedSalespersonId = salespeople[pointer]?.id || null;
    await updateRoundRobinPointer(supabase, pointer, lastAssignedSalespersonId);

    // 7. Store import batch record
    try {
      await supabase.from("lead_import_batches").insert({
        id: batchId,
        file_name: file.name,
        total_rows: totalRawRows,
        unique_companies: uniqueCompanies,
        leads_created: leadsCreatedCount,
        duplicates_skipped: skippedRecords.length - invalidRows.length,
        invalid_rows: invalidRows.length,
        followups_created: followupsCreatedCount,
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
        followupsCreated: followupsCreatedCount,
        salespersonDistribution: distributionMap,
        skippedRecords,
      },
    };
  } catch (err) {
    console.error("Critical error executing lead import:", err);
    return { success: false, error: err.message || "Failed to process lead import." };
  }
}

/**
 * Fetch unconverted leads for Follow-ups page
 */
export async function fetchUnconvertedLeadsAction() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from("clients")
    .select(`
      id,
      client_code,
      company_name,
      contact_person,
      email,
      phone,
      city,
      state,
      address,
      assigned_salesperson,
      client_status,
      is_lead,
      lead_status,
      lead_source,
      entity_id,
      entity_type,
      district,
      roc,
      nic_code,
      nic_label,
      date_of_incorporation,
      paid_up_capital,
      authorized_capital,
      class_of_company,
      falcon_status,
      directors,
      created_at,
      assigned_profile:profiles!assigned_salesperson (id, full_name, email),
      follow_ups (
        id,
        title,
        follow_up_type,
        due_date,
        due_time,
        priority,
        status,
        notes,
        created_at
      )
    `)
    .or("is_lead.eq.true,client_status.eq.Lead,notes.ilike.%[LEAD:%")
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error || !data) {
    console.error("Error fetching unconverted leads:", error);
    return [];
  }

  return data.map((lead) => {
    const followups = lead.follow_ups || [];
    const pendingFollowups = followups
      .filter((f) => f.status === "Pending" || f.status === "In Progress")
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    const nextFollowup = pendingFollowups[0] || null;

    return {
      id: lead.id,
      clientCode: lead.client_code,
      companyName: lead.company_name,
      contactPerson: lead.contact_person,
      email: lead.email || "-",
      phone: lead.phone || "-",
      city: lead.city || "-",
      state: lead.state || "-",
      address: lead.address || "-",
      entityId: lead.entity_id || null,
      entityType: lead.entity_type || "-",
      district: lead.district || "-",
      roc: lead.roc || "-",
      nicCode: lead.nic_code || "-",
      nicLabel: lead.nic_label || "-",
      dateOfIncorporation: lead.date_of_incorporation || null,
      paidUpCapital: lead.paid_up_capital || 0,
      authorizedCapital: lead.authorized_capital || 0,
      classOfCompany: lead.class_of_company || "-",
      falconStatus: lead.falcon_status || "-",
      directors: Array.isArray(lead.directors) ? lead.directors : [],
      leadStatus: lead.lead_status || "New",
      leadSource: lead.lead_source || "Excel Import",
      assignedSalespersonId: lead.assigned_salesperson,
      assignedSalespersonName: lead.assigned_profile?.full_name || "Unassigned",
      createdAt: lead.created_at,
      nextFollowupDate: nextFollowup ? nextFollowup.due_date : null,
      nextFollowupType: nextFollowup ? nextFollowup.follow_up_type : null,
      nextFollowupStatus: nextFollowup ? nextFollowup.status : null,
      totalFollowups: followups.length,
      allFollowups: followups,
    };
  });
}

/**
 * Manual Lead-to-Client Conversion
 */
export async function convertLeadToClientAction(leadId, completionData) {
  if (!leadId) {
    return { success: false, error: "Lead ID is required for conversion." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user ? user.id : null;

  try {
    const updatePayload = {
      is_lead: false,
      lead_status: "Converted",
      client_status: "Active",
      converted_at: new Date().toISOString(),
      converted_by: currentUserId,
      updated_at: new Date().toISOString(),
    };

    if (completionData) {
      if (completionData.companyName) updatePayload.company_name = completionData.companyName.trim();
      if (completionData.contactPerson) updatePayload.contact_person = completionData.contactPerson.trim();
      if (completionData.phone) updatePayload.phone = completionData.phone.trim();
      if (completionData.email) updatePayload.email = completionData.email.trim();
      if (completionData.address) updatePayload.address = completionData.address.trim();
      if (completionData.city) updatePayload.city = completionData.city.trim();
      if (completionData.state) updatePayload.state = completionData.state.trim();
      if (completionData.pincode) updatePayload.pincode = completionData.pincode.trim();
      if (completionData.gstNumber) updatePayload.gst_number = completionData.gstNumber.trim();
      if (completionData.panNumber) updatePayload.pan_number = completionData.panNumber.trim();
    }

    const { error: updErr } = await supabase
      .from("clients")
      .update(updatePayload)
      .eq("id", leadId);

    if (updErr) {
      // Fallback update without new columns
      console.warn("Update with new columns failed, attempting fallback:", updErr.message);
      const fallbackPayload = {
        client_status: "Active",
        updated_at: new Date().toISOString(),
      };
      if (completionData?.address) fallbackPayload.address = completionData.address;
      if (completionData?.pincode) fallbackPayload.pincode = completionData.pincode;

      const { error: fbErr } = await supabase
        .from("clients")
        .update(fallbackPayload)
        .eq("id", leadId);

      if (fbErr) {
        return { success: false, error: fbErr.message };
      }
    }

    // Add conversion record to follow-up history
    await supabase.from("follow_ups").insert({
      client_id: leadId,
      assigned_to: currentUserId || "00000000-0000-0000-0000-000000000001",
      title: "Lead Converted to Client",
      follow_up_type: "General",
      due_date: new Date().toISOString().split("T")[0],
      priority: "High",
      status: "Completed",
      completed_at: new Date().toISOString(),
      completed_by: currentUserId,
      completion_notes: "Successfully converted from Lead to full Active Client.",
      notes: "Lead conversion finalized. Now accessible from the Clients portfolio.",
    });

    revalidatePath("/clients");
    revalidatePath("/follow-ups");

    return { success: true };
  } catch (err) {
    console.error("Error converting lead to client:", err);
    return { success: false, error: err.message || "Failed to convert lead." };
  }
}

/**
 * Log call outcome, update lead status, or schedule next follow-up
 */
export async function updateLeadFollowupActivityAction(payload) {
  const { leadId, leadStatus, callOutcome, notes, nextDueDate, nextDueType } = payload;
  if (!leadId) {
    return { success: false, error: "Lead ID required." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    // 1. Update lead status if changed
    if (leadStatus) {
      await supabase
        .from("clients")
        .update({ lead_status: leadStatus, updated_at: new Date().toISOString() })
        .eq("id", leadId);
    }

    // 2. Complete previous open follow-up or add activity record
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("follow_ups").insert({
      client_id: leadId,
      assigned_to: user ? user.id : "00000000-0000-0000-0000-000000000001",
      title: callOutcome ? `Call Outcome: ${callOutcome}` : "Follow-up Log",
      follow_up_type: "Call",
      due_date: today,
      priority: "Medium",
      status: "Completed",
      completed_at: new Date().toISOString(),
      completed_by: user ? user.id : null,
      completion_notes: notes || "Call completed with lead.",
      notes: notes,
    });

    // 3. Schedule next follow-up if requested
    if (nextDueDate) {
      await supabase.from("follow_ups").insert({
        client_id: leadId,
        assigned_to: user ? user.id : "00000000-0000-0000-0000-000000000001",
        title: `Next Follow-up - ${nextDueType || "Call"}`,
        follow_up_type: nextDueType || "Call",
        due_date: nextDueDate,
        priority: "Medium",
        status: "Pending",
        notes: `Scheduled next contact. Outcome of prior call: ${callOutcome || "-"}`,
      });
    }

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


