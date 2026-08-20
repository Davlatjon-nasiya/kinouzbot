const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const http = require("http");

const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 8582398177;

const PORT = process.env.PORT || 10000;
const PUBLIC_URL =
    process.env.RENDER_EXTERNAL_URL ||
    "https://kinouzbot-a04h.onrender.com";

const WEBHOOK_PATH = "/telegram-webhook";

if (!TOKEN) {
    console.log("❌ BOT_TOKEN topilmadi!");
    process.exit(1);
}

const bot = new TelegramBot(TOKEN);

console.log("🤖 Bot ishga tushmoqda...");

const DATA_FILE = "data.json";

const DEFAULT_DATA = {
    channels: [],
    users: [],
    instagram: "",
    website: "",
    contact: ""
};

function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            saveData(DEFAULT_DATA);
            return { ...DEFAULT_DATA };
        }

        const data = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );

        return {
            channels: data.channels || [],
            users: data.users || [],
            instagram: data.instagram || "",
            website: data.website || "",
            contact: data.contact || ""
        };
    } catch (error) {
        console.log("❌ data.json xatosi:", error.message);
        return { ...DEFAULT_DATA };
    }
}

function saveData(data) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2)
    );
}

const adminState = {};

// ===============================
// USER MENU
// ===============================

function userKeyboard() {
    const data = loadData();

    const buttons = [];

    data.channels.forEach((channel) => {
        buttons.push([
            {
                text: "📢 " + channel.name,
                url: channel.link
            }
        ]);
    });

    if (data.instagram) {
        buttons.push([
            {
                text: "📸 Instagram",
                url: data.instagram
            }
        ]);
    }

    if (data.website) {
        buttons.push([
            {
                text: "🌐 Sayt",
                url: data.website
            }
        ]);
    }

    if (data.contact) {
        buttons.push([
            {
                text: "📞 Aloqa",
                url: data.contact
            }
        ]);
    }

    buttons.push([
        {
            text: "✅ Tekshirish",
            callback_data: "CHECK"
        }
    ]);

    return {
        reply_markup: {
            inline_keyboard: buttons
        }
    };
}

function showChannels(chatId) {
    const data = loadData();

    if (data.channels.length === 0) {
        return bot.sendMessage(
            chatId,
            "⚠️ Hozircha kanal qo'shilmagan."
        );
    }

    return bot.sendMessage(
        chatId,
        `👋 Assalomu alaykum!

Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling 👇

Obuna bo'lgach, "✅ Tekshirish" tugmasini bosing.`,
        userKeyboard()
    );
}

// ===============================
// START
// ===============================

bot.onText(/^\/start$/, async (msg) => {

    console.log("🔥 START KELDI!");
    console.log("👤 USER ID:", msg.from.id);
    console.log("👤 NAME:", msg.from.first_name);

    const data = loadData();
    const userId = msg.from.id;

    const exists = data.users.some(
        user => user.id === userId
    );

    if (!exists) {
        data.users.push({
            id: userId,
            name: msg.from.first_name || "",
            username: msg.from.username || "",
            date: new Date().toISOString()
        });

        saveData(data);

        console.log("👤 Yangi foydalanuvchi qo'shildi:", userId);
    }

    await showChannels(msg.chat.id);
});

// ===============================
// ADMIN
// ===============================

function sendAdminPanel(chatId) {

    return bot.sendMessage(
        chatId,
        `👨‍💼 ADMIN PANEL

Kerakli bo'limni tanlang 👇`,
        {
            reply_markup: {
                inline_keyboard: [

                    [
                        {
                            text: "➕ Kanal qo'shish",
                            callback_data: "ADD_CHANNEL"
                        }
                    ],

                    [
                        {
                            text: "🗑 Kanal o'chirish",
                            callback_data: "DELETE_CHANNEL"
                        },
                        {
                            text: "📋 Kanallar",
                            callback_data: "CHANNEL_LIST"
                        }
                    ],

                    [
                        {
                            text: "📸 Instagram",
                            callback_data: "INSTAGRAM"
                        }
                    ],

                    [
                        {
                            text: "🌐 Sayt",
                            callback_data: "WEBSITE"
                        }
                    ],

                    [
                        {
                            text: "📞 Aloqa",
                            callback_data: "CONTACT"
                        }
                    ],

                    [
                        {
                            text: "📊 Statistika",
                            callback_data: "STATS"
                        }
                    ]

                ]
            }
        }
    );
}

bot.onText(/^\/admin$/, async (msg) => {

    console.log("👨‍💼 ADMIN:", msg.from.id);

    if (msg.from.id !== ADMIN_ID) {
        return bot.sendMessage(
            msg.chat.id,
            "❌ Siz admin emassiz."
        );
    }

    delete adminState[msg.from.id];

    await sendAdminPanel(msg.chat.id);
});

// ===============================
// CALLBACK
// ===============================

bot.on("callback_query", async (query) => {

    console.log(
        "🔘 TUGMA:",
        query.data,
        "USER:",
        query.from.id
    );

    const userId = query.from.id;
    const chatId = query.message.chat.id;
    const action = query.data;

    try {
        await bot.answerCallbackQuery(query.id);
    } catch (error) {
        console.log(
            "Callback xatosi:",
            error.message
        );
    }

    // ===========================
    // CHECK
    // ===========================

    if (action === "CHECK") {

        await bot.sendMessage(
            chatId,
            "❌ Afsuski, hali barcha kanallarga obuna bo'lmagansiz!"
        );

        setTimeout(() => {
            showChannels(chatId);
        }, 300);

        return;
    }

    // ===========================
    // ADMIN TEKSHIRUV
    // ===========================

    if (userId !== ADMIN_ID) {
        await bot.sendMessage(
            chatId,
            "❌ Sizda admin huquqi yo'q."
        );

        return;
    }

    // ===========================
    // ADD CHANNEL
    // ===========================

    if (action === "ADD_CHANNEL") {

        adminState[userId] = {
            step: "channel_name"
        };

        await bot.sendMessage(
            chatId,
            `➕ KANAL QO'SHISH

📢 Kanal nomini yuboring.

Masalan:
Mandarin Tech`
        );

        return;
    }

    // ===========================
    // CHANNEL LIST
    // ===========================

    if (action === "CHANNEL_LIST") {

        const data = loadData();

        if (data.channels.length === 0) {
            await bot.sendMessage(
                chatId,
                "📭 Hozircha kanal qo'shilmagan."
            );

            return;
        }

        let text = "📋 KANALLAR:\n\n";

        data.channels.forEach((channel, index) => {
            text += `${index + 1}. ${channel.name}\n`;
            text += `🔗 ${channel.link}\n\n`;
        });

        await bot.sendMessage(chatId, text);

        return;
    }

    // ===========================
    // DELETE CHANNEL
    // ===========================

    if (action === "DELETE_CHANNEL") {

        const data = loadData();

        if (data.channels.length === 0) {
            await bot.sendMessage(
                chatId,
                "📭 O'chirish uchun kanal yo'q."
            );

            return;
        }

        const buttons = [];

        data.channels.forEach((channel, index) => {

            buttons.push([
                {
                    text: "❌ " + channel.name,
                    callback_data: "REMOVE_" + index
                }
            ]);

        });

        await bot.sendMessage(
            chatId,
            "🗑 O'chiriladigan kanalni tanlang:",
            {
                reply_markup: {
                    inline_keyboard: buttons
                }
            }
        );

        return;
    }

    // ===========================
    // REMOVE CHANNEL
    // ===========================

    if (action.startsWith("REMOVE_")) {

        const index = Number(
            action.replace("REMOVE_", "")
        );

        const data = loadData();

        if (!data.channels[index]) {
            await bot.sendMessage(
                chatId,
                "❌ Kanal topilmadi."
            );

            return;
        }

        const removed = data.channels[index];

        data.channels.splice(index, 1);

        saveData(data);

        await bot.sendMessage(
            chatId,
            `✅ Kanal o'chirildi!

📢 ${removed.name}`
        );

        setTimeout(() => {
            sendAdminPanel(chatId);
        }, 300);

        return;
    }

    // ===========================
    // INSTAGRAM
    // ===========================

    if (action === "INSTAGRAM") {

        adminState[userId] = {
            step: "instagram"
        };

        await bot.sendMessage(
            chatId,
            `📸 Instagram linkini yuboring.

Masalan:
https://instagram.com/username`
        );

        return;
    }

    // ===========================
    // WEBSITE
    // ===========================

    if (action === "WEBSITE") {

        adminState[userId] = {
            step: "website"
        };

        await bot.sendMessage(
            chatId,
            `🌐 Sayt linkini yuboring.

Masalan:
https://sayt.uz`
        );

        return;
    }

    // ===========================
    // CONTACT
    // ===========================

    if (action === "CONTACT") {

        adminState[userId] = {
            step: "contact"
        };

        await bot.sendMessage(
            chatId,
            `📞 Aloqa linkini yuboring.

Masalan:
https://t.me/admin`
        );

        return;
    }

    // ===========================
    // STATS
    // ===========================

    if (action === "STATS") {

        const data = loadData();

        await bot.sendMessage(
            chatId,
            `📊 BOT STATISTIKASI

👥 Jami foydalanuvchilar: ${data.users.length}

📢 Kanallar: ${data.channels.length}

🤖 Bot: ✅ Ishlayapti`
        );

        return;
    }
});

// ===============================
// ADMIN XABARLARI
// ===============================

bot.on("message", async (msg) => {

    if (!msg.text) return;

    const userId = msg.from.id;
    const chatId = msg.chat.id;

    if (userId !== ADMIN_ID) return;

    if (
        msg.text === "/start" ||
        msg.text === "/admin"
    ) {
        return;
    }

    const state = adminState[userId];

    if (!state) return;

    // ===========================
    // CHANNEL NAME
    // ===========================

    if (state.step === "channel_name") {

        adminState[userId] = {
            step: "channel_link",
            name: msg.text.trim()
        };

        await bot.sendMessage(
            chatId,
            `✅ Kanal nomi qabul qilindi:

${msg.text}

🔗 Endi kanal linkini yuboring.

Masalan:
https://t.me/kanal`
        );

        return;
    }

    // ===========================
    // CHANNEL LINK
    // ===========================

    if (state.step === "channel_link") {

        const link = msg.text.trim();

        if (
            !link.startsWith("https://t.me/") &&
            !link.startsWith("http://t.me/")
        ) {

            await bot.sendMessage(
                chatId,
                `❌ Link noto'g'ri.

Masalan:
https://t.me/kanal`
            );

            return;
        }

        const data = loadData();

        data.channels.push({
            name: state.name,
            link: link
        });

        saveData(data);

        delete adminState[userId];

        await bot.sendMessage(
            chatId,
            `✅ KANAL MUVAFFAQIYATLI QO'SHILDI!

📢 ${state.name}

🔗 ${link}`
        );

        setTimeout(() => {
            sendAdminPanel(chatId);
        }, 300);

        return;
    }

    // ===========================
    // INSTAGRAM
    // ===========================

    if (state.step === "instagram") {

        const data = loadData();

        data.instagram = msg.text.trim();

        saveData(data);

        delete adminState[userId];

        await bot.sendMessage(
            chatId,
            "✅ Instagram linki saqlandi."
        );

        setTimeout(() => {
            sendAdminPanel(chatId);
        }, 300);

        return;
    }

    // ===========================
    // WEBSITE
    // ===========================

    if (state.step === "website") {

        const data = loadData();

        data.website = msg.text.trim();

        saveData(data);

        delete adminState[userId];

        await bot.sendMessage(
            chatId,
            "✅ Sayt linki saqlandi."
        );

        setTimeout(() => {
            sendAdminPanel(chatId);
        }, 300);

        return;
    }

    // ===========================
    // CONTACT
    // ===========================

    if (state.step === "contact") {

        const data = loadData();

        data.contact = msg.text.trim();

        saveData(data);

        delete adminState[userId];

        await bot.sendMessage(
            chatId,
            "✅ Aloqa linki saqlandi."
        );

        setTimeout(() => {
            sendAdminPanel(chatId);
        }, 300);

        return;
    }
});

// ===============================
// WEBHOOK SERVER
// ===============================

const server = http.createServer((req, res) => {

    console.log(
        "🌐 REQUEST:",
        req.method,
        req.url
    );

    // HEALTH CHECK
    if (req.method === "GET") {

        res.writeHead(200, {
            "Content-Type": "text/plain; charset=utf-8"
        });

        res.end("BOT OK");

        return;
    }

    // TELEGRAM WEBHOOK
    if (
        req.method === "POST" &&
        req.url === WEBHOOK_PATH
    ) {

        let body = "";

        req.on("data", (chunk) => {
            body += chunk.toString();
        });

        req.on("end", () => {

            try {

                const update = JSON.parse(body);

                console.log(
                    "📩 TELEGRAM UPDATE KELDI"
                );

                console.log(
                    JSON.stringify(update)
                );

                bot.processUpdate(update);

                res.writeHead(200);
                res.end("OK");

            } catch (error) {

                console.log(
                    "❌ WEBHOOK XATOSI:",
                    error.message
                );

                res.writeHead(400);
                res.end("ERROR");
            }
        });

        return;
    }

    res.writeHead(404);
    res.end("Not found");
});

// ===============================
// START SERVER
// ===============================

server.listen(PORT, "0.0.0.0", async () => {

    console.log(
        "🌐 Server " + PORT + " portda ishlayapti"
    );

    const webhookUrl =
        PUBLIC_URL + WEBHOOK_PATH;

    try {

        // Eski webhookni o'chiramiz
        await bot.deleteWebHook();

        console.log(
            "🧹 Eski webhook o'chirildi"
        );

        // Yangi webhook
        await bot.setWebHook(webhookUrl);

        console.log(
            "✅ YANGI WEBHOOK O'RNATILDI:"
        );

        console.log(webhookUrl);

    } catch (error) {

        console.log(
            "❌ WEBHOOK XATOSI:",
            error.message
        );
    }
});

// ===============================
// ERROR
// ===============================

process.on("uncaughtException", (error) => {

    console.log(
        "❌ Uncaught Exception:",
        error.message
    );

});

process.on("unhandledRejection", (error) => {

    console.log(
        "❌ Unhandled Rejection:",
        error
    );

});
