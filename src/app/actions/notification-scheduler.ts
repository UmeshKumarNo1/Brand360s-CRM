"use server";

import { createClient } from "@/lib/supabase/server";
import { createNotification, notifyAdmins } from "@/lib/notifications/notification-service";

/**
 * Scheduled check for approaching & overdue deadlines:
 * - Invoices due soon (within 3 days) or overdue
 * - Renewals due soon (within 7 or 30 days) or overdue
 * - Follow-ups due today or overdue
 * - Installments due soon or overdue
 * 
 * Can be triggered via Cron endpoint or nightly schedule.
 */
export async function runScheduledNotificationsCheck(): Promise<{ generatedCount: number }> {
  const supabase = await createClient();
  let count = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  // 1. Check Follow-ups due today or overdue
  const { data: followups } = await supabase
    .from("follow_ups")
    .select("id, client_id, title, due_date, status, assigned_to, client:clients!client_id(company_name)")
    .neq("status", "completed")
    .lte("due_date", todayStr);

  if (followups) {
    for (const f of followups) {
      const isOverdue = f.due_date < todayStr;
      const clientName = (f.client as any)?.company_name || "Client";
      const recipient = f.assigned_to;
      if (recipient) {
        const created = await createNotification({
          recipient_id: recipient,
          title: isOverdue ? `Overdue Follow-up: ${clientName}` : `Follow-up Due Today: ${clientName}`,
          message: `${f.title} is ${isOverdue ? "past its due date" : "scheduled for today"}.`,
          type: isOverdue ? "followup_overdue" : "followup_due",
          category: isOverdue ? "alert" : "update",
          entity_type: "follow_ups",
          entity_id: f.id,
          action_url: "/follow-ups",
        });
        if (created) count++;
      }
    }
  }

  // 2. Check Overdue Invoices
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, client_id, due_date, status, balance_due, client:clients!client_id(company_name, assigned_salesperson)")
    .in("status", ["Unpaid", "Partially Paid", "Sent"])
    .lt("due_date", todayStr);

  if (invoices) {
    for (const inv of invoices) {
      const client = inv.client as any;
      const recipient = client?.assigned_salesperson;
      const clientName = client?.company_name || "Client";

      if (recipient) {
        const created = await createNotification({
          recipient_id: recipient,
          title: `Overdue Invoice: ${inv.invoice_number}`,
          message: `Invoice for ${clientName} is overdue. Balance remaining: ₹${inv.balance_due}.`,
          type: "invoice_overdue",
          category: "alert",
          entity_type: "invoices",
          entity_id: inv.id,
          action_url: "/payments",
        });
        if (created) count++;
      }
    }
  }

  // 3. Check Renewals due within 30 days or overdue
  const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const { data: renewals } = await supabase
    .from("client_services")
    .select("id, client_id, service_name, expected_completion_date, renewal_date, client:clients!client_id(company_name, assigned_salesperson)")
    .neq("renewal_status", "Renewed")
    .lte("renewal_date", thirtyDaysAhead);

  if (renewals) {
    for (const r of renewals) {
      const targetDate = r.renewal_date || r.expected_completion_date;
      if (!targetDate) continue;

      const isOverdue = targetDate < todayStr;
      const client = r.client as any;
      const recipient = client?.assigned_salesperson;
      const clientName = client?.company_name || "Client";

      if (recipient) {
        const created = await createNotification({
          recipient_id: recipient,
          title: isOverdue ? `Overdue Renewal: ${r.service_name}` : `Upcoming Renewal: ${r.service_name}`,
          message: `Subscription for ${clientName} is ${isOverdue ? "expired and overdue" : `due on ${targetDate}`}.`,
          type: isOverdue ? "renewal_overdue" : "renewal_due",
          category: isOverdue ? "alert" : "update",
          entity_type: "client_services",
          entity_id: r.id,
          action_url: "/renewals",
        });
        if (created) count++;
      }
    }
  }

  // 4. Check Installments due or overdue
  const { data: installments } = await supabase
    .from("installment_schedules")
    .select("id, title, due_date, status, remaining_amount, client:clients!client_id(company_name, assigned_salesperson)")
    .neq("status", "Paid")
    .lte("due_date", todayStr);

  if (installments) {
    for (const inst of installments) {
      const isOverdue = inst.due_date < todayStr;
      const client = inst.client as any;
      const recipient = client?.assigned_salesperson;
      const clientName = client?.company_name || "Client";

      if (recipient) {
        const created = await createNotification({
          recipient_id: recipient,
          title: isOverdue ? `Overdue Installment: ${inst.title}` : `Installment Due: ${inst.title}`,
          message: `Milestone payment for ${clientName} of ₹${inst.remaining_amount} is ${isOverdue ? "overdue" : "due today"}.`,
          type: isOverdue ? "installment_overdue" : "installment_due",
          category: isOverdue ? "alert" : "update",
          entity_type: "installment_schedules",
          entity_id: inst.id,
          action_url: "/payments",
        });
        if (created) count++;
      }
    }
  }

  return { generatedCount: count };
}

