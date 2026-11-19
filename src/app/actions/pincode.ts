"use server";

export interface PincodeLookupResult {
  success: boolean;
  city?: string;
  state?: string;
  country?: string;
  district?: string;
  error?: string;
}

const PIN_PREFIX_STATE_MAP: Record<string, { state: string; defaultCity: string }> = {
  "11": { state: "Delhi (NCT)", defaultCity: "New Delhi" },
  "12": { state: "Haryana", defaultCity: "Gurugram" },
  "13": { state: "Haryana", defaultCity: "Faridabad" },
  "14": { state: "Punjab", defaultCity: "Amritsar" },
  "15": { state: "Punjab", defaultCity: "Bathinda" },
  "16": { state: "Punjab", defaultCity: "Chandigarh" },
  "17": { state: "Himachal Pradesh", defaultCity: "Shimla" },
  "18": { state: "Jammu & Kashmir", defaultCity: "Jammu" },
  "19": { state: "Jammu & Kashmir", defaultCity: "Srinagar" },
  "20": { state: "Uttar Pradesh", defaultCity: "Noida" },
  "21": { state: "Uttar Pradesh", defaultCity: "Prayagraj" },
  "22": { state: "Uttar Pradesh", defaultCity: "Lucknow" },
  "23": { state: "Uttar Pradesh", defaultCity: "Varanasi" },
  "24": { state: "Uttar Pradesh", defaultCity: "Bareilly" },
  "25": { state: "Uttar Pradesh", defaultCity: "Meerut" },
  "26": { state: "Uttarakhand", defaultCity: "Dehradun" },
  "27": { state: "Uttar Pradesh", defaultCity: "Gorakhpur" },
  "28": { state: "Uttar Pradesh", defaultCity: "Agra" },
  "30": { state: "Rajasthan", defaultCity: "Jaipur" },
  "31": { state: "Rajasthan", defaultCity: "Udaipur" },
  "32": { state: "Rajasthan", defaultCity: "Kota" },
  "33": { state: "Rajasthan", defaultCity: "Bikaner" },
  "34": { state: "Rajasthan", defaultCity: "Jodhpur" },
  "36": { state: "Gujarat", defaultCity: "Rajkot" },
  "37": { state: "Gujarat", defaultCity: "Jamnagar" },
  "38": { state: "Gujarat", defaultCity: "Ahmedabad" },
  "39": { state: "Gujarat", defaultCity: "Surat" },
  "40": { state: "Maharashtra", defaultCity: "Mumbai" },
  "41": { state: "Maharashtra", defaultCity: "Pune" },
  "42": { state: "Maharashtra", defaultCity: "Nashik" },
  "43": { state: "Maharashtra", defaultCity: "Aurangabad" },
  "44": { state: "Maharashtra", defaultCity: "Nagpur" },
  "45": { state: "Madhya Pradesh", defaultCity: "Indore" },
  "46": { state: "Madhya Pradesh", defaultCity: "Bhopal" },
  "47": { state: "Madhya Pradesh", defaultCity: "Gwalior" },
  "48": { state: "Madhya Pradesh", defaultCity: "Jabalpur" },
  "49": { state: "Chhattisgarh", defaultCity: "Raipur" },
  "50": { state: "Telangana", defaultCity: "Hyderabad" },
  "51": { state: "Andhra Pradesh", defaultCity: "Tirupati" },
  "52": { state: "Andhra Pradesh", defaultCity: "Vijayawada" },
  "53": { state: "Andhra Pradesh", defaultCity: "Visakhapatnam" },
  "56": { state: "Karnataka", defaultCity: "Bengaluru" },
  "57": { state: "Karnataka", defaultCity: "Mangaluru" },
  "58": { state: "Karnataka", defaultCity: "Hubballi" },
  "59": { state: "Karnataka", defaultCity: "Belagavi" },
  "60": { state: "Tamil Nadu", defaultCity: "Chennai" },
  "61": { state: "Tamil Nadu", defaultCity: "Tiruchirappalli" },
  "62": { state: "Tamil Nadu", defaultCity: "Madurai" },
  "63": { state: "Tamil Nadu", defaultCity: "Salem" },
  "64": { state: "Tamil Nadu", defaultCity: "Coimbatore" },
  "67": { state: "Kerala", defaultCity: "Kozhikode" },
  "68": { state: "Kerala", defaultCity: "Kochi" },
  "69": { state: "Kerala", defaultCity: "Thiruvananthapuram" },
  "70": { state: "West Bengal", defaultCity: "Kolkata" },
  "71": { state: "West Bengal", defaultCity: "Howrah" },
  "72": { state: "West Bengal", defaultCity: "Midnapore" },
  "73": { state: "West Bengal", defaultCity: "Siliguri" },
  "74": { state: "West Bengal", defaultCity: "North 24 Parganas" },
  "75": { state: "Odisha", defaultCity: "Bhubaneswar" },
  "76": { state: "Odisha", defaultCity: "Cuttack" },
  "77": { state: "Odisha", defaultCity: "Rourkela" },
  "78": { state: "Assam", defaultCity: "Guwahati" },
  "79": { state: "Meghalaya", defaultCity: "Shillong" },
  "80": { state: "Bihar", defaultCity: "Patna" },
  "81": { state: "Bihar", defaultCity: "Bhagalpur" },
  "82": { state: "Bihar", defaultCity: "Gaya" },
  "83": { state: "Jharkhand", defaultCity: "Ranchi" },
  "84": { state: "Bihar", defaultCity: "Muzaffarpur" },
  "85": { state: "Bihar", defaultCity: "Purnia" },
};

const INDIAN_STATES_CANONICAL = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi (NCT)",
  "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh", "Other"
];

function normalizeState(raw: string): string {
  if (!raw) return "Karnataka";
  const lower = raw.toLowerCase().trim();
  if (lower.includes("delhi")) return "Delhi (NCT)";
  if (lower.includes("tamil")) return "Tamil Nadu";
  if (lower.includes("jammu") || lower.includes("kashmir")) return "Jammu & Kashmir";
  if (lower.includes("odisha") || lower.includes("orissa")) return "Odisha";
  if (lower.includes("uttarakhand") || lower.includes("uttaranchal")) return "Uttarakhand";
  if (lower.includes("puducherry") || lower.includes("pondicherry")) return "Puducherry";
  if (lower.includes("andaman") || lower.includes("nicobar")) return "Other";

  const exact = INDIAN_STATES_CANONICAL.find((s) => s.toLowerCase() === lower);
  if (exact) return exact;

  const partial = INDIAN_STATES_CANONICAL.find(
    (s) => lower.includes(s.toLowerCase()) || s.toLowerCase().includes(lower)
  );
  return partial || raw;
}

export async function lookupPincodeAction(pincode: string): Promise<PincodeLookupResult> {
  const clean = pincode.replace(/\D/g, "");
  if (clean.length !== 6 || !/^[1-9][0-9]{5}$/.test(clean)) {
    return { success: false, error: "Please enter a valid 6-digit PIN code." };
  }

  // 1. Try public postal API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`, {
      signal: controller.signal,
      headers: { "Accept": "application/json" },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        const rawDistrict = (po.District || "").trim();
        const rawState = (po.State || "").trim();
        const state = normalizeState(rawState);
        const city = rawDistrict || (po.Division || "").replace(/Division/i, "").trim() || po.Name?.trim() || "";

        return {
          success: true,
          city,
          state,
          country: "India",
          district: rawDistrict,
        };
      }
    }
  } catch (err) {
    // Timeout or network error, proceed to fallback
  }

  // 2. Fallback to prefix mapping
  const prefix = clean.substring(0, 2);
  const fallback = PIN_PREFIX_STATE_MAP[prefix];
  if (fallback) {
    return {
      success: true,
      city: fallback.defaultCity,
      state: fallback.state,
      country: "India",
    };
  }

  return { success: false, error: "Location could not be found for this PIN code." };
}
