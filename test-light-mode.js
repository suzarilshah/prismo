const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function testLightMode() {
  // Configure Chrome options
  const options = new chrome.Options();
  options.addArguments('--disable-blink-features=AutomationControlled');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  
  // Create driver
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  const pages = [
    { path: '/', name: 'Landing Page' },
    { path: '/sign-in', name: 'Sign In' },
    { path: '/sign-up', name: 'Sign Up' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/dashboard/transactions', name: 'Transactions' },
    { path: '/dashboard/budgets', name: 'Budgets' },
    { path: '/dashboard/goals', name: 'Goals' },
    { path: '/dashboard/subscriptions', name: 'Subscriptions' },
    { path: '/dashboard/tax', name: 'Tax' },
    { path: '/dashboard/settings', name: 'Settings' },
    { path: '/dashboard/ai', name: 'AI Assistant' },
    { path: '/dashboard/forecast', name: 'Forecast' },
    { path: '/dashboard/income', name: 'Income' },
    { path: '/dashboard/credit-cards', name: 'Credit Cards' },
    { path: '/dashboard/vendors', name: 'Vendors' }
  ];

  const results = [];

  try {
    // Set viewport size for consistency
    await driver.manage().window().setRect({ width: 1920, height: 1080 });

    for (const page of pages) {
      console.log(`\nTesting: ${page.name} (${page.path})`);
      
      // Navigate to page
      await driver.get(`http://localhost:3000${page.path}`);
      
      // Wait for page to load
      await driver.sleep(2000);

      // Set light mode by injecting localStorage
      await driver.executeScript(`
        localStorage.setItem('theme', 'light');
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      `);

      // Wait for theme change
      await driver.sleep(500);

      // Get computed styles of key elements
      const backgroundStyle = await driver.executeScript(`
        return window.getComputedStyle(document.body).backgroundColor;
      `);

      const textStyle = await driver.executeScript(`
        return window.getComputedStyle(document.body).color;
      `);

      // Check for dark mode specific classes
      const hasDarkClasses = await driver.executeScript(`
        const elements = document.querySelectorAll('*');
        let darkCount = 0;
        for (let el of elements) {
          const classes = el.className;
          if (typeof classes === 'string' && classes.includes('dark:')) {
            darkCount++;
          }
        }
        return darkCount;
      `);

      // Get all background colors on the page
      const backgroundColors = await driver.executeScript(`
        const elements = document.querySelectorAll('div, section, main, header, footer');
        const colors = new Set();
        for (let el of elements) {
          const style = window.getComputedStyle(el);
          if (style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            colors.add(style.backgroundColor);
          }
        }
        return Array.from(colors);
      `);

      // Check for consistent card styles
      const cardStyles = await driver.executeScript(`
        const cards = document.querySelectorAll('.data-card, .card, [class*="card"]');
        const styles = [];
        for (let card of cards) {
          const style = window.getComputedStyle(card);
          styles.push({
            background: style.backgroundColor,
            border: style.borderColor,
            shadow: style.boxShadow
          });
        }
        return styles;
      `);

      // Take screenshot
      const screenshot = await driver.takeScreenshot();
      const fs = require('fs');
      fs.writeFileSync(`./test-screenshots/light-mode-${page.path.replace(/\//g, '-')}.png`, screenshot, 'base64');

      results.push({
        page: page.name,
        path: page.path,
        backgroundColor: backgroundStyle,
        textColor: textStyle,
        darkClassCount: hasDarkClasses,
        uniqueBackgrounds: backgroundColors.length,
        cardCount: cardStyles.length,
        status: backgroundStyle.includes('255, 255, 255') || backgroundStyle.includes('rgb(255, 255, 255)') ? '✅' : '❌'
      });

      console.log(`  Background: ${backgroundStyle}`);
      console.log(`  Text Color: ${textStyle}`);
      console.log(`  Dark Classes Found: ${hasDarkClasses}`);
      console.log(`  Unique Backgrounds: ${backgroundColors.length}`);
      console.log(`  Cards Found: ${cardStyles.length}`);
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('LIGHT MODE CONSISTENCY TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log('\n📊 Summary:');
    for (const result of results) {
      console.log(`${result.status} ${result.page.padEnd(20)} - BG: ${result.backgroundColor.substring(0, 20).padEnd(20)} - Dark Classes: ${result.darkClassCount}`);
    }

    // Check for issues
    const issues = results.filter(r => r.status === '❌' || r.darkClassCount > 0);
    if (issues.length > 0) {
      console.log('\n⚠️  Issues found:');
      for (const issue of issues) {
        console.log(`  - ${issue.page}: ${issue.darkClassCount} dark classes, BG: ${issue.backgroundColor}`);
      }
    } else {
      console.log('\n✅ All pages have consistent light mode!');
    }

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await driver.quit();
  }
}

// Run the test
testLightMode().catch(console.error);
