const http = require("http");
const https = require("https");
const fs = require("fs");

const TOKEN = process.env.BOT_TOKEN;

const ADMIN_ID = 858239817;

const PORT = process.env.PORT || 10000;

const PUBLIC_URL =
    process.env.RENDER_EXTERNAL_URL ||
    "https://kinouzbot-a04h.onrender.com";

const WEBHOOK_PATH = "/telegram-webhook";

if (!TOKEN) {
    console.log("❌ BOT_TOKEN topilmadi!");
    process.exit(1);
}

console.log("🤖 BOT KODI YUKLANDI");

// ================================
// LINKLAR
// ================================

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

// ================================
// MA'LUMOT
// ================================

const DATA_FILE = "data.json";

function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return { users: [] };
        }

        const data = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );

        return {
            users: data.users || []
        };
    } catch (error) {
        console.log("❌ DATA XATO:", error.message);
        return { users: [] };
    }
}

function saveData(data) {
    try {
        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(data, null, 2)
        );
    } catch (error) {
        console.log("❌ SAQLASH XATO:", error.message);
    }
}

// ================================
// TELEGRAM API
// ================================

function telegram(method, data) {
    return new Promise((resolve, reject) => {

        const body = JSON.stringify(data);

        const req = https.request(
            {
                hostname: "api.telegram.org",
                path: `/bot${TOKEN}/${method}`,
                method: "POST",
                timeout: 15000,
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(body)
                }
            },
            (res) => {

                let result = "";

                res.on("data", (chunk) => {
                    result += chunk;
                });

                res.on("end", () => {

                    try {
                        const json = JSON.parse(result);

                        if (!json.ok) {
                            console.log(
                                "❌ TELEGRAM API XATO:",
                                json.description
                            );

                            reject(
                                new Error(json.description)
                            );

                            return;
                        }

                        resolve(json.result);

                    } catch (error) {
                        reject(error);
                    }
                });
            }
        );

        req.on("timeout", () => {
            req.destroy(
                new Error("Telegram API timeout")
            );
        });

        req.on("error", (error) => {
            console.log(
                "❌ TELEGRAM ULANISH XATOSI:",
                error.message
            );

            reject(error);
        });

        req.write(body);
        req.end();
    });
}

// ================================
// XABAR YUBORISH
// ================================

async function sendMessage(chatId, text, keyboard = null) {

    const data = {
        chat_id: chatId,
        text: text
    };

    if (keyboard) {
        data.reply_markup = keyboard;
    }

    return telegram("sendMessage", data);
}

// ================================
// LINKLAR TUGMASI
// ================================

function getKeyboard() {

    const buttons = [];

    for (const item of LINKS) {

        buttons.push([
            {
                text: item.name,
                url: item.link
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
        inline_keyboard: buttons
    };
}

// ================================
// KANALLAR / LINKLAR
// ================================

async function showChannels(chatId) {

    console.log(
        "📨 LINKLAR YUBORILMOQDA:",
        chatId
    );

    await sendMessage(
        chatId,
        `👋 Assalomu alaykum!

🤖 Botdan foydalanish uchun quyidagi sahifalarga obuna bo'ling 👇

1️⃣ Telegram kanalga o'ting
2️⃣ Instagram sahifalarga o'ting
3️⃣ Hammasiga obuna bo'ling
4️⃣ Keyin "✅ Tekshirish" tugmasini bosing

⚠️ Obuna tekshiruvi hozircha avtomatik emas.`,
        getKeyboard()
    );

    console.log(
        "✅ LINKLAR YUBORILDI:",
        chatId
    );
}

// ================================
// ADMIN PANEL
// ================================

async function adminPanel(chatId) {

    await sendMessage(
        chatId,
        `👨‍💼 ADMIN PANEL

Kerakli bo'limni tanlang 👇`,
        {
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
    );
}

// ================================
// UPDATE QABUL QILISH
// ================================

async function processUpdate(update) {

    try {

        console.log("==============================");
        console.log("📩 TELEGRAM UPDATE KELDI");
        console.log("==============================");

        // =========================
        // MESSAGE
        // =========================

        if (update.message) {

            const msg = update.message;

            const chatId = msg.chat.id;

            const userId = msg.from.id;

            console.log(
                "👤 USER:",
                userId
            );

            console.log(
                "💬 TEXT:",
                msg.text
            );

            // =========================
            // START
            // =========================

            if (
                msg.text &&
                msg.text.startsWith("/start")
            ) {

                console.log("🔥 START KELDI");

                const data = loadData();

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
                        "👤 YANGI USER:",
                        userId
                    );
                }

                await showChannels(chatId);

                return;
            }

            // =========================
            // ADMIN
            // =========================

            if (
                msg.text === "/admin"
            ) {

                if (userId !== ADMIN_ID) {

                    await sendMessage(
                        chatId,
                        "❌ Siz admin emassiz."
                    );

                    return;
                }

                await adminPanel(chatId);

                return;
            }
        }

        // =========================
        // BUTTON
        // =========================

        if (update.callback_query) {

            const query = update.callback_query;

            const action = query.data;

            const chatId =
                query.message.chat.id;

            const userId =
                query.from.id;

            console.log(
                "🔘 TUGMA:",
                action
            );

            // Loading aylanishini to'xtatish

            try {

                await telegram(
                    "answerCallbackQuery",
                    {
                        callback_query_id:
                            query.id
                    }
                );

            } catch (error) {

                console.log(
                    "Callback xato:",
                    error.message
                );
            }

            // =========================
            // CHECK
            // =========================

            if (action === "CHECK") {

                await sendMessage(
                    chatId,
                    `❌ Afsuski, hali barcha sahifalarga obuna bo'lmagansiz!

Iltimos, yuqoridagi barcha havolalarga o'tib chiqing 👇`
                );

                await showChannels(chatId);

                return;
            }

            // =========================
            // ADMIN TEKSHIRISH
            // =========================

            if (userId !== ADMIN_ID) {

                await sendMessage(
                    chatId,
                    "❌ Sizda admin huquqi yo'q."
                );

                return;
            }

            // =========================
            // LINKS
            // =========================

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

                await sendMessage(
                    chatId,
                    text
                );

                return;
            }

            // =========================
            // STATS
            // =========================

            if (action === "STATS") {

                const data = loadData();

                await sendMessage(
                    chatId,
                    `📊 BOT STATISTIKASI

👥 Jami foydalanuvchilar: ${data.users.length}

🔗 Linklar: ${LINKS.length}

🤖 Bot: ✅ Ishlayapti`
                );

                return;
            }
        }

    } catch (error) {

        console.log(
            "❌ UPDATE XATOSI:",
            error.message
        );
    }
}

// ================================
// WEBHOOK
// ================================

const server = http.createServer(
    (req, res) => {

        console.log(
            "🌐 REQUEST:",
            req.method,
            req.url
        );

        // Render health check

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

        // =========================
        // TELEGRAM WEBHOOK
        // =========================

        if (
            req.method === "POST" &&
            req.url === WEBHOOK_PATH
        ) {

            let body = "";

            req.on(
                "data",
                chunk => {
                    body += chunk.toString();
                }
            );

            req.on(
                "end",
                async () => {

                    try {

                        const update =
                            JSON.parse(body);

                        console.log(
                            "📩 UPDATE QABUL QILINDI"
                        );

                        // Telegramga darhol OK
                        res.writeHead(200);
                        res.end("OK");

                        // Keyin update ishlanadi
                        await processUpdate(
                            update
                        );

                    } catch (error) {

                        console.log(
                            "❌ WEBHOOK XATO:",
                            error.message
                        );

                        if (!res.headersSent) {
                            res.writeHead(400);
                            res.end("ERROR");
                        }
                    }
                }
            );

            return;
        }

        res.writeHead(404);
        res.end("Not found");
    }
);

// ================================
// SERVER
// ================================

server.listen(
    PORT,
    "0.0.0.0",
    async () => {

        console.log(
            `🌐 Server ${PORT} portda ishlayapti`
        );

        const webhookUrl =
            PUBLIC_URL +
            WEBHOOK_PATH;

        try {

            console.log(
                "🧹 Eski webhook o'chirilmoqda..."
            );

            await telegram(
                "deleteWebhook",
                {
                    drop_pending_updates: true
                }
            );

            console.log(
                "✅ Eski webhook o'chirildi"
            );

            console.log(
                "🔗 Yangi webhook o'rnatilmoqda..."
            );

            await telegram(
                "setWebhook",
                {
                    url: webhookUrl
                }
            );

            console.log(
                "✅ WEBHOOK O'RNATILDI"
            );

            console.log(
                webhookUrl
            );

        } catch (error) {

            console.log(
                "❌ WEBHOOK XATOSI:",
                error.message
            );
        }
    }
);

// ================================
// XATOLAR
// ================================

process.on(
    "uncaughtException",
    error => {

        console.log(
            "❌ UNCAUGHT:",
            error.message
        );
    }
);

process.on(
    "unhandledRejection",
    error => {

        console.log(
            "❌ REJECTION:",
            error
        );
    }
);
