import Link from "next/link";
import { Plus } from "lucide-react";

export function ClientsHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">Clients</h1>
          <span className="px-2.5 py-0.5 text-xs font-semibold bg-[#E0F2FE] text-[#0369A1] rounded-md">
            Illustrative data
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#64748B] mt-1">
          Client relationships, service commitments and collections.
        </p>
      </div>

      <div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#077EA1] hover:bg-[#066B89] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus size={16} />
          <span>Add Client</span>
        </Link>
      </div>
    </div>
  );
}

