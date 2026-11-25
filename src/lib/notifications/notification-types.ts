export type NotificationType =
  | "payment_received"
  | "payment_due"
  | "payment_overdue"
  | "invoice_created"
  | "invoice_updated"
  | "invoice_overdue"
  | "renewal_due"
  | "renewal_overdue"
  | "renewal_completed"
  | "renewal_generated"
  | "renewal_confirmed"
  | "followup_due"
  | "followup_overdue"
  | "followup_created"
  | "followup_completed"
  | "installment_due"
  | "installment_overdue"
  | "service_deadline_today"
  | "service_deadline_upcoming"
  | "service_deadline_overdue"
  | "service_assigned"
  | "service_updated"
  | "service_completed"
  | "client_created"
  | "client_updated"
  | "client_reassigned"
  | "document_uploaded"
  | "system_alert";

export type NotificationCategory = "alert" | "update";

export interface NotificationItem {
  id: string;
  recipient_id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  entity_type?: string | null;
  entity_id?: string | null;
  action_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface CreateNotificationParams {
  recipient_id: string;
  title: string;
  message: string;
  type: NotificationType;
  category?: NotificationCategory;
  entity_type?: string;
  entity_id?: string;
  action_url?: string;
}

