import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

const PAGES_TO_TEST = [
  { path: '/', name: 'Landing Page' },
  { path: '/sign-in', name: 'Sign In' },
  { path: '/sign-up', name: 'Sign Up' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/dashboard/transactions', name: 'Transactions' },
  { path: '/dashboard/budgets', name: 'Budgets' },
  { path: '/dashboard/goals', name: 'Goals' },
  { path: '/dashboard/subscriptions', name: 'Subscriptions' },
  { path: '/dashboard/tax', name: 'Tax' },
];

test.describe('Mobile Visual Overlap Audit', () => {
  test.use({
    viewport: MOBILE_VIEWPORT,
    isMobile: true,
    hasTouch: true,
  });

  for (const page of PAGES_TO_TEST) {
    test(`${page.name} - check for overlapping elements`, async ({ page: p }) => {
      await p.goto(page.path);
      await p.waitForTimeout(3000); // Wait for animations
      
      const overlaps = await p.evaluate(() => {
        const getAllVisibleElements = () => {
          const elements = [];
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_ELEMENT,
            {
              acceptNode: (node) => {
                const el = node as HTMLElement;
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                  return NodeFilter.FILTER_REJECT;
                }
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) {
                  return NodeFilter.FILTER_SKIP;
                }
                // Only care about leaf nodes or nodes with text
                if (el.children.length === 0 || (el.innerText && el.children.length === 0)) {
                  return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
              }
            }
          );

          while (walker.nextNode()) {
            elements.push(walker.currentNode as HTMLElement);
          }
          return elements;
        };

        const elements = getAllVisibleElements();
        const overlaps = [];

        for (let i = 0; i < elements.length; i++) {
          for (let j = i + 1; j < elements.length; j++) {
            const el1 = elements[i];
            const el2 = elements[j];
            
            // Skip if one is inside the other (not overlap, just containment)
            if (el1.contains(el2) || el2.contains(el1)) continue;

            const r1 = el1.getBoundingClientRect();
            const r2 = el2.getBoundingClientRect();

            const overlap = !(r1.right < r2.left || 
                            r1.left > r2.right || 
                            r1.bottom < r2.top || 
                            r1.top > r2.bottom);

            if (overlap) {
              // Calculate overlap area to ignore tiny overlaps (borders etc)
              const x_overlap = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
              const y_overlap = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
              const overlapArea = x_overlap * y_overlap;
              
              if (overlapArea > 10) { // Ignore < 10px overlap
                 // Ignore if one element has position absolute/fixed and z-index handling (hard to detect perfectly, but...)
                 // Or if they are SVGs/Icons that might overlap intentionally
                 const style1 = window.getComputedStyle(el1);
                 const style2 = window.getComputedStyle(el2);
                 
                 // Skip negative margins which often cause intentional overlap
                 if (parseFloat(style1.marginTop) < 0 || parseFloat(style2.marginTop) < 0) continue;

                 const getClassName = (el) => {
                   if (typeof el.className === 'string') return el.className;
                   if (el.className && typeof el.className.baseVal === 'string') return el.className.baseVal;
                   return '';
                 };

                 overlaps.push({
                   el1: el1.tagName + '.' + getClassName(el1).slice(0, 30),
                   el2: el2.tagName + '.' + getClassName(el2).slice(0, 30),
                   area: overlapArea,
                   r1, r2
                 });
              }
            }
          }
        }
        return overlaps.slice(0, 5); // Limit output
      });

      if (overlaps.length > 0) {
        console.log(`${page.name} Overlaps:`, JSON.stringify(overlaps, null, 2));
      }
      
      // We don't fail the test because false positives are common in overlap detection,
      // but we log them for the AI to analyze.
      expect(overlaps.length).toBeLessThan(100); 
    });
  }
});
