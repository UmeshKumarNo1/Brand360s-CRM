import React from "react";
import { Check, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FulfillmentStage } from "@/lib/services/fulfillment-workflows";

interface ServiceFulfillmentTimelineProps {
  stages: FulfillmentStage[];
  currentStageName?: string;
  progressPercentage?: number;
  interactive?: boolean;
  onStageClick?: (stageIndex: number) => void;
  className?: string;
  size?: "sm" | "md";
}

/**
 * ServiceFulfillmentTimeline
 * 
 * Perfectly aligned horizontal milestone timeline:
 * - A single, uninterrupted straight horizontal connecting line directly behind circles.
 * - Every milestone circle is vertically centered on the exact midpoint of the connecting line.
 * - Evenly distributed milestone columns.
 * - Milestone labels centered directly underneath their respective circles with text wrapping.
 * - Completed: Emerald/Green circle with white check icon.
 * - Current Active: Blue circle with subtle outer ring.
 * - Upcoming: White circle with light gray border.
 * - Responsive: Works cleanly across 2, 5, or more stages without shifting.
 */
export function ServiceFulfillmentTimeline({
  stages = [],
  currentStageName,
  progressPercentage,
  interactive = false,
  onStageClick,
  className,
  size = "md",
}: ServiceFulfillmentTimelineProps) {
  if (!stages || stages.length === 0) {
    return null;
  }

  const isSmall = size === "sm";
  const circleSize = isSmall ? "w-4 h-4" : "w-5 h-5";
  const checkSize = isSmall ? 10 : 12;
  const dotSize = isSmall ? "w-1.5 h-1.5" : "w-2 h-2";
  const lineTop = isSmall ? "top-2" : "top-2.5"; // Center line precisely at 8px (sm) or 10px (md)
  const lineHeight = "h-[2px]";

  const completedCount = stages.filter((s) => s.status === "completed").length;
  const currentIdx = stages.findIndex((s) => s.status === "current");
  const totalStages = stages.length;

  // Compute connecting line progress percentage:
  // The line starts at the center of the first circle and ends at the center of the last circle.
  let lineFillPercent = 0;
  if (totalStages > 1) {
    if (completedCount === totalStages) {
      lineFillPercent = 100;
    } else if (currentIdx !== -1) {
      // Line is filled through completed stages up to the active node
      lineFillPercent = (currentIdx / (totalStages - 1)) * 100;
    } else {
      lineFillPercent = (completedCount / (totalStages - 1)) * 100;
    }
  }

  return (
    <div className={cn("relative w-full max-w-full select-none", className)}>
      {/* 
        1. Straight Continuous Connecting Line
        Inset by (100% / totalStages / 2) on left & right so line terminates exactly at the first and last node centers!
      */}
      {totalStages > 1 && (
        <div
          className={cn("absolute left-0 right-0 -translate-y-1/2 z-0", lineTop)}
          style={{
            left: `${100 / (totalStages * 2)}%`,
            right: `${100 / (totalStages * 2)}%`,
          }}
        >
          {/* Base track (upcoming light-gray) */}
          <div className={cn("w-full bg-slate-200 rounded-full", lineHeight)}>
            {/* Active/Completed filled track */}
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                completedCount === totalStages
                  ? "bg-[#00607A]"
                  : "bg-gradient-to-r from-[#00607A] via-[#0481A2] to-sky-400"
              )}
              style={{ width: `${Math.min(100, Math.max(0, lineFillPercent))}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. Evenly Distributed Node Columns & Centered Labels */}
      <div className="relative z-10 flex items-start justify-between w-full">
        {stages.map((stage, idx) => {
          const isDone = stage.status === "completed";
          const isCurrent = stage.status === "current";
          const isUpcoming = stage.status === "upcoming";

          return (
            <div
              key={`${stage.name}-${idx}`}
              className="flex-1 flex flex-col items-center px-0.5 min-w-0"
            >
              {/* Milestone Circle */}
              <div
                onClick={() => {
                  if (interactive && onStageClick) {
                    onStageClick(idx);
                  }
                }}
                className={cn(
                  circleSize,
                  "rounded-full flex items-center justify-center shrink-0 transition-all select-none",
                  interactive && "cursor-pointer hover:scale-110",
                  isDone && "bg-[#00607A] text-white shadow-xs ring-2 ring-sky-100",
                  isCurrent && "bg-white border-2 border-[#00607A] text-[#00607A] ring-4 ring-sky-100 shadow-xs",
                  isUpcoming && "bg-white border border-slate-300 text-transparent"
                )}
                title={`${stage.name} (${isDone ? "Completed" : isCurrent ? "Active Milestone" : "Upcoming"})`}
              >
                {isDone ? (
                  <Check size={checkSize} strokeWidth={3} className="text-white shrink-0" />
                ) : isCurrent ? (
                  <div className={cn(dotSize, "rounded-full bg-[#00607A] shrink-0")} />
                ) : null}
              </div>

              {/* Centered Milestone Label below Circle with ellipsis tooltip */}
              <div className="w-full mt-1.5 px-0.5 text-center flex justify-center">
                <span
                  className={cn(
                    "block text-center font-medium leading-tight tracking-tight transition-colors truncate whitespace-nowrap overflow-hidden max-w-full",
                    isSmall ? "text-[8.5px]" : "text-[10px]",
                    isCurrent && "text-[#00607A] font-bold",
                    isDone && "text-slate-700",
                    isUpcoming && "text-slate-400 font-normal"
                  )}
                  style={{
                    wordBreak: "normal",
                    overflowWrap: "normal",
                  }}
                  title={stage.name}
                >
                  {stage.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
