console.log("Testing service financial calculation...");

// Test Case 1: The user's exact reported problem
// Contract: ₹45,000, Invoice: ₹53,100 (incl 18% GST), Verified Paid: ₹45,000, Outstanding: ₹8,100
const service1 = { id: 'srv-1', total_amount: 45000, service_fee: 45000, govt_fee: 0 };
const invoices1 = [
  {
    id: 'inv-1',
    status: 'Issued',
    total_amount: 53100,
    items: [{ client_service_id: 'srv-1', total: 53100 }]
  }
];
const allocatedAmount1 = 45000;

// Test calculation
function calc(service, invoices, allocated) {
  const contractValue = Number(service.total_amount) || 0;
  const validIssuedInvoices = (invoices || []).filter(inv => !["Draft", "Void", "Cancelled"].includes(inv.status));
  const invoicedAmount = validIssuedInvoices.reduce((sum, inv) => {
    if (inv.items && Array.isArray(inv.items)) {
      const sItems = inv.items.filter(it => it.client_service_id === service.id);
      if (sItems.length > 0) {
        return sum + sItems.reduce((iSum, it) => iSum + (Number(it.total) || 0), 0);
      }
    }
    return sum + (Number(inv.total_amount) || 0);
  }, 0);
  const hasIssuedInvoice = validIssuedInvoices.length > 0;
  const collectedAmount = Math.max(0, allocated || 0);
  const outstandingAmount = Math.max(0, invoicedAmount - collectedAmount);

  let paymentStatus = "Not Invoiced";
  if (!hasIssuedInvoice || invoicedAmount === 0) {
    paymentStatus = "Not Invoiced";
  } else if (collectedAmount >= invoicedAmount - 0.009) {
    paymentStatus = "Paid";
  } else if (collectedAmount > 0.009) {
    paymentStatus = "Partially Paid";
  } else {
    paymentStatus = "Unpaid";
  }

  // Display text logic
  let displaySubtext = "";
  if (paymentStatus === "Not Invoiced" || (!hasIssuedInvoice && invoicedAmount === 0)) {
    displaySubtext = "Not Invoiced";
  } else if (paymentStatus === "Paid") {
    displaySubtext = `₹${invoicedAmount.toLocaleString()}`;
  } else if (paymentStatus === "Partially Paid") {
    displaySubtext = `₹${collectedAmount.toLocaleString()} / ₹${invoicedAmount.toLocaleString()}`;
  } else {
    displaySubtext = `₹0 / ₹${invoicedAmount.toLocaleString()}`;
  }

  return { contractValue, invoicedAmount, collectedAmount, outstandingAmount, paymentStatus, displaySubtext };
}

// Case 1
const res1 = calc(service1, invoices1, allocatedAmount1);
console.log("\nCase 1 (Reported Problem):");
console.log(res1);
if (res1.paymentStatus === "Partially Paid" && res1.displaySubtext === "₹45,000 / ₹53,100" && res1.outstandingAmount === 8100) {
  console.log("=> PASS Case 1!");
} else {
  console.error("=> FAIL Case 1!");
  process.exit(1);
}

// Case 2: Fully Paid
const res2 = calc(service1, invoices1, 53100);
console.log("\nCase 2 (Fully Paid):");
console.log(res2);
if (res2.paymentStatus === "Paid" && res2.displaySubtext === "₹53,100" && res2.outstandingAmount === 0) {
  console.log("=> PASS Case 2!");
} else {
  console.error("=> FAIL Case 2!");
  process.exit(1);
}

// Case 3: Unpaid Invoice
const res3 = calc(service1, invoices1, 0);
console.log("\nCase 3 (Unpaid Invoice):");
console.log(res3);
if (res3.paymentStatus === "Unpaid" && res3.displaySubtext === "₹0 / ₹53,100" && res3.outstandingAmount === 53100) {
  console.log("=> PASS Case 3!");
} else {
  console.error("=> FAIL Case 3!");
  process.exit(1);
}

// Case 4: Uninvoiced Service
const res4 = calc(service1, [], 0);
console.log("\nCase 4 (Uninvoiced Service):");
console.log(res4);
if (res4.paymentStatus === "Not Invoiced" && res4.displaySubtext === "Not Invoiced" && res4.outstandingAmount === 0) {
  console.log("=> PASS Case 4!");
} else {
  console.error("=> FAIL Case 4!");
  process.exit(1);
}

console.log("\nALL SERVICE FINANCIAL DISPLAY CASES VERIFIED SUCCESSFULLY!");
