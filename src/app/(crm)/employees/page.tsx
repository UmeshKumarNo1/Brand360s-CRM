"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  UserPlus,
  Shield,
  User,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  Power,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  fetchEmployeesAction,
  toggleEmployeeStatusAction,
  deleteEmployeeAction,
} from "@/app/actions/employees";
import { AddEmployeeModal } from "@/components/employees/AddEmployeeModal";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { useToast } from "@/components/common/ToastProvider";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Deletion modal state
  const [deletingEmployee, setDeletingEmployee] = useState<any | null>(null);

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

  const handleConfirmDelete = async () => {
    if (!deletingEmployee) return;
    const res = await deleteEmployeeAction(deletingEmployee.id);
    if (res.success) {
      success("Employee Deleted", `${deletingEmployee.fullName} has been removed.`);
      loadData();
    } else {
      throw new Error(res.error || "Failed to delete employee.");
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Employee Directory
            </h1>
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
            <RefreshCw size={15} className={isLoading ? "animate-spin text-[#0481A2]" : ""} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <UserPlus size={16} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-2xs">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by employee name, email, or role..."
            className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
          />
        </div>
      </div>

      {/* Directory Table */}
      {errorMessage ? (
        <ErrorRetryState message={errorMessage} onRetry={loadData} />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#243E76] text-white font-semibold text-xs tracking-wide">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-center">System Role</th>
                  <th className="py-3 px-4 text-center">Assigned Clients</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      Loading employee directory...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-[#0481A2] font-bold flex items-center justify-center text-xs border border-slate-200">
                            {emp.fullName?.charAt(0) || "U"}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">{emp.fullName}</span>
                            <span className="text-[11px] text-slate-400 block font-mono">{emp.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                          <Mail size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{emp.email}</span>
                        </div>
                        {emp.phone && emp.phone !== "-" && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Phone size={11} className="text-slate-400 shrink-0" />
                            <span>{emp.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                            emp.role === "admin"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {emp.role}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {emp.clientsCount}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            emp.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {emp.isActive ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                          {emp.isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-xs">{emp.createdAt}</td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/employees/${emp.id}`}
                            className="p-1.5 text-slate-500 hover:text-[#0481A2] hover:bg-slate-100 rounded-md transition-colors"
                            title="View Profile & Portfolio"
                          >
                            <Eye size={15} />
                          </Link>

                          {/* Toggle Active Status */}
                          <button
                            onClick={() => handleToggleStatus(emp.id, emp.isActive)}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              emp.isActive
                                ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={emp.isActive ? "Deactivate Account" : "Activate Account"}
                          >
                            <Power size={15} />
                          </button>

                          {/* Delete Action */}
                          <button
                            onClick={() => setDeletingEmployee(emp)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Employee"
                          >
                            <Trash2 size={15} />
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

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadData()}
      />

      {/* Delete Confirmation Modal */}
      {deletingEmployee && (
        <DeleteConfirmationModal
          isOpen={!!deletingEmployee}
          onClose={() => setDeletingEmployee(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Employee Account"
          recordName={deletingEmployee.fullName}
          consequences={`Deleting this employee account will permanently revoke their access credentials and profile. If they have active assigned clients or tasks, deletion will be blocked and you will be asked to reassign their clients first.`}
          requireMatchInput={false}
          archiveOption={{
            label: deletingEmployee.isActive ? "Deactivate Instead" : "Keep Deactivated",
            onArchive: async () => {
              if (deletingEmployee.isActive) {
                await handleToggleStatus(deletingEmployee.id, true);
              }
            },
          }}
        />
      )}
    </div>
  );
}
