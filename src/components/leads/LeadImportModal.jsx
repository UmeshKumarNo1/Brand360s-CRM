"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  Users,
  Calendar,
  Building2,
  Download,
  Loader2,
  RefreshCw,
  Info,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import {
  parseExcelWorkbook,
  groupAndValidateLeads,
} from "@/lib/leads/excel-import-parser";
import {
  previewLeadsFileAction,
  executeLeadsImportAction,
  fetchActiveSalespeopleAction,
  fetchExistingEntityIdsAction,
  downloadSkippedRecordsBufferAction,
} from "@/app/actions/leads";
import { useToast } from "@/components/common/ToastProvider";

export function LeadImportModal({ isOpen, onClose, onSuccess }) {
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState("");

  // Administrator Settings
  const [initialFollowupDate, setInitialFollowupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [initialFollowupType, setInitialFollowupType] = useState("Call");

  // Roster & Existing Entity IDs for Instant Duplicate Check
  const [salespeople, setSalespeople] = useState([]);
  const [existingEntityIds, setExistingEntityIds] = useState(new Set());
  const [isExecuting, setIsExecuting] = useState(false);
  const [importReport, setImportReport] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchActiveSalespeopleAction().then((sp) => setSalespeople(sp || []));
      fetchExistingEntityIdsAction().then((ids) => {
        setExistingEntityIds(new Set((ids || []).map((id) => String(id).trim().toUpperCase())));
      });
    } else {
      setFile(null);
      setPreviewData(null);
      setImportReport(null);
      setIsExecuting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const processFilePreview = async (selectedFile, sheetToUse) => {
    try {
      setIsLoadingPreview(true);
      const arrayBuffer = await selectedFile.arrayBuffer();
      const { sheetNames, activeSheetName, headers, rawRows } = parseExcelWorkbook(arrayBuffer, sheetToUse);
      const { totalRawRows, uniqueCompanies, groupedLeads, invalidRows } = groupAndValidateLeads(rawRows);

      const duplicatesCount = groupedLeads.filter(
        (l) => l.entityId && existingEntityIds.has(l.entityId.trim().toUpperCase())
      ).length;

      const previewList = groupedLeads.slice(0, 25).map((lead) => ({
        ...lead,
        isDuplicate: lead.entityId ? existingEntityIds.has(lead.entityId.trim().toUpperCase()) : false,
      }));

      setPreviewData({
        success: true,
        fileName: selectedFile.name,
        sheetNames,
        activeSheetName,
        headers,
        totalRawRows,
        uniqueCompanies,
        duplicatesCount,
        invalidCount: invalidRows.length,
        previewLeads: previewList,
      });
      setSelectedSheet(activeSheetName || (sheetNames && sheetNames[0]) || "");
    } catch (err) {
      console.warn("Client preview error, falling back to server preview:", err);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        if (sheetToUse) formData.append("sheetName", sheetToUse);
        const res = await previewLeadsFileAction(formData);
        if (res.success) {
          setPreviewData(res);
          setSelectedSheet(res.activeSheetName || (res.sheetNames && res.sheetNames[0]) || "");
        } else {
          toastError("Preview Failed", res.error || "Could not read spreadsheet.");
          setFile(null);
        }
      } catch (srvErr) {
        toastError("Preview Failed", srvErr.message || "Could not read spreadsheet.");
        setFile(null);
      }
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleFileSelected = async (selectedFile) => {
    if (!selectedFile) return;
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
      toastError("Invalid File", "Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.");
      return;
    }

    setFile(selectedFile);
    setPreviewData(null);
    setImportReport(null);
    await processFilePreview(selectedFile, undefined);
  };

  const handleSheetChange = async (sheet) => {
    if (!file || sheet === selectedSheet) return;
    setSelectedSheet(sheet);
    await processFilePreview(file, sheet);
  };

  const handleExecuteImport = async () => {
    if (!file) return;
    setIsExecuting(true);

    const formData = new FormData();
    formData.append("file", file);
    if (selectedSheet) formData.append("sheetName", selectedSheet);
    formData.append("initialFollowupDate", initialFollowupDate);
    formData.append("initialFollowupType", initialFollowupType);

    try {
      const res = await executeLeadsImportAction(formData);
      if (res.success) {
        setImportReport(res.report);
        success("Import Complete", `Successfully created ${res.report.leadsCreated} new leads and follow-ups.`);
        if (onSuccess) onSuccess();
      } else {
        toastError("Import Failed", res.error || "Error importing leads.");
      }
    } catch (err) {
      toastError("Import Error", err.message || "Failed to execute import.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDownloadSkipped = async () => {
    if (!importReport?.skippedRecords || importReport.skippedRecords.length === 0) return;
    try {
      const res = await downloadSkippedRecordsBufferAction(importReport.skippedRecords);
      if (res.success && res.base64) {
        const link = document.createElement("a");
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.base64}`;
        link.download = `Skipped_Leads_${new Date().toISOString().split("T")[0]}.xlsx`;
        link.click();
      }
    } catch (err) {
      toastError("Download failed", err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-[#1B3260]">
                Bulk Excel / CSV Lead Import
              </h3>
              <p className="text-xs text-slate-500">
                Continuous Round-Robin Salesperson Assignment &amp; Automatic Follow-up Creation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-6">
          {/* STEP 1: IMPORT REPORT (If Completed) */}
          {importReport ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-2">
                <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
                <h4 className="font-heading font-bold text-lg text-emerald-900">
                  Bulk Lead Import Completed Successfully
                </h4>
                <p className="text-xs text-emerald-700 max-w-lg mx-auto">
                  New company leads have been created and assigned individually to active salespersons.
                  Initial follow-ups have been scheduled. These leads now appear in the Follow-ups page.
                </p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                  <p className="text-slate-400 text-[11px] font-semibold">Spreadsheet Rows</p>
                  <p className="text-xl font-bold text-slate-800 font-number mt-0.5">{importReport.totalRows}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                  <p className="text-slate-400 text-[11px] font-semibold">Unique Companies</p>
                  <p className="text-xl font-bold text-slate-800 font-number mt-0.5">{importReport.uniqueCompanies}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center">
                  <p className="text-emerald-700 text-[11px] font-bold">Leads Created</p>
                  <p className="text-xl font-bold text-emerald-800 font-number mt-0.5">{importReport.leadsCreated}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-center">
                  <p className="text-amber-700 text-[11px] font-bold">Duplicates Skipped</p>
                  <p className="text-xl font-bold text-amber-800 font-number mt-0.5">{importReport.duplicatesSkipped}</p>
                </div>
              </div>

              {/* Salesperson Distribution */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Users size={14} className="text-[#0481A2]" />
                  <span>Round-Robin Salesperson Assignment Distribution</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {Object.entries(importReport.salespersonDistribution || {}).map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-700">{name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#0481A2]/10 text-[#0481A2] font-bold font-number">
                        {count} leads
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Download Skipped Report */}
              {importReport.skippedRecords && importReport.skippedRecords.length > 0 && (
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {importReport.skippedRecords.length} Records Were Skipped or Flagged as Duplicate
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Download the report to review why records were skipped.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadSkipped}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download Report (.xlsx)</span>
                  </button>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Close &amp; View Leads in Follow-ups
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: UPLOAD & PREVIEW FLOW */
            <>
              {/* Drag & Drop Zone */}
              {!previewData && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.[0]) handleFileSelected(e.dataTransfer.files[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-10 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-[#0481A2] bg-[#0481A2]/5"
                      : "border-slate-300 hover:border-[#0481A2] hover:bg-slate-50/60"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                    }}
                  />
                  {isLoadingPreview ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Loader2 size={32} className="animate-spin text-[#0481A2]" />
                      <p className="font-semibold text-xs">Parsing spreadsheet and grouping directors...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0481A2] flex items-center justify-center">
                        <Upload size={24} />
                      </div>
                      <p className="font-bold text-slate-800 text-sm">
                        Click to upload or drag &amp; drop company spreadsheet
                      </p>
                      <p className="text-slate-400 text-xs">
                        Supports Excel (.xlsx, .xls) and CSV (.csv) with company and director details
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Preview & Confirmation View */}
              {previewData && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* File & Sheet Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet size={18} className="text-[#0481A2]" />
                      <div>
                        <p className="font-bold text-slate-800">{previewData.fileName}</p>
                        <p className="text-[11px] text-slate-500">
                          {previewData.totalRawRows} rows • {previewData.uniqueCompanies} unique companies
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {previewData.sheetNames && previewData.sheetNames.length > 1 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">Worksheet:</span>
                          <select
                            value={selectedSheet}
                            onChange={(e) => handleSheetChange(e.target.value)}
                            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                          >
                            {previewData.sheetNames.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setFile(null);
                          setPreviewData(null);
                        }}
                        className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      >
                        Change File
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <p className="text-slate-400 text-[10px] font-bold">TOTAL ROWS</p>
                      <p className="text-lg font-bold text-slate-800 font-number">{previewData.totalRawRows}</p>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <p className="text-[#0481A2] text-[10px] font-bold">UNIQUE COMPANIES</p>
                      <p className="text-lg font-bold text-[#0481A2] font-number">{previewData.uniqueCompanies}</p>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <p className="text-amber-600 text-[10px] font-bold">EXISTING DUPLICATES</p>
                      <p className="text-lg font-bold text-amber-700 font-number">{previewData.duplicatesCount}</p>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <p className="text-emerald-700 text-[10px] font-bold">READY TO IMPORT</p>
                      <p className="text-lg font-bold text-emerald-800 font-number">
                        {Math.max(0, previewData.uniqueCompanies - previewData.duplicatesCount)}
                      </p>
                    </div>
                  </div>

                  {/* Settings & Round Robin Configuration */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Calendar size={14} className="text-[#0481A2]" />
                        <span>Automatic Initial Follow-up Settings</span>
                      </h5>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-slate-600 text-[11px] mb-1">Follow-up Due Date *</label>
                          <input
                            type="date"
                            required
                            value={initialFollowupDate}
                            onChange={(e) => setInitialFollowupDate(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 text-[11px] mb-1">Initial Contact Channel</label>
                          <select
                            value={initialFollowupType}
                            onChange={(e) => setInitialFollowupType(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                          >
                            <option value="Call">Phone Call</option>
                            <option value="Email">Email Outreach</option>
                            <option value="Meeting">Meeting / Consultation</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Users size={14} className="text-[#0481A2]" />
                        <span>Active Round-Robin Salespersons ({salespeople.length})</span>
                      </h5>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {salespeople.map((sp, idx) => (
                          <div key={sp.id} className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-100 text-[11px]">
                            <span className="font-medium text-slate-700">{sp.full_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Turn #{idx + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Data Preview Table */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex items-center justify-between">
                      <span>Data Preview (First 25 Unique Companies)</span>
                      <span className="text-[11px] text-slate-400 font-normal">Directors grouped by Entity ID</span>
                    </div>
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                            <th className="py-2 px-3">Company Name</th>
                            <th className="py-2 px-3">Entity ID</th>
                            <th className="py-2 px-3">Primary Director</th>
                            <th className="py-2 px-3">Mobile / Email</th>
                            <th className="py-2 px-3">City / State</th>
                            <th className="py-2 px-3">Directors</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {previewData.previewLeads.map((item, idx) => (
                            <tr key={idx} className={item.isDuplicate ? "bg-amber-50/50" : "hover:bg-slate-50/60"}>
                              <td className="py-2 px-3 font-semibold text-slate-800">{item.name}</td>
                              <td className="py-2 px-3 font-mono">{item.entityId || "-"}</td>
                              <td className="py-2 px-3">{item.contactPerson || "-"}</td>
                              <td className="py-2 px-3 font-mono">{item.phone || item.email || "-"}</td>
                              <td className="py-2 px-3">{item.city || item.state || "-"}</td>
                              <td className="py-2 px-3">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold">
                                  {item.directors ? item.directors.length : 0}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                {item.isDuplicate ? (
                                  <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                                    Duplicate
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                                    New Lead
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-[11px] text-slate-500">
                      Imported records will be saved as <strong>Leads</strong> with follow-ups and will <strong>NOT</strong> appear on the Clients page until converted.
                    </p>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={isExecuting}
                        className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleExecuteImport}
                        disabled={isExecuting}
                        className="inline-flex items-center gap-1.5 px-6 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isExecuting ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Importing &amp; Assigning...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Confirm &amp; Import Leads</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
