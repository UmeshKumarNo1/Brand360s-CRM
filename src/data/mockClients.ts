export interface ClientRecord {
  id: string;
  no: number;
  companyName: string;
  salesperson: string;
  servicesPurchased: string;
  contractValue: number;
  paymentsReceived: number;
  balanceReceivable: number;
  nextPaymentDueAmount: number;
  nextPaymentDueDate: string;
  paymentStatus: 'Paid in full' | 'Overdue' | 'Upcoming' | 'Partially Paid';
}

export const MOCK_CLIENTS: ClientRecord[] = [
  {
    id: "cl-001",
    no: 1,
    companyName: "Example Industries",
    salesperson: "Yogeetha",
    servicesPurchased: "Annual Compliance, Website",
    contractValue: 150000,
    paymentsReceived: 90000,
    balanceReceivable: 60000,
    nextPaymentDueAmount: 20000,
    nextPaymentDueDate: "10 Jan 2027",
    paymentStatus: "Overdue",
  },
  {
    id: "cl-002",
    no: 2,
    companyName: "Sample Trading",
    salesperson: "Jai Sakthi",
    servicesPurchased: "Trademark Filing",
    contractValue: 40000,
    paymentsReceived: 40000,
    balanceReceivable: 0,
    nextPaymentDueAmount: 0,
    nextPaymentDueDate: "-",
    paymentStatus: "Paid in full",
  },
  {
    id: "cl-003",
    no: 3,
    companyName: "Demo Technologies",
    salesperson: "Adhithya",
    servicesPurchased: "Annual Compliance",
    contractValue: 80000,
    paymentsReceived: 40000,
    balanceReceivable: 40000,
    nextPaymentDueAmount: 40000,
    nextPaymentDueDate: "01 Apr 2027",
    paymentStatus: "Upcoming",
  },
  {
    id: "cl-004",
    no: 4,
    companyName: "Example Engineering",
    salesperson: "Yogeetha",
    servicesPurchased: "HR & Payroll",
    contractValue: 60000,
    paymentsReceived: 30000,
    balanceReceivable: 30000,
    nextPaymentDueAmount: 30000,
    nextPaymentDueDate: "05 Apr 2027",
    paymentStatus: "Upcoming",
  },
  {
    id: "cl-005",
    no: 5,
    companyName: "Sample Retail",
    salesperson: "Adhithya",
    servicesPurchased: "Website Development",
    contractValue: 75000,
    paymentsReceived: 45000,
    balanceReceivable: 30000,
    nextPaymentDueAmount: 30000,
    nextPaymentDueDate: "15 Apr 2027",
    paymentStatus: "Upcoming",
  },
  {
    id: "cl-006",
    no: 6,
    companyName: "Demo Consulting",
    salesperson: "Jai Sakthi",
    servicesPurchased: "SEO Retainer",
    contractValue: 36000,
    paymentsReceived: 36000,
    balanceReceivable: 0,
    nextPaymentDueAmount: 0,
    nextPaymentDueDate: "-",
    paymentStatus: "Paid in full",
  },
];

