"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Pencil,
  Eye,
  Play,
  XCircle,
  Building,
  User,
  FileSpreadsheet,
  Layers,
  UserCheck,
  Check,
  PhoneCall,
} from "lucide-react";
import {
  fetchFollowupsAction,
  updateFollowupStatusAction,
  deleteFollowupAction,
  markInProgressFollowupAction,
  cancelFollowupAction,
  FollowupItem,
} from "@/app/actions/followups";
import { fetchUnconvertedLeadsAction } from "@/app/actions/leads";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { CreateFollowupModal } from "@/components/followups/CreateFollowupModal";
import { CompleteFollowupModal } from "@/components/followups/CompleteFollowupModal";
import { FollowupDetailModal } from "@/components/followups/FollowupDetailModal";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { LeadImportModal } from "@/components/leads/LeadImportModal";
import { LeadDetailModal } from "@/components/leads/LeadDetailModal";
import { ConvertLeadModal } from "@/components/leads/ConvertLeadModal";
import { useToast } from "@/components/common/ToastProvider";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";
import { FollowupStatsCards } from "@/components/followups/FollowupStatsCards";

export default function FollowupsPage() {
  const [followups, setFollowups] = useState<FollowupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Tabs: all | my | today | upcoming | overdue | completed | leads
  const [activeTab, setActiveTab] = useState<
    "all" | "my" | "today" | "upcoming" | "overdue" | "completed" | "leads"
  >("all");

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  // Leads State
  const [unconvertedLeads, setUnconvertedLeads] = useState<any[]>([]);
  const [leadStatusFilter, setLeadStatusFilter] = useState("All");
  const [leadSalespersonFilter, setLeadSalespersonFilter] = useState("All");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<any | null>(null);
  const [selectedLeadForConvert, setSelectedLeadForConvert] = useState<any | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingFollowup, setEditingFollowup] = useState<FollowupItem | null>(null);
  const [viewingFollowup, setViewingFollowup] = useState<FollowupItem | null>(null);
  const [completingFollowup, setCompletingFollowup] = useState<FollowupItem | null>(null);
  const [deletingFollowup, setDeletingFollowup] = useState<FollowupItem | null>(null);

  const { success, error: toastError } = useToast();
  const requestIdRef = useRef(0);

  // Load user profile
  useEffect(() => {
    getCurrentUserProfileAction().then((p) => {
      if (p) {
        setCurrentUserId(p.id);
        setIsAdmin(p.role === "admin");
      }
    });
  }, []);

  const loadData = useCallback(async () => {
    const currentReqId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [fData, lData] = await Promise.all([
        fetchFollowupsAction(),
        fetchUnconvertedLeadsAction(),
      ]);
      if (currentReqId === requestIdRef.current) {
        setFollowups(fData || []);
        setUnconvertedLeads(lData || []);
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        setErrorMessage(err.message || "Failed to load follow-up tasks.");
      }
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Status Actions
  const handleMarkInProgress = async (id: string) => {
    const res = await markInProgressFollowupAction(id);
    if (res.success) {
      success("Status Updated", "Task marked In Progress.");
      loadData();
    } else {
      toastError("Error", res.error || "Failed to update status.");
    }
  };

  const handleCancelTask = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this follow-up task?")) return;
    const res = await cancelFollowupAction(id);
    if (res.success) {
      success("Task Cancelled", "Follow-up marked Cancelled.");
      loadData();
    } else {
      toastError("Error", res.error || "Failed to cancel task.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingFollowup) return;
    const res = await deleteFollowupAction(deletingFollowup.id, deletingFollowup.clientId);
    if (res.success) {
      success("Follow-up Deleted", `"${deletingFollowup.title}" has been deleted.`);
      loadData();
    } else {
      throw new Error(res.error || "Failed to delete task.");
    }
  };

  // Dynamic calculations from database values
  const todayStr = new Date().toISOString().split("T")[0];

  // A lead is in "New Leads" if NO activity has been logged yet
  // Once activity is logged (call outcome, notes, rescheduled), it moves to "My Follow-ups" / "All Follow-ups"!
  const newLeads = useMemo(() => {
    return unconvertedLeads.filter((l: any) => !l.hasActivityLogged);
  }, [unconvertedLeads]);

  // Active follow-ups in My Follow-ups / All Follow-ups:
  // Includes all follow-ups with logged activity, or created for clients
  const activeFollowups = useMemo(() => {
    return followups.filter((f: any) => f.hasActivityLogged || f.clientId);
  }, [followups]);

  const totalCount = activeFollowups.length;
  const myCount = activeFollowups.filter((f) => f.assignedToId === currentUserId).length;
  const pendingCount = activeFollowups.filter((f) => f.status === "Pending" || f.status === "In Progress").length;
  const todayCount = activeFollowups.filter(
    (f) => f.dueDate === todayStr && f.status !== "Completed" && f.status !== "Cancelled"
  ).length;
  const upcomingCount = activeFollowups.filter(
    (f) => f.dueDate > todayStr && f.status !== "Completed" && f.status !== "Cancelled"
  ).length;
  const overdueCount = activeFollowups.filter(
    (f) => f.isOverdue
  ).length;
  const completedCount = activeFollowups.filter((f) => f.status === "Completed").length;
  const newLeadsCount = newLeads.length;

  // Filter & Tab Logic
  const filteredFollowups = useMemo(() => {
    return activeFollowups.filter((f) => {
      // Tab filter
      if (activeTab === "my" && f.assignedToId !== currentUserId) return false;
      if (activeTab === "today" && (f.dueDate !== todayStr || f.status === "Completed" || f.status === "Cancelled")) return false;
      if (activeTab === "upcoming" && (f.dueDate <= todayStr || f.status === "Completed" || f.status === "Cancelled")) return false;
      if (activeTab === "overdue" && !f.isOverdue) return false;
      if (activeTab === "completed" && f.status !== "Completed") return false;

      // Dropdown filters
      if (priorityFilter !== "All" && f.priority !== priorityFilter) return false;
      if (typeFilter !== "All" && f.followUpType !== typeFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.companyName.toLowerCase().includes(q) ||
        f.contactPerson.toLowerCase().includes(q) ||
        (f.notes && f.notes.toLowerCase().includes(q))
      );
    });
  }, [activeFollowups, activeTab, currentUserId, todayStr, priorityFilter, typeFilter, searchQuery]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return newLeads.filter((l: any) => {
      if (!isAdmin && l.assignedSalespersonId && l.assignedSalespersonId !== currentUserId) {
        return false;
      }
      if (leadStatusFilter !== "All" && l.leadStatus !== leadStatusFilter) return false;
      if (leadSalespersonFilter !== "All" && l.assignedSalespersonName !== leadSalespersonFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        l.companyName.toLowerCase().includes(q) ||
        (l.entityId && l.entityId.toLowerCase().includes(q)) ||
        l.contactPerson.toLowerCase().includes(q) ||
        (l.phone && l.phone.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.city && l.city.toLowerCase().includes(q)) ||
        (l.state && l.state.toLowerCase().includes(q))
      );
    });
  }, [newLeads, isAdmin, currentUserId, leadStatusFilter, leadSalespersonFilter, searchQuery]);

  const uniqueLeadSalespeople = useMemo(() => {
    const set = new Set<string>();
    unconvertedLeads.forEach((l: any) => {
      if (l.assignedSalespersonName && l.assignedSalespersonName !== "Unassigned") {
        set.add(l.assignedSalespersonName);
      }
    });
    return Array.from(set);
  }, [unconvertedLeads]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Follow-ups &amp; Leads
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage imported company leads, client follow-ups, and lead-to-client conversion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin text-[#0481A2]" : ""} />
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#243E76] hover:bg-[#1B2F5B] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            title="Bulk Excel / CSV Lead Import with Round-Robin Assignment"
          >
            <FileSpreadsheet size={16} />
            <span>Import Leads (Excel/CSV)</span>
          </button>

          <button
            onClick={() => {
              setEditingFollowup(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Follow-up</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards matching Clients & Payments card design */}
      <FollowupStatsCards
        totalCount={totalCount}
        pendingCount={pendingCount}
        todayCount={todayCount}
        upcomingCount={upcomingCount}
        overdueCount={overdueCount}
        completedCount={completedCount}
      />

      {/* Tabs */}
      <div className="flex border-b border-[#E2E8F0] overflow-x-auto text-xs font-semibold text-slate-600 gap-1">
        <button
          onClick={() => setActiveTab("all")}
          className={`py-2.5 px-3.5 rounded-t-lg transition-colors cursor-pointer ${
            activeTab === "all"
              ? "bg-[#243E76] text-white shadow-2xs"
              : "hover:bg-slate-100 text-slate-600"
          }`}
        >
          All Follow-ups ({totalCount})
        </button>
        <button
          onClick={() => setActiveTab("my")}
          className={`py-2.5 px-3.5 rounded-t-lg transition-colors cursor-pointer ${
            activeTab === "my"
              ? "bg-[#243E76] text-white shadow-2xs"
              : "hover:bg-slate-100 text-slate-600"
          }`}
        >
          My Follow-ups ({myCount})
        </button>
        <button
          onClick={() => setActiveTab("today")}
          className={`py-2.5 px-3.5 rounded-t-lg transition-colors cursor-pointer ${
            activeTab === "today"
              ? "bg-[#0481A2] text-white shadow-2xs"
              : "hover:bg-slate-100 text-slate-600"
          }`}
        >
          Today's Follow-ups ({todayCount})
        </button>
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`py-2.5 px-3.5 rounded-t-lg transition-colors cursor-pointer ${
            activeTab === "upcoming"
              ? "bg-blue-600 text-white shadow-2xs"
              : "hover:bg-slate-100 text-slate-600"
          }`}
        >
          Upcoming ({upcomingCount})
        </button>
        <button
          onClick={() => setActiveTab("overdue")}
          className={`py-2.5 px-3.5 rounded-t-lg transition-colors cursor-pointer ${
            activeTab === "overdue"
              ? "bg-rose-600 text-white shadow-2xs"
              : "hover:bg-slate-100 text-slate-600"
          }`}
        >
          Overdue ({overdueCount})
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`py-2.5 px-3.5 rounded-t-lg transition-colors cursor-pointer ${
            activeTab === "completed"
              ? "bg-emerald-600 text-white shadow-2xs"
              : "hover:bg-slate-100 text-slate-600"
          }`}
        >
          Completed ({completedCount})
        </button>
        <button
          onClick={() => setActiveTab("leads")}
          className={`py-2.5 px-3.5 rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "leads"
              ? "bg-[#0481A2] text-white shadow-2xs font-bold"
              : "hover:bg-slate-100 text-slate-600"
          }`}
        >
          <Building size={13} />
          <span>New Leads ({newLeadsCount})</span>
        </button>
      </div>

      {/* Filter Toolbar for Leads */}
      {activeTab === "leads" ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads by company, entity ID, contact, phone..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          <select
            value={leadStatusFilter}
            onChange={(e) => setLeadStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-slate-700 font-medium cursor-pointer"
          >
            <option value="All">All Lead Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="In Discussion">In Discussion</option>
            <option value="Follow-up Scheduled">Follow-up Scheduled</option>
            <option value="Lost">Lost / Dropped</option>
          </select>

          {isAdmin && (
            <select
              value={leadSalespersonFilter}
              onChange={(e) => setLeadSalespersonFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-slate-700 font-medium cursor-pointer"
            >
              <option value="All">All Salespersons</option>
              {uniqueLeadSalespeople.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}

          {(searchQuery || leadStatusFilter !== "All" || leadSalespersonFilter !== "All") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setLeadStatusFilter("All");
                setLeadSalespersonFilter("All");
              }}
              className="text-xs text-[#0481A2] hover:underline font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        /* Filter Toolbar for Normal Tasks */
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, client, or contact..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-slate-700 font-medium cursor-pointer"
          >
            <option value="All">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-slate-700 font-medium cursor-pointer"
          >
            <option value="All">All Types</option>
            <option value="Phone Call">Phone Call</option>
            <option value="Email">Email</option>
            <option value="Meeting">Meeting</option>
            <option value="Payment Reminder">Payment Reminder</option>
            <option value="Document Request">Document Request</option>
            <option value="Service Update">Service Update</option>
            <option value="Renewal Reminder">Renewal Reminder</option>
          </select>

          {(searchQuery || priorityFilter !== "All" || typeFilter !== "All") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setPriorityFilter("All");
                setTypeFilter("All");
              }}
              className="text-xs text-[#0481A2] hover:underline font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Tables View */}
      {errorMessage ? (
        <ErrorRetryState message={errorMessage} onRetry={loadData} />
      ) : activeTab === "leads" ? (
        /* New Leads Table */
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#243E76] text-white font-semibold text-xs tracking-wide">
                  <th className="py-3 px-3 w-10 text-center">No.</th>
                  <th className="py-3 px-3.5">Company Name &amp; Entity ID</th>
                  <th className="py-3 px-3">Primary Director &amp; Contact</th>
                  <th className="py-3 px-3">City &amp; State</th>
                  <th className="py-3 px-3 text-center">Assigned Salesperson</th>
                  <th className="py-3 px-3 text-center">Lead Status</th>
                  <th className="py-3 px-3 text-center">Next Follow-up</th>
                  <th className="py-3 px-3 text-center w-36 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      <RefreshCw size={18} className="animate-spin text-[#0481A2] mx-auto mb-2" />
                      Loading new company leads...
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      No new company leads match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead: any, idx: number) => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center font-mono text-xs text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3.5">
                        <button
                          onClick={() => setSelectedLeadForDetail(lead)}
                          className="font-bold text-slate-900 hover:text-[#0481A2] text-left transition-colors cursor-pointer block"
                        >
                          {lead.companyName}
                        </button>
                        <p className="text-[11px] font-mono text-slate-400">
                          {lead.entityId ? `Entity ID: ${lead.entityId}` : `Code: ${lead.clientCode || "-"}`}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-slate-800">{lead.contactPerson || "-"}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {lead.phone || lead.email || "-"}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <p>{lead.city || "-"}</p>
                        <p className="text-[11px] text-slate-400">{lead.state || "-"}</p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {lead.assignedSalespersonName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          lead.leadStatus === "New"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : lead.leadStatus === "Contacted"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : lead.leadStatus === "In Discussion"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}>
                          {lead.leadStatus || "New"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-xs">
                        {lead.nextFollowupDate ? (
                          <div>
                            <p className="font-bold text-[#0481A2]">{lead.nextFollowupDate}</p>
                            <p className="text-[10px] text-slate-400">{lead.nextFollowupType || "Call"}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None scheduled</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedLeadForDetail(lead)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#F0F8FA] hover:bg-[#E0F2F7] text-[#0481A2] border border-[#D5EBF1] font-semibold text-xs transition-all shadow-2xs cursor-pointer"
                            title="Manage Lead & View Details"
                          >
                            Manage
                          </button>
                          <button
                            onClick={() => setSelectedLeadForConvert(lead)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-2xs cursor-pointer"
                            title="Convert to full active Client"
                          >
                            Convert
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Regular Follow-ups Responsive Table */
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
          <div>
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#243E76] text-white font-semibold text-xs tracking-wide">
                  <th className="py-3 px-3 w-10 text-center">No.</th>
                  <th className="py-3 px-3.5 text-center">Follow-up Title</th>
                  <th className="py-3 px-3 text-center">Client</th>
                  <th className="py-3 px-3 text-center">Assigned To</th>
                  <th className="py-3 px-3 text-center">Type</th>
                  <th className="py-3 px-3 text-center">Priority</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Due Date</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center w-28 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                      <RefreshCw size={18} className="animate-spin text-[#0481A2] mx-auto mb-2" />
                      Loading follow-up tasks...
                    </td>
                  </tr>
                ) : filteredFollowups.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                      No follow-up tasks found for this view.
                    </td>
                  </tr>
                ) : (
                  filteredFollowups.map((f, idx) => {
                    const isCompleted = f.status === "Completed";
                    const isCancelled = f.status === "Cancelled";

                    return (
                      <tr
                        key={f.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isCompleted ? "opacity-75 bg-slate-50/30" : ""
                        }`}
                      >
                        {/* No. */}
                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {idx + 1}
                        </td>

                        {/* Title */}
                        <td className="py-3 px-3.5 font-bold">
                          <button
                            onClick={() => setViewingFollowup(f)}
                            className="text-[#0481A2] hover:text-[#036c88] text-left transition-colors cursor-pointer block"
                          >
                            {f.title}
                          </button>
                          {f.notes && (
                            <span className="text-[11px] text-slate-400 font-normal line-clamp-1 mt-0.5">
                              {f.notes}
                            </span>
                          )}
                        </td>

                        {/* Client / Company */}
                        <td className="py-3 px-3">
                          {f.clientId ? (
                            <Link
                              href={`/clients/${f.clientId}`}
                              className="font-semibold text-slate-800 hover:text-[#0481A2] block truncate max-w-[150px]"
                            >
                              {f.companyName}
                            </Link>
                          ) : (
                            <span className="font-semibold text-slate-800 block truncate max-w-[150px]">
                              {f.companyName}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {f.clientCode || (f.clientId ? "Client" : "Lead")}
                          </span>
                        </td>

                        {/* Assigned To */}
                        <td className="py-3 px-3 font-medium text-slate-700">
                          {f.assignedToName}
                        </td>

                        {/* Type */}
                        <td className="py-3 px-3 text-slate-600 font-normal whitespace-nowrap">
                          {f.followUpType}
                        </td>

                        {/* Priority Badge */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              f.priority === "Urgent"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : f.priority === "High"
                                ? "bg-orange-50 text-orange-700 border border-orange-200"
                                : f.priority === "Medium"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-slate-50 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {f.priority}
                          </span>
                        </td>

                        {/* Due Date & Overdue calculation */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="leading-tight">
                            <span
                              className={`font-semibold block ${
                                f.isOverdue ? "text-rose-600" : "text-slate-800"
                              }`}
                            >
                              {f.dueDate}
                            </span>
                            {f.isOverdue && (
                              <span className="text-[10px] text-rose-600 font-semibold block">
                                {f.overdueDays}d overdue
                              </span>
                            )}
                            {f.dueTime && (
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {f.dueTime}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isCompleted
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : f.status === "In Progress"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : isCancelled
                                ? "bg-slate-100 text-slate-600 border border-slate-200"
                                : f.isOverdue
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 size={10} />
                            ) : (
                              <Clock size={10} />
                            )}
                            {f.isOverdue ? "Overdue" : f.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1">
                            {/* View Details */}
                            <button
                              onClick={() => setViewingFollowup(f)}
                              className="p-1.5 rounded-lg bg-[#F0F8FA] hover:bg-[#E0F2F7] text-[#0481A2] border border-[#D5EBF1] transition-all shadow-2xs cursor-pointer"
                              title="View details"
                            >
                              <Eye size={13} />
                            </button>

                            {/* Mark In Progress */}
                            {!isCompleted && !isCancelled && f.status === "Pending" && (
                              <button
                                onClick={() => handleMarkInProgress(f.id)}
                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-all shadow-2xs cursor-pointer"
                                title="Mark In Progress"
                              >
                                <Play size={13} />
                              </button>
                            )}

                            {/* Complete Task */}
                            {!isCompleted && !isCancelled && (
                              <button
                                onClick={() => setCompletingFollowup(f)}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 transition-all shadow-2xs cursor-pointer"
                                title="Mark Completed"
                              >
                                <CheckCircle2 size={13} />
                              </button>
                            )}

                            {/* Edit */}
                            {(isAdmin || f.assignedToId === currentUserId) && (
                              <button
                                onClick={() => {
                                  setEditingFollowup(f);
                                  setIsCreateModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all shadow-2xs cursor-pointer"
                                title="Edit Follow-up"
                              >
                                <Pencil size={13} />
                              </button>
                            )}

                            {/* Delete (Admin or user's pending task) */}
                            {(isAdmin || (f.assignedToId === currentUserId && f.status === "Pending")) && (
                              <button
                                onClick={() => setDeletingFollowup(f)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all shadow-2xs cursor-pointer"
                                title="Delete Task"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isCreateModalOpen && (
        <CreateFollowupModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingFollowup(null);
          }}
          onSuccess={() => loadData()}
          mode={editingFollowup ? "edit" : "create"}
          initialData={editingFollowup}
          isAdmin={isAdmin}
        />
      )}

      {/* Complete Modal */}
      {completingFollowup && (
        <CompleteFollowupModal
          isOpen={!!completingFollowup}
          onClose={() => setCompletingFollowup(null)}
          onSuccess={() => loadData()}
          followup={completingFollowup}
          isAdmin={isAdmin}
        />
      )}

      {/* View Detail Modal */}
      {viewingFollowup && (
        <FollowupDetailModal
          isOpen={!!viewingFollowup}
          onClose={() => setViewingFollowup(null)}
          followup={viewingFollowup}
          onEdit={(f) => {
            setEditingFollowup(f);
            setIsCreateModalOpen(true);
          }}
          onComplete={(f) => {
            setCompletingFollowup(f);
          }}
          onConvert={(leadToConvert) => {
            setViewingFollowup(null);
            setSelectedLeadForConvert(leadToConvert);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingFollowup && (
        <DeleteConfirmationModal
          isOpen={!!deletingFollowup}
          onClose={() => setDeletingFollowup(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Follow-up Task"
          recordName={deletingFollowup.title}
          consequences="This follow-up task and reminder will be permanently removed from the system. This action cannot be undone."
        />
      )}

      {/* Bulk Excel / CSV Lead Import Modal */}
      {isImportModalOpen && (
        <LeadImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => loadData()}
        />
      )}

      {/* Lead Detail & Activity History Modal */}
      {selectedLeadForDetail && (
        <LeadDetailModal
          isOpen={!!selectedLeadForDetail}
          onClose={() => setSelectedLeadForDetail(null)}
          lead={selectedLeadForDetail}
          onConvertClick={(leadToConvert: any) => {
            setSelectedLeadForDetail(null);
            setSelectedLeadForConvert(leadToConvert);
          }}
          onRefresh={() => loadData()}
        />
      )}

      {/* Convert Lead to Active Client Modal */}
      {selectedLeadForConvert && (
        <ConvertLeadModal
          isOpen={!!selectedLeadForConvert}
          onClose={() => setSelectedLeadForConvert(null)}
          lead={selectedLeadForConvert}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  );
}
