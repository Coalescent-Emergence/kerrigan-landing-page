import { chromium } from 'playwright';

const base = 'http://127.0.0.1:1313';
const pages = [
  { slug: 'home', path: '/' },
  { slug: 'privacy', path: '/privacy/' },
  { slug: 'product-demo', path: '/product-demo/' }
];

const themes = [
  {
    name: 'default',
    apply: async () => {}
  },
  {
    name: 'light-experimental',
    apply: async (page) => {
      await page.evaluate(() => {
        const r = document.documentElement;
        r.style.setProperty('--void', '#f4f7fb');
        r.style.setProperty('--void-mid', '#ffffff');
        r.style.setProperty('--void-light', '#eaf0f8');
        r.style.setProperty('--light', '#0b1d33');
        r.style.setProperty('--muted', '#4d657f');
        r.style.setProperty('--glass', 'rgba(255,255,255,0.8)');
        r.style.setProperty('--glass-border', 'rgba(0,151,196,0.22)');
      });
    }
  },
  {
    name: 'high-contrast-experimental',
    apply: async (page) => {
      await page.evaluate(() => {
        const r = document.documentElement;
        r.style.setProperty('--void', '#000814');
        r.style.setProperty('--void-mid', '#001d3d');
        r.style.setProperty('--void-light', '#003566');
        r.style.setProperty('--cerulean', '#00d4ff');
        r.style.setProperty('--amber', '#ffd60a');
        r.style.setProperty('--light', '#fefefe');
        r.style.setProperty('--muted', '#b6d8ea');
      });
    }
  }
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1720, height: 980 } });

for (const pageDef of pages) {
  for (const theme of themes) {
    const page = await context.newPage();
    await page.goto(`${base}${pageDef.path}`, { waitUntil: 'networkidle' });
    await theme.apply(page);
    await page.waitForTimeout(250);
    const out = `content/product-demo/screenshots/captured/${pageDef.slug}--${theme.name}.png`;
    await page.screenshot({ path: out, fullPage: true });
    await page.close();
    console.log(`saved ${out}`);
  }
}

await browser.close();
