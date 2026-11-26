"use client";

import Link from "next/link";
import { User, Phone, FileText, HeartHandshake, Target, SlidersHorizontal } from "lucide-react";

interface SalesPipelineCardProps {
  data?: {
    newProspects: number;
    inFollowup: number;
    proposalSent: number;
    likelyToConvert: number;
    totalProspects: number;
  };
}

export function SalesPipelineCard({ data }: SalesPipelineCardProps) {
  const pipeline = data || {
    newProspects: 0,
    inFollowup: 0,
    proposalSent: 0,
    likelyToConvert: 0,
    totalProspects: 0,
  };

  const rows = [
    {
      label: "New Prospects",
      value: pipeline.newProspects,
      icon: User,
      iconColor: "text-slate-500",
    },
    {
      label: "In Follow-up",
      value: pipeline.inFollowup,
      icon: Phone,
      iconColor: "text-slate-500",
    },
    {
      label: "Proposal Sent",
      value: pipeline.proposalSent,
      icon: FileText,
      iconColor: "text-slate-500",
    },
    {
      label: "Likely to Convert",
      value: pipeline.likelyToConvert,
      icon: HeartHandshake,
      iconColor: "text-slate-500",
    },
  ];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Sales Pipeline (Prospects)</h3>
          <p className="text-xs text-slate-500">Unconfirmed clients &amp; follow-up stage</p>
        </div>
        <button
          type="button"
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          title="Filter Pipeline"
        >
          <SlidersHorizontal size={14} />
        </button>
      </div>

      {/* Pipeline Rows */}
      <div className="space-y-3.5 flex-1 justify-center flex flex-col">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.label} className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2.5 text-slate-700">
                <Icon size={15} className={r.iconColor} />
                <span className="font-medium">{r.label}</span>
              </div>
              <span className="font-bold text-slate-900 font-sans font-number">{r.value}</span>
            </div>
          );
        })}
      </div>

      {/* Total Banner across the bottom */}
      <Link
        href="/follow-ups"
        className="mt-4 bg-[#E0F2F7] hover:bg-[#D4EDF4] text-[#0481A2] rounded-xl px-3.5 py-2.5 flex items-center justify-between transition-colors shadow-2xs"
      >
        <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
          <Target size={16} />
          <span>Total Prospects</span>
        </div>
        <span className="text-sm sm:text-base font-extrabold font-sans font-number">
          {pipeline.totalProspects}
        </span>
      </Link>
    </div>
  );
}
