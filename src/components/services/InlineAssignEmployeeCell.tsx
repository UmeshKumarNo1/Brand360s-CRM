"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { User, Check, Loader2, Search, X, UserMinus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { assignClientServiceEmployeeAction } from "@/app/actions/services";
import { fetchSalespeopleAction } from "@/app/actions/clients";

export interface EmployeeProfileOption {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface InlineAssignEmployeeCellProps {
  serviceId: string;
  clientId: string;
  assignedEmployeeId?: string | null;
  assignedEmployeeName?: string | null;
  editable?: boolean;
  onUpdated?: (employeeId: string | null, employeeName: string) => void;
  className?: string;
  showIcon?: boolean;
}

export function InlineAssignEmployeeCell({
  serviceId,
  clientId,
  assignedEmployeeId: initialEmployeeId,
  assignedEmployeeName: initialEmployeeName,
  editable = true,
  onUpdated,
  className,
  showIcon = true,
}: InlineAssignEmployeeCellProps) {
  const [currentId, setCurrentId] = useState<string | null>(initialEmployeeId || null);
  const [currentName, setCurrentName] = useState<string>(initialEmployeeName || "Unassigned");
  const [isOpen, setIsOpen] = useState(false);
  const [employees, setEmployees] = useState<EmployeeProfileOption[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentId(initialEmployeeId || null);
    setCurrentName(initialEmployeeName || "Unassigned");
  }, [initialEmployeeId, initialEmployeeName]);

  // Load active employees when popover opens
  useEffect(() => {
    if (isOpen && employees.length === 0) {
      setIsLoadingEmployees(true);
      fetchSalespeopleAction()
        .then((data) => {
          const activeOnly = (data || []).filter((e: any) => e.is_active !== false);
          setEmployees(activeOnly);
        })
        .catch((err) => {
          console.error("Failed to load employees:", err);
          setErrorMsg("Could not load employee list");
        })
        .finally(() => {
          setIsLoadingEmployees(false);
        });
    }
  }, [isOpen, employees.length]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
        setErrorMsg(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setSearchQuery("");
        setErrorMsg(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (emp: EmployeeProfileOption | null) => {
    setErrorMsg(null);
    const newId = emp ? emp.id : null;
    const newName = emp ? (emp.full_name || emp.email) : "Unassigned";

    startTransition(async () => {
      try {
        const res = await assignClientServiceEmployeeAction(serviceId, newId, clientId);
        if (res.error) {
          setErrorMsg(res.error);
          return;
        }
        setCurrentId(newId);
        setCurrentName(newName);
        setIsOpen(false);
        setSearchQuery("");
        if (onUpdated) {
          onUpdated(newId, newName);
        }
      } catch (err: any) {
        console.error("Error updating assignment:", err);
        setErrorMsg(err.message || "Failed to update employee assignment.");
      }
    });
  };

  const isAssigned = currentName && currentName !== "Unassigned" && currentName !== "-";

  if (!editable) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs text-slate-700", className)}>
        {showIcon && <User size={13} className="text-blue-600 shrink-0" />}
        <span className={cn("truncate font-medium", isAssigned ? "text-slate-800" : "text-slate-400 italic")}>
          {currentName}
        </span>
      </div>
    );
  }

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (emp.full_name && emp.full_name.toLowerCase().includes(q)) ||
      (emp.email && emp.email.toLowerCase().includes(q)) ||
      (emp.role && emp.role.toLowerCase().includes(q))
    );
  });

  return (
    <div className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setErrorMsg(null);
        }}
        disabled={isPending}
        title={isAssigned ? `Assigned to ${currentName}. Click to reassign.` : "Unassigned. Click to assign an employee."}
        className={cn(
          "group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer border select-none",
          isAssigned
            ? "bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 border-blue-200/80 shadow-2xs"
            : "bg-slate-50 hover:bg-slate-100 text-slate-500 border-dashed border-slate-300 hover:border-slate-400",
          isPending && "opacity-70 pointer-events-none"
        )}
      >
        {isPending ? (
          <Loader2 size={12} className="animate-spin text-blue-600 shrink-0" />
        ) : (
          showIcon && <User size={12} className={cn("shrink-0", isAssigned ? "text-blue-600" : "text-slate-400")} />
        )}
        <span className={cn("truncate max-w-[120px]", !isAssigned && "italic text-slate-400")}>
          {currentName}
        </span>
        <ChevronDown size={11} className="text-slate-400 group-hover:text-slate-600 shrink-0 transition-transform" />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 text-left text-xs space-y-2 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Popover Title & Close */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 px-1">
            <span className="font-bold text-slate-800 text-[11px] tracking-tight">Assign Employee</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
            >
              <X size={12} />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          {errorMsg && (
            <div className="text-[10px] text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Employee List */}
          <div className="max-h-48 overflow-y-auto space-y-0.5 divide-y divide-slate-50 pr-0.5">
            {isLoadingEmployees ? (
              <div className="flex items-center justify-center gap-1.5 py-4 text-slate-400 text-xs">
                <Loader2 size={13} className="animate-spin text-[#0481A2]" />
                <span>Loading employees...</span>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="py-3 text-center text-slate-400 text-[11px]">
                No matching active employees found.
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = emp.id === currentId;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelect(emp)}
                    disabled={isPending}
                    className={cn(
                      "w-full px-2 py-1.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors cursor-pointer",
                      isSelected ? "bg-blue-50 text-blue-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate text-xs">{emp.full_name || emp.email}</p>
                      <p className="text-[10px] text-slate-400 truncate uppercase tracking-wider font-sans">
                        {emp.role || "Employee"}
                      </p>
                    </div>
                    {isSelected && <Check size={13} className="text-blue-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Unassign / Clear Option */}
          {isAssigned && (
            <div className="pt-1.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleSelect(null)}
                disabled={isPending}
                className="w-full px-2 py-1.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <UserMinus size={13} className="shrink-0" />
                <span>Unassign (Set as Unassigned)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
