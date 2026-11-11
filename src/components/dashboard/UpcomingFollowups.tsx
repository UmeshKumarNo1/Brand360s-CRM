import Link from "next/link";
import { Building2, ArrowRight, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { fetchFollowupsAction } from "@/app/actions/followups";

export async function UpcomingFollowups() {
  const followups = await fetchFollowupsAction();

  const todayStr = new Date().toISOString().split("T")[0];

  // Pending tasks due today or upcoming
  const activeFollowups = followups
    .filter((f) => f.status !== "Completed" && f.status !== "Cancelled")
    .slice(0, 4);

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
        {activeFollowups.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No pending follow-ups scheduled.
          </div>
        ) : (
          activeFollowups.map((item) => {
            const isToday = item.dueDate === todayStr;
            const isOverdue = item.isOverdue;

            return (
              <div
                key={item.id}
                className="py-2.5 flex items-start justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-lg transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#243E76] shrink-0 mt-0.5">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900">
                      {item.companyName}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {item.title}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                    isOverdue
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : isToday
                      ? "bg-[#E0F2F7] text-[#0481A2] border border-[#D5EBF1]"
                      : "bg-slate-50 text-slate-600 border border-slate-200"
                  }`}
                >
                  {isOverdue ? `${item.overdueDays}d overdue` : isToday ? "Today" : item.dueDate}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
