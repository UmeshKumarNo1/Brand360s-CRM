import Link from "next/link";
import { Plus, ScanSearch } from "lucide-react";

interface ClientsHeaderProps {
  isAdmin?: boolean;
  onOpenScanDuplicates?: () => void;
}

export function ClientsHeader({ isAdmin, onOpenScanDuplicates }: ClientsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold font-heading text-[#1B3260] tracking-tight">
          Clients
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-normal">
          Manage your clients, track their payments and stay up to date with their status.
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {isAdmin && onOpenScanDuplicates && (
          <button
            type="button"
            onClick={onOpenScanDuplicates}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl shadow-2xs transition-all duration-150 cursor-pointer"
          >
            <ScanSearch size={16} className="text-[#0481A2]" />
            <span>Scan Duplicates</span>
          </button>
        )}

        <Link
          href="/clients/new"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0481A2] hover:bg-[#036c88] text-white text-sm font-semibold rounded-xl shadow-xs transition-all duration-150 cursor-pointer"
        >
          <Plus size={18} />
          <span>Add Client</span>
        </Link>
      </div>
    </div>
  );
}
