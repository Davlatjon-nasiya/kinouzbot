const http = require("http");
const https = require("https");
const fs = require("fs");

// ========================================
// SOZLAMALAR
// ========================================

const TOKEN = process.env.BOT_TOKEN;

// SIZNING TELEGRAM ID
const ADMIN_ID = "8582398177";

const PORT = process.env.PORT || 10000;

const PUBLIC_URL =
    process.env.RENDER_EXTERNAL_URL ||
    "https://kinouzbot-a04h.onrender.com";

const WEBHOOK_PATH = "/telegram-webhook";

const DATA_FILE = "data.json";

// ========================================
// BOT TOKEN TEKSHIRISH
// ========================================

if (!TOKEN) {
    console.log("❌ BOT_TOKEN topilmadi!");
    process.exit(1);
}

console.log("🤖 BOT KODI YUKLANDI");

// ========================================
// LINKLAR
// ========================================

const DEFAULT_LINKS = [
    {
        name: "📢 Qosimjon Maslahat",
        link: "https://t.me/qosimjon_maslahat"
    },
    {
        name: "📢 Mandarin Tech",
        link: "https://t.me/mandarintech"
    },
    {
        name: "📸 Yakhubov AI",
        link: "https://www.instagram.com/yakhubov_ai"
    },
    {
        name: "📸 Mandarin Nasiya",
        link: "https://www.instagram.com/mandarin_nasiya"
    }
];

// ========================================
// DATA
// ========================================

function loadData() {

    try {

        if (!fs.existsSync(DATA_FILE)) {

            return {
                users: [],
                links: DEFAULT_LINKS,
                totalStarts: 0
            };
        }

        const data = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );

        return {

            users: Array.isArray(data.users)
                ? data.users
                : [],

            links:
                Array.isArray(data.links) &&
                data.links.length
                    ? data.links
                    : DEFAULT_LINKS,

            totalStarts:
                Number(data.totalStarts || 0)
        };

    } catch (error) {

        console.log(
            "❌ DATA O'QISH XATOSI:",
            error.message
        );

        return {
            users: [],
            links: DEFAULT_LINKS,
            totalStarts: 0
        };
    }
}

// ========================================
// DATA SAQLASH
// ========================================

function saveData(data) {

    try {

        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(data, null, 2)
        );

    } catch (error) {

        console.log(
            "❌ DATA SAQLASH XATOSI:",
            error.message
        );
    }
}

// ========================================
// ADMIN TEKSHIRISH
// ========================================

function isAdmin(userId) {

    return String(userId).trim() === "858239817";
}

// ========================================
// BUGUNGI USERLAR
// ========================================

function todayUsers(users) {

    const today =
        new Date()
            .toISOString()
            .slice(0, 10);

    return users.filter(user =>
        String(user.date || "")
            .startsWith(today)
    ).length;
}

// ========================================
// TELEGRAM API
// ========================================

function telegram(method, data) {

    return new Promise((resolve, reject) => {

        const body =
            JSON.stringify(data);

        const req = https.request(

            {
                hostname: "api.telegram.org",

                path:
                    `/bot${TOKEN}/${method}`,

                method: "POST",

                timeout: 20000,

                headers: {
                    "Content-Type":
                        "application/json",

                    "Content-Length":
                        Buffer.byteLength(body)
                }
            },

            (res) => {

                let result = "";

                res.on(
                    "data",
                    chunk => {
                        result +=
                            chunk.toString();
                    }
                );

                res.on(
                    "end",
                    () => {

                        try {

                            const json =
                                JSON.parse(result);

                            if (!json.ok) {

                                console.log(
                                    "❌ TELEGRAM API:",
                                    json.description
                                );

                                reject(
                                    new Error(
                                        json.description
                                    )
                                );

                                return;
                            }

                            resolve(
                                json.result
                            );

                        } catch (error) {

                            reject(error);
                        }
                    }
                );
            }
        );

        req.on(
            "timeout",
            () => {

                req.destroy(
                    new Error(
                        "Telegram API timeout"
                    )
                );
            }
        );

        req.on(
            "error",
            error => {

                console.log(
                    "❌ TELEGRAM ULANISH:",
                    error.message
                );

                reject(error);
            }
        );

        req.write(body);
        req.end();
    });
}

// ========================================
// MESSAGE YUBORISH
// ========================================

async function sendMessage(
    chatId,
    text,
    keyboard = null
) {

    const data = {

        chat_id: chatId,

        text: text
    };

    if (keyboard) {

        data.reply_markup =
            keyboard;
    }

    return telegram(
        "sendMessage",
        data
    );
}

// ========================================
// CALLBACK JAVOB
// ========================================

async function answerCallback(
    queryId,
    text = ""
) {

    try {

        await telegram(
            "answerCallbackQuery",
            {
                callback_query_id:
                    queryId,

                text: text
            }
        );

    } catch (error) {

        console.log(
            "❌ CALLBACK XATO:",
            error.message
        );
    }
}

// ========================================
// FOYDALANUVCHI LINKLARI
// ========================================

function getUserKeyboard() {

    const data =
        loadData();

    const buttons = [];

    for (
        const item of data.links
    ) {

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
        inline_keyboard:
            buttons
    };
}

// ========================================
// KANAL / INSTAGRAM OYNASI
// ========================================

async function showChannels(
    chatId
) {

    await sendMessage(

        chatId,

`👋 Assalomu alaykum!

🤖 Botdan foydalanish uchun quyidagi sahifalarga obuna bo'ling 👇

📢 Telegram kanalga obuna bo'ling
📸 Instagram sahifalarga obuna bo'ling

Hammasiga obuna bo'lgach:

✅ "Tekshirish" tugmasini bosing.`,

        getUserKeyboard()
    );
}

// ========================================
// ADMIN PANEL
// ========================================

async function adminPanel(
    chatId
) {

    console.log(
        "👨‍💼 ADMIN PANEL OCHILDI:",
        chatId
    );

    await sendMessage(

        chatId,

`👨‍💼 ADMIN PANEL

Kerakli bo'limni tanlang 👇`,

        {

            inline_keyboard: [

                [

                    {
                        text:
                            "📢 Linklar",

                        callback_data:
                            "LINKS"
                    },

                    {
                        text:
                            "📊 Statistika",

                        callback_data:
                            "STATS"
                    }

                ],

                [

                    {
                        text:
                            "➕ Link qo'shish",

                        callback_data:
                            "ADD_LINK"
                    }

                ],

                [

                    {
                        text:
                            "✏️ Link o'zgartirish",

                        callback_data:
                            "EDIT_LINK"
                    },

                    {
                        text:
                            "🗑 Link o'chirish",

                        callback_data:
                            "DELETE_LINK"
                    }

                ]

            ]

        }
    );
}

// ========================================
// ADMIN LINKLAR
// ========================================

async function showAdminLinks(
    chatId
) {

    const data =
        loadData();

    let text =
        "📢 BOT LINKLARI\n\n";

    if (!data.links.length) {

        text +=
            "❌ Linklar yo'q.";

    } else {

        data.links.forEach(
            (item, index) => {

                text +=
                    `${index + 1}. ${item.name}\n`;

                text +=
                    `${item.link}\n\n`;
            }
        );
    }

    await sendMessage(
        chatId,
        text
    );
}

// ========================================
// ADMIN HOLATLARI
// ========================================

const adminStates =
    new Map();

// ========================================
// UPDATE ISHLASH
// ========================================

async function processUpdate(
    update
) {

    try {

        // ==================================
        // MESSAGE
        // ==================================

        if (update.message) {

            const msg =
                update.message;

            const chatId =
                msg.chat.id;

            const userId =
                msg.from.id;

            const text =
                msg.text || "";

            console.log(
                "================================"
            );

            console.log(
                "📩 TELEGRAM UPDATE KELDI"
            );

            console.log(
                "👤 USER:",
                userId
            );

            console.log(
                "💬 TEXT:",
                text
            );

            // ==================================
            // ADMIN / ADMIN PANEL
            // ==================================

            if (
                text === "/admin"
            ) {

                console.log(
                    "👨‍💼 ADMIN BUYRUG'I KELDI"
                );

                console.log(
                    "USER ID:",
                    userId
                );

                console.log(
                    "ADMIN ID:",
                    ADMIN_ID
                );

                // QAT'IY ADMIN TEKSHIRUV

                if (
                    String(userId).trim()
                    !==
                    "858239817"
                ) {

                    console.log(
                        "❌ ADMIN EMAS"
                    );

                    await sendMessage(
                        chatId,
                        "❌ Siz admin emassiz."
                    );

                    return;
                }

                console.log(
                    "✅ ADMIN TASDIQLANDI"
                );

                await adminPanel(
                    chatId
                );

                console.log(
                    "✅ ADMIN PANEL YUBORILDI"
                );

                return;
            }

            // ==================================
            // ADMIN MESSAGE HOLATI
            // ==================================

            if (
                isAdmin(userId)
            ) {

                const state =
                    adminStates.get(
                        userId
                    );

                if (
                    state &&
                    !text.startsWith("/")
                ) {

                    const data =
                        loadData();

                    // =========================
                    // LINK QO'SHISH
                    // =========================

                    if (
                        state.action
                        ===
                        "ADD_LINK"
                    ) {

                        const parts =
                            text
                                .split("|")
                                .map(
                                    x =>
                                        x.trim()
                                );

                        if (
                            parts.length < 2
                        ) {

                            await sendMessage(

                                chatId,

`❌ Format xato.

Shunday yozing:

Nomi | Link

Masalan:

📢 Yangi kanal | https://t.me/yangi_kanal`
                            );

                            return;
                        }

                        data.links.push({

                            name:
                                parts[0],

                            link:
                                parts[1]

                        });

                        saveData(data);

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,
                            "✅ Link qo'shildi!"
                        );

                        await adminPanel(
                            chatId
                        );

                        return;
                    }

                    // =========================
                    // LINK O'CHIRISH
                    // =========================

                    if (
                        state.action
                        ===
                        "DELETE_LINK"
                    ) {

                        const index =
                            Number(text) - 1;

                        if (
                            !Number.isInteger(
                                index
                            ) ||
                            index < 0 ||
                            index >=
                                data.links.length
                        ) {

                            await sendMessage(
                                chatId,
                                "❌ Raqam noto'g'ri."
                            );

                            return;
                        }

                        const deleted =
                            data.links.splice(
                                index,
                                1
                            )[0];

                        saveData(data);

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(

                            chatId,

`🗑 Link o'chirildi:

${deleted.name}`
                        );

                        await adminPanel(
                            chatId
                        );

                        return;
                    }

                    // =========================
                    // LINK O'ZGARTIRISH
                    // =========================

                    if (
                        state.action
                        ===
                        "EDIT_LINK"
                    ) {

                        const parts =
                            text
                                .split("|")
                                .map(
                                    x =>
                                        x.trim()
                                );

                        if (
                            parts.length < 3
                        ) {

                            await sendMessage(

                                chatId,

`❌ Format xato.

Shunday yozing:

Raqam | Yangi nom | Yangi link

Masalan:

1 | 📢 Yangi kanal | https://t.me/yangi_kanal`
                            );

                            return;
                        }

                        const index =
                            Number(
                                parts[0]
                            ) - 1;

                        if (
                            !Number.isInteger(
                                index
                            ) ||
                            index < 0 ||
                            index >=
                                data.links.length
                        ) {

                            await sendMessage(
                                chatId,
                                "❌ Raqam noto'g'ri."
                            );

                            return;
                        }

                        data.links[index] = {

                            name:
                                parts[1],

                            link:
                                parts[2]

                        };

                        saveData(data);

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,
                            "✅ Link o'zgartirildi!"
                        );

                        await adminPanel(
                            chatId
                        );

                        return;
                    }
                }
            }

            // ==================================
            // START
            // ==================================

            if (
                text.startsWith(
                    "/start"
                )
            ) {

                console.log(
                    "🔥 START KELDI"
                );

                const data =
                    loadData();

                data.totalStarts =
                    Number(
                        data.totalStarts
                    ) + 1;

                const exists =
                    data.users.some(
                        user =>
                            String(
                                user.id
                            ) ===
                            String(
                                userId
                            )
                    );

                if (!exists) {

                    data.users.push({

                        id:
                            userId,

                        name:
                            msg.from
                                .first_name ||
                            "",

                        username:
                            msg.from
                                .username ||
                            "",

                        date:
                            new Date()
                                .toISOString()

                    });
                }

                saveData(data);

                await showChannels(
                    chatId
                );

                return;
            }

            return;
        }

        // ==================================
        // CALLBACK QUERY
        // ==================================

        if (
            update.callback_query
        ) {

            const query =
                update.callback_query;

            const action =
                query.data;

            const chatId =
                query.message.chat.id;

            const userId =
                query.from.id;

            console.log(
                "================================"
            );

            console.log(
                "🔘 TUGMA BOSILDI:",
                action
            );

            console.log(
                "👤 USER:",
                userId
            );

            // TELEGRAM LOADINGNI O'CHIRISH

            await answerCallback(
                query.id
            );

            // ==================================
            // CHECK
            // ==================================

            if (
                action === "CHECK"
            ) {

                await sendMessage(

                    chatId,

`❌ Hali barcha sahifalarga obuna bo'lmagansiz!

Iltimos, yuqoridagi barcha havolalarga o'tib chiqing va obuna bo'ling.`
                );

                await showChannels(
                    chatId
                );

                return;
            }

            // ==================================
            // ADMIN TEKSHIRUV
            // ==================================

            if (
                !isAdmin(userId)
            ) {

                console.log(
                    "❌ CALLBACK ADMIN EMAS"
                );

                await sendMessage(
                    chatId,
                    "❌ Siz admin emassiz."
                );

                return;
            }

            console.log(
                "✅ CALLBACK ADMIN"
            );

            // ==================================
            // LINKLAR
            // ==================================

            if (
                action === "LINKS"
            ) {

                await showAdminLinks(
                    chatId
                );

                return;
            }

            // ==================================
            // STATISTIKA
            // ==================================

            if (
                action === "STATS"
            ) {

                const data =
                    loadData();

                await sendMessage(

                    chatId,

`📊 BOT STATISTIKASI

👥 Jami foydalanuvchilar:
${data.users.length}

🆕 Bugun kirganlar:
${todayUsers(data.users)}

▶️ Jami /start:
${data.totalStarts}

🔗 Linklar:
${data.links.length}

🤖 Bot:
✅ Ishlayapti`
                );

                return;
            }

            // ==================================
            // LINK QO'SHISH
            // ==================================

            if (
                action === "ADD_LINK"
            ) {

                adminStates.set(

                    userId,

                    {
                        action:
                            "ADD_LINK"
                    }
                );

                await sendMessage(

                    chatId,

`➕ LINK QO'SHISH

Shunday yozing:

Nomi | Link

Masalan:

📢 Yangi kanal | https://t.me/yangi_kanal`
                );

                return;
            }

            // ==================================
            // LINK O'CHIRISH
            // ==================================

            if (
                action === "DELETE_LINK"
            ) {

                const links =
                    getLinks();

                let text =
                    "🗑 LINK O'CHIRISH\n\n";

                links.forEach(
                    (item, index) => {

                        text +=
                            `${index + 1}. ${item.name}\n`;
                    }
                );

                text +=
                    "\nO'chirish uchun raqam yuboring.";

                adminStates.set(

                    userId,

                    {
                        action:
                            "DELETE_LINK"
                    }
                );

                await sendMessage(
                    chatId,
                    text
                );

                return;
            }

            // ==================================
            // LINK O'ZGARTIRISH
            // ==================================

            if (
                action === "EDIT_LINK"
            ) {

                const links =
                    getLinks();

                let text =
                    "✏️ LINK O'ZGARTIRISH\n\n";

                links.forEach(
                    (item, index) => {

                        text +=
                            `${index + 1}. ${item.name}\n`;
                    }
                );

                text +=

`\nShunday yozing:

Raqam | Yangi nom | Yangi link`;

                adminStates.set(

                    userId,

                    {
                        action:
                            "EDIT_LINK"
                    }
                );

                await sendMessage(
                    chatId,
                    text
                );

                return;
            }
        }

    } catch (error) {

        console.log(
            "❌ UPDATE XATOSI:",
            error.message
        );

        console.log(
            error.stack
        );
    }
}

// ========================================
// WEB SERVER
// ========================================

const server =
    http.createServer(
        (req, res) => {

            console.log(
                "🌐 REQUEST:",
                req.method,
                req.url
            );

            // ==================================
            // GET
            // ==================================

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

            // ==================================
            // WEBHOOK
            // ==================================

            if (
                req.method === "POST" &&
                req.url === WEBHOOK_PATH
            ) {

                let body = "";

                req.on(
                    "data",
                    chunk => {

                        body +=
                            chunk.toString();
                    }
                );

                req.on(
                    "end",
                    async () => {

                        try {

                            const update =
                                JSON.parse(
                                    body
                                );

                            // Telegramga darhol OK

                            res.writeHead(
                                200,
                                {
                                    "Content-Type":
                                        "text/plain"
                                }
                            );

                            res.end(
                                "OK"
                            );

                            // Update ishlash

                            await processUpdate(
                                update
                            );

                        } catch (error) {

                            console.log(
                                "❌ WEBHOOK XATO:",
                                error.message
                            );

                            if (
                                !res.headersSent
                            ) {

                                res.writeHead(
                                    400
                                );

                                res.end(
                                    "ERROR"
                                );
                            }
                        }
                    }
                );

                return;
            }

            res.writeHead(
                404
            );

            res.end(
                "Not found"
            );
        }
    );

// ========================================
// SERVER ISHGA TUSHISHI
// ========================================

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
                    drop_pending_updates:
                        true
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
                    url:
                        webhookUrl
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

// ========================================
// XATOLAR
// ========================================

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
