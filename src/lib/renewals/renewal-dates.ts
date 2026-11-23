/**
 * Renewal Calculation & Date Helpers for BRAND 360s CRM
 */

export type RenewalFrequency = "Monthly" | "Quarterly" | "Half-Yearly" | "Annually" | "Custom";

/**
 * Get the duration in months for a given renewal frequency
 */
export function getMonthsForFrequency(frequency: RenewalFrequency, customMonths?: number): number {
  switch (frequency) {
    case "Monthly":
      return 1;
    case "Quarterly":
      return 3;
    case "Half-Yearly":
      return 6;
    case "Annually":
      return 12;
    case "Custom":
      return customMonths && customMonths > 0 ? customMonths : 12;
    default:
      return 12;
  }
}

/**
 * Calculates the expiry date given a start date and duration in months.
 * Example: Start Date 2026-11-20 + 12 months -> 2027-11-19 (or 2027-11-20 based on cycle standard)
 * We add months and subtract 1 day (e.g. 1 year cycle: 2026-01-01 to 2026-12-31).
 */
export function calculateExpiryDate(startDateStr: string, durationMonths: number): string {
  if (!startDateStr) {
    const today = new Date();
    startDateStr = today.toISOString().split("T")[0];
  }

  const [y, m, d] = startDateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  // Add months
  date.setMonth(date.getMonth() + durationMonths);
  // Subtract 1 day for standard period end
  date.setDate(date.getDate() - 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Calculates the next cycle start and end dates from a previous expiry date.
 * Next cycle start date = previousExpiryDate + 1 day
 * Next cycle end date = next cycle start date + durationMonths - 1 day
 */
export function calculateNextRenewalCycle(
  previousExpiryDate: string,
  durationMonths: number
): { startDate: string; endDate: string } {
  const [y, m, d] = previousExpiryDate.split("-").map(Number);
  const startDateObj = new Date(y, m - 1, d);
  startDateObj.setDate(startDateObj.getDate() + 1);

  const startYear = startDateObj.getFullYear();
  const startMonth = String(startDateObj.getMonth() + 1).padStart(2, "0");
  const startDay = String(startDateObj.getDate()).padStart(2, "0");
  const nextStartDate = `${startYear}-${startMonth}-${startDay}`;

  const nextEndDate = calculateExpiryDate(nextStartDate, durationMonths);

  return {
    startDate: nextStartDate,
    endDate: nextEndDate,
  };
}

/**
 * Calculates reminder date before renewal expiry
 */
export function calculateReminderDate(expiryDateStr: string, reminderDays: number = 30): string {
  const [y, m, d] = expiryDateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - reminderDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
