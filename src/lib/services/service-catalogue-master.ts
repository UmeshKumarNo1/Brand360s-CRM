/**
 * BRAND 360s Official Services Master Catalogue & Auto-Category Detection
 * Reference: https://brand360s.co/
 */

export interface CatalogServiceItem {
  name: string;
  category: Brand360ServiceCategory;
  defaultServiceFee?: number;
  defaultGovtFee?: number;
  workflowPreset?: string;
  description?: string;
}

export type Brand360ServiceCategory =
  | "Business Registration"
  | "Compliance & Tax"
  | "Intellectual Property & Legal"
  | "Branding & Web Development"
  | "Digital Growth & Visibility"
  | "General";

export const BRAND360_CATEGORIES: Brand360ServiceCategory[] = [
  "Business Registration",
  "Compliance & Tax",
  "Intellectual Property & Legal",
  "Branding & Web Development",
  "Digital Growth & Visibility",
  "General",
];

export const BRAND360_SERVICES_MASTER: CatalogServiceItem[] = [
  // A. Business Registration
  { name: "Company Registration", category: "Business Registration", defaultServiceFee: 10000, defaultGovtFee: 5000, workflowPreset: "incorporation" },
  { name: "Private Limited Company Registration", category: "Business Registration", defaultServiceFee: 12000, defaultGovtFee: 5000, workflowPreset: "incorporation" },
  { name: "LLP Registration", category: "Business Registration", defaultServiceFee: 8000, defaultGovtFee: 3000, workflowPreset: "incorporation" },
  { name: "OPC Registration", category: "Business Registration", defaultServiceFee: 9000, defaultGovtFee: 4000, workflowPreset: "incorporation" },
  { name: "Partnership Firm Registration", category: "Business Registration", defaultServiceFee: 6000, defaultGovtFee: 1500, workflowPreset: "incorporation" },
  { name: "Proprietorship Registration", category: "Business Registration", defaultServiceFee: 3500, defaultGovtFee: 0, workflowPreset: "incorporation" },
  { name: "Section 8 Company Registration", category: "Business Registration", defaultServiceFee: 18000, defaultGovtFee: 8000, workflowPreset: "incorporation" },
  { name: "Startup India Registration", category: "Business Registration", defaultServiceFee: 5000, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "GST Registration", category: "Business Registration", defaultServiceFee: 4000, defaultGovtFee: 0, workflowPreset: "gst" },
  { name: "Udyam / MSME Registration", category: "Business Registration", defaultServiceFee: 2000, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "FSSAI Registration", category: "Business Registration", defaultServiceFee: 4500, defaultGovtFee: 2000, workflowPreset: "general" },
  { name: "Digital Signature Certificate (DSC)", category: "Business Registration", defaultServiceFee: 1500, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "DIN Registration", category: "Business Registration", defaultServiceFee: 2500, defaultGovtFee: 1000, workflowPreset: "general" },
  { name: "ICEGATE Registration", category: "Business Registration", defaultServiceFee: 5000, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "Import Export Code (IEC)", category: "Business Registration", defaultServiceFee: 3500, defaultGovtFee: 500, workflowPreset: "general" },
  { name: "Professional Tax Registration", category: "Business Registration", defaultServiceFee: 3500, defaultGovtFee: 500, workflowPreset: "general" },
  { name: "Shop & Establishment License", category: "Business Registration", defaultServiceFee: 4000, defaultGovtFee: 1000, workflowPreset: "general" },

  // B. Compliance & Tax
  { name: "GST Return Filing", category: "Compliance & Tax", defaultServiceFee: 3000, defaultGovtFee: 0, workflowPreset: "compliance" },
  { name: "GST Annual Return Filing", category: "Compliance & Tax", defaultServiceFee: 8000, defaultGovtFee: 0, workflowPreset: "compliance" },
  { name: "GST Reconciliation", category: "Compliance & Tax", defaultServiceFee: 5000, defaultGovtFee: 0, workflowPreset: "compliance" },
  { name: "Income Tax Return (ITR) Filing", category: "Compliance & Tax", defaultServiceFee: 4000, defaultGovtFee: 0, workflowPreset: "compliance" },
  { name: "MCA / ROC Compliance", category: "Compliance & Tax", defaultServiceFee: 12000, defaultGovtFee: 2000, workflowPreset: "compliance" },
  { name: "AOC-4 Filing", category: "Compliance & Tax", defaultServiceFee: 5000, defaultGovtFee: 1000, workflowPreset: "compliance" },
  { name: "MGT-7 Filing", category: "Compliance & Tax", defaultServiceFee: 5000, defaultGovtFee: 1000, workflowPreset: "compliance" },
  { name: "TDS Returns & Compliance", category: "Compliance & Tax", defaultServiceFee: 4500, defaultGovtFee: 0, workflowPreset: "compliance" },
  { name: "Accounting & Bookkeeping", category: "Compliance & Tax", defaultServiceFee: 15000, defaultGovtFee: 0, workflowPreset: "compliance" },
  { name: "Payroll Management", category: "Compliance & Tax", defaultServiceFee: 10000, defaultGovtFee: 0, workflowPreset: "compliance" },
  { name: "PF Compliance", category: "Compliance & Tax", defaultServiceFee: 4000, defaultGovtFee: 0, workflowPreset: "compliance" },
  { name: "ESI Compliance", category: "Compliance & Tax", defaultServiceFee: 4000, defaultGovtFee: 0, workflowPreset: "compliance" },
  { name: "HR Compliance", category: "Compliance & Tax", defaultServiceFee: 7500, defaultGovtFee: 0, workflowPreset: "compliance" },
  { name: "Corporate Compliance", category: "Compliance & Tax", defaultServiceFee: 15000, defaultGovtFee: 2500, workflowPreset: "compliance" },
  { name: "Director KYC", category: "Compliance & Tax", defaultServiceFee: 1500, defaultGovtFee: 500, workflowPreset: "compliance" },
  { name: "Annual Compliance", category: "Compliance & Tax", defaultServiceFee: 15000, defaultGovtFee: 2000, workflowPreset: "compliance" },
  { name: "Statutory Audit Support", category: "Compliance & Tax", defaultServiceFee: 18000, defaultGovtFee: 0, workflowPreset: "compliance" },

  // C. Intellectual Property & Legal
  { name: "Trademark Search", category: "Intellectual Property & Legal", defaultServiceFee: 1500, defaultGovtFee: 0, workflowPreset: "trademark" },
  { name: "Trademark Registration", category: "Intellectual Property & Legal", defaultServiceFee: 7500, defaultGovtFee: 4500, workflowPreset: "trademark" },
  { name: "Trademark Filing", category: "Intellectual Property & Legal", defaultServiceFee: 7500, defaultGovtFee: 4500, workflowPreset: "trademark" },
  { name: "Trademark Renewal", category: "Intellectual Property & Legal", defaultServiceFee: 8000, defaultGovtFee: 9000, workflowPreset: "trademark" },
  { name: "Trademark Objection Reply", category: "Intellectual Property & Legal", defaultServiceFee: 6000, defaultGovtFee: 0, workflowPreset: "trademark" },
  { name: "Trademark Hearing Support", category: "Intellectual Property & Legal", defaultServiceFee: 10000, defaultGovtFee: 0, workflowPreset: "trademark" },
  { name: "Copyright Registration", category: "Intellectual Property & Legal", defaultServiceFee: 9000, defaultGovtFee: 2000, workflowPreset: "trademark" },
  { name: "Patent Filing Support", category: "Intellectual Property & Legal", defaultServiceFee: 25000, defaultGovtFee: 8000, workflowPreset: "trademark" },
  { name: "IP Protection", category: "Intellectual Property & Legal", defaultServiceFee: 12000, defaultGovtFee: 0, workflowPreset: "trademark" },
  { name: "Commercial Agreement Drafting", category: "Intellectual Property & Legal", defaultServiceFee: 7500, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "Contract Review", category: "Intellectual Property & Legal", defaultServiceFee: 5000, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "Legal Support Services", category: "Intellectual Property & Legal", defaultServiceFee: 10000, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "Corporate Documentation", category: "Intellectual Property & Legal", defaultServiceFee: 6500, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "Non-Disclosure Agreement (NDA)", category: "Intellectual Property & Legal", defaultServiceFee: 3000, defaultGovtFee: 0, workflowPreset: "general" },

  // D. Branding & Web Development
  { name: "Logo Design", category: "Branding & Web Development", defaultServiceFee: 8000, defaultGovtFee: 0, workflowPreset: "website" },
  { name: "Brand Identity Design", category: "Branding & Web Development", defaultServiceFee: 18000, defaultGovtFee: 0, workflowPreset: "website" },
  { name: "Business Branding", category: "Branding & Web Development", defaultServiceFee: 25000, defaultGovtFee: 0, workflowPreset: "website" },
  { name: "Personal Branding", category: "Branding & Web Development", defaultServiceFee: 20000, defaultGovtFee: 0, workflowPreset: "website" },
  { name: "Business Website Design", category: "Branding & Web Development", defaultServiceFee: 35000, defaultGovtFee: 0, workflowPreset: "website" },
  { name: "Website UI/UX Design", category: "Branding & Web Development", defaultServiceFee: 25000, defaultGovtFee: 0, workflowPreset: "website" },
  { name: "Website Development", category: "Branding & Web Development", defaultServiceFee: 45000, defaultGovtFee: 0, workflowPreset: "website" },
  { name: "E-commerce Website Development", category: "Branding & Web Development", defaultServiceFee: 65000, defaultGovtFee: 0, workflowPreset: "website" },
  { name: "Mobile-Friendly Website Development", category: "Branding & Web Development", defaultServiceFee: 40000, defaultGovtFee: 0, workflowPreset: "website" },
  { name: "Website Maintenance", category: "Branding & Web Development", defaultServiceFee: 10000, defaultGovtFee: 0, workflowPreset: "website" },
  { name: "Company Profile Design", category: "Branding & Web Development", defaultServiceFee: 12000, defaultGovtFee: 0, workflowPreset: "website" },
  { name: "Pitch Deck Design", category: "Branding & Web Development", defaultServiceFee: 15000, defaultGovtFee: 0, workflowPreset: "website" },
  { name: "Corporate Presentation Design", category: "Branding & Web Development", defaultServiceFee: 12000, defaultGovtFee: 0, workflowPreset: "website" },

  // E. Digital Growth & Visibility
  { name: "SEO Services", category: "Digital Growth & Visibility", defaultServiceFee: 20000, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "GEO / AI Search Visibility", category: "Digital Growth & Visibility", defaultServiceFee: 25000, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "Local SEO", category: "Digital Growth & Visibility", defaultServiceFee: 15000, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "Social Media Marketing", category: "Digital Growth & Visibility", defaultServiceFee: 22000, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "PR Services", category: "Digital Growth & Visibility", defaultServiceFee: 30000, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "Brand Visibility", category: "Digital Growth & Visibility", defaultServiceFee: 25000, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "Founder Visibility", category: "Digital Growth & Visibility", defaultServiceFee: 25000, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "Reputation Management", category: "Digital Growth & Visibility", defaultServiceFee: 30000, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "Corporate Positioning", category: "Digital Growth & Visibility", defaultServiceFee: 35000, defaultGovtFee: 0, workflowPreset: "general" },
  { name: "Google Business Profile Optimisation", category: "Digital Growth & Visibility", defaultServiceFee: 8000, defaultGovtFee: 0, workflowPreset: "general" },
];

/**
 * Automatically detects the appropriate BRAND 360s category for any service name.
 * Uses exact match first, then keyword-based heuristics.
 */
export function detectServiceCategory(serviceName: string): Brand360ServiceCategory {
  if (!serviceName) return "General";
  const trimmed = serviceName.trim();
  const lower = trimmed.toLowerCase();

  // 1. Exact catalog match
  const exact = BRAND360_SERVICES_MASTER.find(
    (s) => s.name.toLowerCase() === lower
  );
  if (exact) return exact.category;

  // 2. Specific keyword heuristics (order of precedence matters)
  // Tax & Filing checks (before general registration)
  if (
    lower.includes("return") ||
    lower.includes("filing") && !lower.includes("trademark") && !lower.includes("patent") ||
    lower.includes("itr") ||
    lower.includes("aoc-4") ||
    lower.includes("mgt-7") ||
    lower.includes("tds") ||
    lower.includes("reconciliation") ||
    lower.includes("audit") ||
    lower.includes("bookkeeping") ||
    lower.includes("accounting") ||
    lower.includes("payroll") ||
    lower.includes("kyc") ||
    lower.includes("compliance")
  ) {
    return "Compliance & Tax";
  }

  // IP & Legal checks
  if (
    lower.includes("trademark") ||
    lower.includes("copyright") ||
    lower.includes("patent") ||
    lower.includes("ip protection") ||
    lower.includes("contract") ||
    lower.includes("agreement") ||
    lower.includes("nda") ||
    lower.includes("legal")
  ) {
    return "Intellectual Property & Legal";
  }

  // Branding & Web Development checks
  if (
    lower.includes("website") ||
    lower.includes("web") ||
    lower.includes("ui/ux") ||
    lower.includes("logo") ||
    lower.includes("pitch deck") ||
    lower.includes("presentation") ||
    lower.includes("branding") ||
    lower.includes("identity") ||
    lower.includes("profile design")
  ) {
    return "Branding & Web Development";
  }

  // Digital Growth & Visibility
  if (
    lower.includes("seo") ||
    lower.includes("visibility") ||
    lower.includes("social media") ||
    lower.includes("marketing") ||
    lower.includes("pr ") ||
    lower.includes("reputation") ||
    lower.includes("google business") ||
    lower.includes("geo / ai")
  ) {
    return "Digital Growth & Visibility";
  }

  // Business Registration checks
  if (
    lower.includes("registration") ||
    lower.includes("incorporat") ||
    lower.includes("pvt ltd") ||
    lower.includes("llp") ||
    lower.includes("opc") ||
    lower.includes("proprietorship") ||
    lower.includes("partnership") ||
    lower.includes("startup india") ||
    lower.includes("msme") ||
    lower.includes("udyam") ||
    lower.includes("fssai") ||
    lower.includes("dsc") ||
    lower.includes("din") ||
    lower.includes("icegate") ||
    lower.includes("iec") ||
    lower.includes("license")
  ) {
    return "Business Registration";
  }

  return "General";
}

