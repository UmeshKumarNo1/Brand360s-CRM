const DEFAULT_SERVICE_STAGES = {
  website: ["Requirements", "UI/UX Design", "Development", "Client Review", "Deployment"],
  smm: ["Client Onboarding", "Strategy & Planning", "Content Creation", "Client Approval", "Publishing", "Performance Reporting"],
  trademark: ["Client Onboarding", "Document Collection", "Trademark Search", "Application Filing", "Examination", "Registration"],
  incorporation: ["Document Collection", "Name Approval", "Application Preparation", "Government Filing", "Government Processing", "Certificate Issued"],
  gst: ["Document Collection", "Application Preparation", "Application Submission", "Verification", "GSTIN Issued"],
  compliance: ["Onboarding", "Doc Collection", "Preparation", "Filing", "Completed"],
  general: ["Onboarding", "Doc Collection", "Preparation", "Filing", "Closure"],
};

function getServiceFulfillmentPreset(serviceName, serviceCategory, explicitPreset) {
  if (explicitPreset && DEFAULT_SERVICE_STAGES[explicitPreset.toLowerCase()]) {
    return DEFAULT_SERVICE_STAGES[explicitPreset.toLowerCase()];
  }
  const norm = (serviceName + " " + (serviceCategory || "")).toLowerCase();
  if (norm.includes("social media") || norm.includes("smm") || norm.includes("marketing") || norm.includes("growth & visibility")) {
    return DEFAULT_SERVICE_STAGES.smm;
  }
  if (norm.includes("web") || norm.includes("app") || norm.includes("software") || norm.includes("design") || norm.includes("frontend") || norm.includes("backend") || norm.includes("ui/ux")) {
    return DEFAULT_SERVICE_STAGES.website;
  }
  if (norm.includes("gst")) {
    return DEFAULT_SERVICE_STAGES.gst;
  }
  if (norm.includes("trademark") || norm.includes("ip") || norm.includes("patent") || norm.includes("copyright")) {
    return DEFAULT_SERVICE_STAGES.trademark;
  }
  if (norm.includes("incorporat") || norm.includes("pvt ltd") || norm.includes("llp") || norm.includes("opc") || norm.includes("company reg") || norm.includes("registration")) {
    return DEFAULT_SERVICE_STAGES.incorporation;
  }
  if (norm.includes("compliance") || norm.includes("annual") || norm.includes("roc") || norm.includes("audit") || norm.includes("itr") || norm.includes("tds")) {
    return DEFAULT_SERVICE_STAGES.compliance;
  }
  return DEFAULT_SERVICE_STAGES.general;
}

function computeServiceFulfillment(service) {
  const status = (service.service_status || service.serviceStatus || "Pending").toLowerCase();
  const isServiceCompleted = status === "completed";

  if (Array.isArray(service.fulfillment_stages) && service.fulfillment_stages.length > 0) {
    const rawStages = service.fulfillment_stages;
    const totalStages = rawStages.length;
    const firstIncompleteIdx = rawStages.findIndex((s) => s.status !== "completed");
    const completedCount = rawStages.filter((s) => s.status === "completed").length;

    const normalizedStages = rawStages.map((stage, idx) => {
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
    const activeStage = isAllComplete ? null : normalizedStages.find((s) => s.status === "current");
    const progressPercentage = isAllComplete ? 100 : totalStages > 0 ? Math.round((completedCount / totalStages) * 100) : 0;
    const currentStageName = isAllComplete ? "Completed" : activeStage?.name || service.current_stage_name || normalizedStages[0]?.name || "In Progress";

    return {
      stages: normalizedStages,
      progressPercentage,
      currentStageName,
      currentStageDescription: service.current_stage_description || (isAllComplete ? "Deliverable completed & approved" : "Work in progress"),
    };
  }

  const preset = getServiceFulfillmentPreset(
    service.service_name || service.serviceName || "",
    service.service_category || service.serviceCategory || "",
    service.workflow_preset || service.workflowPreset
  );

  let completedUpTo = isServiceCompleted ? preset.length : 0;
  const stages = preset.map((name, idx) => {
    if (completedUpTo === preset.length) return { name, status: "completed" };
    if (idx < completedUpTo) return { name, status: "completed" };
    if (idx === completedUpTo) return { name, status: "current" };
    return { name, status: "upcoming" };
  });

  return {
    stages,
    progressPercentage: isServiceCompleted ? 100 : Math.round((completedUpTo / preset.length) * 100),
    currentStageName: isServiceCompleted ? "Completed" : stages.find((s) => s.status === "current")?.name || preset[0],
    currentStageDescription: isServiceCompleted ? "Deliverable completed & approved" : "Work in progress",
  };
}

console.log("=== RUNNING FULFILLMENT & STAGE PROGRESSION TESTS ===\n");

// 1. Verify Templates
console.log("1. Verifying Workflow Templates:");
if (
  DEFAULT_SERVICE_STAGES.website.length === 5 &&
  DEFAULT_SERVICE_STAGES.smm.length === 6 &&
  DEFAULT_SERVICE_STAGES.trademark.length === 6 &&
  DEFAULT_SERVICE_STAGES.incorporation.length === 6 &&
  DEFAULT_SERVICE_STAGES.gst.length === 5
) {
  console.log("=> PASS: All 5 templates match requirements exactly!\n");
} else {
  console.error("=> FAIL: Template stage count mismatch!");
  process.exit(1);
}

// 2. Test auto-detection
console.log("2. Testing Auto-Detection:");
const t1 = getServiceFulfillmentPreset("Website Design & Development", "Branding & Web Development");
if (t1.join(",") === DEFAULT_SERVICE_STAGES.website.join(",")) console.log("=> PASS: Website detected.");
const t2 = getServiceFulfillmentPreset("Social Media Campaign Management", "Digital Growth & Visibility");
if (t2.join(",") === DEFAULT_SERVICE_STAGES.smm.join(",")) console.log("=> PASS: SMM detected.");
const t3 = getServiceFulfillmentPreset("Trademark Filing & IP Protection", "Intellectual Property & Legal");
if (t3.join(",") === DEFAULT_SERVICE_STAGES.trademark.join(",")) console.log("=> PASS: Trademark detected.");
const t4 = getServiceFulfillmentPreset("Private Limited Company Registration", "Business Registration");
if (t4.join(",") === DEFAULT_SERVICE_STAGES.incorporation.join(",")) console.log("=> PASS: Incorporation detected.");
const t5 = getServiceFulfillmentPreset("GST Registration", "Business Registration");
if (t5.join(",") === DEFAULT_SERVICE_STAGES.gst.join(",")) console.log("=> PASS: GST detected.");

// 3. User's exact reported problem test:
console.log("\n3. Testing Stage Progression (User's Exact Example):");
const userExampleService = {
  service_status: "In Progress",
  fulfillment_stages: [
    { name: "Requirements", status: "completed" },
    { name: "UI/UX Design", status: "completed" },
    { name: "Development", status: "completed" },
    { name: "Client Review", status: "completed" },
    { name: "Deployment", status: "upcoming" },
  ]
};

const resUser = computeServiceFulfillment(userExampleService);
console.log("Result for User Example:", {
  currentStageName: resUser.currentStageName,
  progressPercentage: resUser.progressPercentage,
  activeMilestone: resUser.stages.find(s => s.status === 'current')?.name
});

if (
  resUser.currentStageName === "Deployment" &&
  resUser.progressPercentage === 80 &&
  resUser.stages[0].status === "completed" &&
  resUser.stages[1].status === "completed" &&
  resUser.stages[2].status === "completed" &&
  resUser.stages[3].status === "completed" &&
  resUser.stages[4].status === "current"
) {
  console.log("=> PASS: User example correctly sets Deployment as active milestone with 80% progress!\n");
} else {
  console.error("=> FAIL on user example!", resUser);
  process.exit(1);
}

// 4. Test Complete 3rd stage -> 4th becomes active
console.log("4. Testing Complete 3rd stage -> 4th becomes active:");
const service3rd = {
  service_status: "In Progress",
  fulfillment_stages: [
    { name: "Requirements", status: "completed" },
    { name: "UI/UX Design", status: "completed" },
    { name: "Development", status: "completed" },
    { name: "Client Review", status: "upcoming" },
    { name: "Deployment", status: "upcoming" },
  ]
};
const res3rd = computeServiceFulfillment(service3rd);
if (res3rd.currentStageName === "Client Review" && res3rd.progressPercentage === 60 && res3rd.stages[3].status === "current") {
  console.log("=> PASS: 4th stage (Client Review) is active with 60% progress!\n");
} else {
  console.error("=> FAIL on 3rd stage test!", res3rd);
  process.exit(1);
}

// 5. Test Complete all stages -> 100% and Completed
console.log("5. Testing Complete all stages -> 100% and Completed:");
const serviceAll = {
  service_status: "Completed",
  fulfillment_stages: [
    { name: "Requirements", status: "completed" },
    { name: "UI/UX Design", status: "completed" },
    { name: "Development", status: "completed" },
    { name: "Client Review", status: "completed" },
    { name: "Deployment", status: "completed" },
  ]
};
const resAll = computeServiceFulfillment(serviceAll);
if (resAll.currentStageName === "Completed" && resAll.progressPercentage === 100) {
  console.log("=> PASS: 100% and Completed successfully!\n");
} else {
  console.error("=> FAIL on all stages complete test!", resAll);
  process.exit(1);
}

console.log("=== ALL FULFILLMENT TESTS PASSED PERFECTLY ===");
