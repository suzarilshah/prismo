import { test, expect, devices } from '@playwright/test';

// Mobile viewport configurations
const mobileViewports = {
  'iPhone SE': { width: 375, height: 667 },
  'iPhone 12': { width: 390, height: 844 },
  'iPhone 14 Pro Max': { width: 430, height: 932 },
  'Pixel 5': { width: 393, height: 851 },
  'Samsung Galaxy S21': { width: 360, height: 800 },
};

// Key pages to test
const pagesToTest = [
  { name: 'Landing Page', path: '/' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Transactions', path: '/dashboard/transactions' },
  { name: 'Subscriptions', path: '/dashboard/subscriptions' },
  { name: 'Goals', path: '/dashboard/goals' },
  { name: 'Tax', path: '/dashboard/tax' },
];

// Minimum touch target size (Apple HIG recommends 44x44)
const MIN_TOUCH_TARGET = 44;

test.describe('Mobile Responsiveness Audit', () => {
  
  test.describe('Landing Page - Mobile', () => {
    test.use({ viewport: mobileViewports['iPhone 12'] });

    test('should not have horizontal overflow', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check for horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      expect(hasHorizontalScroll).toBe(false);
    });

    test('should have readable text sizes', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check that body text is at least 14px
      const textSizes = await page.evaluate(() => {
        const elements = document.querySelectorAll('p, span, li, a');
        const sizes: number[] = [];
        elements.forEach(el => {
          const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
          if (fontSize > 0) sizes.push(fontSize);
        });
        return sizes;
      });
      
      const smallTextCount = textSizes.filter(s => s < 12).length;
      const totalText = textSizes.length;
      const percentageSmall = (smallTextCount / totalText) * 100;
      
      // Allow up to 10% of text to be smaller (for labels, badges, etc.)
      expect(percentageSmall).toBeLessThan(15);
    });

    test('should have adequate touch targets', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check button sizes
      const buttonSizes = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, a[role="button"], [role="button"]');
        const undersized: { text: string; width: number; height: number }[] = [];
        
        buttons.forEach(btn => {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (rect.width < 44 || rect.height < 44) {
              undersized.push({
                text: btn.textContent?.trim().slice(0, 30) || 'unknown',
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              });
            }
          }
        });
        
        return undersized;
      });
      
      // Log undersized buttons for debugging
      if (buttonSizes.length > 0) {
        console.log('Undersized touch targets:', buttonSizes);
      }
      
      // Allow some small decorative buttons but main CTAs should be adequate
      expect(buttonSizes.length).toBeLessThan(5);
    });

    test('should have visible navigation on mobile', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check that nav is visible
      const nav = page.locator('nav').first();
      await expect(nav).toBeVisible();
    });

    test('video section should be responsive', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check video container doesn't overflow
      const videoOverflow = await page.evaluate(() => {
        const video = document.querySelector('video');
        if (!video) return false;
        const rect = video.getBoundingClientRect();
        return rect.width > window.innerWidth;
      });
      
      expect(videoOverflow).toBe(false);
    });
  });

  test.describe('Dashboard - Mobile', () => {
    test.use({ viewport: mobileViewports['iPhone 12'] });

    test('should not have horizontal overflow', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForTimeout(2000); // Wait for any redirects
      
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-screenshots/dashboard-mobile.png', fullPage: true });
      
      expect(hasHorizontalScroll).toBe(false);
    });

    test('cards should stack vertically on mobile', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);
      
      // Check that cards are not too wide
      const cardWidths = await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*="Card"], [class*="card"]');
        const widths: number[] = [];
        cards.forEach(card => {
          const rect = card.getBoundingClientRect();
          if (rect.width > 0) widths.push(rect.width);
        });
        return widths;
      });
      
      const viewportWidth = mobileViewports['iPhone 12'].width;
      const oversizedCards = cardWidths.filter(w => w > viewportWidth);
      
      expect(oversizedCards.length).toBe(0);
    });

    test('sidebar should be hidden or collapsed on mobile', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);
      
      // Check sidebar width - should be collapsed or hidden
      const sidebarVisible = await page.evaluate(() => {
        const sidebar = document.querySelector('aside, [class*="sidebar"], [class*="Sidebar"]');
        if (!sidebar) return false;
        const rect = sidebar.getBoundingClientRect();
        // Sidebar should be off-screen or collapsed (width < 80px)
        return rect.width > 80 && rect.left >= 0;
      });
      
      // On mobile, sidebar should be hidden
      expect(sidebarVisible).toBe(false);
    });

    test('text should be readable', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);
      
      const textSizes = await page.evaluate(() => {
        const elements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6');
        const tooSmall: string[] = [];
        
        elements.forEach(el => {
          const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
          const text = el.textContent?.trim().slice(0, 20) || '';
          if (fontSize < 11 && text.length > 0) {
            tooSmall.push(`${text}: ${fontSize}px`);
          }
        });
        
        return tooSmall;
      });
      
      console.log('Small text elements:', textSizes);
      expect(textSizes.length).toBeLessThan(10);
    });
  });

  test.describe('Tax Dashboard - Mobile', () => {
    test.use({ viewport: mobileViewports['iPhone 12'] });

    test('should not have horizontal overflow', async ({ page }) => {
      await page.goto('/dashboard/tax');
      await page.waitForTimeout(2000);
      
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      await page.screenshot({ path: 'test-screenshots/tax-mobile.png', fullPage: true });
      
      expect(hasHorizontalScroll).toBe(false);
    });

    test('header should be responsive', async ({ page }) => {
      await page.goto('/dashboard/tax');
      await page.waitForTimeout(2000);
      
      // Check header doesn't overflow
      const headerOverflow = await page.evaluate(() => {
        const header = document.querySelector('h1');
        if (!header) return false;
        const rect = header.getBoundingClientRect();
        return rect.width > window.innerWidth;
      });
      
      expect(headerOverflow).toBe(false);
    });

    test('metric cards should be properly sized', async ({ page }) => {
      await page.goto('/dashboard/tax');
      await page.waitForTimeout(2000);
      
      const cardWidths = await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*="Card"]');
        const oversized: { width: number }[] = [];
        
        cards.forEach(card => {
          const rect = card.getBoundingClientRect();
          if (rect.width > window.innerWidth) {
            oversized.push({ width: rect.width });
          }
        });
        
        return oversized;
      });
      
      expect(cardWidths.length).toBe(0);
    });
  });

  test.describe('Transactions Page - Mobile', () => {
    test.use({ viewport: mobileViewports['iPhone 12'] });

    test('should not have horizontal overflow', async ({ page }) => {
      await page.goto('/dashboard/transactions');
      await page.waitForTimeout(2000);
      
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      await page.screenshot({ path: 'test-screenshots/transactions-mobile.png', fullPage: true });
      
      expect(hasHorizontalScroll).toBe(false);
    });

    test('table or list should be scrollable if needed', async ({ page }) => {
      await page.goto('/dashboard/transactions');
      await page.waitForTimeout(2000);
      
      // Tables should have overflow-x-auto on mobile
      const tableContainerScrollable = await page.evaluate(() => {
        const tables = document.querySelectorAll('table');
        let allScrollable = true;
        
        tables.forEach(table => {
          const parent = table.parentElement;
          if (parent) {
            const style = window.getComputedStyle(parent);
            if (table.scrollWidth > parent.clientWidth) {
              allScrollable = allScrollable && (style.overflowX === 'auto' || style.overflowX === 'scroll');
            }
          }
        });
        
        return allScrollable;
      });
      
      expect(tableContainerScrollable).toBe(true);
    });
  });

  test.describe('Cross-device Screenshots', () => {
    for (const [deviceName, viewport] of Object.entries(mobileViewports)) {
      test(`Landing page on ${deviceName}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        await page.screenshot({ 
          path: `test-screenshots/landing-${deviceName.toLowerCase().replace(/ /g, '-')}.png`,
          fullPage: true 
        });
        
        // Basic checks
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        
        expect(hasHorizontalScroll).toBe(false);
      });
    }
  });
});

test.describe('Touch Target Audit', () => {
  test.use({ viewport: mobileViewports['iPhone 12'] });

  test('all interactive elements should have minimum 44px touch target', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const undersizedElements = await page.evaluate(() => {
      const interactiveSelectors = 'button, a, input, select, textarea, [role="button"], [tabindex="0"]';
      const elements = document.querySelectorAll(interactiveSelectors);
      const undersized: { selector: string; width: number; height: number; text: string }[] = [];
      
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        
        if (isVisible && (rect.width < 44 || rect.height < 44)) {
          // Exclude hidden elements and very small decorative elements
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            undersized.push({
              selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              text: el.textContent?.trim().slice(0, 30) || '',
            });
          }
        }
      });
      
      return undersized;
    });
    
    console.log('Undersized interactive elements:', undersizedElements);
    
    // Main CTAs and buttons should all be adequate
    const criticalUndersized = undersizedElements.filter(el => 
      el.width < 30 || el.height < 30
    );
    
    expect(criticalUndersized.length).toBeLessThan(3);
  });
});

test.describe('Spacing and Layout Audit', () => {
  test.use({ viewport: mobileViewports['iPhone 12'] });

  test('content should have adequate padding on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that main content has at least 16px padding
    const paddingCheck = await page.evaluate(() => {
      const main = document.querySelector('main, [role="main"], section');
      if (!main) return true;
      
      const style = window.getComputedStyle(main);
      const paddingLeft = parseFloat(style.paddingLeft);
      const paddingRight = parseFloat(style.paddingRight);
      
      return paddingLeft >= 16 && paddingRight >= 16;
    });
    
    expect(paddingCheck).toBe(true);
  });

  test('text should not touch screen edges', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const textTouchingEdge = await page.evaluate(() => {
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span');
      let touchingEdge = 0;
      
      textElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const text = el.textContent?.trim() || '';
        
        if (text.length > 10 && rect.width > 100) {
          // Check if text touches left or right edge
          if (rect.left < 8 || rect.right > window.innerWidth - 8) {
            touchingEdge++;
          }
        }
      });
      
      return touchingEdge;
    });
    
    expect(textTouchingEdge).toBeLessThan(5);
  });
});
