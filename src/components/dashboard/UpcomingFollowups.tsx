import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";

export function UpcomingFollowups() {
  const followups = [
    {
      id: "1",
      company: "ABC Tech Pvt. Ltd.",
      task: "GST Registration – Document follow-up",
      due: "Today",
      dueBadge: "bg-red-50 text-red-600 border border-red-200",
    },
    {
      id: "2",
      company: "Skyline Ventures LLP",
      task: "Company Registration – Status update",
      due: "Tomorrow",
      dueBadge: "bg-sky-50 text-sky-700 border border-sky-200",
    },
    {
      id: "3",
      company: "GreenLeaf Trading",
      task: "Trade License – Document collection",
      due: "Jan 28",
      dueBadge: "bg-slate-50 text-slate-600 border border-slate-200",
    },
  ];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-slate-900">Upcoming Follow-ups</h3>
        <Link 
          href="/follow-ups" 
          className="text-xs font-semibold text-[#0481A2] hover:text-[#036c88] flex items-center gap-1"
        >
          View All <ArrowRight size={12} />
        </Link>
      </div>

      <div className="divide-y divide-slate-100 flex-1 flex flex-col justify-around">
        {followups.map((item) => (
          <div key={item.id} className="py-2.5 flex items-start justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-lg transition-colors">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#243E76] shrink-0 mt-0.5">
                <Building2 size={16} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-900">{item.company}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{item.task}</p>
              </div>
            </div>

            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${item.dueBadge}`}>
              {item.due}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

