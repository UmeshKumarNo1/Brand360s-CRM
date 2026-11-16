import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Converts a number to Indian currency words representation (e.g. 50000 -> "Fifty Thousand Rupees Only")
 */
export function numberToWordsINR(num: number): string {
  if (isNaN(num) || num <= 0) return "Zero Rupees Only";

  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const inWords = (n: number): string => {
    let str = "";
    if (n > 99) {
      str += a[Math.floor(n / 100)] + "Hundred ";
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : " ");
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  };

  const integerPart = Math.floor(num);
  let crore = Math.floor(integerPart / 10000000);
  let remainder = integerPart % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder %= 1000;

  let result = "";
  if (crore > 0) result += inWords(crore) + "Crore ";
  if (lakh > 0) result += inWords(lakh) + "Lakh ";
  if (thousand > 0) result += inWords(thousand) + "Thousand ";
  if (remainder > 0) result += inWords(remainder);

  return (result.trim() || "Zero") + " Rupees Only";
}

