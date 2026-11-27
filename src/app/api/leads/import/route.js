import { executeLeadsImportAction } from "@/app/actions/leads";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const result = await executeLeadsImportAction(formData);
    return NextResponse.json(result);
  } catch (err) {
    console.error("API /api/leads/import error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process bulk lead import." },
      { status: 500 }
    );
  }
}
