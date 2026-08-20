const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

// ==========================================
// SOZLAMALAR
// ==========================================

// Tokenni hostingda BOT_TOKEN qilib qo'yamiz
const TOKEN = process.env.BOT_TOKEN;

// ⚠️ BU YERGA O'Z TELEGRAM ID INGIZNI YOZING
const ADMIN_ID = 8582398177;

// ==========================================
// BOT
// ==========================================

if (!TOKEN) {
    console.log("❌ BOT_TOKEN topilmadi!");
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, {
    polling: true
});

console.log("✅ BOT ISHGA TUSHDI");

// ==========================================
// FAYLLAR
// ==========================================

const DATA_FILE = "data.json";

// Boshlang'ich ma'lumot
const DEFAULT_DATA = {
    channels: [],
    users: []
};

// Fayl yo'q bo'lsa yaratadi
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(DEFAULT_DATA, null, 2)
    );
}

// ==========================================
// DATA O'QISH
// ==========================================

function getData() {
    try {
        return JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );
    } catch (error) {
        return {
            channels: [],
            users: []
        };
    }
}

// ==========================================
// DATA SAQLASH
// ==========================================

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
// FOYDALANUVCHINI SAQLASH
// ==========================================

function saveUser(msg) {

    const data = getData();

    const userId = msg.from.id;

    const exists = data.users.find(
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
}

// ==========================================
// KANALLARNI CHIQARISH
// ==========================================

function showChannels(chatId, text = null) {

    const data = getData();

    if (data.channels.length === 0) {

        return bot.sendMessage(
            chatId,
            "❌ Hozircha kanallar qo'shilmagan."
        );
    }

    const buttons = [];

    data.channels.forEach((channel, index) => {

        buttons.push([
            {
                text: `📢 ${channel.name}`,
                url: channel.link
            }
        ]);

    });

    // TEKSHIRISH
    buttons.push([
        {
            text: "✅ Tekshirish",
            callback_data: "check_subscription"
        }
    ]);

    bot.sendMessage(
        chatId,
        text ||
        `👋 Assalomu alaykum!

🎬 Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling.

👇 Barcha kanallarga obuna bo'lgach:

✅ Tekshirish tugmasini bosing.`,
        {
            reply_markup: {
                inline_keyboard: buttons
            }
        }
    );
}

// ==========================================
// START
// ==========================================

bot.onText(/\/start/, (msg) => {

    saveUser(msg);

    showChannels(msg.chat.id);

});

// ==========================================
// ADMIN PANEL
// ==========================================

function showAdmin(chatId) {

    const data = getData();

    bot.sendMessage(
        chatId,
        `👨‍💼 ADMIN PANEL

📢 Kanallar: ${data.channels.length}
👥 Foydalanuvchilar: ${data.users.length}

👇 Kerakli bo'limni tanlang:`,
        {
            reply_markup: {
                inline_keyboard: [

                    [
                        {
                            text: "➕ Kanal qo'shish",
                            callback_data: "add_channel"
                        }
                    ],

                    [
                        {
                            text: "🗑 Kanal o'chirish",
                            callback_data: "delete_channel"
                        }
                    ],

                    [
                        {
                            text: "📋 Kanallar",
                            callback_data: "channels_list"
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
        }
    );
}

// ==========================================
// /ADMIN
// ==========================================

bot.onText(/\/admin/, (msg) => {

    if (msg.from.id !== ADMIN_ID) {

        return bot.sendMessage(
            msg.chat.id,
            "❌ Siz admin emassiz."
        );
    }

    showAdmin(msg.chat.id);

});

// ==========================================
// CALLBACK QUERY
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

        return showChannels(
            chatId,
            `❌ Afsuski, hali barcha kanallarga obuna bo'lmagansiz!

👇 Quyidagi kanallarning barchasiga obuna bo'ling.

Obuna bo'lgach yana:

✅ Tekshirish

tugmasini bosing.`
        );
    }

    // ======================================
    // FAQAT ADMIN
    // ======================================

    if (userId !== ADMIN_ID) {

        return bot.answerCallbackQuery(
            query.id,
            {
                text: "❌ Siz admin emassiz!",
                show_alert: true
            }
        );
    }

    await bot.answerCallbackQuery(query.id);

    // ======================================
    // KANAL QO'SHISH
    // ======================================

    if (action === "add_channel") {

        adminState[userId] = {
            step: "channel_name"
        };

        return bot.sendMessage(
            chatId,
            `➕ YANGI KANAL

📢 Kanal nomini yuboring.

Masalan:

Kinolar Olami`
        );
    }

    // ======================================
    // KANALLAR RO'YXATI
    // ======================================

    if (action === "channels_list") {

        const data = getData();

        if (data.channels.length === 0) {

            return bot.sendMessage(
                chatId,
                "❌ Hozircha kanal yo'q."
            );
        }

        let text = "📋 KANALLAR\n\n";

        data.channels.forEach((channel, index) => {

            text += `${index + 1}. 📢 ${channel.name}\n`;
            text += `🔗 ${channel.link}\n\n`;

        });

        return bot.sendMessage(
            chatId,
            text
        );
    }

    // ======================================
    // KANAL O'CHIRISH
    // ======================================

    if (action === "delete_channel") {

        const data = getData();

        if (data.channels.length === 0) {

            return bot.sendMessage(
                chatId,
                "❌ O'chirish uchun kanal yo'q."
            );
        }

        const buttons = [];

        data.channels.forEach((channel, index) => {

            buttons.push([
                {
                    text: `❌ ${channel.name}`,
                    callback_data: `remove_${index}`
                }
            ]);

        });

        return bot.sendMessage(
            chatId,
            "🗑 O'chirmoqchi bo'lgan kanalni tanlang:",
            {
                reply_markup: {
                    inline_keyboard: buttons
                }
            }
        );
    }

    // ======================================
    // KANALNI O'CHIRISH
    // ======================================

    if (action.startsWith("remove_")) {

        const index = Number(
            action.replace("remove_", "")
        );

        const data = getData();

        if (!data.channels[index]) {

            return bot.sendMessage(
                chatId,
                "❌ Kanal topilmadi."
            );
        }

        const channelName =
            data.channels[index].name;

        data.channels.splice(index, 1);

        saveData(data);

        bot.sendMessage(
            chatId,
            `✅ Kanal o'chirildi:

📢 ${channelName}`
        );

        return showAdmin(chatId);
    }

    // ======================================
    // STATISTIKA
    // ======================================

    if (action === "statistics") {

        const data = getData();

        const today =
            new Date().toISOString().split("T")[0];

        const todayUsers =
            data.users.filter(user =>
                user.date &&
                user.date.startsWith(today)
            ).length;

        return bot.sendMessage(
            chatId,
            `📊 BOT STATISTIKASI

👥 Jami foydalanuvchilar:
${data.users.length}

🆕 Bugun kirganlar:
${todayUsers}

📢 Kanallar:
${data.channels.length}

🤖 Bot:
✅ Ishlayapti`
        );
    }

});

// ==========================================
// ADMIN XABARLARI
// ==========================================

bot.on("message", (msg) => {

    const userId = msg.from.id;
    const chatId = msg.chat.id;

    // Faqat admin
    if (userId !== ADMIN_ID) {
        return;
    }

    // Buyruqlarni o'tkazib yuboramiz
    if (
        msg.text === "/start" ||
        msg.text === "/admin"
    ) {
        return;
    }

    const state = adminState[userId];

    if (!state) {
        return;
    }

    // ======================================
    // KANAL NOMI
    // ======================================

    if (state.step === "channel_name") {

        if (!msg.text) {
            return;
        }

        adminState[userId] = {
            step: "channel_link",
            name: msg.text
        };

        return bot.sendMessage(
            chatId,
            `✅ Kanal nomi:

📢 ${msg.text}

Endi kanal havolasini yuboring.

Masalan:

https://t.me/kinolar`
        );
    }

    // ======================================
    // KANAL LINKI
    // ======================================

    if (state.step === "channel_link") {

        if (!msg.text) {
            return;
        }

        const link = msg.text.trim();

        // Linkni tekshirish
        if (
            !link.startsWith("https://") &&
            !link.startsWith("http://")
        ) {

            return bot.sendMessage(
                chatId,
                `❌ Link noto'g'ri.

To'liq link yuboring.

Masalan:

https://t.me/kinolar`
            );
        }

        const data = getData();

        data.channels.push({
            name: state.name,
            link: link
        });

        saveData(data);

        delete adminState[userId];

        bot.sendMessage(
            chatId,
            `✅ KANAL QO'SHILDI!

📢 ${state.name}

🔗 ${link}

Endi /start qilgan odamlarga bu kanal ham chiqadi.`
        );

        return showAdmin(chatId);
    }

});

// ==========================================
// XATOLIK
// ==========================================

bot.on("polling_error", (error) => {

    console.log(
        "❌ BOT XATOSI:",
        error.message
    );

});
