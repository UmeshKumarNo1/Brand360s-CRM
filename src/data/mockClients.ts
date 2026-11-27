export interface ClientServiceItem {
  id: string;
  service_name: string;
  service_category?: string;
  service_fee: number;
  govt_fee: number;
  total_amount: number;
  service_status: string; // 'Pending' | 'In Progress' | 'Processing' | 'Completed' | 'Cancelled' | 'Filing'
  start_date?: string | null;
  expected_completion_date?: string | null;
  assigned_employee_id?: string | null;
  assigned_employee_name?: string | null;
  stage?: string;
  progressPercent?: number;
  fulfillment_stages?: any[] | null;
  current_stage_name?: string | null;
  current_stage_description?: string | null;
  paymentStatus?: 'Paid' | 'Partially Paid' | 'Partial' | 'Unpaid' | 'Not Invoiced' | 'Overdue';
  amountPaid?: number;
  invoicedAmount?: number;
  outstandingAmount?: number;
  hasIssuedInvoice?: boolean;
}

export interface ClientRecord {
  id: string;
  no: number;
  companyName: string;
  tradeName?: string;
  clientCode?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  dateOfCreation?: string;
  createdAt?: string;
  assignedSalespersonId?: string | null;
  salesperson: string;
  servicesPurchased: string;
  contractValue: number;
  invoicedAmount?: number;
  paymentsReceived: number;
  balanceReceivable: number;
  nextPaymentDueAmount: number;
  nextPaymentDueDate: string;
  paymentStatus: 'Paid in full' | 'Overdue' | 'Upcoming' | 'Partially Paid';
  clientStatus?:
    | 'Active'
    | 'Pending Onboarding'
    | 'Documentation in Progress'
    | 'Work in Progress'
    | 'Awaiting External Approval'
    | 'Awaiting Professional Review'
    | 'Completed – Professional Review'
    | 'On Hold'
    | 'Completed'
    | 'Inactive'
    | 'Archived';
  gstin?: string;
  gstNumber?: string;
  services?: ClientServiceItem[];
  servicesCompletedCount?: number;
  servicesTotalCount?: number;
  servicesProgressPercent?: number;
  nextActionTitle?: string;
  nextActionDueDate?: string;
}

export const MOCK_CLIENTS: ClientRecord[] = [];


