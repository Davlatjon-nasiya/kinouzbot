const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const http = require("http");

// ==========================================
// TOKEN
// ==========================================

const TOKEN = process.env.BOT_TOKEN;

// O'Z TELEGRAM ID INGIZNI YOZING
const ADMIN_ID = 123456789;

if (!TOKEN) {
    console.log("❌ BOT_TOKEN topilmadi!");
    process.exit(1);
}

// ==========================================
// RENDER UCHUN SERVER
// ==========================================

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("Telegram bot ishlayapti!");
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Server ${PORT} portda ishlayapti`);
});

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

const defaultData = {
    channels: [],
    users: [],
    instagram: "",
    website: "",
    contact: ""
};

function loadData() {

    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(defaultData, null, 2)
        );

        return { ...defaultData };
    }

    try {
        const data = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );

        data.channels = data.channels || [];
        data.users = data.users || [];
        data.instagram = data.instagram || "";
        data.website = data.website || "";
        data.contact = data.contact || "";

        return data;

    } catch (error) {
        console.log("❌ data.json xatosi");
        return { ...defaultData };
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
// OBUNA TUGMALARI
// ==========================================

function subscriptionKeyboard() {

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
            callback_data: "check_subscription"
        }
    ]);

    return {
        reply_markup: {
            inline_keyboard: buttons
        }
    };
}

// ==========================================
// KANALLARNI CHIQARISH
// ==========================================

function showChannels(chatId) {

    const data = loadData();

    if (data.channels.length === 0) {

        return bot.sendMessage(
            chatId,
            "⚠️ Hozircha kanal qo‘shilmagan."
        );
    }

    bot.sendMessage(
        chatId,
        `👋 Assalomu alaykum!

Botdan foydalanish uchun quyidagi kanallarga obuna bo‘ling 👇

Obuna bo‘lgach, «✅ Tekshirish» tugmasini bosing.`,
        subscriptionKeyboard()
    );
}

// ==========================================
// START
// ==========================================

bot.onText(/\/start/, (msg) => {

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
    }

    showChannels(msg.chat.id);
});

// ==========================================
// ADMIN PANEL
// ==========================================

function adminPanel() {

    return {
        reply_markup: {
            inline_keyboard: [

                [
                    {
                        text: "➕ Kanal qo‘shish",
                        callback_data: "add_channel"
                    }
                ],

                [
                    {
                        text: "🗑 Kanal o‘chirish",
                        callback_data: "delete_channel"
                    },
                    {
                        text: "📋 Kanallar",
                        callback_data: "channel_list"
                    }
                ],

                [
                    {
                        text: "📸 Instagram",
                        callback_data: "edit_instagram"
                    }
                ],

                [
                    {
                        text: "🌐 Sayt",
                        callback_data: "edit_website"
                    }
                ],

                [
                    {
                        text: "📞 Aloqa",
                        callback_data: "edit_contact"
                    }
                ],

                [
                    {
                        text: "📊 Statistika",
                        callback_data: "statistics"
                    }
                ]
            ]
        }
    };
}

// ==========================================
// ADMIN
// ==========================================

bot.onText(/\/admin/, (msg) => {

    if (msg.from.id !== ADMIN_ID) {

        return bot.sendMessage(
            msg.chat.id,
            "❌ Siz admin emassiz."
        );
    }

    delete adminState[msg.from.id];

    bot.sendMessage(
        msg.chat.id,
        `👨‍💼 ADMIN PANEL

Kerakli bo‘limni tanlang 👇`,
        adminPanel()
    );
});

// ==========================================
// CALLBACK
// ==========================================

bot.on("callback_query", async (query) => {

    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const action = query.data;

    // ======================================
    // TEKSHIRISH
    // ======================================

    if (action === "check_subscription") {

        await bot.answerCallbackQuery(query.id);

        await bot.sendMessage(
            chatId,
            `❌ Afsuski, hali barcha kanallarga obuna bo‘lmagansiz!

👇 Kanallarga obuna bo‘lib, yana tekshiring.`
        );

        return showChannels(chatId);
    }

    // ======================================
    // ADMIN
    // ======================================

    if (userId !== ADMIN_ID) {

        return bot.answerCallbackQuery(
            query.id,
            {
                text: "❌ Ruxsat yo‘q!",
                show_alert: true
            }
        );
    }

    await bot.answerCallbackQuery(query.id);

    // ======================================
    // KANAL QO‘SHISH
    // ======================================

    if (action === "add_channel") {

        adminState[userId] = {
            step: "channel_name"
        };

        return bot.sendMessage(
            chatId,
            `➕ KANAL QO‘SHISH

📢 Kanal nomini yuboring.

Masalan:

Kino Uz`
        );
    }

    // ======================================
    // KANALLAR
    // ======================================

    if (action === "channel_list") {

        const data = loadData();

        if (data.channels.length === 0) {

            return bot.sendMessage(
                chatId,
                "📭 Hozircha kanal yo‘q."
            );
        }

        let text = "📋 KANALLAR:\n\n";

        data.channels.forEach((channel, index) => {

            text += `${index + 1}. ${channel.name}\n`;
            text += `${channel.link}\n\n`;

        });

        return bot.sendMessage(
            chatId,
            text
        );
    }

    // ======================================
    // KANAL O‘CHIRISH
    // ======================================

    if (action === "delete_channel") {

        const data = loadData();

        if (data.channels.length === 0) {

            return bot.sendMessage(
                chatId,
                "📭 O‘chirish uchun kanal yo‘q."
            );
        }

        const buttons = data.channels.map(
            (channel, index) => [
                {
                    text: "❌ " + channel.name,
                    callback_data: "remove_" + index
                }
            ]
        );

        return bot.sendMessage(
            chatId,
            "🗑 O‘chiriladigan kanalni tanlang:",
            {
                reply_markup: {
                    inline_keyboard: buttons
                }
            }
        );
    }

    // ======================================
    // O‘CHIRISH
    // ======================================

    if (action.startsWith("remove_")) {

        const index = parseInt(
            action.replace("remove_", "")
        );

        const data = loadData();

        if (!data.channels[index]) {

            return bot.sendMessage(
                chatId,
                "❌ Kanal topilmadi."
            );
        }

        const removed = data.channels[index];

        data.channels.splice(index, 1);

        saveData(data);

        return bot.sendMessage(
            chatId,
            `✅ Kanal o‘chirildi:

📢 ${removed.name}`,
            adminPanel()
        );
    }

    // ======================================
    // INSTAGRAM
    // ======================================

    if (action === "edit_instagram") {

        adminState[userId] = {
            step: "instagram"
        };

        return bot.sendMessage(
            chatId,
            `📸 Instagram linkini yuboring.

Masalan:

https://instagram.com/username`
        );
    }

    // ======================================
    // SAYT
    // ======================================

    if (action === "edit_website") {

        adminState[userId] = {
            step: "website"
        };

        return bot.sendMessage(
            chatId,
            `🌐 Sayt linkini yuboring.

Masalan:

https://sayt.uz`
        );
    }

    // ======================================
    // ALOQA
    // ======================================

    if (action === "edit_contact") {

        adminState[userId] = {
            step: "contact"
        };

        return bot.sendMessage(
            chatId,
            `📞 Aloqa linkini yuboring.

Masalan:

https://t.me/admin`
        );
    }

    // ======================================
    // STATISTIKA
    // ======================================

    if (action === "statistics") {

        const data = loadData();

        return bot.sendMessage(
            chatId,
            `📊 BOT STATISTIKASI

👥 Jami kirganlar: ${data.users.length}

📢 Kanallar: ${data.channels.length}

🤖 Bot: ✅ Ishlayapti`
        );
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

        return bot.sendMessage(
            chatId,
            `✅ Kanal nomi saqlandi:

${msg.text}

🔗 Endi kanal linkini yuboring.

Masalan:

https://t.me/kanal`
        );
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

            return bot.sendMessage(
                chatId,
                `❌ Link noto‘g‘ri.

Masalan:

https://t.me/kanal`
            );
        }

        const data = loadData();

        data.channels.push({
            name: state.name,
            link: link
        });

        saveData(data);

        delete adminState[userId];

        return bot.sendMessage(
            chatId,
            `✅ KANAL QO‘SHILDI!

📢 ${state.name}

🔗 ${link}`,
            adminPanel()
        );
    }

    // ======================================
    // INSTAGRAM
    // ======================================

    if (state.step === "instagram") {

        const data = loadData();

        data.instagram = msg.text.trim();

        saveData(data);

        delete adminState[userId];

        return bot.sendMessage(
            chatId,
            "✅ Instagram linki saqlandi.",
            adminPanel()
        );
    }

    // ======================================
    // SAYT
    // ======================================

    if (state.step === "website") {

        const data = loadData();

        data.website = msg.text.trim();

        saveData(data);

        delete adminState[userId];

        return bot.sendMessage(
            chatId,
            "✅ Sayt linki saqlandi.",
            adminPanel()
        );
    }

    // ======================================
    // ALOQA
    // ======================================

    if (state.step === "contact") {

        const data = loadData();

        data.contact = msg.text.trim();

        saveData(data);

        delete adminState[userId];

        return bot.sendMessage(
            chatId,
            "✅ Aloqa linki saqlandi.",
            adminPanel()
        );
    }
});

// ==========================================
// XATOLIK
// ==========================================

bot.on("polling_error", (error) => {

    console.log(
        "❌ Telegram xatosi:",
        error.message
    );

});
