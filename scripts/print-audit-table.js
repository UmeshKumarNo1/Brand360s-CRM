const fs = require('fs');
const content = fs.readFileSync('audit-output.json', 'utf16le'); // PowerShell redirection might be utf16le
let jsonText = '';
if (content.includes('[')) {
  const start = content.indexOf('[');
  const end = content.lastIndexOf(']') + 1;
  jsonText = content.slice(start, end);
} else {
  const utf8Content = fs.readFileSync('audit-output.json', 'utf8');
  const start = utf8Content.indexOf('[');
  const end = utf8Content.lastIndexOf(']') + 1;
  jsonText = utf8Content.slice(start, end);
}

const data = JSON.parse(jsonText);
console.log('| Client | Contract | Invoiced | Received | Allocated | Unallocated Advance | Invoice Outstanding | Issues |');
console.log('|---|---:|---:|---:|---:|---:|---:|---|');
for (const c of data) {
  const issuesStr = c.issues.length > 0 ? c.issues.join('; ') : 'None (' + c.classification + ')';
  console.log(`| ${c.clientName} | ₹${c.contractValue.toLocaleString('en-IN')} | ₹${c.invoicedAmount.toLocaleString('en-IN')} | ₹${c.paymentsReceived.toLocaleString('en-IN')} | ₹${c.allocatedPayments.toLocaleString('en-IN')} | ₹${c.unallocatedAdvance.toLocaleString('en-IN')} | ₹${c.invoiceOutstanding.toLocaleString('en-IN')} | ${issuesStr} |`);
}

console.log("\n--- DETAILED CLIENT INSPECTION ---");
for (const c of data) {
  console.log(`\nClient: ${c.clientName} (${c.clientId}) - [${c.classification}]`);
  console.log(`Services (${c.services.length}):`);
  for (const s of c.services) {
    console.log(`  - ${s.service_name} (ID: ${s.id}): fee=${s.service_fee}, govt=${s.govt_fee}, total=${s.total_amount}, status=${s.service_status}`);
  }
  console.log(`Invoices (${c.invoices.length}):`);
  for (const inv of c.invoices) {
    console.log(`  - Inv ${inv.invoice_number} (status: ${inv.status}): total=${inv.total_amount}, amount_paid=${inv.amount_paid}, balance_due=${inv.balance_due}`);
    for (const it of (inv.items || [])) {
      console.log(`     * Item ${it.id}: "${it.description}", total=${it.total}, client_service_id=${it.client_service_id}`);
    }
  }
  console.log(`Payments (${c.payments.length}):`);
  for (const p of c.payments) {
    console.log(`  - Payment ${p.id}: amount=${p.amount}, status=${p.status}, method=${p.payment_method}`);
  }
}
