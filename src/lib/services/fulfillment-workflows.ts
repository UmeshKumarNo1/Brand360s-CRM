export interface FulfillmentStage {
  name: string;
  status: "completed" | "current" | "upcoming";
}

/**
 * Standard fulfillment stage presets for common service types.
 */
export const DEFAULT_SERVICE_STAGES: Record<string, string[]> = {
  compliance: ["Onboarding", "Doc Collection", "Preparation", "Filing", "Completed"],
  trademark: ["Onboarding", "Search & Check", "Filing", "Examination", "Registration"],
  incorporation: ["Name Approval", "DSC & DIN", "Spice+ Filing", "Incorporation Cert", "PAN & TAN"],
  gst: ["Onboarding", "Document Verification", "ARN Generation", "Verification", "GST Certificate"],
  website: ["Requirements", "UI/UX Design", "Development", "Client Review", "Deployment"],
  general: ["Onboarding", "Doc Collection", "Preparation", "Filing", "Closure"],
};

/**
 * Match a service name to the appropriate workflow stage template.
 */
export function getServiceFulfillmentPreset(serviceName: string, serviceCategory?: string): string[] {
  const norm = (serviceName + " " + (serviceCategory || "")).toLowerCase();

  if (norm.includes("trademark") || norm.includes("ip") || norm.includes("patent") || norm.includes("copyright")) {
    return DEFAULT_SERVICE_STAGES.trademark;
  }
  if (norm.includes("incorporat") || norm.includes("pvt ltd") || norm.includes("llp") || norm.includes("opc") || norm.includes("company reg")) {
    return DEFAULT_SERVICE_STAGES.incorporation;
  }
  if (norm.includes("gst")) {
    return DEFAULT_SERVICE_STAGES.gst;
  }
  if (norm.includes("web") || norm.includes("app") || norm.includes("software") || norm.includes("design")) {
    return DEFAULT_SERVICE_STAGES.website;
  }
  if (norm.includes("compliance") || norm.includes("annual") || norm.includes("roc") || norm.includes("audit")) {
    return DEFAULT_SERVICE_STAGES.compliance;
  }

  return DEFAULT_SERVICE_STAGES.general;
}

/**
 * Derives the active stages, current stage name/description, and progress %
 * from the service's current status and any custom stage configuration.
 */
export function computeServiceFulfillment(service: any): {
  stages: FulfillmentStage[];
  progressPercentage: number;
  currentStageName: string;
  currentStageDescription: string;
} {
  // If stored in DB, use it
  if (Array.isArray(service.fulfillment_stages) && service.fulfillment_stages.length > 0) {
    const stages: FulfillmentStage[] = service.fulfillment_stages;
    const completedCount = stages.filter((s) => s.status === "completed").length;
    const currentIdx = stages.findIndex((s) => s.status === "current");
    const progress =
      service.progress_percentage !== undefined && service.progress_percentage !== null
        ? Number(service.progress_percentage)
        : Math.round(((completedCount + (currentIdx !== -1 ? 0.5 : 0)) / stages.length) * 100);

    const currentStage = stages.find((s) => s.status === "current") || stages[stages.length - 1];
    return {
      stages,
      progressPercentage: Math.min(100, Math.max(0, progress)),
      currentStageName: service.current_stage_name || currentStage?.name || "In Progress",
      currentStageDescription: service.current_stage_description || "",
    };
  }

  // Derive intelligently from service status
  const preset = getServiceFulfillmentPreset(service.service_name || "", service.service_category || "");
  const status = (service.service_status || "Pending").toLowerCase();

  let completedUpTo = 0;
  let currentStageIndex = 0;
  let stageDescription = "Work in progress";

  if (status === "completed") {
    completedUpTo = preset.length;
    currentStageIndex = -1;
    stageDescription = "Deliverable completed & approved";
  } else if (status === "processing" || status === "in progress") {
    completedUpTo = Math.max(1, Math.floor(preset.length / 2));
    currentStageIndex = completedUpTo;
    stageDescription = "Work in progress";
  } else if (status === "waiting for approval" || status === "documents pending") {
    completedUpTo = 1;
    currentStageIndex = 1;
    stageDescription = "Documents under verification";
  } else if (status === "on hold") {
    completedUpTo = 1;
    currentStageIndex = 1;
    stageDescription = "On hold by client";
  } else {
    // Pending / New
    completedUpTo = 0;
    currentStageIndex = 0;
    stageDescription = "Awaiting kick-off";
  }

  const stages: FulfillmentStage[] = preset.map((name, idx) => {
    if (idx < completedUpTo) {
      return { name, status: "completed" };
    }
    if (idx === currentStageIndex) {
      return { name, status: "current" };
    }
    return { name, status: "upcoming" };
  });

  const progressPercentage =
    status === "completed"
      ? 100
      : Math.round((completedUpTo / preset.length) * 100);

  const currentStageName =
    status === "completed"
      ? "Completed"
      : stages[currentStageIndex]?.name || "Onboarding";

  return {
    stages,
    progressPercentage,
    currentStageName,
    currentStageDescription: stageDescription,
  };
}

