# 🚍 1337 Bus Booking Bot

A Telegram bot to help you book bus tickets on the 1337 school bus system automatically at a specific time. **Now with automatic token retrieval!**

## 📋 Prerequisites

Before installing, make sure you have the following installed on your system:

- **Node.js** (version 14 or higher)
- **npm** (comes with Node.js)
- **A Telegram account**

## 🔧 Installation Steps

### 1. Install Node.js and npm

If you don't have Node.js installed yet:

```bash
# Check if you have Node.js installed
node --version

# If not installed, install Node.js:
# On Ubuntu/Debian (WSL)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Clone or Download the Project

Navigate to your desired directory and either clone or download this project:

```bash
cd ~
# If you have the project folder already, navigate to it
cd BoBus
```

### 3. Install Dependencies

Install all required npm packages:

```bash
npm install
```

This will install:
- `node-telegram-bot-api` - For Telegram bot functionality
- `chalk` - For colored terminal output
- `dotenv` - For environment variables
- `node-fetch` - For HTTP requests
- `node-schedule` - For scheduling tasks
- `playwright` - For automated token retrieval

### 3.1 Install Playwright Browsers

After installing dependencies, install Chromium for Playwright:

```bash
npx playwright install chromium
```

This downloads the browser needed for automatic token retrieval.

### 4. Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Follow the instructions:
   - Choose a name for your bot (e.g., "My 1337 Bus Bot")
   - Choose a username (must end with 'bot', e.g., "my1337bus_bot")
4. **Copy the API token** that BotFather gives you (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 5. Configure Environment Variables

Create a `.env` file in the project directory:

```bash
touch .env
```

Edit the `.env` file and add your credentials:

```env
BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN_HERE"

# Intra credentials for automatic token retrieval
INTRA_LOGIN="your_intra_login"
INTRA_PASSWORD="your_intra_password"
```

Replace:
- `YOUR_TELEGRAM_BOT_TOKEN_HERE` with the token you got from BotFather
- `your_intra_login` with your 1337 intra login (username or email)
- `your_intra_password` with your 1337 intra password

**⚠️ Security Note:** Keep your `.env` file private and never commit it to git!

### 6. ~~Get Your 1337 Bus Token~~ (Optional - Now Automatic!)

**You no longer need to manually get the token!** The bot can now retrieve it automatically using the `/get` command.

However, if you prefer to do it manually:

1. Go to https://bus-med.1337.ma/
2. Log in with your 1337 credentials
3. Open **Developer Tools** in your browser (F12 or Right-click → Inspect)
4. Go to the **Application** or **Storage** tab
5. Look for **Cookies** → `bus-med.1337.ma`
6. Find the cookie named `le_token`
7. **Copy its value**

## 🚀 Running the Bot

Start the bot with:

```bash
node bus.mjs
```

Or use the npm script:

```bash
npm start
```

You should see:
```
🔑 Token loaded from .tkn
🤖 M9L_bot is now running...
```

## 📱 How to Use the Bot

### First Time Setup (Automatic Method - Recommended!)

1. Open Telegram and find your bot (search for the username you created)
2. Start a chat with your bot
3. **Get your token automatically:**
   ```
   /get
   ```
   The bot will automatically log in to the intra, retrieve your token, and save it!

### First Time Setup (Manual Method - Alternative)

If you prefer to set the token manually:

1. Get your token from the browser (see section 6 above)
2. Send it to the bot:
   ```
   token: YOUR_LE_TOKEN_VALUE
   ```

### Booking a Bus

1. **Check available buses:**
   ```
   /bus
   ```
   This shows all current available buses with their IDs.

2. **Set the time** you want to book (must be in the future):
   ```
   time: 15:10:22
   ```
   Format: `HH:MM:SS` (24-hour format)

3. **Set the bus ID** you want to book:
   ```
   id: 18399
   ```
   Use the ID you got from the `/bus` command.

4. **Schedule the booking:**
   ```
   /run
   ```
   The bot will automatically book the bus at the specified time.

### Other Commands

- **`/get`** - 🔄 Automatically retrieve a fresh token from the intra (no manual copying needed!)
- **`/status`** - Check your current settings (time, bus ID, token status)
- **`/cancel`** - Cancel a scheduled booking
- **`/bus`** - View currently available buses

## 📝 Example Usage

### Automatic Token Retrieval (New!)

```
1. Send: /get
   Bot: 🔄 Starting automatic token retrieval process...
   Bot: 🚀 Starting automated token retrieval...
   Bot: 🔐 Logging in to intra...
   Bot: ✅ Token retrieved successfully!
        🔑 eyJhb...xDkA
   Bot: 🧾 Token retrieved successfully!
        
        Current data:
        ⏰ Time: ❌ Not set
        🚌 Bus ID: ❌ Not set
        🪪 Token: ✅ Active
        🔑 eyJhb...xDkA

2. Send: /bus
   Bot: 🚍 Current available buses:
        🔹 ID: 18399 | 🛣️ Route: Martil | 🚍 Bus: Bus 1

3. Send: time: 15:10:22
   Bot: 🕐 Time set to 15:10:22

4. Send: id: 18399
   Bot: 🚌 Bus ID set to 18399

5. Send: /run
   Bot: ✅ Command scheduled for 3:10:22 PM
```

At 15:10:22, the bot will automatically book the bus for you!

### Manual Token Method (Alternative)

```
1. Send: token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Bot: 🔑 Token saved successfully.

2. Send: /bus
   Bot: 🚍 Current available buses:
        🔹 ID: 18399 | 🛣️ Route: Martil | 🚍 Bus: Bus 1

3. Send: time: 15:10:22
   Bot: 🕐 Time set to 15:10:22

4. Send: id: 18399
   Bot: 🚌 Bus ID set to 18399

5. Send: /run
   Bot: ✅ Command scheduled for 3:10:22 PM
```

## 🐛 Troubleshooting

### Bot Token Error
```
❌ BOT_TOKEN not found in .env file!
```
**Solution:** Make sure you created a `.env` file with your `BOT_TOKEN`.

### Token Unauthorized
```
🚫 Unauthorized — your token might be expired or invalid.
```
**Solution:** Your `le_token` has expired. Simply send `/get` to the bot to automatically retrieve a fresh token!

### Time in the Past Error
```
❌ Time must be in the future!
```
**Solution:** Make sure the time you set is in the future, not in the past.

### No Buses Available
```
🚌 No active buses found right now.
```
**Solution:** Check the bus schedule on the 1337 bus website. There might be no buses available at the moment.

### Token Retrieval Failed
```
❌ Error during token retrieval: ...
```
**Solution:** 
1. Check your internet connection
2. Verify your `INTRA_LOGIN` and `INTRA_PASSWORD` in `.env` file are correct
3. Check the terminal logs for detailed error messages
4. Look for `error_screenshot.png` in the project folder for debugging

## 📁 Project Structure

```
buTe/
├── bus.mjs              # Main bot code with integrated auto-token retrieval
├── get_token.mjs        # Standalone token getter (can be used separately)
├── package.json         # Project dependencies
├── .env                 # Your bot token and intra credentials (create this)
├── .tkn                 # Saved 1337 bus token (auto-generated)
├── bus_log.txt          # Bot activity logs (auto-generated)
├── error_screenshot.png # Debug screenshot (auto-generated on errors)
├── TOKEN_GETTER_README.md # Documentation for standalone token getter
└── README.md            # This file
```

## ⚠️ Important Notes

- Keep your `.env` file and `.tkn` file **private** - never share them!
- Your `.env` file contains your intra password - **never commit it to git!**
- Your `le_token` expires periodically, but now you can refresh it easily with `/get`
- The bot must be running continuously for scheduled bookings to work
- Make sure your computer/server is on at the scheduled time
- The automatic token retrieval runs in headless mode (no visible browser)

## 🎓 Tips for 1337 Students

- Run the bot on a server or keep your computer on if you want reliable scheduling
- Use `/get` command whenever you see "Unauthorized" errors - no need to manually copy tokens!
- Set the time a few seconds before the actual booking time to account for network delays
- The `/bus` command is useful to see what buses are currently available
- Check `/status` regularly to make sure your settings are correct
- The bot logs all activities in the terminal with colored output for easy debugging

## ✨ New Features

### Automatic Token Retrieval
- No more manual token copying from browser DevTools!
- Just send `/get` and the bot handles everything
- Uses Playwright to automate the login process
- Runs in headless mode (background, no visible browser)
- All actions are logged in the terminal
- Automatically saves the token to `.tkn` file
- Updates the bot's memory with the new token

## 📞 Support

If you encounter any issues:
1. Check the `bus_log.txt` file for error messages
2. Make sure all dependencies are installed correctly
3. Verify your bot token and 1337 token are valid
4. Ensure your Node.js version is 14 or higher

---

**Made for 1337 School Students By M9L** 🎓
