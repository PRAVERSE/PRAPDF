async function check() {
  const urls = [
    'https://prapdf.us.ci',
    'https://pra-pdf.praverse-auth.workers.dev'
  ];

  for (const url of urls) {
    console.log(`\n========================================`);
    console.log(`Checking ${url}`);
    console.log(`========================================`);
    const res = await fetch(url);
    console.log(`Status: ${res.status}`);
    console.log(`Headers:`);
    for (const [k, v] of res.headers.entries()) {
      if (['server', 'cf-ray', 'content-type', 'cache-control', 'etag', 'last-modified', 'cf-cache-status', 'date', 'x-powered-by'].includes(k.toLowerCase())) {
        console.log(`  ${k}: ${v}`);
      }
    }
    const html = await res.text();
    console.log(`HTML size: ${html.length} bytes`);
    
    // Find all script tags
    const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
    let match;
    const scripts: string[] = [];
    while ((match = scriptRegex.exec(html)) !== null) {
      scripts.push(match[1]);
    }
    console.log(`Scripts found in HTML:`, scripts);

    // Fetch and inspect the main script
    for (const src of scripts) {
      const scriptUrl = src.startsWith('http') ? src : new URL(src, url).href;
      console.log(`Fetching script: ${scriptUrl}`);
      const sRes = await fetch(scriptUrl);
      console.log(`  Script Status: ${sRes.status}, Headers:`);
      for (const [k, v] of sRes.headers.entries()) {
        if (['cf-cache-status', 'cache-control', 'etag', 'last-modified', 'content-length'].includes(k.toLowerCase())) {
          console.log(`    ${k}: ${v}`);
        }
      }
      const js = await sRes.text();
      console.log(`  Script size: ${js.length} bytes`);
      
      // Check presence of Wave 1 service IDs in the script
      const wave1Ids = [
        'delete-pdf-annotations',
        'flip-pdf',
        'split-pdf-in-half',
        'alternate-mix-pdf',
        'n-up-pdf',
      ];
      console.log(`  Wave 1 Service Search in JS:`);
      for (const id of wave1Ids) {
        const found = js.includes(id);
        console.log(`    ${id}: ${found}`);
      }

      // Check occurrences of "30" vs "35" vs "56"
      const occurrences30 = (js.match(/30/g) || []).length;
      const occurrences35 = (js.match(/35/g) || []).length;
      const occurrences56 = (js.match(/56/g) || []).length;
      console.log(`  Occurrences: "30": ${occurrences30}, "35": ${occurrences35}, "56": ${occurrences56}`);
    }
  }
}

check().catch(console.error);
