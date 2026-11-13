"use server";

import { createClient } from "@/lib/supabase/server";
import {
  normalizeCompanyName,
  normalizeEmail,
  normalizePhone,
  DuplicateCheckResult,
  DuplicateMatch,
} from "@/lib/validation/duplicate-detector";

export interface CheckClientDuplicatesParams {
  companyName: string;
  tradeName?: string | null;
  email?: string | null;
  phone?: string | null;
  excludeClientId?: string; // used when editing
}

/**
 * Checks existing clients (both Active and Archived) for duplicates by email, phone, and normalized company name.
 * Uses service role or user client. Accessible to authenticated users.
 */
export async function checkClientDuplicatesAction(
  params: CheckClientDuplicatesParams
): Promise<DuplicateCheckResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      hasMatches: false,
      hasExactEmailMatch: false,
      activeEmailMatch: false,
      matches: [],
    };
  }

  const targetEmail = normalizeEmail(params.email || "");
  const targetPhone = normalizePhone(params.phone || "");
  const targetNormCompany = normalizeCompanyName(params.companyName || "");
  const targetNormTrade = normalizeCompanyName(params.tradeName || "");

  if (!targetEmail && !targetPhone && !targetNormCompany && !targetNormTrade) {
    return {
      hasMatches: false,
      hasExactEmailMatch: false,
      activeEmailMatch: false,
      matches: [],
    };
  }

  // 1. Try secure database function check_client_duplicate_conflicts first
  try {
    const { data: rpcMatches, error: rpcError } = await supabase.rpc(
      "check_client_duplicate_conflicts",
      {
        p_company_name: params.companyName || "",
        p_trade_name: params.tradeName || null,
        p_email: targetEmail || null,
        p_phone: targetPhone || null,
        p_exclude_id: params.excludeClientId || null,
      }
    );

    if (!rpcError && Array.isArray(rpcMatches) && rpcMatches.length > 0) {
      const matchMap = new Map<string, DuplicateMatch>();

      for (const m of rpcMatches) {
        const existing = matchMap.get(m.id);
        const reason = (m.match_reason || "companyName") as "email" | "phone" | "companyName";
        if (existing) {
          if (!existing.matchReasons.includes(reason)) {
            existing.matchReasons.push(reason);
          }
        } else {
          matchMap.set(m.id, {
            id: m.id,
            clientCode: m.client_code,
            companyName: m.company_name,
            contactPerson: m.contact_person,
            email: m.email,
            phone: m.phone,
            clientStatus: m.client_status,
            contractValue: Number(m.contract_value) || 0,
            assignedSalespersonName: m.assigned_salesperson_name || "Unassigned",
            matchReasons: [reason],
          });
        }
      }

      const matches = Array.from(matchMap.values());
      const activeEmailMatch = matches.some(
        (m) => m.clientStatus !== "Archived" && targetEmail && normalizeEmail(m.email) === targetEmail
      );
      const hasExactEmailMatch = matches.some(
        (m) => targetEmail && normalizeEmail(m.email) === targetEmail
      );

      return {
        hasMatches: matches.length > 0,
        hasExactEmailMatch,
        activeEmailMatch,
        matches,
      };
    }
  } catch {
    // Fall back to table query below if migration 015 function is not yet deployed
  }

  // 2. Direct table query fallback
  let query = supabase
    .from("clients")
    .select(`
      id,
      client_code,
      company_name,
      trade_name,
      contact_person,
      email,
      phone,
      client_status,
      contract_value,
      assigned_profile:profiles!assigned_salesperson(full_name)
    `);

  if (params.excludeClientId) {
    query = query.neq("id", params.excludeClientId);
  }

  const { data: clients, error } = await query;

  if (error || !clients) {
    console.error("Error checking client duplicates:", error);
    return {
      hasMatches: false,
      hasExactEmailMatch: false,
      activeEmailMatch: false,
      matches: [],
    };
  }

  const matches: DuplicateMatch[] = [];
  let hasExactEmailMatch = false;
  let activeEmailMatch = false;

  for (const c of clients) {
    const reasons: ("email" | "phone" | "companyName")[] = [];

    // 1. Email check (Case-insensitive)
    if (targetEmail && c.email && normalizeEmail(c.email) === targetEmail) {
      reasons.push("email");
      hasExactEmailMatch = true;
      if (c.client_status !== "Archived") {
        activeEmailMatch = true;
      }
    }

    // 2. Phone check (Normalized comparison)
    if (targetPhone && c.phone && normalizePhone(c.phone) === targetPhone) {
      reasons.push("phone");
    }

    // 3. Normalized Company Name / Trade Name check
    const clientNormCompany = normalizeCompanyName(c.company_name);
    const clientNormTrade = normalizeCompanyName(c.trade_name || "");

    const companyMatches =
      (targetNormCompany && clientNormCompany === targetNormCompany) ||
      (targetNormCompany && clientNormTrade === targetNormCompany) ||
      (targetNormTrade && clientNormCompany === targetNormTrade);

    if (companyMatches) {
      reasons.push("companyName");
    }

    if (reasons.length > 0) {
      matches.push({
        id: c.id,
        clientCode: c.client_code,
        companyName: c.company_name,
        contactPerson: c.contact_person,
        email: c.email,
        phone: c.phone,
        clientStatus: c.client_status,
        contractValue: Number(c.contract_value) || 0,
        assignedSalespersonName: (c.assigned_profile as any)?.full_name || "Unassigned",
        matchReasons: reasons,
      });
    }
  }

  return {
    hasMatches: matches.length > 0,
    hasExactEmailMatch,
    activeEmailMatch,
    matches,
  };
}

export interface DuplicateGroup {
  reason: "email" | "phone" | "companyName";
  value: string;
  clients: {
    id: string;
    clientCode: string;
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    clientStatus: string;
    contractValue: number;
    createdAt: string;
    assignedSalespersonName?: string;
  }[];
}

/**
 * Admin utility: Scans all existing clients in the database to detect duplicate sets.
 */
export async function scanDatabaseDuplicatesAction(): Promise<{
  totalClients: number;
  duplicateGroupCount: number;
  groups: DuplicateGroup[];
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { totalClients: 0, duplicateGroupCount: 0, groups: [] };
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new Error("Unauthorized: Only admins can scan duplicates.");
  }

  const { data: allClients, error } = await supabase
    .from("clients")
    .select(`
      id,
      client_code,
      company_name,
      contact_person,
      email,
      phone,
      client_status,
      contract_value,
      created_at,
      assigned_profile:profiles!assigned_salesperson(full_name)
    `)
    .order("created_at", { ascending: false });

  if (error || !allClients) {
    return { totalClients: 0, duplicateGroupCount: 0, groups: [] };
  }

  // Group by email, phone, and normalized company name
  const emailMap = new Map<string, any[]>();
  const phoneMap = new Map<string, any[]>();
  const companyMap = new Map<string, any[]>();

  for (const c of allClients) {
    const formatted = {
      id: c.id,
      clientCode: c.client_code,
      companyName: c.company_name,
      contactPerson: c.contact_person,
      email: c.email,
      phone: c.phone,
      clientStatus: c.client_status,
      contractValue: Number(c.contract_value) || 0,
      createdAt: c.created_at,
      assignedSalespersonName: (c.assigned_profile as any)?.full_name || "Unassigned",
    };

    const e = normalizeEmail(c.email);
    if (e) {
      if (!emailMap.has(e)) emailMap.set(e, []);
      emailMap.get(e)!.push(formatted);
    }

    const p = normalizePhone(c.phone);
    if (p) {
      if (!phoneMap.has(p)) phoneMap.set(p, []);
      phoneMap.get(p)!.push(formatted);
    }

    const cn = normalizeCompanyName(c.company_name);
    if (cn) {
      if (!companyMap.has(cn)) companyMap.set(cn, []);
      companyMap.get(cn)!.push(formatted);
    }
  }

  const groups: DuplicateGroup[] = [];

  // Add duplicate email groups
  for (const [email, list] of emailMap.entries()) {
    if (list.length > 1) {
      groups.push({
        reason: "email",
        value: email,
        clients: list,
      });
    }
  }

  // Add duplicate phone groups
  for (const [phone, list] of phoneMap.entries()) {
    if (list.length > 1) {
      // Check if already covered identically
      groups.push({
        reason: "phone",
        value: phone,
        clients: list,
      });
    }
  }

  // Add duplicate company groups
  for (const [comp, list] of companyMap.entries()) {
    if (list.length > 1) {
      groups.push({
        reason: "companyName",
        value: list[0].companyName,
        clients: list,
      });
    }
  }

  return {
    totalClients: allClients.length,
    duplicateGroupCount: groups.length,
    groups,
  };
}

