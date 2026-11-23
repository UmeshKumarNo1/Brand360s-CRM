"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X, Sparkles, Layers } from "lucide-react";
import { Brand360ServiceCategory } from "@/lib/services/service-catalogue-master";

export interface ServiceComboboxItem {
  id?: string;
  name: string;
  category: Brand360ServiceCategory | string;
  default_service_fee?: number;
  default_govt_fee?: number;
  workflow_preset?: string;
  description?: string;
  is_renewable?: boolean;
  renewal_frequency?: "Monthly" | "Quarterly" | "Half-Yearly" | "Annually" | "Custom";
  renewal_duration_months?: number;
  default_renewal_amount?: number;
  default_reminder_days?: number;
}

interface ServiceComboboxProps {
  catalog: ServiceComboboxItem[];
  selectedItem: ServiceComboboxItem | null;
  onSelect: (item: ServiceComboboxItem | null) => void;
  onCustomTextChange?: (text: string) => void;
  placeholder?: string;
}

export function ServiceCombobox({
  catalog,
  selectedItem,
  onSelect,
  onCustomTextChange,
  placeholder = "Search services catalog or type custom...",
}: ServiceComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync internal display when an item is chosen or cleared
  useEffect(() => {
    if (selectedItem) {
      setSearchQuery(selectedItem.name);
    } else {
      setSearchQuery("");
    }
  }, [selectedItem]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter items matching query by name or category
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q))
    );
  }, [catalog, searchQuery]);

  // Reset highlight index when filter changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredItems]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setIsOpen(true);

    if (onCustomTextChange) {
      onCustomTextChange(val);
    }

    // Check if typed text matches an item exactly
    const exact = catalog.find(
      (c) => c.name.trim().toLowerCase() === val.trim().toLowerCase()
    );
    if (exact) {
      onSelect(exact);
    } else if (selectedItem && selectedItem.name !== val) {
      // User is editing custom text
      onSelect(null);
    }
  };

  const handleSelectItem = (item: ServiceComboboxItem) => {
    onSelect(item);
    setSearchQuery(item.name);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setSearchQuery("");
    if (onCustomTextChange) {
      onCustomTextChange("");
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : prev));
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[highlightedIndex]) {
        handleSelectItem(filteredItems[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const scrollHighlightedIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-combobox-item]");
    if (items[index]) {
      (items[index] as HTMLElement).scrollIntoView({
        block: "nearest",
      });
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search
          size={14}
          className="absolute left-3 text-slate-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-8 pr-16 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2]/20 transition-all"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
          >
            <ChevronDown size={14} className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1 text-xs divide-y divide-slate-50 animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {filteredItems.length === 0 ? (
            <div className="p-3 text-center text-slate-500">
              <p className="font-semibold text-slate-700">No catalogue matches</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Press Tab or click below to use &ldquo;{searchQuery}&rdquo; as a custom service.
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = selectedItem?.name === item.name;
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={`${item.name}-${idx}`}
                  data-combobox-item
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelectItem(item)}
                  className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                    isHighlighted ? "bg-sky-50/80" : "hover:bg-slate-50"
                  } ${isSelected ? "bg-sky-50 text-[#0481A2] font-semibold" : "text-slate-800"}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium truncate">{item.name}</span>
                      {isSelected && <Check size={12} className="text-[#0481A2] shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                        {item.category}
                      </span>
                      {item.default_service_fee !== undefined && item.default_service_fee > 0 && (
                        <span className="text-[10.5px] text-emerald-600 font-medium">
                          ₹{item.default_service_fee.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {searchQuery && !filteredItems.some((i) => i.name.toLowerCase() === searchQuery.trim().toLowerCase()) && (
            <div
              onClick={() => {
                if (onCustomTextChange) onCustomTextChange(searchQuery);
                setIsOpen(false);
              }}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center gap-2 text-slate-700 border-t border-slate-100"
            >
              <Sparkles size={13} className="text-[#0481A2] shrink-0" />
              <span className="truncate">
                Use custom service: <strong className="text-slate-900">&ldquo;{searchQuery}&rdquo;</strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

