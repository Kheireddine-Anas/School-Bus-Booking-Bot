import TelegramBot from "node-telegram-bot-api";
import { exec } from "child_process";
import fs from "fs";
import chalk from "chalk";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
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

