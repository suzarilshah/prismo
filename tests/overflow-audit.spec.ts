import { test, expect } from '@playwright/test';

test.describe('Mobile Overflow Audit', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test('dashboard should not have horizontal overflow', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);
    
    // Check document width vs viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    console.log(`Body width: ${bodyWidth}, Viewport: ${viewportWidth}`);
    
    // Find all elements that exceed viewport
    const overflowingElements = await page.evaluate(() => {
      const viewport = window.innerWidth;
      const overflowing: Array<{tag: string, class: string, width: number, text: string}> = [];
      
      document.querySelectorAll('*').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > viewport || rect.right > viewport + 5) {
          overflowing.push({
            tag: el.tagName.toLowerCase(),
            class: el.className?.toString().slice(0, 80) || '',
            width: Math.round(rect.width),
            text: el.textContent?.slice(0, 30) || ''
          });
        }
      });
      
      // Dedupe by class
      const seen = new Set();
      return overflowing.filter(el => {
        const key = el.class + el.tag;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 20);
    });
    
    console.log('Overflowing elements:', JSON.stringify(overflowingElements, null, 2));
    
    await page.screenshot({ path: 'test-screenshots/overflow-dashboard.png', fullPage: true });
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test('landing page should not have horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    console.log(`Landing - Body width: ${bodyWidth}, Viewport: ${viewportWidth}`);
    
    const overflowingElements = await page.evaluate(() => {
      const viewport = window.innerWidth;
      const overflowing: Array<{tag: string, class: string, width: number, right: number}> = [];
      
      document.querySelectorAll('*').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right > viewport + 5 && rect.width > 50) {
          overflowing.push({
            tag: el.tagName.toLowerCase(),
            class: el.className?.toString().slice(0, 80) || '',
            width: Math.round(rect.width),
            right: Math.round(rect.right)
          });
        }
      });
      
      const seen = new Set();
      return overflowing.filter(el => {
        const key = el.class;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 15);
    });
    
    console.log('Landing overflowing:', JSON.stringify(overflowingElements, null, 2));
    
    await page.screenshot({ path: 'test-screenshots/overflow-landing.png', fullPage: true });
  });

  test('transactions page overflow check', async ({ page }) => {
    await page.goto('/dashboard/transactions');
    await page.waitForTimeout(3000);
    
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    console.log(`Transactions - Body: ${bodyWidth}, Viewport: ${viewportWidth}`);
    
    await page.screenshot({ path: 'test-screenshots/overflow-transactions.png', fullPage: true });
  });
});
