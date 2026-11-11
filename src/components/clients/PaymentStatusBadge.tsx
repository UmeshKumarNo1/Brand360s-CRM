import { cn } from "@/lib/utils";

interface PaymentStatusBadgeProps {
  status: 'Paid in full' | 'Overdue' | 'Upcoming' | 'Partially Paid';
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  if (status === 'Paid in full') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#DCFCE7] text-[#15803D]">
        Paid in full
      </span>
    );
  }

  if (status === 'Overdue') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEE2E2] text-[#B91C1C]">
        Overdue
      </span>
    );
  }

  if (status === 'Upcoming') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#E0F2FE] text-[#0369A1]">
        Upcoming
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700">
      {status}
    </span>
  );
}

