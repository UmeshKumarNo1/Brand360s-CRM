export type NotificationType =
  | "payment_received"
  | "payment_due"
  | "payment_overdue"
  | "invoice_created"
  | "invoice_overdue"
  | "renewal_due"
  | "renewal_overdue"
  | "renewal_completed"
  | "followup_due"
  | "followup_overdue"
  | "installment_due"
  | "installment_overdue"
  | "client_created"
  | "client_updated"
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

