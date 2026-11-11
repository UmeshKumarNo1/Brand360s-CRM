"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { UserPlus, Shield, User, Phone, Mail, CheckCircle2, XCircle, Search, Eye, Power, RefreshCw } from "lucide-react";
import { fetchEmployeesAction, toggleEmployeeStatusAction } from "@/app/actions/employees";
import { AddEmployeeModal } from "@/components/employees/AddEmployeeModal";
import { useToast } from "@/components/common/ToastProvider";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { success, error: toastError } = useToast();
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const currentReqId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchEmployeesAction();
      if (currentReqId === requestIdRef.current) {
        setEmployees(data || []);
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        setErrorMessage(err.message || "Failed to load employee directory.");
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

  const handleToggleStatus = async (employeeId: string, currentStatus: boolean) => {
    // Optimistic toggle
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === employeeId ? { ...emp, isActive: !currentStatus } : emp))
    );

    try {
      const res = await toggleEmployeeStatusAction(employeeId, !currentStatus);
      if (res.success) {
        success("Status updated", `Employee ${!currentStatus ? "activated" : "deactivated"}.`);
        loadData();
      } else if (res.error) {
        toastError("Failed to update status", res.error);
        loadData();
      }
    } catch {
      toastError("Failed to update status", "Server connection error.");
      loadData();
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (emp.fullName && emp.fullName.toLowerCase().includes(q)) ||
      (emp.email && emp.email.toLowerCase().includes(q)) ||
      (emp.role && emp.role.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Employee Directory</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Shield size={12} />
              Admin Only
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage sales representatives, account access permissions, and client assignment portfolios.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh directory"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin text-[#077EA1]" : ""} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#077EA1] hover:bg-[#066B89] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <UserPlus size={16} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employees by name, email, or role..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] text-slate-800 placeholder:text-slate-400 shadow-xs"
          />
        </div>
      </div>

      {/* Error State */}
      {errorMessage && (
        <ErrorRetryState message={errorMessage} onRetry={loadData} />
      )}

      {/* Employees Table */}
      {!errorMessage && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] text-[#1E293B] border-b border-[#E2E8F0] font-semibold text-[13px]">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4 text-center">Assigned Clients</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-[#077EA1]" />
                        <span>Loading employee directory...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                      No team members found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                            {emp.fullName?.slice(0, 2).toUpperCase() || "EM"}
                          </div>
                          <div>
                            <Link 
                              href={`/employees/${emp.id}`}
                              className="font-semibold text-slate-900 hover:text-[#077EA1] transition-colors block"
                            >
                              {emp.fullName}
                            </Link>
                            <span className="text-[11px] text-slate-400 font-mono">ID: {emp.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 text-slate-500 text-xs space-y-0.5">
                        <p className="flex items-center gap-1.5">
                          <Mail size={12} className="text-slate-400" />
                          <span>{emp.email}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Phone size={12} className="text-[#077EA1]" />
                          <span>{emp.phone}</span>
                        </p>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                          emp.role === "admin" 
                            ? "bg-purple-50 text-purple-700 border border-purple-200" 
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {emp.role}
                        </span>
                      </td>

                      {/* Clients Count */}
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {emp.assignedClientsCount}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          emp.isActive 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}>
                          {emp.isActive ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                          {emp.isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {emp.createdAt}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/employees/${emp.id}`}
                            className="p-1.5 text-slate-500 hover:text-[#077EA1] hover:bg-slate-100 rounded-md transition-colors"
                            title="View Profile & Portfolio"
                          >
                            <Eye size={15} />
                          </Link>

                          {/* Toggle Active Status */}
                          <button
                            onClick={() => handleToggleStatus(emp.id, emp.isActive)}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              emp.isActive
                                ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={emp.isActive ? "Deactivate Account" : "Activate Account"}
                          >
                            <Power size={15} />
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
      )}

      {/* Modal */}
      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
