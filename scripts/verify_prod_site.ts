import { chromium } from 'playwright';

async function verifyProdSite() {
  console.log('Launching Chrome to verify https://prapdf.us.ci ...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://prapdf.us.ci/#/tools', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('a[href*="#/tools/"]', { timeout: 15000 });
    const count = await page.$$eval('a[href*="#/tools/"]', (els) => {
      const ids = new Set<string>();
      els.forEach((el) => {
        const href = el.getAttribute('href') || '';
        const m = href.match(/#\/tools\/([a-z0-9-]+)/);
        if (m && m[1]) ids.add(m[1]);
      });
      return ids.size;
    });
    console.log(`Live production website catalog distinct services found: ${count}`);
    await page.screenshot({ path: 'tests/e2e/screenshots/production_live_tools_catalog.png' });
  } finally {
    await browser.close();
  }
}

verifyProdSite().catch(err => {
  console.error('Error verifying production site:', err);
  process.exit(1);
});
