async function check() {
  console.log('Sending GET http://localhost:3001/invoices...');
  const res = await fetch('http://localhost:3001/invoices');
  console.log('Response status:', res.status);
  const text = await res.text();
  console.log('Contains Invoices title:', text.includes('Tax Invoices'));

  const cssMatches = [...text.matchAll(/href="(\/_next\/static\/css\/[^"]+\.css[^"]*)"/g)];
  console.log('Found CSS links:', cssMatches.length);
  for (const m of cssMatches) {
    const cssUrl = 'http://localhost:3001' + m[1];
    const cssRes = await fetch(cssUrl);
    console.log(m[1], 'Status:', cssRes.status, 'Type:', cssRes.headers.get('content-type'));
  }

  const jsMatches = [...text.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js[^"]*)"/g)];
  console.log('Found JS chunks:', jsMatches.length);
  if (jsMatches.length > 0) {
    const sampleJs = 'http://localhost:3001' + jsMatches[0][1];
    const jsRes = await fetch(sampleJs);
    console.log('Sample JS chunk:', jsMatches[0][1], 'Status:', jsRes.status);
  }
}
check();

