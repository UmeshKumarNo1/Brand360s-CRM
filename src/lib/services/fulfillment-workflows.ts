export interface FulfillmentStage {
  name: string;
  status: "completed" | "current" | "upcoming";
}

export interface WorkflowTemplateItem {
  id: string;
  name: string;
  description?: string;
  stages: string[];
  is_active?: boolean;
}

/**
 * Standard fulfillment stage presets for common service types.
 * Initial templates matching the BRAND 360s CRM specification:
 * - Website Development (5 stages)
 * - Social Media Marketing (6 stages)
 * - Trademark Filing (6 stages)
 * - Company Registration (6 stages)
 * - GST Registration (5 stages)
 * - Annual Compliance (5 stages)
 * - General Service (5 stages)
 */
export const DEFAULT_SERVICE_STAGES: Record<string, string[]> = {
  website: ["Requirements", "UI/UX Design", "Development", "Client Review", "Deployment"],
  smm: ["Client Onboarding", "Strategy & Planning", "Content Creation", "Client Approval", "Publishing", "Performance Reporting"],
  trademark: ["Client Onboarding", "Document Collection", "Trademark Search", "Application Filing", "Examination", "Registration"],
  incorporation: ["Document Collection", "Name Approval", "Application Preparation", "Government Filing", "Government Processing", "Certificate Issued"],
  gst: ["Document Collection", "Application Preparation", "Application Submission", "Verification", "GSTIN Issued"],
  compliance: ["Onboarding", "Doc Collection", "Preparation", "Filing", "Completed"],
  general: ["Onboarding", "Doc Collection", "Preparation", "Filing", "Closure"],
};

export const WORKFLOW_OPTIONS: { id: string; label: string; stages: string[] }[] = [
  {
    id: "website",
    label: "Website Development (5 Stages: Requirements → UI/UX Design → Development → Client Review → Deployment)",
    stages: DEFAULT_SERVICE_STAGES.website,
  },
  {
    id: "smm",
    label: "Social Media Marketing (6 Stages: Onboarding → Strategy → Content → Approval → Publishing → Reporting)",
    stages: DEFAULT_SERVICE_STAGES.smm,
  },
  {
    id: "trademark",
    label: "Trademark Filing (6 Stages: Onboarding → Document Collection → Search → Filing → Examination → Registration)",
    stages: DEFAULT_SERVICE_STAGES.trademark,
  },
  {
    id: "incorporation",
    label: "Company Registration (6 Stages: Document Collection → Name Approval → Application Prep → Filing → Processing → Certificate)",
    stages: DEFAULT_SERVICE_STAGES.incorporation,
  },
  {
    id: "gst",
    label: "GST Registration (5 Stages: Document Collection → Prep → Submission → Verification → GSTIN Issued)",
    stages: DEFAULT_SERVICE_STAGES.gst,
  },
  {
    id: "compliance",
    label: "Annual Compliance (5 Stages: Onboarding → Doc Collection → Preparation → Filing → Completed)",
    stages: DEFAULT_SERVICE_STAGES.compliance,
  },
  {
    id: "general",
    label: "General Service (5 Stages: Onboarding → Doc Collection → Preparation → Filing → Closure)",
    stages: DEFAULT_SERVICE_STAGES.general,
  },
];

/**
 * Match a service name or explicit preset key to the appropriate workflow stage template.
 */
export function getServiceFulfillmentPreset(
  serviceName: string,
  serviceCategory?: string,
  explicitPreset?: string | null
): string[] {
  if (explicitPreset && DEFAULT_SERVICE_STAGES[explicitPreset.toLowerCase()]) {
    return DEFAULT_SERVICE_STAGES[explicitPreset.toLowerCase()];
  }

  const norm = (serviceName + " " + (serviceCategory || "")).toLowerCase();

  // 1. Social Media Marketing
  if (
    norm.includes("social media") ||
    norm.includes("smm") ||
    norm.includes("marketing") ||
    norm.includes("campaign") ||
    norm.includes("content creation") ||
    norm.includes("publishing") ||
    norm.includes("growth & visibility")
  ) {
    return DEFAULT_SERVICE_STAGES.smm;
  }

  // 2. Website & Software
  if (
    norm.includes("web") ||
    norm.includes("app") ||
    norm.includes("software") ||
    norm.includes("design") ||
    norm.includes("frontend") ||
    norm.includes("backend") ||
    norm.includes("ui/ux")
  ) {
    return DEFAULT_SERVICE_STAGES.website;
  }

  // 3. GST Registration & Tax
  if (norm.includes("gst")) {
    return DEFAULT_SERVICE_STAGES.gst;
  }

  // 4. Trademark Filing & IP
  if (
    norm.includes("trademark") ||
    norm.includes("ip") ||
    norm.includes("patent") ||
    norm.includes("copyright")
  ) {
    return DEFAULT_SERVICE_STAGES.trademark;
  }

  // 5. Company Registration & Incorporation
  if (
    norm.includes("incorporat") ||
    norm.includes("pvt ltd") ||
    norm.includes("llp") ||
    norm.includes("opc") ||
    norm.includes("company reg") ||
    norm.includes("registration")
  ) {
    return DEFAULT_SERVICE_STAGES.incorporation;
  }

  // 6. Annual Compliance & ROC
  if (
    norm.includes("compliance") ||
    norm.includes("annual") ||
    norm.includes("roc") ||
    norm.includes("audit") ||
    norm.includes("itr") ||
    norm.includes("tds")
  ) {
    return DEFAULT_SERVICE_STAGES.compliance;
  }

  return DEFAULT_SERVICE_STAGES.general;
}

/**
 * Derives the active stages, current stage name/description, and progress %
 * from the service's current status and persistent stage configuration.
 *
 * Rules:
 * - Completed stages remain marked as "completed" (green checkmark).
 * - The first incomplete stage is automatically the active milestone ("current", blue).
 * - All subsequent stages are "upcoming" (neutral).
 * - Progress is calculated strictly as completed stages / total stages.
 * - When all stages are completed, progress is 100% and currentStageName is "Completed".
 */
export function computeServiceFulfillment(service: any): {
  stages: FulfillmentStage[];
  progressPercentage: number;
  currentStageName: string;
  currentStageDescription: string;
} {
  const status = (service.service_status || service.serviceStatus || "Pending").toLowerCase();
  const isServiceCompleted = status === "completed";

  // If persistent fulfillment_stages are stored in the database, use them
  if (Array.isArray(service.fulfillment_stages) && service.fulfillment_stages.length > 0) {
    const rawStages: FulfillmentStage[] = service.fulfillment_stages;
    const totalStages = rawStages.length;

    // Sequential stage progression repair & normalization:
    // Find the first stage that is not completed
    const firstIncompleteIdx = rawStages.findIndex((s) => s.status !== "completed");
    const completedCount = rawStages.filter((s) => s.status === "completed").length;

    const normalizedStages: FulfillmentStage[] = rawStages.map((stage, idx) => {
      if (isServiceCompleted || firstIncompleteIdx === -1) {
        return { name: stage.name, status: "completed" };
      }
      if (idx < firstIncompleteIdx) {
        return { name: stage.name, status: "completed" };
      }
      if (idx === firstIncompleteIdx) {
        return { name: stage.name, status: "current" };
      }
      return { name: stage.name, status: "upcoming" };
    });

    const isAllComplete = isServiceCompleted || completedCount === totalStages || firstIncompleteIdx === -1;
    const activeStage = isAllComplete
      ? null
      : normalizedStages.find((s) => s.status === "current");

    const progressPercentage = isAllComplete
      ? 100
      : totalStages > 0
      ? Math.round((completedCount / totalStages) * 100)
      : 0;

    const currentStageName = isAllComplete
      ? "Completed"
      : activeStage?.name || service.current_stage_name || normalizedStages[0]?.name || "In Progress";

    return {
      stages: normalizedStages,
      progressPercentage,
      currentStageName,
      currentStageDescription: service.current_stage_description || (isAllComplete ? "Deliverable completed & approved" : "Work in progress"),
    };
  }

  // Derive intelligently from explicit workflow preset or service name/category
  const preset = getServiceFulfillmentPreset(
    service.service_name || service.serviceName || "",
    service.service_category || service.serviceCategory || "",
    service.workflow_preset || service.workflowPreset
  );

  let completedUpTo = 0;
  let stageDescription = "Work in progress";

  if (isServiceCompleted) {
    completedUpTo = preset.length;
    stageDescription = "Deliverable completed & approved";
  } else if (status === "processing" || status === "in progress") {
    completedUpTo = Math.max(1, Math.floor(preset.length / 2));
    stageDescription = "Work in progress";
  } else if (status === "waiting for approval" || status === "documents pending") {
    completedUpTo = 1;
    stageDescription = "Documents under verification";
  } else if (status === "on hold") {
    completedUpTo = 1;
    stageDescription = "On hold by client";
  } else {
    // Pending / New
    completedUpTo = 0;
    stageDescription = "Awaiting kick-off";
  }

  const stages: FulfillmentStage[] = preset.map((name, idx) => {
    if (completedUpTo === preset.length) {
      return { name, status: "completed" };
    }
    if (idx < completedUpTo) {
      return { name, status: "completed" };
    }
    if (idx === completedUpTo) {
      return { name, status: "current" };
    }
    return { name, status: "upcoming" };
  });

  const progressPercentage =
    isServiceCompleted || completedUpTo === preset.length
      ? 100
      : Math.round((completedUpTo / preset.length) * 100);

  const currentStageName =
    isServiceCompleted || completedUpTo === preset.length
      ? "Completed"
      : stages.find((s) => s.status === "current")?.name || preset[0] || "Onboarding";

  return {
    stages,
    progressPercentage,
    currentStageName,
    currentStageDescription: stageDescription,
  };
}
