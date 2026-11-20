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
 * ServiceFulfillmentTimeline matching Reference Design exactly:
 * - Straight continuous horizontal connecting line passing through center of circles.
 * - Completed / Current stage has teal background (#005C72) with white checkmark.
 * - Upcoming stages have white circles with subtle gray borders.
 * - Labels positioned cleanly underneath with bold active text.
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
  const circleSize = isSmall ? "w-4.5 h-4.5" : "w-6 h-6";
  const checkSize = isSmall ? 10 : 13;
  const lineTop = isSmall ? "top-[9px]" : "top-3";
  const lineHeight = "h-[2px]";

  const completedCount = stages.filter((s) => s.status === "completed").length;
  const currentIdx = stages.findIndex((s) => s.status === "current");
  const totalStages = stages.length;

  let lineFillPercent = 0;
  if (totalStages > 1) {
    if (completedCount === totalStages) {
      lineFillPercent = 100;
    } else if (currentIdx !== -1) {
      lineFillPercent = (currentIdx / (totalStages - 1)) * 100;
    } else {
      lineFillPercent = (completedCount / (totalStages - 1)) * 100;
    }
  }

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
              className={cn(
                "h-full rounded-full transition-all duration-300",
                completedCount === totalStages
                  ? "bg-[#005C72]"
                  : "bg-gradient-to-r from-[#005C72] to-sky-400"
              )}
              style={{ width: `${Math.min(100, Math.max(0, lineFillPercent))}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. Evenly Distributed Milestone Nodes & Labels */}
      <div className="relative z-10 flex items-start justify-between w-full">
        {stages.map((stage, idx) => {
          const isDone = stage.status === "completed";
          const isCurrent = stage.status === "current" || (currentIdx === -1 && idx === 0);
          const isUpcoming = !isDone && !isCurrent;

          return (
            <div
              key={`${stage.name}-${idx}`}
              className="flex-1 flex flex-col items-center px-1 min-w-0"
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
                  (isDone || isCurrent) && "bg-[#005C72] text-white shadow-xs ring-2 ring-sky-100",
                  isUpcoming && "bg-white border-2 border-slate-200 text-transparent"
                )}
                title={`${stage.name} (${isDone ? "Completed" : isCurrent ? "Active Milestone" : "Upcoming"})`}
              >
                {isDone || isCurrent ? (
                  <Check size={checkSize} strokeWidth={2.5} className="text-white shrink-0" />
                ) : null}
              </div>

              {/* Centered Milestone Label below Circle */}
              <div className="w-full mt-2 px-0.5 text-center flex justify-center">
                <span
                  className={cn(
                    "block text-center leading-tight tracking-tight transition-colors truncate whitespace-nowrap overflow-hidden max-w-full",
                    isSmall ? "text-[9px]" : "text-xs",
                    (isCurrent || isDone) ? "text-slate-900 font-bold" : "text-slate-500 font-normal"
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
