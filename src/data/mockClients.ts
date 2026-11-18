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
  assigned_employee_name?: string | null;
  stage?: string;
  progressPercent?: number;
  paymentStatus?: 'Paid' | 'Partial' | 'Unpaid';
  amountPaid?: number;
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
  salesperson: string;
  servicesPurchased: string;
  contractValue: number;
  paymentsReceived: number;
  balanceReceivable: number;
  nextPaymentDueAmount: number;
  nextPaymentDueDate: string;
  paymentStatus: 'Paid in full' | 'Overdue' | 'Upcoming' | 'Partially Paid';
  clientStatus?: 'Active' | 'Pending Onboarding' | 'On Hold' | 'Completed' | 'Inactive' | 'Archived';
  gstin?: string;
  gstNumber?: string;
  services?: ClientServiceItem[];
  servicesCompletedCount?: number;
  servicesTotalCount?: number;
  servicesProgressPercent?: number;
  nextActionTitle?: string;
  nextActionDueDate?: string;
}

export const MOCK_CLIENTS: ClientRecord[] = [
  {
    id: "cl-001",
    no: 1,
    companyName: "RAJA OVERSEAS",
    dateOfCreation: "Nov 11, 2026",
    createdAt: "2026-11-11",
    salesperson: "Employee2",
    servicesPurchased: "Annual Compliance Website",
    contractValue: 15000,
    paymentsReceived: 10000,
    balanceReceivable: 140000,
    nextPaymentDueAmount: 140000,
    nextPaymentDueDate: "Nov 30, 2026",
    paymentStatus: "Upcoming",
  },
  {
    id: "cl-002",
    no: 2,
    companyName: "La fantasie",
    dateOfCreation: "Nov 11, 2026",
    createdAt: "2026-11-11",
    salesperson: "Employee1",
    servicesPurchased: "Website Development",
    contractValue: 15000,
    paymentsReceived: 25000,
    balanceReceivable: 125000,
    nextPaymentDueAmount: 25000,
    nextPaymentDueDate: "Dec 15, 2026",
    paymentStatus: "Upcoming",
  },
  {
    id: "cl-003",
    no: 3,
    companyName: "Example Industries",
    dateOfCreation: "Nov 10, 2026",
    createdAt: "2026-11-10",
    salesperson: "Employee2",
    servicesPurchased: "Annual Compliance, Website",
    contractValue: 150000,
    paymentsReceived: 90000,
    balanceReceivable: 60000,
    nextPaymentDueAmount: 20000,
    nextPaymentDueDate: "Jan 10, 2027",
    paymentStatus: "Overdue",
  },
  {
    id: "cl-004",
    no: 4,
    companyName: "Sample Trading",
    dateOfCreation: "Nov 08, 2026",
    createdAt: "2026-11-08",
    salesperson: "Employee1",
    servicesPurchased: "Trademark Filing",
    contractValue: 40000,
    paymentsReceived: 40000,
    balanceReceivable: 0,
    nextPaymentDueAmount: 0,
    nextPaymentDueDate: "-",
    paymentStatus: "Paid in full",
  },
  {
    id: "cl-005",
    no: 5,
    companyName: "Demo Technologies",
    dateOfCreation: "Nov 05, 2026",
    createdAt: "2026-11-05",
    salesperson: "Employee2",
    servicesPurchased: "Annual Compliance",
    contractValue: 80000,
    paymentsReceived: 40000,
    balanceReceivable: 40000,
    nextPaymentDueAmount: 40000,
    nextPaymentDueDate: "Apr 01, 2027",
    paymentStatus: "Upcoming",
  },
  {
    id: "cl-006",
    no: 6,
    companyName: "Example Engineering",
    dateOfCreation: "Nov 01, 2026",
    createdAt: "2026-11-01",
    salesperson: "Employee1",
    servicesPurchased: "HR & Payroll",
    contractValue: 60000,
    paymentsReceived: 30000,
    balanceReceivable: 30000,
    nextPaymentDueAmount: 30000,
    nextPaymentDueDate: "Apr 05, 2027",
    paymentStatus: "Upcoming",
  },
];


