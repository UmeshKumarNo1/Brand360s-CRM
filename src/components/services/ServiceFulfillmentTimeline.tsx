import React from "react";
import { Check } from "lucide-react";
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
 * ServiceFulfillmentTimeline:
 * - Straight continuous horizontal connecting line passing through center of nodes.
 * - Completed/Active stages render a teal circle with a crisp white checkmark.
 * - When size="sm" (e.g. table view): Upcoming stages render as minimal dots on the track.
 * - When size="md" (e.g. service detail page): Upcoming stages render as clean outlined circles.
 * - Connecting line fills with teal up to the active milestone and remains light gray for upcoming.
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
  const totalStages = stages.length;

  const completedCount = stages.filter((s) => s.status === "completed").length;
  const currentIdx = stages.findIndex((s) => s.status === "current");

  // Determine active reached index
  let activeIdx = 0;
  if (completedCount === totalStages) {
    activeIdx = totalStages - 1;
  } else if (currentIdx !== -1) {
    activeIdx = currentIdx;
  } else if (completedCount > 0) {
    activeIdx = completedCount - 1;
  } else {
    activeIdx = 0;
  }

  // Calculate line fill percentage between node 0 and node (totalStages - 1)
  let lineFillPercent = 0;
  if (totalStages > 1) {
    if (completedCount === totalStages) {
      lineFillPercent = 100;
    } else {
      lineFillPercent = (activeIdx / (totalStages - 1)) * 100;
    }
  }

  const circleSize = isSmall ? "w-4 h-4" : "w-6 h-6";
  const checkSize = isSmall ? 9 : 13;
  const checkStrokeWidth = isSmall ? 3 : 2.5;
  const lineTop = isSmall ? "top-2" : "top-3";
  const lineHeight = isSmall ? "h-[1.5px]" : "h-[2px]";
  const themeColor = isSmall ? "bg-[#0481A2]" : "bg-[#005C72]";

  return (
    <div className={cn("relative w-full max-w-full select-none", className)}>
      {/* 1. Straight Continuous Connecting Line */}
      {totalStages > 1 && (
        <div
          className={cn("absolute left-0 right-0 -translate-y-1/2 z-0", lineTop)}
          style={{
            left: `${100 / (totalStages * 2)}%`,
            right: `${100 / (totalStages * 2)}%`,
          }}
        >
          {/* Base track */}
          <div className={cn("w-full bg-slate-200 rounded-full", lineHeight)}>
            {/* Filled track */}
            <div
              className={cn("h-full transition-all duration-300 rounded-full", themeColor)}
              style={{ width: `${Math.min(100, Math.max(0, lineFillPercent))}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. Evenly Distributed Milestone Nodes & Labels */}
      <div className="relative z-10 flex items-start justify-between w-full">
        {stages.map((stage, idx) => {
          const isReached = idx <= activeIdx;
          const isCurrent = idx === activeIdx;

          return (
            <div
              key={`${stage.name}-${idx}`}
              className={cn(
                "flex-1 flex flex-col items-center min-w-0",
                isSmall ? "px-0.5" : "px-1"
              )}
            >
              {/* Milestone Node Container */}
              <div
                onClick={() => {
                  if (interactive && onStageClick) {
                    onStageClick(idx);
                  }
                }}
                className={cn(
                  circleSize,
                  "flex items-center justify-center shrink-0 transition-all select-none",
                  interactive && "cursor-pointer hover:scale-110"
                )}
                title={`${stage.name} (${isReached ? (isCurrent ? "Active Milestone" : "Completed") : "Upcoming"})`}
              >
                {isReached ? (
                  <div
                    className={cn(
                      circleSize,
                      "rounded-full flex items-center justify-center shrink-0 text-white shadow-2xs",
                      themeColor,
                      !isSmall && "ring-4 ring-sky-100/50"
                    )}
                  >
                    <Check
                      size={checkSize}
                      strokeWidth={checkStrokeWidth}
                      className="text-white shrink-0"
                    />
                  </div>
                ) : isSmall ? (
                  /* Small dots for upcoming stages when isSmall, matching reference image */
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                ) : (
                  /* White circle with border when size is md (service detail page) */
                  <div className={cn(circleSize, "rounded-full bg-white border-2 border-slate-200 shrink-0")} />
                )}
              </div>

              {/* Centered Milestone Label below Circle */}
              <div className={cn("w-full text-center flex justify-center", isSmall ? "mt-1 px-0.5" : "mt-2 px-1")}>
                <span
                  className={cn(
                    "block text-center leading-tight tracking-tight transition-colors truncate whitespace-nowrap overflow-hidden max-w-full",
                    isSmall ? "text-[9px]" : "text-xs",
                    isReached ? "text-slate-900 font-bold" : "text-slate-400 font-normal"
                  )}
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
