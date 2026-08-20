const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const http = require("http");

// ==========================================
// SOZLAMALAR
// ==========================================

const TOKEN = process.env.BOT_TOKEN;

// SIZNING TELEGRAM ID
const ADMIN_ID = 858239817;

const PORT = process.env.PORT || 10000;

const PUBLIC_URL =
    process.env.RENDER_EXTERNAL_URL ||
    "https://kinouzbot-a04h.onrender.com";

const WEBHOOK_PATH = "/telegram-webhook";

// ==========================================
// TOKEN TEKSHIRISH
// ==========================================

if (!TOKEN) {
    console.log("❌ BOT_TOKEN topilmadi!");
    process.exit(1);
}

// ==========================================
// BOT
// ==========================================

const bot = new TelegramBot(TOKEN);

console.log("🤖 BOT ISHGA TUSHMOQDA...");

// ==========================================
// FAYL
// ==========================================

const DATA_FILE = "data.json";

const DEFAULT_DATA = {
    users: []
};

// ==========================================
// MA'LUMOTNI O'QISH
// ==========================================

function loadData() {

    try {

        if (!fs.existsSync(DATA_FILE)) {

            fs.writeFileSync(
                DATA_FILE,
                JSON.stringify(DEFAULT_DATA, null, 2)
            );

            return {
                users: []
            };
        }

        const data = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );

        return {
            users: data.users || []
        };

    } catch (error) {

        console.log(
            "❌ data.json xatosi:",
            error.message
        );

        return {
            users: []
        };
    }
}

// ==========================================
// MA'LUMOTNI SAQLASH
// ==========================================

function saveData(data) {

    try {

        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(data, null, 2)
        );

    } catch (error) {

        console.log(
            "❌ Saqlash xatosi:",
            error.message
        );
    }
}

// ==========================================
// SIZNING LINKLARINGIZ
// ==========================================

const LINKS = [

    {
        name: "📢 Telegram — Mandarin Tech",
        link: "https://t.me/mandarintech"
    },

    {
        name: "📸 Instagram — Yakhubov AI",
        link: "https://www.instagram.com/yakhubov_ai"
    },

    {
        name: "📸 Instagram — Mandarin Nasiya",
        link: "https://www.instagram.com/mandarin_nasiya"
    }

];

// ==========================================
// FOYDALANUVCHI MENYUSI
// ==========================================

function userKeyboard() {

    const buttons = [];

    // 3 TA LINK

    LINKS.forEach((item) => {

        buttons.push([
            {
                text: item.name,
                url: item.link
            }
        ]);

    });

    // TEKSHIRISH

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

async function showChannels(chatId) {

    await bot.sendMessage(
        chatId,

        `👋 Assalomu alaykum!

🤖 Botdan foydalanish uchun quyidagi sahifalarga obuna bo'ling 👇

1️⃣ Telegram kanalga o'ting
2️⃣ Instagram sahifalarga o'ting
3️⃣ Hammasini ko'rib chiqing
4️⃣ Keyin "✅ Tekshirish" tugmasini bosing`,

        userKeyboard()
    );
}

// ==========================================
// /START
// ==========================================

bot.onText(/^\/start(?:\s.*)?$/, async (msg) => {

    try {

        console.log("");
        console.log("================================");
        console.log("🔥 START KELDI");
        console.log("👤 ID:", msg.from.id);
        console.log("👤 ISM:", msg.from.first_name);
        console.log("================================");

        const data = loadData();

        const userId = msg.from.id;

        // Foydalanuvchini topish

        const exists = data.users.some(
            user => user.id === userId
        );

        // Yangi foydalanuvchi

        if (!exists) {

            data.users.push({

                id: userId,

                name:
                    msg.from.first_name ||
                    "",

                username:
                    msg.from.username ||
                    "",

                date:
                    new Date().toISOString()

            });

            saveData(data);

            console.log(
                "👤 YANGI FOYDALANUVCHI:",
                userId
            );
        }

        await showChannels(
            msg.chat.id
        );

    } catch (error) {

        console.log(
            "❌ START XATOSI:",
            error.message
        );
    }
});

// ==========================================
// ADMIN PANEL
// ==========================================

async function sendAdminPanel(chatId) {

    await bot.sendMessage(

        chatId,

        `👨‍💼 ADMIN PANEL

Kerakli bo'limni tanlang 👇`,

        {

            reply_markup: {

                inline_keyboard: [

                    [
                        {
                            text: "📢 Linklar",
                            callback_data: "LINKS"
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

bot.onText(/^\/admin$/, async (msg) => {

    console.log(
        "👨‍💼 ADMIN:",
        msg.from.id
    );

    if (msg.from.id !== ADMIN_ID) {

        await bot.sendMessage(
            msg.chat.id,
            "❌ Siz admin emassiz."
        );

        return;
    }

    await sendAdminPanel(
        msg.chat.id
    );
});

// ==========================================
// TUGMALAR
// ==========================================

bot.on(
    "callback_query",
    async (query) => {

        try {

            console.log(
                "🔘 TUGMA:",
                query.data,
                "USER:",
                query.from.id
            );

            const action =
                query.data;

            const chatId =
                query.message.chat.id;

            // Tugma aylanishini to'xtatish

            try {

                await bot.answerCallbackQuery(
                    query.id
                );

            } catch (error) {

                console.log(
                    "Callback javob xatosi:",
                    error.message
                );
            }

            // ==================================
            // TEKSHIRISH
            // ==================================

            if (action === "CHECK") {

                await bot.sendMessage(

                    chatId,

                    `❌ Afsuski, hali barcha sahifalarga obuna bo'lmagansiz!

Iltimos, yuqoridagi barcha havolalarga o'tib chiqing.`

                );

                // Yana linklarni chiqarish

                setTimeout(
                    () => {

                        showChannels(
                            chatId
                        );

                    },
                    500
                );

                return;
            }

            // ==================================
            // ADMIN TEKSHIRUV
            // ==================================

            if (
                query.from.id !==
                ADMIN_ID
            ) {

                await bot.sendMessage(
                    chatId,
                    "❌ Sizda admin huquqi yo'q."
                );

                return;
            }

            // ==================================
            // LINKLAR
            // ==================================

            if (action === "LINKS") {

                let text =
                    "📢 BOT LINKLARI\n\n";

                LINKS.forEach(
                    (item, index) => {

                        text +=
                            `${index + 1}. ${item.name}\n`;

                        text +=
                            `${item.link}\n\n`;
                    }
                );

                await bot.sendMessage(
                    chatId,
                    text
                );

                return;
            }

            // ==================================
            // STATISTIKA
            // ==================================

            if (action === "STATS") {

                const data =
                    loadData();

                await bot.sendMessage(

                    chatId,

                    `📊 BOT STATISTIKASI

👥 Jami foydalanuvchilar: ${data.users.length}

🔗 Linklar: ${LINKS.length}

🤖 Bot: ✅ Ishlayapti`

                );

                return;
            }

        } catch (error) {

            console.log(
                "❌ CALLBACK XATOSI:",
                error.message
            );
        }
    }
);

// ==========================================
// RENDER WEBHOOK SERVER
// ==========================================

const server =
    http.createServer(
        (req, res) => {

            console.log(
                "🌐 REQUEST:",
                req.method,
                req.url
            );

            // =================================
            // RENDER TEKSHIRUVI
            // =================================

            if (
                req.method === "GET"
            ) {

                res.writeHead(
                    200,
                    {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                );

                res.end(
                    "🤖 Telegram bot ishlayapti!"
                );

                return;
            }

            // =================================
            // TELEGRAM WEBHOOK
            // =================================

            if (

                req.method === "POST" &&

                req.url ===
                WEBHOOK_PATH

            ) {

                let body = "";

                req.on(
                    "data",
                    (chunk) => {

                        body +=
                            chunk.toString();

                    }
                );

                req.on(
                    "end",
                    () => {

                        try {

                            const update =
                                JSON.parse(
                                    body
                                );

                            console.log(
                                "📩 TELEGRAM UPDATE KELDI"
                            );

                            // Telegram update

                            bot.processUpdate(
                                update
                            );

                            res.writeHead(
                                200
                            );

                            res.end(
                                "OK"
                            );

                        } catch (error) {

                            console.log(
                                "❌ WEBHOOK XATOSI:",
                                error.message
                            );

                            res.writeHead(
                                400
                            );

                            res.end(
                                "ERROR"
                            );
                        }
                    }
                );

                return;
            }

            // =================================
            // NOT FOUND
            // =================================

            res.writeHead(
                404
            );

            res.end(
                "Not found"
            );
        }
    );

// ==========================================
// SERVERNI ISHGA TUSHIRISH
// ==========================================

server.listen(

    PORT,

    "0.0.0.0",

    async () => {

        console.log(
            "🌐 Server " +
            PORT +
            " portda ishlayapti"
        );

        const webhookUrl =
            PUBLIC_URL +
            WEBHOOK_PATH;

        try {

            // Eski webhookni tozalash

            await bot.deleteWebHook();

            console.log(
                "🧹 Eski webhook tozalandi"
            );

            // Yangi webhook

            await bot.setWebHook(
                webhookUrl
            );

            console.log(
                "================================"
            );

            console.log(
                "✅ WEBHOOK O'RNATILDI"
            );

            console.log(
                webhookUrl
            );

            console.log(
                "================================"
            );

        } catch (error) {

            console.log(
                "❌ WEBHOOK XATOSI:",
                error.message
            );
        }
    }
);

// ==========================================
// XATOLAR
// ==========================================

process.on(
    "uncaughtException",
    (error) => {

        console.log(
            "❌ UNCAUGHT ERROR:",
            error.message
        );
    }
);

process.on(
    "unhandledRejection",
    (error) => {

        console.log(
            "❌ PROMISE ERROR:",
            error
        );
    }
);

console.log(
    "🚀 BOT KODI YUKLANDI"
);
