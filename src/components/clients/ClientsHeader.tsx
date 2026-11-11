"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

interface ClientsHeaderProps {
  onAddClient?: () => void;
}

export function ClientsHeader({ onAddClient }: ClientsHeaderProps) {
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

      <div>
        {onAddClient ? (
          <button
            type="button"
            onClick={onAddClient}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0481A2] hover:bg-[#036c88] text-white text-sm font-semibold rounded-xl shadow-xs transition-all duration-150 cursor-pointer"
          >
            <Plus size={18} />
            <span>Add Client</span>
          </button>
        ) : (
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0481A2] hover:bg-[#036c88] text-white text-sm font-semibold rounded-xl shadow-xs transition-all duration-150 cursor-pointer"
          >
            <Plus size={18} />
            <span>Add Client</span>
          </Link>
        )}
      </div>
    </div>
  );
}
