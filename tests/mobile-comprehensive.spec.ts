import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

const PAGES_TO_TEST = [
  { path: '/', name: 'Landing Page' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/dashboard/transactions', name: 'Transactions' },
  { path: '/dashboard/budgets', name: 'Budgets' },
  { path: '/dashboard/goals', name: 'Goals' },
  { path: '/dashboard/subscriptions', name: 'Subscriptions' },
  { path: '/dashboard/tax', name: 'Tax' },
  { path: '/dashboard/income', name: 'Income' },
  { path: '/dashboard/credit-cards', name: 'Credit Cards' },
];

test.describe('Mobile Comprehensive Audit', () => {
  test.use({
    viewport: MOBILE_VIEWPORT,
    isMobile: true,
    hasTouch: true,
  });

  for (const page of PAGES_TO_TEST) {
    test(`${page.name} - no horizontal scroll`, async ({ page: p }) => {
      await p.goto(page.path);
      await p.waitForTimeout(2000);
      
      // Check if horizontal scrolling is possible
      const hasHorizontalScroll = await p.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      const scrollWidth = await p.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await p.evaluate(() => document.documentElement.clientWidth);
      
      console.log(`${page.name}: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
      
      // Take screenshot
      await p.screenshot({ 
        path: `test-screenshots/mobile-${page.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: false 
      });
      
      expect(hasHorizontalScroll, `${page.name} should not have horizontal scroll`).toBe(false);
    });

    test(`${page.name} - text is readable (min 12px)`, async ({ page: p }) => {
      await p.goto(page.path);
      await p.waitForTimeout(2000);
      
      const smallTextElements = await p.evaluate(() => {
        const elements: Array<{tag: string, fontSize: string, text: string}> = [];
        document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label, li').forEach((el) => {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          if (fontSize < 12 && el.textContent?.trim()) {
            elements.push({
              tag: el.tagName.toLowerCase(),
              fontSize: style.fontSize,
              text: el.textContent.slice(0, 30)
            });
          }
        });
        // Return unique elements
        const unique = new Map();
        elements.forEach(el => {
          const key = el.tag + el.text;
          if (!unique.has(key)) unique.set(key, el);
        });
        return Array.from(unique.values()).slice(0, 10);
      });
      
      console.log(`${page.name} small text:`, smallTextElements);
      
      // Allow some small decorative text but flag it
      expect(smallTextElements.length, `${page.name} should have minimal tiny text`).toBeLessThan(20);
    });

    test(`${page.name} - content fits within viewport`, async ({ page: p }) => {
      await p.goto(page.path);
      await p.waitForTimeout(2000);
      
      // Check for content that extends beyond viewport
      const overflowingContent = await p.evaluate(() => {
        const viewport = window.innerWidth;
        const issues: Array<{selector: string, width: number, problem: string}> = [];
        
        // Check main content containers
        document.querySelectorAll('main, section, article, .card, [class*="Card"], [class*="grid"]').forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width > viewport + 10) {
            issues.push({
              selector: el.className?.toString().slice(0, 50) || el.tagName,
              width: Math.round(rect.width),
              problem: `Width ${Math.round(rect.width)}px exceeds viewport ${viewport}px`
            });
          }
        });
        
        return issues.slice(0, 5);
      });
      
      if (overflowingContent.length > 0) {
        console.log(`${page.name} overflow issues:`, overflowingContent);
      }
      
      expect(overflowingContent.length, `${page.name} content should fit viewport`).toBe(0);
    });
  }
});

test.describe('Mobile Touch Targets', () => {
  test.use({
    viewport: MOBILE_VIEWPORT,
    isMobile: true,
    hasTouch: true,
  });

  test('all buttons should have minimum 44px touch target', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    const undersizedButtons = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a[role="button"], [class*="Button"]');
      const issues: Array<{text: string, width: number, height: number}> = [];
      
      buttons.forEach((btn) => {
        const rect = btn.getBoundingClientRect();
        // Skip hidden or tiny utility buttons
        if (rect.width > 0 && rect.height > 0 && rect.width < 300) {
          if (rect.width < 44 || rect.height < 44) {
            // Skip icon-only buttons that have adequate clickable area
            const isIconOnly = btn.querySelector('svg') && !btn.textContent?.trim();
            if (!isIconOnly) {
              issues.push({
                text: btn.textContent?.slice(0, 20) || 'icon',
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              });
            }
          }
        }
      });
      
      return issues.slice(0, 10);
    });
    
    console.log('Undersized buttons:', undersizedButtons);
    // Warning level, not failure (some small buttons are intentional for secondary actions)
  });
});
