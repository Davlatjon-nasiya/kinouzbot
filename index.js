const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const http = require("http");

// ==========================================
// SOZLAMALAR
// ==========================================

const TOKEN = process.env.BOT_TOKEN;

// O'Z TELEGRAM ID INGIZ
const ADMIN_ID = 8582398177;

// ==========================================
// RENDER SERVER
// ==========================================

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("🤖 Telegram bot ishlayapti!");
});

server.listen(PORT, "0.0.0.0", () => {
    console.log("🌐 Server " + PORT + " portda ishlayapti");
});

// ==========================================
// TOKEN TEKSHIRISH
// ==========================================

if (!TOKEN) {
    console.log("❌ BOT_TOKEN topilmadi!");
    process.exit(1);
}

// ==========================================
// TELEGRAM BOT
// ==========================================

const bot = new TelegramBot(TOKEN, {
    polling: true
});

console.log("✅ Telegram bot ishga tushdi");

// ==========================================
// DATA
// ==========================================

const DATA_FILE = "data.json";

const DEFAULT_DATA = {
    channels: [],
    users: [],
    instagram: "",
    website: "",
    contact: ""
};

function loadData() {

    if (!fs.existsSync(DATA_FILE)) {
        saveData(DEFAULT_DATA);
        return { ...DEFAULT_DATA };
    }

    try {

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

        console.log("❌ data.json o'qishda xato");

        return {
            channels: [],
            users: [],
            instagram: "",
            website: "",
            contact: ""
        };
    }
}

function saveData(data) {

    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2)
    );

}

// ==========================================
// ADMIN HOLATI
// ==========================================

const adminState = {};

// ==========================================
// FOYDALANUVCHI MENYUSI
// ==========================================

function userKeyboard() {

    const data = loadData();

    const buttons = [];

    // Kanallar
    data.channels.forEach((channel) => {

        buttons.push([
            {
                text: "📢 " + channel.name,
                url: channel.link
            }
        ]);

    });

    // Instagram
    if (data.instagram) {

        buttons.push([
            {
                text: "📸 Instagram",
                url: data.instagram
            }
        ]);

    }

    // Sayt
    if (data.website) {

        buttons.push([
            {
                text: "🌐 Sayt",
                url: data.website
            }
        ]);

    }

    // Aloqa
    if (data.contact) {

        buttons.push([
            {
                text: "📞 Aloqa",
                url: data.contact
            }
        ]);

    }

    // Tekshirish
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

// ==========================================
// KANALLARNI KO'RSATISH
// ==========================================

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

// ==========================================
// START
// ==========================================

bot.onText(/^\/start$/, (msg) => {

    console.log("▶️ START:", msg.from.id);

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

        console.log(
            "👤 Yangi foydalanuvchi:",
            userId
        );
    }

    showChannels(msg.chat.id);

});

// ==========================================
// ADMIN PANEL
// ==========================================

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

// ==========================================
// /ADMIN
// ==========================================

bot.onText(/^\/admin$/, (msg) => {

    console.log("👨‍💼 ADMIN:", msg.from.id);

    if (msg.from.id !== ADMIN_ID) {

        return bot.sendMessage(
            msg.chat.id,
            "❌ Siz admin emassiz."
        );

    }

    delete adminState[msg.from.id];

    sendAdminPanel(msg.chat.id);

});

// ==========================================
// CALLBACK QUERY
// ==========================================

bot.on("callback_query", (query) => {

    console.log(
        "🔘 TUGMA BOSILDI:",
        query.data,
        "USER:",
        query.from.id
    );

    const userId = query.from.id;
    const chatId = query.message.chat.id;
    const action = query.data;

    // ======================================
    // ENG MUHIM:
    // TUGMAGA DARHOL JAVOB
    // ======================================

    bot.answerCallbackQuery(query.id)
        .catch((error) => {
            console.log(
                "Callback javob xatosi:",
                error.message
            );
        });

    // ======================================
    // TEKSHIRISH
    // ======================================

    if (action === "CHECK") {

        bot.sendMessage(
            chatId,
            `❌ Afsuski, hali barcha kanallarga obuna bo'lmagansiz!

👇 Kanallarga obuna bo'lib, yana tekshiring.`
        );

        setTimeout(() => {
            showChannels(chatId);
        }, 300);

        return;
    }

    // ======================================
    // ADMIN TEKSHIRISH
    // ======================================

    if (userId !== ADMIN_ID) {

        bot.sendMessage(
            chatId,
            "❌ Sizda admin huquqi yo'q."
        );

        return;
    }

    // ======================================
    // KANAL QO'SHISH
    // ======================================

    if (action === "ADD_CHANNEL") {

        adminState[userId] = {
            step: "channel_name"
        };

        bot.sendMessage(
            chatId,
            `➕ KANAL QO'SHISH

📢 Kanal nomini yuboring.

Masalan:

Mandarin Tech`
        );

        return;
    }

    // ======================================
    // KANALLAR RO'YXATI
    // ======================================

    if (action === "CHANNEL_LIST") {

        const data = loadData();

        if (data.channels.length === 0) {

            bot.sendMessage(
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

        bot.sendMessage(
            chatId,
            text
        );

        return;
    }

    // ======================================
    // KANAL O'CHIRISH
    // ======================================

    if (action === "DELETE_CHANNEL") {

        const data = loadData();

        if (data.channels.length === 0) {

            bot.sendMessage(
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

        bot.sendMessage(
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

    // ======================================
    // KANALNI O'CHIRISH
    // ======================================

    if (action.startsWith("REMOVE_")) {

        const index = Number(
            action.replace("REMOVE_", "")
        );

        const data = loadData();

        if (!data.channels[index]) {

            bot.sendMessage(
                chatId,
                "❌ Kanal topilmadi."
            );

            return;
        }

        const removed = data.channels[index];

        data.channels.splice(index, 1);

        saveData(data);

        bot.sendMessage(
            chatId,
            `✅ Kanal o'chirildi!

📢 ${removed.name}`
        );

        setTimeout(() => {
            sendAdminPanel(chatId);
        }, 300);

        return;
    }

    // ======================================
    // INSTAGRAM
    // ======================================

    if (action === "INSTAGRAM") {

        adminState[userId] = {
            step: "instagram"
        };

        bot.sendMessage(
            chatId,
            `📸 Instagram linkini yuboring.

Masalan:

https://instagram.com/username`
        );

        return;
    }

    // ======================================
    // SAYT
    // ======================================

    if (action === "WEBSITE") {

        adminState[userId] = {
            step: "website"
        };

        bot.sendMessage(
            chatId,
            `🌐 Sayt linkini yuboring.

Masalan:

https://sayt.uz`
        );

        return;
    }

    // ======================================
    // ALOQA
    // ======================================

    if (action === "CONTACT") {

        adminState[userId] = {
            step: "contact"
        };

        bot.sendMessage(
            chatId,
            `📞 Aloqa linkini yuboring.

Masalan:

https://t.me/admin`
        );

        return;
    }

    // ======================================
    // STATISTIKA
    // ======================================

    if (action === "STATS") {

        const data = loadData();

        bot.sendMessage(
            chatId,
            `📊 BOT STATISTIKASI

👥 Jami foydalanuvchilar: ${data.users.length}

📢 Kanallar: ${data.channels.length}

🤖 Bot holati: ✅ Ishlayapti`
        );

        return;
    }

});

// ==========================================
// ADMIN XABARLARI
// ==========================================

bot.on("message", (msg) => {

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

    // ======================================
    // KANAL NOMI
    // ======================================

    if (state.step === "channel_name") {

        adminState[userId] = {
            step: "channel_link",
            name: msg.text.trim()
        };

        bot.sendMessage(
            chatId,
            `✅ Kanal nomi:

${msg.text}

🔗 Endi kanal linkini yuboring.

Masalan:

https://t.me/kanal`
        );

        return;
    }

    // ======================================
    // KANAL LINKI
    // ======================================

    if (state.step === "channel_link") {

        const link = msg.text.trim();

        if (
            !link.startsWith("https://t.me/") &&
            !link.startsWith("http://t.me/")
        ) {

            bot.sendMessage(
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

        bot.sendMessage(
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

    // ======================================
    // INSTAGRAM
    // ======================================

    if (state.step === "instagram") {

        const data = loadData();

        data.instagram = msg.text.trim();

        saveData(data);

        delete adminState[userId];

        bot.sendMessage(
            chatId,
            "✅ Instagram linki saqlandi."
        );

        setTimeout(() => {
            sendAdminPanel(chatId);
        }, 300);

        return;
    }

    // ======================================
    // SAYT
    // ======================================

    if (state.step === "website") {

        const data = loadData();

        data.website = msg.text.trim();

        saveData(data);

        delete adminState[userId];

        bot.sendMessage(
            chatId,
            "✅ Sayt linki saqlandi."
        );

        setTimeout(() => {
            sendAdminPanel(chatId);
        }, 300);

        return;
    }

    // ======================================
    // ALOQA
    // ======================================

    if (state.step === "contact") {

        const data = loadData();

        data.contact = msg.text.trim();

        saveData(data);

        delete adminState[userId];

        bot.sendMessage(
            chatId,
            "✅ Aloqa linki saqlandi."
        );

        setTimeout(() => {
            sendAdminPanel(chatId);
        }, 300);

        return;
    }

});

// ==========================================
// XATOLIKLAR
// ==========================================

bot.on("polling_error", (error) => {

    console.log(
        "❌ POLLING XATOSI:",
        error.message
    );

});

process.on("uncaughtException", (error) => {

    console.log(
        "❌ UNCaught Exception:",
        error.message
    );

});

process.on("unhandledRejection", (error) => {

    console.log(
        "❌ Unhandled Rejection:",
        error
    );

});
