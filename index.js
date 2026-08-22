const http = require("http");
const https = require("https");
const fs = require("fs");

// ========================================
// SOZLAMALAR
// ========================================

const TOKEN = process.env.BOT_TOKEN;

const ADMIN_ID = "8582398177";

const PORT = process.env.PORT || 10000;

const PUBLIC_URL =
    process.env.RENDER_EXTERNAL_URL ||
    "https://kinouzbot-a04h.onrender.com";

const WEBHOOK_PATH = "/telegram-webhook";

const DATA_FILE = "data.json";

if (!TOKEN) {
    console.log("❌ BOT_TOKEN topilmadi!");
    process.exit(1);
}

console.log("🤖 BOT ISHGA TUSHMOQDA...");

// ========================================
// BOSHLANG'ICH LINKLAR
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

            const newData = {
                users: [],
                links: DEFAULT_LINKS,
                totalStarts: 0
            };

            saveData(newData);

            return newData;
        }

        const data = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );

        return {
            users: Array.isArray(data.users)
                ? data.users
                : [],

            links: Array.isArray(data.links)
                ? data.links
                : DEFAULT_LINKS,

            totalStarts: Number(
                data.totalStarts || 0
            )
        };

    } catch (error) {

        console.log(
            "❌ DATA XATOSI:",
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
            JSON.stringify(
                data,
                null,
                2
            )
        );

        console.log("💾 DATA SAQLANDI");

    } catch (error) {

        console.log(
            "❌ SAQLASH XATOSI:",
            error.message
        );
    }
}

// ========================================
// ADMIN
// ========================================

function isAdmin(userId) {

    return (
        String(userId).trim() ===
        String(ADMIN_ID).trim()
    );
}

// ========================================
// TELEGRAM API
// ========================================

function telegram(method, data) {

    return new Promise((resolve, reject) => {

        const body =
            JSON.stringify(data);

        const req =
            https.request(
                {
                    hostname:
                        "api.telegram.org",

                    path:
                        `/bot${TOKEN}/${method}`,

                    method:
                        "POST",

                    timeout:
                        20000,

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
                                    JSON.parse(
                                        result
                                    );

                                if (!json.ok) {

                                    reject(
                                        new Error(
                                            json.description ||
                                            "Telegram API xatosi"
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
                    "❌ TELEGRAM XATO:",
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
// XABAR YUBORISH
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
        data.reply_markup = keyboard;
    }

    return telegram(
        "sendMessage",
        data
    );
}

// ========================================
// ADMIN HOLATLARI
// ========================================

const adminStates = new Map();

// ========================================
// BUGUNGI USERLAR
// ========================================

function todayUsers(users) {

    const today =
        new Date()
            .toISOString()
            .slice(0, 10);

    return users.filter(
        user =>
            String(
                user.date || ""
            ).startsWith(today)
    ).length;
}

// ========================================
// USER KNOPKALARI
// ========================================

function userKeyboard() {

    const data =
        loadData();

    const buttons = [];

    data.links.forEach(
        item => {

            buttons.push([
                {
                    text:
                        item.name,

                    url:
                        item.link
                }
            ]);
        }
    );

    buttons.push([
        {
            text:
                "✅ Tekshirish",

            callback_data:
                "CHECK"
        }
    ]);

    return {
        inline_keyboard:
            buttons
    };
}

// ========================================
// ADMIN PASTKI KNOPKALARI
// ========================================

function adminKeyboard() {

    return {

        keyboard: [

            [
                {
                    text:
                        "📢 Linklar"
                },

                {
                    text:
                        "📊 Statistika"
                }
            ],

            [
                {
                    text:
                        "➕ Link qo'shish"
                },

                {
                    text:
                        "✏️ Link o'zgartirish"
                }
            ],

            [
                {
                    text:
                        "🗑 Link o'chirish"
                },

                {
                    text:
                        "📨 Xabar yuborish"
                }
            ]

        ],

        resize_keyboard:
            true,

        one_time_keyboard:
            false
    };
}

// ========================================
// ADMIN PANEL
// ========================================

async function adminPanel(chatId) {

    await sendMessage(
        chatId,

`👨‍💼 ADMIN PANEL

Kerakli bo‘limni tanlang 👇`,

        adminKeyboard()
    );
}

// ========================================
// USER KANALLAR
// ========================================

async function showChannels(chatId) {

    await sendMessage(
        chatId,

`👋 Assalomu alaykum!

🤖 Botdan foydalanish uchun quyidagi sahifalarga obuna bo‘ling 👇

📢 Telegram kanalga obuna bo‘ling
📸 Instagram sahifalarga obuna bo‘ling

Hammasiga obuna bo‘lgach:

✅ "Tekshirish" tugmasini bosing.`,

        userKeyboard()
    );
}

// ========================================
// ADMIN LINKLAR
// ========================================

async function showAdminLinks(chatId) {

    const data =
        loadData();

    let text =
        "📢 BOT LINKLARI\n\n";

    if (
        data.links.length === 0
    ) {

        text +=
            "❌ Hozircha link yo'q.";

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
        text,
        adminKeyboard()
    );
}

// ========================================
// BARCHA USERLARGA XABAR YUBORISH
// ========================================

async function broadcastMessage(
    adminChatId,
    messageText
) {

    const data =
        loadData();

    let sent = 0;
    let failed = 0;

    console.log(
        `📨 XABAR YUBORILMOQDA: ${data.users.length} ta user`
    );

    for (
        const user of data.users
    ) {

        try {

            await sendMessage(
                user.id,
                messageText
            );

            sent++;

            // Telegram limitiga urilmasligi uchun
            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        50
                    )
            );

        } catch (error) {

            failed++;

            console.log(
                `❌ ${user.id} ga yuborilmadi:`,
                error.message
            );
        }
    }

    await sendMessage(
        adminChatId,

`✅ XABAR YUBORILDI!

👥 Jami user:
${data.users.length}

✅ Yetib bordi:
${sent}

❌ Yetib bormadi:
${failed}`,

        adminKeyboard()
    );
}

// ========================================
// UPDATE
// ========================================

async function processUpdate(update) {

    try {

        // ==================================
        // ODDIY XABAR
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
                "📩 USER:",
                userId
            );

            console.log(
                "💬 TEXT:",
                text
            );

            console.log(
                "================================"
            );

            // ==================================
            // ADMIN /admin
            // ==================================

            if (
                text === "/admin"
            ) {

                console.log(
                    "👨‍💼 /admin"
                );

                console.log(
                    "USER ID:",
                    String(userId)
                );

                console.log(
                    "ADMIN ID:",
                    String(ADMIN_ID)
                );

                if (
                    !isAdmin(userId)
                ) {

                    await sendMessage(
                        chatId,
                        "❌ Siz admin emassiz."
                    );

                    return;
                }

                adminStates.delete(
                    userId
                );

                await adminPanel(
                    chatId
                );

                return;
            }

            // ==================================
            // ADMIN
            // ==================================

            if (
                isAdmin(userId)
            ) {

                // ==================================
                // XABAR YUBORISH
                // ==================================

                if (
                    text === "📨 Xabar yuborish"
                ) {

                    adminStates.set(
                        userId,
                        {
                            action:
                                "BROADCAST"
                        }
                    );

                    await sendMessage(
                        chatId,

`📨 XABAR YUBORISH

Barcha bot foydalanuvchilariga yubormoqchi bo‘lgan xabaringizni yozing.

Masalan:

🔥 Yangi chegirmalar boshlandi!

📱 iPhone va Samsung telefonlar mavjud.

📞 Murojaat uchun: +998 XX XXX XX XX

❌ Bekor qilish uchun /admin yozing.`,

                        adminKeyboard()
                    );

                    return;
                }

                // ==================================
                // LINKLAR
                // ==================================

                if (
                    text === "📢 Linklar"
                ) {

                    adminStates.delete(
                        userId
                    );

                    await showAdminLinks(
                        chatId
                    );

                    return;
                }

                // ==================================
                // STATISTIKA
                // ==================================

                if (
                    text === "📊 Statistika"
                ) {

                    adminStates.delete(
                        userId
                    );

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
✅ Ishlayapti`,

                        adminKeyboard()
                    );

                    return;
                }

                // ==================================
                // LINK QO'SHISH
                // ==================================

                if (
                    text === "➕ Link qo'shish"
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

📢 Yangi kanal | https://t.me/yangi_kanal

❌ Bekor qilish uchun /admin yozing.`,

                        adminKeyboard()
                    );

                    return;
                }

                // ==================================
                // LINK O'ZGARTIRISH
                // ==================================

                if (
                    text === "✏️ Link o'zgartirish"
                ) {

                    const data =
                        loadData();

                    if (
                        data.links.length === 0
                    ) {

                        await sendMessage(
                            chatId,
                            "❌ O'zgartirish uchun link yo'q.",
                            adminKeyboard()
                        );

                        return;
                    }

                    let list =
                        "✏️ LINK O'ZGARTIRISH\n\n";

                    data.links.forEach(
                        (item, index) => {

                            list +=
                                `${index + 1}. ${item.name}\n`;

                            list +=
                                `${item.link}\n\n`;
                        }
                    );

                    list += `

Shunday yozing:

Raqam | Yangi nom | Yangi link

Masalan:

1 | 📢 Yangi kanal | https://t.me/yangi_kanal`;

                    adminStates.set(
                        userId,
                        {
                            action:
                                "EDIT_LINK"
                        }
                    );

                    await sendMessage(
                        chatId,
                        list,
                        adminKeyboard()
                    );

                    return;
                }

                // ==================================
                // LINK O'CHIRISH
                // ==================================

                if (
                    text === "🗑 Link o'chirish"
                ) {

                    const data =
                        loadData();

                    if (
                        data.links.length === 0
                    ) {

                        await sendMessage(
                            chatId,
                            "❌ O'chirish uchun link yo'q.",
                            adminKeyboard()
                        );

                        return;
                    }

                    let list =
                        "🗑 LINK O'CHIRISH\n\n";

                    data.links.forEach(
                        (item, index) => {

                            list +=
                                `${index + 1}. ${item.name}\n`;
                        }
                    );

                    list += `

Raqamini yuboring.

Masalan:

2`;

                    adminStates.set(
                        userId,
                        {
                            action:
                                "DELETE_LINK"
                        }
                    );

                    await sendMessage(
                        chatId,
                        list,
                        adminKeyboard()
                    );

                    return;
                }

                // ==================================
                // ADMIN HOLATI
                // ==================================

                const state =
                    adminStates.get(
                        userId
                    );

                if (
                    state &&
                    !text.startsWith("/")
                ) {

                    // ==================================
                    // BARCHAGA XABAR
                    // ==================================

                    if (
                        state.action ===
                        "BROADCAST"
                    ) {

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,

`⏳ Xabar yuborilmoqda...

Iltimos, kuting.`
                        );

                        await broadcastMessage(
                            chatId,
                            text
                        );

                        return;
                    }

                    const data =
                        loadData();

                    // ==================================
                    // LINK QO'SHISH
                    // ==================================

                    if (
                        state.action ===
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
                            parts.length < 2 ||
                            !parts[0] ||
                            !parts[1]
                        ) {

                            await sendMessage(
                                chatId,

`❌ Format xato.

To'g'ri format:

Nomi | Link

Masalan:

📢 Yangi kanal | https://t.me/yangi_kanal`
                            );

                            return;
                        }

                        if (
                            !parts[1].startsWith(
                                "http://"
                            ) &&
                            !parts[1].startsWith(
                                "https://"
                            )
                        ) {

                            await sendMessage(
                                chatId,

`❌ Link noto'g'ri.

https:// bilan boshlanishi kerak.`
                            );

                            return;
                        }

                        data.links.push({

                            name:
                                parts[0],

                            link:
                                parts[1]
                        });

                        saveData(
                            data
                        );

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,

`✅ LINK QO'SHILDI!

📌 Nomi:
${parts[0]}

🔗 Link:
${parts[1]}`,

                            adminKeyboard()
                        );

                        return;
                    }

                    // ==================================
                    // LINK O'CHIRISH
                    // ==================================

                    if (
                        state.action ===
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
                                "❌ Raqam noto'g'ri. Masalan: 1"
                            );

                            return;
                        }

                        const deleted =
                            data.links.splice(
                                index,
                                1
                            )[0];

                        saveData(
                            data
                        );

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,

`🗑 LINK O'CHIRILDI!

${deleted.name}

${deleted.link}`,

                            adminKeyboard()
                        );

                        return;
                    }

                    // ==================================
                    // LINK O'ZGARTIRISH
                    // ==================================

                    if (
                        state.action ===
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

To'g'ri format:

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

                        if (
                            !parts[2].startsWith(
                                "http://"
                            ) &&
                            !parts[2].startsWith(
                                "https://"
                            )
                        ) {

                            await sendMessage(
                                chatId,
                                "❌ Link noto'g'ri."
                            );

                            return;
                        }

                        data.links[index] = {

                            name:
                                parts[1],

                            link:
                                parts[2]
                        };

                        saveData(
                            data
                        );

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,

`✅ LINK O'ZGARTIRILDI!

📌 Yangi nom:
${parts[1]}

🔗 Yangi link:
${parts[2]}`,

                            adminKeyboard()
                        );

                        return;
                    }
                }
            }

            // ==================================
            // START
            // ==================================

            if (
                text.startsWith("/start")
            ) {

                const data =
                    loadData();

                data.totalStarts =
                    Number(
                        data.totalStarts ||
                        0
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

                if (
                    !exists
                ) {

                    data.users.push({

                        id:
                            userId,

                        name:
                            msg.from.first_name ||
                            "",

                        username:
                            msg.from.username ||
                            "",

                        date:
                            new Date()
                                .toISOString()
                    });
                }

                saveData(
                    data
                );

                await showChannels(
                    chatId
                );

                return;
            }

            return;
        }

        // ==================================
        // CALLBACK
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
                    "⚠️ CALLBACK XATOSI:",
                    error.message
                );
            }

            // ==================================
            // TEKSHIRISH
            // ==================================

            if (
                action ===
                "CHECK"
            ) {

                await sendMessage(
                    chatId,

`❌ Afsuski, hali barcha sahifalarga obuna bo'lmagansiz!

Iltimos, yuqoridagi barcha havolalarga o'tib chiqing 👇`
                );

                await showChannels(
                    chatId
                );

                return;
            }

            return;
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
// SERVER
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
                req.method ===
                "GET"
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
                req.method ===
                    "POST" &&
                req.url ===
                    WEBHOOK_PATH
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

            // ==================================
            // NOT FOUND
            // ==================================

            res.writeHead(
                404
            );

            res.end(
                "Not found"
            );
        }
    );

// ========================================
// SERVER START
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

// ========================================
// XATOLARNI USHLASH
// ========================================

process.on(
    "uncaughtException",
    error => {

        console.log(
            "❌ UNCAUGHT ERROR:",
            error.message
        );
    }
);

process.on(
    "unhandledRejection",
    error => {

        console.log(
            "❌ UNHANDLED REJECTION:",
            error
        );
    }
);
