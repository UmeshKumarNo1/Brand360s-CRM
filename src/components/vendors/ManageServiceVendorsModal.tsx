"use client";

import { useState, useActionState, useEffect } from "react";
import {
  Store,
  X,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  IndianRupee,
} from "lucide-react";
import {
  updateVendorAssignmentAction,
  removeVendorAssignmentAction,
} from "@/app/actions/serviceVendors";
import { useToast } from "@/components/common/ToastProvider";
import { formatINR } from "@/lib/utils";

interface ManageServiceVendorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onOpenAssignVendor: () => void;
  service: {
    id: string;
    service_name: string;
    service_fee: number;
    govt_fee?: number;
    total_amount?: number;
    vendor_assignments?: any[];
  } | null;
  clientName: string;
}

export function ManageServiceVendorsModal({
  isOpen,
  onClose,
  onRefresh,
  onOpenAssignVendor,
  service,
  clientName,
}: ManageServiceVendorsModalProps) {
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);
  const [viewingAssignment, setViewingAssignment] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editState, editFormAction, isEditPending] = useActionState(
    updateVendorAssignmentAction,
    null
  );
  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (editState?.success) {
      success("Assignment updated", "Vendor cost and payment status updated.");
      setEditingAssignment(null);
      onRefresh();
    } else if (editState?.error) {
      toastError("Update failed", editState.error);
    }
  }, [editState, success, toastError, onRefresh]);

  if (!isOpen || !service) return null;

  const assignments = service.vendor_assignments || [];
  const totalVendorCost = assignments.reduce(
    (sum, a) => sum + (Number(a.agreed_cost) || 0),
    0
  );
  const serviceFee = Number(service.service_fee) || 0;
  const remainingMargin = serviceFee - totalVendorCost;

  const handleRemove = async (assignment: any) => {
    const vName = assignment.vendor?.name || "this vendor";
    if (
      !confirm(
        `Are you sure you want to remove ${vName} from "${service.service_name}"? This only removes the assignment from this service and will not delete the vendor record.`
      )
    ) {
      return;
    }

    setDeletingId(assignment.id);
    try {
      const res = await removeVendorAssignmentAction(assignment.id);
      if (res.error) {
        toastError("Failed to remove assignment", res.error);
      } else {
        success("Vendor unassigned", `${vName} removed from service.`);
        onRefresh();
      }
    } catch {
      toastError("Failed to remove assignment", "Server connection error.");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Partially Paid":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Pending":
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center font-bold">
              <Store size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Manage Service Vendors & Outsourcing
              </h3>
              <p className="text-[11px] text-slate-500">
                Client: <strong className="text-slate-700">{clientName}</strong> • Service:{" "}
                <strong className="text-slate-700">{service.service_name}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Summary Financial Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-medium block">Client Service Fee</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">
                {formatINR(serviceFee)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-medium block">Total Vendor Cost</span>
              <span className="text-base font-bold text-[#0481A2] mt-0.5 block">
                {formatINR(totalVendorCost)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-medium block">
                Remaining Margin (Pre-tax)
              </span>
              <span
                className={`text-base font-bold mt-0.5 block ${
                  remainingMargin < 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {formatINR(remainingMargin)}
              </span>
            </div>
          </div>

          {remainingMargin < 0 && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] flex items-center gap-1.5 font-medium">
              <AlertCircle size={14} className="shrink-0" />
              <span>
                Warning: Total vendor costs ({formatINR(totalVendorCost)}) exceed the client service fee (
                {formatINR(serviceFee)}).
              </span>
            </div>
          )}

          {/* Edit Assignment Form if open */}
          {editingAssignment && (
            <div className="p-4 bg-sky-50/50 border border-sky-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-sky-100">
                <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Edit2 size={13} className="text-[#0481A2]" />
                  <span>Edit: {editingAssignment.vendor?.name}</span>
                </h5>
                <button
                  onClick={() => setEditingAssignment(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <form action={editFormAction} className="space-y-3">
                <input type="hidden" name="assignment_id" value={editingAssignment.id} />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Agreed Vendor Cost (₹) *
                    </label>
                    <input
                      name="agreed_cost"
                      type="number"
                      step="any"
                      min="0"
                      required
                      defaultValue={editingAssignment.agreed_cost}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Vendor Payment Status
                    </label>
                    <select
                      name="payment_status"
                      defaultValue={editingAssignment.payment_status}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={editingAssignment.notes || ""}
                    placeholder="Milestone instructions or remarks..."
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingAssignment(null)}
                    className="px-3 py-1 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEditPending}
                    className="px-3.5 py-1 font-semibold text-white bg-[#0481A2] hover:bg-[#036c88] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isEditPending ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* View Details Drawer/Card */}
          {viewingAssignment && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h5 className="font-bold text-slate-800">
                  Vendor Partner Details: {viewingAssignment.vendor?.name}
                </h5>
                <button
                  onClick={() => setViewingAssignment(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Category</span>
                  <span className="font-semibold text-slate-800">{viewingAssignment.vendor?.category || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Contact Person</span>
                  <span className="font-semibold text-slate-800">{viewingAssignment.vendor?.contact_person || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Phone</span>
                  <span className="font-semibold text-slate-800">{viewingAssignment.vendor?.phone || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Email</span>
                  <span className="font-semibold text-slate-800">{viewingAssignment.vendor?.email || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Agreed Cost</span>
                  <span className="font-bold text-slate-900">{formatINR(Number(viewingAssignment.agreed_cost) || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(viewingAssignment.payment_status)}`}>
                    {viewingAssignment.payment_status}
                  </span>
                </div>
              </div>

              {viewingAssignment.notes && (
                <div className="pt-2 border-t border-slate-200 text-[11px]">
                  <span className="text-slate-400 block">Assignment Notes:</span>
                  <p className="text-slate-700 mt-0.5 italic">{viewingAssignment.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Assigned Vendors Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Assigned Partners ({assignments.length})
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenAssignVendor();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0481A2] hover:bg-[#036c88] text-white font-semibold rounded text-[11px] transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>Assign Another Vendor</span>
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <p>No external vendor assigned to this service deliverable.</p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenAssignVendor();
                  }}
                  className="text-[#0481A2] font-semibold hover:underline cursor-pointer"
                >
                  + Assign First Vendor
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200 text-[11px]">
                    <th className="py-2 px-3">Vendor / Partner</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-right">Agreed Cost</th>
                    <th className="py-2 px-3 text-center">Payment Status</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignments.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => setViewingAssignment(a)}
                          className="font-semibold text-slate-900 hover:text-[#0481A2] hover:underline text-left cursor-pointer"
                        >
                          {a.vendor?.name || "Vendor"}
                        </button>
                        <span className="block text-[10px] text-slate-400">
                          {a.vendor?.contact_person !== "-" ? a.vendor?.contact_person : a.vendor?.phone}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        {a.vendor?.category || "General"}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatINR(Number(a.agreed_cost) || 0)}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(
                            a.payment_status
                          )}`}
                        >
                          {a.payment_status === "Paid" && <CheckCircle2 size={10} />}
                          {a.payment_status === "Pending" && <Clock size={10} />}
                          {a.payment_status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setViewingAssignment(null);
                              setEditingAssignment(a);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Edit assignment"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleRemove(a)}
                            disabled={deletingId === a.id}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer disabled:opacity-50"
                            title="Remove assignment"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs shadow-2xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

