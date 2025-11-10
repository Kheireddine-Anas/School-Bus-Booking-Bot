import { chromium } from "playwright";
import fs from "fs";
import chalk from "chalk";
import dotenv from "dotenv";

dotenv.config();

const INTRA_LOGIN = process.env.INTRA_LOGIN;
const INTRA_PASSWORD = process.env.INTRA_PASSWORD;
const TOKEN_FILE = ".tkn";

// Helper log function
const log = (message, type = "info") => {
  const time = new Date().toLocaleTimeString();
  const colors = {
    success: chalk.green,
    error: chalk.red,
    warn: chalk.yellow,
    info: chalk.cyan,
  };
  console.log(colors[type] ? colors[type](`[${time}] ${message}`) : message);
};

// Main function to get the token
async function getLeToken() {
  if (!INTRA_LOGIN || !INTRA_PASSWORD) {
    log("❌ INTRA_LOGIN or INTRA_PASSWORD not found in .env file!", "error");
    log("Please add them to your .env file:", "info");
    log("INTRA_LOGIN=your_intra_login", "info");
    log("INTRA_PASSWORD=your_intra_password", "info");
    process.exit(1);
  }

  log("🚀 Starting automated login process...", "info");
  
  let browser;
  try {
    // Launch browser
    log("🌐 Launching browser...", "info");
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();

    log("📍 Navigating to bus-med.1337.ma...", "info");
    await page.goto('https://bus-med.1337.ma/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for and click the "Sign in with 42" button
    log("🔍 Looking for 'Sign in with 42' button...", "info");
    await page.waitForSelector('a[href*="/api/auth/42"]', { timeout: 10000 });
    
    log("👆 Clicking 'Sign in with 42' button...", "info");
    await page.click('a[href*="/api/auth/42"]');

    // Wait for redirect to intra login page
    log("⏳ Waiting for intra login page...", "info");
    await page.waitForSelector('input#username', { timeout: 15000 });
    
    log("✍️ Filling in login credentials...", "info");
    
    // Fill in the username
    await page.fill('input#username', INTRA_LOGIN);
    
    // Fill in the password
    await page.fill('input#password', INTRA_PASSWORD);
    
    log("🔐 Submitting login form...", "info");
    
    // Click the sign in button and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
      page.click('input#kc-login')
    ]);

    // Give it a moment to ensure cookies are set
    await page.waitForTimeout(2000);

    // Extract cookies
    log("🍪 Extracting cookies...", "info");
    const cookies = await context.cookies();
    
    // Find the le_token cookie
    const leTokenCookie = cookies.find(cookie => cookie.name === 'le_token');

    if (leTokenCookie && leTokenCookie.value) {
      const token = leTokenCookie.value;
      
      // Save token to file
      fs.writeFileSync(TOKEN_FILE, token);
      
      log("✅ Successfully obtained le_token!", "success");
      log(`🔑 Token: ${token.slice(0, 10)}...${token.slice(-10)}`, "success");
      log(`💾 Token saved to ${TOKEN_FILE}`, "success");
      
      // Also display expiry if available
      if (leTokenCookie.expires && leTokenCookie.expires !== -1) {
        const expiryDate = new Date(leTokenCookie.expires * 1000);
        log(`⏰ Token expires: ${expiryDate.toLocaleString()}`, "info");
      }

      await browser.close();
      return token;
    } else {
      log("❌ le_token cookie not found!", "error");
      log("Available cookies:", "warn");
      cookies.forEach(cookie => log(`  - ${cookie.name}`, "info"));
      
      await browser.close();
      process.exit(1);
    }

  } catch (error) {
    log(`❌ Error during authentication: ${error.message}`, "error");
    
    if (browser) {
      // Take a screenshot for debugging
      try {
        const pages = browser.contexts()[0]?.pages();
        if (pages && pages.length > 0) {
          await pages[0].screenshot({ path: 'error_screenshot.png' });
          log("📸 Screenshot saved to error_screenshot.png for debugging", "info");
        }
      } catch (screenshotError) {
        log(`Could not take screenshot: ${screenshotError.message}`, "warn");
      }
      
      await browser.close();
    }
    
    process.exit(1);
  }
}

// Run the function
getLeToken().catch(error => {
  log(`❌ Fatal error: ${error.message}`, "error");
  process.exit(1);
});
