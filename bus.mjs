import TelegramBot from "node-telegram-bot-api";
import { exec } from "child_process";
import fs from "fs";
import chalk from "chalk";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { chromium } from "playwright";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const INTRA_LOGIN = process.env.INTRA_LOGIN;
const INTRA_PASSWORD = process.env.INTRA_PASSWORD;
const TOKEN_FILE = ".tkn";
const LOG_FILE = "./bus_log.txt";
const userData = {};

if (!BOT_TOKEN) {
  console.error(chalk.red("❌ BOT_TOKEN not found in .env file!"));
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ===== Helper log function =====
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

// ===== Token management =====
let savedToken = null;
if (fs.existsSync(TOKEN_FILE)) {
  savedToken = fs.readFileSync(TOKEN_FILE, "utf8").trim();
  log(`🔑 Token loaded from ${TOKEN_FILE}`, "success");
} else {
  log("⚠️ No token file found (.tkn)", "warn");
}

// ===== Mask token for status display =====
const maskToken = (token) => {
  if (!token || token.length < 12) return "Invalid token";
  return `${token.slice(0, 5)}...${token.slice(-7)}`;
};

// ===== Automatic token getter function =====
async function getLeToken(chatId = null) {
  if (!INTRA_LOGIN || !INTRA_PASSWORD) {
    log("❌ INTRA_LOGIN or INTRA_PASSWORD not found in .env file!", "error");
    if (chatId) {
      bot.sendMessage(chatId, "❌ Intra credentials not configured in .env file!");
    }
    return null;
  }

  log("🚀 Starting automated login process...", "info");
  if (chatId) {
    bot.sendMessage(chatId, "🚀 Starting automated token retrieval...");
  }
  
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
    if (chatId) {
      bot.sendMessage(chatId, "🔐 Logging in to intra...");
    }
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
      
      // Update the savedToken variable
      savedToken = token;
      
      log("✅ Successfully obtained le_token!", "success");
      log(`🔑 Token: ${token.slice(0, 10)}...${token.slice(-10)}`, "success");
      log(`💾 Token saved to ${TOKEN_FILE}`, "success");
      
      // Also display expiry if available
      if (leTokenCookie.expires && leTokenCookie.expires !== -1) {
        const expiryDate = new Date(leTokenCookie.expires * 1000);
        log(`⏰ Token expires: ${expiryDate.toLocaleString()}`, "info");
      }

      await browser.close();
      
      if (chatId) {
        bot.sendMessage(chatId, `✅ Token retrieved successfully!\n🔑 ${maskToken(token)}`);
      }
      
      return token;
    } else {
      log("❌ le_token cookie not found!", "error");
      log("Available cookies:", "warn");
      cookies.forEach(cookie => log(`  - ${cookie.name}`, "info"));
      
      await browser.close();
      
      if (chatId) {
        bot.sendMessage(chatId, "❌ Failed to retrieve token. Check terminal logs for details.");
      }
      
      return null;
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
    
    if (chatId) {
      bot.sendMessage(chatId, `❌ Error during token retrieval: ${error.message}`);
    }
    
    return null;
  }
}

// ===== /get command - Automatic token retrieval =====
bot.onText(/\/get/, async (msg) => {
  const chatId = msg.chat.id;
  
  log(`User ${chatId} requested automatic token retrieval`, "info");
  bot.sendMessage(chatId, "🔄 Starting automatic token retrieval process...");
  
  const token = await getLeToken(chatId);
  
  if (token) {
    // Show status after successful token retrieval
    const data = userData[chatId] || {};
    const time = data.time || "❌ Not set";
    const busId = data.busId || "❌ Not set";
    
    const message = `🧾 *Token retrieved successfully!*\n\n` +
      `*Current data:*\n` +
      `⏰ Time: ${time}\n` +
      `🚌 Bus ID: ${busId}\n` +
      `🪪 Token: ✅ Active\n🔑 ${maskToken(token)}`;
    
    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    log(`✅ Token successfully retrieved and saved for user ${chatId}`, "success");
  } else {
    bot.sendMessage(chatId, "❌ Token retrieval failed. Please check the terminal logs or try again later.");
    log(`❌ Token retrieval failed for user ${chatId}`, "error");
  }
});

// ===== /status =====
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const data = userData[chatId] || {};
  const time = data.time || "❌ Not set";
  const busId = data.busId || "❌ Not set";

  let tokenDisplay = "❌ Not found";
  if (savedToken && savedToken.length > 0)
    tokenDisplay = `✅ Exists\n🔑 ${maskToken(savedToken)}`;

  const message = `🧾 *Current data:*\n` +
    `⏰ Time: ${time}\n` +
    `🚌 Bus ID: ${busId}\n` +
    `🪪 Token: ${tokenDisplay}`;

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  log(`Displayed status for user ${chatId}`, "info");
});

// ===== /cancel =====
bot.onText(/\/cancel/, (msg) => {
  const chatId = msg.chat.id;
  if (userData[chatId]) {
    userData[chatId].scheduled = false;
    bot.sendMessage(chatId, "❌ Scheduled command cancelled.");
    log(`User ${chatId} cancelled scheduled command`, "warn");
  } else {
    bot.sendMessage(chatId, "⚠️ Nothing to cancel.");
  }
});

// ===== /bus =====
bot.onText(/\/bus/, async (msg) => {
  const chatId = msg.chat.id;
  if (!savedToken) {
    bot.sendMessage(chatId, "❌ No token found! Please set it using:\n`token: YOUR_TOKEN`", { parse_mode: "Markdown" });
    return;
  }

  try {
    const res = await fetch("https://bus-med.1337.ma/api/departure/current", {
      headers: {
        "Cookie": `le_token=${savedToken}`,
        "Accept": "application/json",
      },
    });

    const statusText = `${res.status} ${res.statusText}`;
    log(`🌐 /bus request returned ${statusText}`, res.ok ? "success" : "error");

    if (res.status === 401) {
      bot.sendMessage(chatId, "🚫 Unauthorized — your token might be expired or invalid.");
      return;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      bot.sendMessage(chatId, "🚌 No active buses found right now.");
      return;
    }

    let response = "🚍 *Current available buses:*\n";
    for (const bus of data) {
      response += `🔹 ID: ${bus.id} | 🛣️ Route: ${bus.route.name} | 🚍 Bus: ${bus.route.bus.name}\n`;
    }

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
    fs.appendFileSync(LOG_FILE, `[${new Date().toLocaleString()}] /bus request by ${chatId} → ${statusText}\n`);
  } catch (err) {
    bot.sendMessage(chatId, `❌ Error fetching buses: ${err.message}`);
    log(`❌ /bus error: ${err.message}`, "error");
  }
});

// ===== /next - Get buses available in the next hour with predicted IDs =====
bot.onText(/\/next/, async (msg) => {
  const chatId = msg.chat.id;
  if (!savedToken) {
    bot.sendMessage(chatId, "❌ No token found! Please use `/get` to retrieve your token.", { parse_mode: "Markdown" });
    return;
  }

  try {
    log(`🌐 /next request from user ${chatId}`, "info");
    bot.sendMessage(chatId, "🔍 Checking upcoming buses...");

    // Fetch current buses to get the last ID
    const currentRes = await fetch("https://bus-med.1337.ma/api/departure/current", {
      headers: {
        "Cookie": `le_token=${savedToken}`,
        "Accept": "application/json",
      },
    });

    let lastBusId = null;
    if (currentRes.ok) {
      const currentBuses = await currentRes.json();
      if (Array.isArray(currentBuses) && currentBuses.length > 0) {
        // Find the maximum ID from current buses
        lastBusId = Math.max(...currentBuses.map(b => b.id));
        log(`🔢 Last available bus ID: ${lastBusId}`, "info");
      }
    }

    // Fetch upcoming buses
    const res = await fetch("https://bus-med.1337.ma/api/departure/upcoming", {
      headers: {
        "Cookie": `le_token=${savedToken}`,
        "Accept": "application/json",
      },
    });

    const statusText = `${res.status} ${res.statusText}`;
    log(`🌐 /next request returned ${statusText}`, res.ok ? "success" : "error");

    if (res.status === 401) {
      bot.sendMessage(chatId, "🚫 Unauthorized — your token might be expired. Use `/get` to refresh it.", { parse_mode: "Markdown" });
      return;
    }

    const allBuses = await res.json();
    if (!Array.isArray(allBuses) || allBuses.length === 0) {
      bot.sendMessage(chatId, "🚌 No upcoming buses found.");
      return;
    }

    // Get current time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    const currentTimeInSeconds = currentHour * 3600 + currentMinute * 60 + currentSecond;
    
    // Calculate one hour from now
    const oneHourLater = currentTimeInSeconds + 3600;

    log(`⏰ Current time: ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:${String(currentSecond).padStart(2, '0')}`, "info");

    // Filter buses available within the next hour
    const nextHourBuses = allBuses.filter(bus => {
      const [availHour, availMinute, availSecond] = bus.available_time.split(':').map(Number);
      const availableTimeInSeconds = availHour * 3600 + availMinute * 60 + availSecond;
      
      // Check if available time is within the next hour
      return availableTimeInSeconds > currentTimeInSeconds && availableTimeInSeconds <= oneHourLater;
    });

    if (nextHourBuses.length === 0) {
      bot.sendMessage(chatId, "⏰ No buses available in the next hour.\n\nTip: Use `/bus` to see current buses.");
      log("📭 No buses found in the next hour", "warn");
      return;
    }

    // Sort buses by available_time, then by bus.id to ensure correct order
    nextHourBuses.sort((a, b) => {
      const timeCompare = a.available_time.localeCompare(b.available_time);
      if (timeCompare !== 0) return timeCompare;
      return a.bus.id - b.bus.id;
    });

    // Generate predicted IDs based on last bus ID and bus order
    const busesWithPredictedIds = nextHourBuses.map((bus, index) => {
      let predictedId = null;
      
      if (lastBusId !== null) {
        // Group by available_time to handle multiple buses at same time
        const sameTimeIndex = nextHourBuses
          .filter(b => b.available_time === bus.available_time)
          .findIndex(b => b.bus.id === bus.bus.id);
        
        // Calculate predicted ID: lastBusId + offset based on position
        const baseOffset = nextHourBuses
          .slice(0, index)
          .filter(b => b.available_time !== bus.available_time).length;
        
        predictedId = lastBusId + baseOffset + sameTimeIndex + 1;
      }

      return {
        ...bus,
        predictedId
      };
    });

    // Build response message
    let response = `🕐 *Buses available in the next hour:*\n\n`;
    
    for (const bus of busesWithPredictedIds) {
      const availTime = bus.available_time.substring(0, 5); // HH:MM
      const deptTime = bus.departure_time.substring(0, 5);  // HH:MM
      const noReturn = bus.no_return ? " 🚫 (No Return)" : "";
      const idDisplay = bus.predictedId ? `~${bus.predictedId}` : "???";
      
      response += `🔹 *Predicted ID:* \`${idDisplay}\`\n`;
      response += `   📍 Route: ${bus.name}${noReturn}\n`;
      response += `   🚍 Bus: ${bus.bus.name}\n`;
      response += `   ⏰ Available: ${availTime}\n`;
      response += `   🚀 Departs: ${deptTime}\n\n`;
    }

    response += `💡 *Tip:* Use \`id: ${busesWithPredictedIds[0].predictedId || '???'}\` to set your bus ID\n`;
    response += `📝 *Note:* IDs marked with ~ are predicted based on the last available bus`;

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
    log(`✅ Found ${nextHourBuses.length} bus(es) in the next hour for user ${chatId}`, "success");
    
    if (lastBusId) {
      log(`🔮 Predicted IDs starting from ${lastBusId + 1}`, "info");
    } else {
      log(`⚠️ Could not determine last bus ID - prediction unavailable`, "warn");
    }
    
    // Log to file
    fs.appendFileSync(LOG_FILE, `[${now.toLocaleString()}] /next request by ${chatId} → Found ${nextHourBuses.length} bus(es), Last ID: ${lastBusId || 'unknown'}\n`);

  } catch (err) {
    bot.sendMessage(chatId, `❌ Error fetching upcoming buses: ${err.message}`);
    log(`❌ /next error: ${err.message}`, "error");
  }
});

// ===== Handle messages =====
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  if (text.startsWith("/") && text !== "/run") return;
  if (!userData[chatId]) userData[chatId] = {};

  if (text.toLowerCase().startsWith("time:")) {
    const time = text.split(":").slice(1).join(":").trim();
    userData[chatId].time = time;
    bot.sendMessage(chatId, `🕐 Time set to ${time}`);
    log(`User ${chatId} set time: ${time}`);
  } else if (text.toLowerCase().startsWith("id:")) {
    const busId = text.split(":")[1].trim();
    userData[chatId].busId = busId;
    bot.sendMessage(chatId, `🚌 Bus ID set to ${busId}`);
    log(`User ${chatId} set bus ID: ${busId}`);
  } else if (text.toLowerCase().startsWith("token:")) {
    const token = text.split(":")[1].trim();
    savedToken = token;
    fs.writeFileSync(TOKEN_FILE, token);
    log(`🔑 Token saved to ${TOKEN_FILE}`, "success");
    bot.sendMessage(chatId, "🔑 Token saved successfully.");
  }
});

// ===== /run =====
bot.onText(/\/run/, (msg) => {
  const chatId = msg.chat.id;
  const data = userData[chatId];

  if (!data || !data.time || !data.busId || !savedToken) {
    bot.sendMessage(
      chatId,
      "⚙️ Use format:\n- time: 15:10:22\n- id: 18399\n- token: your_token\nThen type /run to schedule."
    );
    return;
  }

  const now = new Date();
  const [h, m, s] = data.time.split(":").map(Number);
  const runTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    h,
    m,
    s
  );

  if (runTime < now) {
    bot.sendMessage(chatId, "❌ Time must be in the future!");
    return;
  }

  const delay = runTime - now;
  bot.sendMessage(chatId, `✅ Command scheduled for ${runTime.toLocaleTimeString()}`);
  log(`Scheduled command for user ${chatId} at ${runTime.toLocaleTimeString()}`, "info");

  setTimeout(() => {
    const { busId } = userData[chatId];
    const command = `/usr/bin/curl -s -X POST "https://bus-med.1337.ma/api/tickets/book" \
-H "User-Agent: Mozilla/5.0" \
-H "Accept: application/json, text/plain, */*" \
-H "Accept-Language: en-US,en;q=0.5" \
-H "Content-Type: application/json" \
-H "Cookie: le_token=${savedToken}" \
-e "https://bus-med.1337.ma/home" \
-d '{"departure_id":${busId},"to_campus":false}'`;

    exec(command, (err, stdout, stderr) => {
      const timestamp = new Date().toLocaleString();
      if (err) {
        const logText = `[${timestamp}] ❌ Error for user ${chatId}, bus ${busId}: ${err.message}\n`;
        fs.appendFileSync(LOG_FILE, logText);
        bot.sendMessage(chatId, `❌ Error: ${err.message}`);
        log(logText, "error");
        return;
      }

      const logText = `[${timestamp}] ✅ Command executed for user ${chatId}, bus ${busId}\nResponse:\n${stdout}\n\n`;
      fs.appendFileSync(LOG_FILE, logText);

      bot.sendMessage(chatId, `🚍 Command executed successfully for bus ${busId}`);
      log(`✅ Command executed successfully for user ${chatId} (Bus ${busId})`, "success");
    });
  }, delay);
});

log("🤖 M9L_bot is now running...", "success");

