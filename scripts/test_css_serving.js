async function test() {
  const res = await fetch('http://localhost:3001/invoices');
  console.log('/invoices HTTP Status:', res.status);
  const html = await res.text();
  const cssMatches = [...html.matchAll(/href="(\/_next\/static\/css\/[^"]+\.css)"/g)];
  console.log('CSS links found in page:', cssMatches.map(m => m[1]));

  for (const match of cssMatches) {
    const cssUrl = 'http://localhost:3001' + match[1];
    const cssRes = await fetch(cssUrl);
    console.log(match[1], '-> Status:', cssRes.status, 'Content-Type:', cssRes.headers.get('content-type'));
  }
}
test();

