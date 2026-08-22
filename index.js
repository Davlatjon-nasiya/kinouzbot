const http = require("http");
const https = require("https");
const fs = require("fs");

// ======================================================
// SOZLAMALAR
// ======================================================

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

// ======================================================
// DEFAULT DATA
// ======================================================

const DEFAULT_DATA = {
    version: 10,

    users: [],

    totalStarts: 0,

    card: "",

    vipName: "👑 VIP KANAL",

    vipLink: "",

    channels: []
};

// ======================================================
// DATA YUKLASH
// ======================================================

function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            saveData(DEFAULT_DATA);
            return JSON.parse(
                JSON.stringify(DEFAULT_DATA)
            );
        }

        const oldData = JSON.parse(
            fs.readFileSync(
                DATA_FILE,
                "utf8"
            )
        );

        return {
            version: 10,

            users:
                Array.isArray(oldData.users)
                    ? oldData.users
                    : [],

            totalStarts:
                Number(
                    oldData.totalStarts || 0
                ),

            card:
                oldData.card || "",

            vipName:
                oldData.vipName ||
                "👑 VIP KANAL",

            vipLink:
                oldData.vipLink || "",

            channels:
                Array.isArray(oldData.channels)
                    ? oldData.channels
                    : []
        };

    } catch (error) {

        console.log(
            "❌ DATA XATOSI:",
            error.message
        );

        return JSON.parse(
            JSON.stringify(DEFAULT_DATA)
        );
    }
}

// ======================================================
// DATA SAQLASH
// ======================================================

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

    } catch (error) {

        console.log(
            "❌ SAQLASH XATOSI:",
            error.message
        );
    }
}

// ======================================================
// ADMIN
// ======================================================

function isAdmin(userId) {
    return (
        String(userId) ===
        String(ADMIN_ID)
    );
}

// ======================================================
// TELEGRAM API
// ======================================================

function telegram(method, data) {

    return new Promise(
        (resolve, reject) => {

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

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Content-Length":
                                Buffer.byteLength(body)
                        },

                        timeout: 30000
                    },

                    res => {

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

                                    if (
                                        !json.ok
                                    ) {

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
                "error",
                error => {
                    reject(error);
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

            req.write(body);

            req.end();
        }
    );
}

// ======================================================
// SEND MESSAGE
// ======================================================

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

// ======================================================
// SEND PHOTO
// ======================================================

async function sendPhoto(
    chatId,
    photo,
    caption = "",
    keyboard = null
) {

    const data = {
        chat_id: chatId,
        photo: photo
    };

    if (caption) {
        data.caption = caption;
    }

    if (keyboard) {
        data.reply_markup = keyboard;
    }

    return telegram(
        "sendPhoto",
        data
    );
}

// ======================================================
// CALLBACK ANSWER
// ======================================================

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

                text: text,

                show_alert: false
            }
        );

    } catch (error) {

        console.log(
            "❌ CALLBACK ANSWER:",
            error.message
        );
    }
}

// ======================================================
// HOLATLAR
// ======================================================

const adminStates = new Map();

const userStates = new Map();

// ======================================================
// USER MENU
// ======================================================

function userKeyboard() {

    const data =
        loadData();

    return {
        inline_keyboard: [

            [
                {
                    text:
                        data.vipName ||
                        "👑 VIP KANAL",

                    callback_data:
                        "VIP"
                }
            ]

        ]
    };
}

// ======================================================
// ADMIN MENU
// ======================================================

function adminKeyboard() {

    return {

        keyboard: [

            [
                {
                    text:
                        "📢 Kanal qo'shish"
                },

                {
                    text:
                        "🗑 Kanal o'chirish"
                }
            ],

            [
                {
                    text:
                        "👑 VIP kanal"
                },

                {
                    text:
                        "💳 Karta"
                }
            ],

            [
                {
                    text:
                        "📊 Statistika"
                },

                {
                    text:
                        "📨 Xabar yuborish"
                }
            ]

        ],

        resize_keyboard: true
    };
}

// ======================================================
// VIP ADMIN MENU
// ======================================================

function vipAdminKeyboard() {

    return {

        keyboard: [

            [
                {
                    text:
                        "✏️ VIP nomi"
                },

                {
                    text:
                        "🔗 VIP link"
                }
            ],

            [
                {
                    text:
                        "🔙 Admin panel"
                }
            ]

        ],

        resize_keyboard: true
    };
}

// ======================================================
// CARD MENU
// ======================================================

function cardKeyboard() {

    return {

        keyboard: [

            [
                {
                    text:
                        "➕ Karta qo'shish"
                }
            ],

            [
                {
                    text:
                        "✏️ Karta o'zgartirish"
                },

                {
                    text:
                        "🗑 Karta o'chirish"
                }
            ],

            [
                {
                    text:
                        "🔙 Admin panel"
                }
            ]

        ],

        resize_keyboard: true
    };
}

// ======================================================
// VIP TARIF MENU
// ======================================================

function vipKeyboard() {

    return {

        inline_keyboard: [

            [
                {
                    text:
                        "🗓 1 haftalik — 15 000 so'm",

                    callback_data:
                        "TARIF_WEEK"
                }
            ],

            [
                {
                    text:
                        "📅 1 oylik — 50 000 so'm",

                    callback_data:
                        "TARIF_MONTH"
                }
            ],

            [
                {
                    text:
                        "🗓 1 yillik — 180 000 so'm",

                    callback_data:
                        "TARIF_YEAR"
                }
            ],

            [
                {
                    text:
                        "🔙 Orqaga",

                    callback_data:
                        "BACK_MENU"
                }
            ]

        ]
    };
}

// ======================================================
// PAYMENT MENU
// ======================================================

function paymentKeyboard() {

    return {

        inline_keyboard: [

            [
                {
                    text:
                        "💰 To'ladim",

                    callback_data:
                        "PAID"
                }
            ],

            [
                {
                    text:
                        "🔙 Tariflar",

                    callback_data:
                        "VIP"
                }
            ]

        ]
    };
}

// ======================================================
// CHANNEL CHECK MENU
// ======================================================

function subscriptionKeyboard() {

    return {

        inline_keyboard: [

            [
                {
                    text:
                        "✅ Tekshirish",

                    callback_data:
                        "CHECK_SUB"
                }
            ]

        ]
    };
}

// ======================================================
// START MENU
// ======================================================

async function mainMenu(
    chatId
) {

    await sendMessage(
        chatId,

        `👋 Assalomu alaykum!

Botdan foydalanish uchun quyidagi tugmani tanlang 👇`,

        userKeyboard()
    );
}

// ======================================================
// KANAL LINKDAN CHAT ID OLISH
// ======================================================

function getChannelChatId(link) {

    if (!link) {
        return null;
    }

    let value =
        link.trim();

    // @username
    if (
        value.startsWith("@")
    ) {
        return value;
    }

    // https://t.me/username
    const match =
        value.match(
            /(?:https?:\/\/)?t\.me\/([^/?]+)/i
        );

    if (match) {

        const username =
            match[1];

        if (
            username.startsWith("+")
        ) {
            return null;
        }

        return "@" + username;
    }

    // username
    if (
        /^[A-Za-z0-9_]{4,}$/.test(value)
    ) {
        return "@" + value;
    }

    return null;
}

// ======================================================
// MAJBURIY OBUNA TEKSHIRISH
// ======================================================

async function checkSubscription(
    userId
) {

    const data =
        loadData();

    if (
        !data.channels ||
        data.channels.length === 0
    ) {
        return true;
    }

    for (
        const channel of data.channels
    ) {

        const chatId =
            channel.chatId ||
            getChannelChatId(
                channel.link
            );

        if (!chatId) {

            console.log(
                "⚠️ Kanal chat ID aniqlanmadi:",
                channel.link
            );

            return false;
        }

        try {

            const member =
                await telegram(
                    "getChatMember",
                    {
                        chat_id:
                            chatId,

                        user_id:
                            userId
                    }
                );

            const status =
                member.status;

            if (
                status === "left" ||
                status === "kicked"
            ) {

                return false;
            }

        } catch (error) {

            console.log(
                "❌ OBUNA TEKSHIRISH XATOSI:",
                channel.name,
                error.message
            );

            return false;
        }
    }

    return true;
}

// ======================================================
// OBUNA KANALLARI
// ======================================================

async function showSubscription(
    chatId
) {

    const data =
        loadData();

    let text =
        `📢 BOTDAN FOYDALANISH UCHUN

Quyidagi kanallarga obuna bo'ling:

`;

    const buttons = [];

    data.channels.forEach(
        channel => {

            text +=
                `📢 ${channel.name}\n`;

            buttons.push(
                [
                    {
                        text:
                            `📢 ${channel.name}`,

                        url:
                            channel.link
                    }
                ]
            );
        }
    );

    text +=
        `\nObuna bo'lganingizdan keyin:
👇 "✅ Tekshirish" tugmasini bosing.`;

    buttons.push(
        [
            {
                text:
                    "✅ Tekshirish",

                callback_data:
                    "CHECK_SUB"
            }
        ]
    );

    await sendMessage(
        chatId,
        text,
        {
            inline_keyboard:
                buttons
        }
    );
}

// ======================================================
// VIP PAGE
// ======================================================

async function showVip(
    chatId
) {

    const data =
        loadData();

    await sendMessage(
        chatId,

`👑 ${data.vipName}

VIP kanalga kirish uchun tariflardan birini tanlang:

🗓 1 haftalik — 15 000 so'm
📅 1 oylik — 50 000 so'm
🗓 1 yillik — 180 000 so'm

👇 Tarifni tanlang:`,

        vipKeyboard()
    );
}

// ======================================================
// TARIF
// ======================================================

function getTarif(
    type
) {

    if (
        type ===
        "TARIF_WEEK"
    ) {

        return {
            name:
                "1 haftalik",

            price:
                15000
        };
    }

    if (
        type ===
        "TARIF_MONTH"
    ) {

        return {
            name:
                "1 oylik",

            price:
                50000
        };
    }

    if (
        type ===
        "TARIF_YEAR"
    ) {

        return {
            name:
                "1 yillik",

            price:
                180000
        };
    }

    return null;
}

// ======================================================
// TO'LOV
// ======================================================

async function showPayment(
    chatId,
    userId,
    tarif
) {

    const data =
        loadData();

    if (!data.card) {

        await sendMessage(
            chatId,

`❌ Hozircha karta raqami sozlanmagan.

Admin karta raqamini qo'shishi kerak.`
        );

        return;
    }

    userStates.set(
        userId,
        {
            action:
                "WAIT_PAYMENT",

            tarifName:
                tarif.name,

            price:
                tarif.price
        }
    );

    await sendMessage(
        chatId,

`💳 TO'LOV

📌 Tarif:
${tarif.name}

💰 Narxi:
${tarif.price.toLocaleString("uz-UZ")} so'm

💳 Karta:
${data.card}

⚠️ Yuqoridagi karta raqamiga to'lov qiling.

To'lovdan keyin:

👇 "💰 To'ladim" tugmasini bosing.`,

        paymentKeyboard()
    );
}

// ======================================================
// CHEK SO'RASH
// ======================================================

async function askReceipt(
    chatId
) {

    await sendMessage(
        chatId,

`📸 CHEKNI YUBORING

To'lov qilganingizni tasdiqlash uchun chekni shu yerga RASM qilib yuboring.

⚠️ Faqat chek rasmini yuboring.

Chek adminning shaxsiy chatiga yuboriladi.`
    );
}

// ======================================================
// PROFIL LINK
// ======================================================

function getProfileLink(
    user
) {

    if (
        user.username
    ) {

        return (
            "https://t.me/" +
            user.username
        );
    }

    return (
        "tg://user?id=" +
        user.id
    );
}

// ======================================================
// CHEKNI ADMIN LICHKASIGA YUBORISH
// ======================================================

async function sendReceiptToAdmin(
    user,
    photoId,
    tarifName,
    price
) {

    const profile =
        getProfileLink(
            user
        );

    const caption =

`💰 YANGI VIP TO'LOV

👤 Ism:
${user.first_name || "Noma'lum"}

📱 Username:
${
    user.username
        ? "@" + user.username
        : "Username yo'q"
}

🆔 Telegram ID:
${user.id}

🔗 PROFIL:
${profile}

📌 Tarif:
${tarifName}

💵 Summa:
${price.toLocaleString("uz-UZ")} so'm

📸 Chek yuqorida.

👇 To'lovni tekshiring.`;

    await sendPhoto(
        ADMIN_ID,
        photoId,
        caption,

        {
            inline_keyboard: [

                [
                    {
                        text:
                            "✅ To'lovni tasdiqlash",

                        callback_data:
                            `APPROVE_${user.id}`
                    }
                ],

                [
                    {
                        text:
                            "❌ Rad etish",

                        callback_data:
                            `REJECT_${user.id}`
                    }
                ]

            ]
        }
    );
}

// ======================================================
// ADMIN CHANNEL LIST
// ======================================================

async function showChannelsAdmin(
    chatId
) {

    const data =
        loadData();

    if (
        !data.channels ||
        data.channels.length === 0
    ) {

        await sendMessage(
            chatId,

`📢 KANALLAR

❌ Hozircha kanal qo'shilmagan.

"📢 Kanal qo'shish" tugmasini bosing.`,

            adminKeyboard()
        );

        return;
    }

    let text =
        "📢 BOT KANALLARI\n\n";

    data.channels.forEach(
        (channel, index) => {

            text +=
                `${index + 1}. ${channel.name}\n`;

            text +=
                `🔗 ${channel.link}\n\n`;
        }
    );

    await sendMessage(
        chatId,
        text,
        adminKeyboard()
    );
}

// ======================================================
// ADMIN PANEL
// ======================================================

async function adminPanel(
    chatId
) {

    await sendMessage(
        chatId,

`👨‍💼 ADMIN PANEL

Kerakli bo'limni tanlang 👇`,

        adminKeyboard()
    );
}

// ======================================================
// BROADCAST
// ======================================================

async function broadcastMessage(
    adminChatId,
    text
) {

    const data =
        loadData();

    let sent = 0;

    let failed = 0;

    for (
        const user of data.users
    ) {

        try {

            await sendMessage(
                user.id,
                text
            );

            sent++;

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        70
                    )
            );

        } catch (error) {

            failed++;
        }
    }

    await sendMessage(
        adminChatId,

`✅ XABAR YUBORILDI!

👥 Jami:
${data.users.length}

✅ Yetib bordi:
${sent}

❌ Yetib bormadi:
${failed}`,

        adminKeyboard()
    );
}

// ======================================================
// UPDATE
// ======================================================

async function processUpdate(
    update
) {

    try {

        // ==================================================
        // MESSAGE
        // ==================================================

        if (
            update.message
        ) {

            const msg =
                update.message;

            const chatId =
                msg.chat.id;

            const userId =
                msg.from.id;

            const text =
                msg.text || "";

            // ==================================================
            // START
            // ==================================================

            if (
                text.startsWith(
                    "/start"
                )
            ) {

                const data =
                    loadData();

                data.totalStarts =
                    Number(
                        data.totalStarts || 0
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

                        first_name:
                            msg.from.first_name ||
                            "",

                        username:
                            msg.from.username ||
                            "",

                        date:
                            new Date()
                                .toISOString()
                    });

                } else {

                    // username o'zgargan bo'lsa yangilash
                    const existing =
                        data.users.find(
                            user =>
                                String(
                                    user.id
                                ) ===
                                String(
                                    userId
                                )
                        );

                    if (existing) {

                        existing.first_name =
                            msg.from.first_name ||
                            "";

                        existing.username =
                            msg.from.username ||
                            "";
                    }
                }

                saveData(data);

                // MAJBURIY OBUNA
                const subscribed =
                    await checkSubscription(
                        userId
                    );

                if (!subscribed) {

                    await showSubscription(
                        chatId
                    );

                    return;
                }

                await mainMenu(
                    chatId
                );

                return;
            }

            // ==================================================
            // ADMIN
            // ==================================================

            if (
                text === "/admin"
            ) {

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

            // ==================================================
            // ADMIN MENYU
            // ==================================================

            if (
                isAdmin(userId)
            ) {

                // ----------------------------------------------
                // KANAL QO'SHISH
                // ----------------------------------------------

                if (
                    text ===
                    "📢 Kanal qo'shish"
                ) {

                    adminStates.set(
                        userId,
                        {
                            action:
                                "CHANNEL_NAME"
                        }
                    );

                    await sendMessage(
                        chatId,

`📢 KANAL QO'SHISH

1️⃣ Avval kanal NOMINI yuboring.

Masalan:

🎬 Kino Kanal`
                    );

                    return;
                }

                // ----------------------------------------------
                // KANAL O'CHIRISH
                // ----------------------------------------------

                if (
                    text ===
                    "🗑 Kanal o'chirish"
                ) {

                    const data =
                        loadData();

                    if (
                        data.channels.length ===
                        0
                    ) {

                        await sendMessage(
                            chatId,

                            "❌ O'chirish uchun kanal yo'q.",

                            adminKeyboard()
                        );

                        return;
                    }

                    let list =
                        "🗑 KANAL O'CHIRISH\n\n";

                    data.channels.forEach(
                        (
                            channel,
                            index
                        ) => {

                            list +=
                                `${index + 1}. ${channel.name}\n`;

                            list +=
                                `${channel.link}\n\n`;
                        }
                    );

                    list +=
                        "O'chirmoqchi bo'lgan kanal raqamini yuboring.\n\nMasalan: 1";

                    adminStates.set(
                        userId,
                        {
                            action:
                                "DELETE_CHANNEL"
                        }
                    );

                    await sendMessage(
                        chatId,
                        list
                    );

                    return;
                }

                // ----------------------------------------------
                // VIP
                // ----------------------------------------------

                if (
                    text ===
                    "👑 VIP kanal"
                ) {

                    const data =
                        loadData();

                    await sendMessage(
                        chatId,

`👑 VIP KANAL SOZLAMALARI

📌 Hozirgi nom:
${data.vipName}

🔗 Hozirgi VIP link:
${
    data.vipLink ||
    "❌ Kiritilmagan"
}

Quyidagilardan birini tanlang:`,

                        vipAdminKeyboard()
                    );

                    return;
                }

                // ----------------------------------------------
                // VIP NOMI
                // ----------------------------------------------

                if (
                    text ===
                    "✏️ VIP nomi"
                ) {

                    adminStates.set(
                        userId,
                        {
                            action:
                                "VIP_NAME"
                        }
                    );

                    await sendMessage(
                        chatId,

`✏️ VIP KANAL NOMI

Yangi VIP kanal nomini yuboring.

Masalan:

👑 Mandarin VIP`
                    );

                    return;
                }

                // ----------------------------------------------
                // VIP LINK
                // ----------------------------------------------

                if (
                    text ===
                    "🔗 VIP link"
                ) {

                    adminStates.set(
                        userId,
                        {
                            action:
                                "VIP_LINK"
                        }
                    );

                    await sendMessage(
                        chatId,

`🔗 VIP KANAL LINKI

VIP kanalning kirish linkini yuboring.

Masalan:

https://t.me/+xxxxxxxx`
                    );

                    return;
                }

                // ----------------------------------------------
                // KARTA
                // ----------------------------------------------

                if (
                    text ===
                    "💳 Karta"
                ) {

                    const data =
                        loadData();

                    await sendMessage(
                        chatId,

`💳 KARTA SOZLAMALARI

Hozirgi karta:

${
    data.card ||
    "❌ Karta kiritilmagan"
}`,

                        cardKeyboard()
                    );

                    return;
                }

                // ----------------------------------------------
                // KARTA QO'SHISH / O'ZGARTIRISH
                // ----------------------------------------------

                if (
                    text ===
                    "➕ Karta qo'shish" ||
                    text ===
                    "✏️ Karta o'zgartirish"
                ) {

                    adminStates.set(
                        userId,
                        {
                            action:
                                "CARD"
                        }
                    );

                    await sendMessage(
                        chatId,

`💳 KARTA RAQAMI

Karta raqamini yuboring.

Masalan:

8600 1234 5678 9012`
                    );

                    return;
                }

                // ----------------------------------------------
                // KARTA O'CHIRISH
                // ----------------------------------------------

                if (
                    text ===
                    "🗑 Karta o'chirish"
                ) {

                    const data =
                        loadData();

                    data.card = "";

                    saveData(data);

                    await sendMessage(
                        chatId,

                        "✅ Karta o'chirildi!",

                        cardKeyboard()
                    );

                    return;
                }

                // ----------------------------------------------
                // STATISTIKA
                // ----------------------------------------------

                if (
                    text ===
                    "📊 Statistika"
                ) {

                    const data =
                        loadData();

                    await sendMessage(
                        chatId,

`📊 BOT STATISTIKASI

👥 Foydalanuvchilar:
${data.users.length}

▶️ Jami /start:
${data.totalStarts}

📢 Majburiy kanallar:
${data.channels.length}

💳 Karta:
${
    data.card
        ? "✅ Bor"
        : "❌ Yo'q"
}

👑 VIP nomi:
${data.vipName}

🔗 VIP link:
${
    data.vipLink
        ? "✅ Bor"
        : "❌ Yo'q"
}

🤖 Bot:
✅ Ishlayapti`,

                        adminKeyboard()
                    );

                    return;
                }

                // ----------------------------------------------
                // XABAR
                // ----------------------------------------------

                if (
                    text ===
                    "📨 Xabar yuborish"
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

Barcha foydalanuvchilarga yuboriladigan xabarni yozing.

Bekor qilish:
/admin`
                    );

                    return;
                }

                // ----------------------------------------------
                // ADMIN STATE
                // ----------------------------------------------

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

                    // ------------------------------------------
                    // KANAL NOMI
                    // ------------------------------------------

                    if (
                        state.action ===
                        "CHANNEL_NAME"
                    ) {

                        adminStates.set(
                            userId,
                            {
                                action:
                                    "CHANNEL_LINK",

                                channelName:
                                    text.trim()
                            }
                        );

                        await sendMessage(
                            chatId,

`✅ Kanal nomi qabul qilindi:

📢 ${text.trim()}

2️⃣ Endi kanal LINKINI yuboring.

Masalan:

https://t.me/kanal`
                        );

                        return;
                    }

                    // ------------------------------------------
                    // KANAL LINKI
                    // ------------------------------------------

                    if (
                        state.action ===
                        "CHANNEL_LINK"
                    ) {

                        const link =
                            text.trim();

                        if (
                            !link.startsWith(
                                "https://t.me/"
                            ) &&
                            !link.startsWith(
                                "http://t.me/"
                            ) &&
                            !link.startsWith(
                                "@"
                            )
                        ) {

                            await sendMessage(
                                chatId,

`❌ Link noto'g'ri.

Telegram kanal linkini yuboring.

Masalan:

https://t.me/kanal`
                            );

                            return;
                        }

                        const chatIdChannel =
                            getChannelChatId(
                                link
                            );

                        if (
                            !chatIdChannel
                        ) {

                            await sendMessage(
                                chatId,

`❌ Bu kanal linkidan kanalni aniqlab bo'lmadi.

Ommaviy kanal linkini yuboring:

https://t.me/kanal`
                            );

                            return;
                        }

                        // DUPLIKAT TEKSHIRISH
                        const exists =
                            data.channels.some(
                                channel =>
                                    channel.link ===
                                    link
                            );

                        if (exists) {

                            adminStates.delete(
                                userId
                            );

                            await sendMessage(
                                chatId,

                                "❌ Bu kanal allaqachon qo'shilgan.",

                                adminKeyboard()
                            );

                            return;
                        }

                        // BOT ADMINLIGINI TEKSHIRISH
                        try {

                            await telegram(
                                "getChatMember",
                                {
                                    chat_id:
                                        chatIdChannel,

                                    user_id:
                                        Number(
                                            (
                                                await telegram(
                                                    "getMe",
                                                    {}
                                                )
                                            ).id
                                        )
                                }
                            );

                        } catch (error) {

                            console.log(
                                "⚠️ Kanal tekshirish:",
                                error.message
                            );

                            adminStates.delete(
                                userId
                            );

                            await sendMessage(
                                chatId,

`❌ Bot bu kanalni tekshira olmayapti.

Botni kanalga ADMIN qilib qo'ying.

Keyin yana kanal qo'shing.`,

                                adminKeyboard()
                            );

                            return;
                        }

                        data.channels.push({

                            name:
                                state.channelName,

                            link:
                                link,

                            chatId:
                                chatIdChannel
                        });

                        saveData(data);

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,

`✅ KANAL QO'SHILDI!

📢 Nomi:
${state.channelName}

🔗 Link:
${link}

👥 Endi bot foydalanuvchilardan shu kanalga obuna bo'lishni talab qiladi.`,

                            adminKeyboard()
                        );

                        return;
                    }

                    // ------------------------------------------
                    // KANAL O'CHIRISH
                    // ------------------------------------------

                    if (
                        state.action ===
                        "DELETE_CHANNEL"
                    ) {

                        const index =
                            Number(text) - 1;

                        if (
                            !Number.isInteger(
                                index
                            ) ||
                            index < 0 ||
                            index >=
                                data.channels.length
                        ) {

                            await sendMessage(
                                chatId,
                                "❌ Raqam noto'g'ri."
                            );

                            return;
                        }

                        const deleted =
                            data.channels.splice(
                                index,
                                1
                            )[0];

                        saveData(data);

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,

`🗑 KANAL O'CHIRILDI!

📢 ${deleted.name}`,

                            adminKeyboard()
                        );

                        return;
                    }

                    // ------------------------------------------
                    // VIP NOMI
                    // ------------------------------------------

                    if (
                        state.action ===
                        "VIP_NAME"
                    ) {

                        data.vipName =
                            text.trim();

                        saveData(data);

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,

`✅ VIP kanal nomi o'zgartirildi!

👑 ${data.vipName}`,

                            adminKeyboard()
                        );

                        return;
                    }

                    // ------------------------------------------
                    // VIP LINK
                    // ------------------------------------------

                    if (
                        state.action ===
                        "VIP_LINK"
                    ) {

                        if (
                            !text.startsWith(
                                "http://"
                            ) &&
                            !text.startsWith(
                                "https://"
                            )
                        ) {

                            await sendMessage(
                                chatId,
                                "❌ Link https:// bilan boshlanishi kerak."
                            );

                            return;
                        }

                        data.vipLink =
                            text.trim();

                        saveData(data);

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,

`✅ VIP link saqlandi!

🔗 ${data.vipLink}`,

                            adminKeyboard()
                        );

                        return;
                    }

                    // ------------------------------------------
                    // KARTA
                    // ------------------------------------------

                    if (
                        state.action ===
                        "CARD"
                    ) {

                        data.card =
                            text.trim();

                        saveData(data);

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,

`✅ Karta saqlandi!

💳 ${data.card}`,

                            adminKeyboard()
                        );

                        return;
                    }

                    // ------------------------------------------
                    // BROADCAST
                    // ------------------------------------------

                    if (
                        state.action ===
                        "BROADCAST"
                    ) {

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,
                            "⏳ Xabar yuborilmoqda..."
                        );

                        await broadcastMessage(
                            chatId,
                            text
                        );

                        return;
                    }
                }
            }

            // ==================================================
            // CHEK RASMI
            // ==================================================

            if (
                msg.photo &&
                !isAdmin(userId)
            ) {

                const state =
                    userStates.get(
                        userId
                    );

                if (
                    state &&
                    state.action ===
                    "WAIT_RECEIPT"
                ) {

                    const photo =
                        msg.photo[
                            msg.photo.length - 1
                        ];

                    const user = {

                        id:
                            userId,

                        first_name:
                            msg.from.first_name ||
                            "",

                        username:
                            msg.from.username ||
                            ""
                    };

                    try {

                        await sendReceiptToAdmin(
                            user,

                            photo.file_id,

                            state.tarifName,

                            state.price
                        );

                        userStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,

`✅ CHEK QABUL QILINDI!

Chekingiz adminga yuborildi.

⏳ Admin to'lovni tekshiradi.

Tasdiqlangandan keyin VIP kanal linki yuboriladi.`
                        );

                    } catch (error) {

                        console.log(
                            "❌ CHEK XATOSI:",
                            error.message
                        );

                        await sendMessage(
                            chatId,

                            "❌ Chek yuborishda xatolik bo'ldi. Qayta yuboring."
                        );
                    }

                    return;
                }
            }

            // ==================================================
            // CHEK O'RNIGA MATN
            // ==================================================

            if (
                !isAdmin(userId)
            ) {

                const state =
                    userStates.get(
                        userId
                    );

                if (
                    state &&
                    state.action ===
                    "WAIT_RECEIPT"
                ) {

                    await sendMessage(
                        chatId,

`📸 Iltimos, chekni RASM qilib yuboring.

Oddiy matn emas, chek rasmini yuboring.`
                    );

                    return;
                }
            }

            return;
        }

        // ==================================================
        // CALLBACK
        // ==================================================

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
                "🔘 CALLBACK:",
                action,
                "USER:",
                userId
            );

            await answerCallback(
                query.id
            );

            // ==================================================
            // CHECK SUBSCRIPTION
            // ==================================================

            if (
                action ===
                "CHECK_SUB"
            ) {

                const subscribed =
                    await checkSubscription(
                        userId
                    );

                if (!subscribed) {

                    await sendMessage(
                        chatId,

`❌ Hali barcha kanallarga obuna bo'lmagansiz.

Kanallarga obuna bo'ling va yana:

✅ Tekshirish

tugmasini bosing.`,

                        subscriptionKeyboard()
                    );

                    return;
                }

                await sendMessage(
                    chatId,
                    "✅ Obuna tasdiqlandi!"
                );

                await mainMenu(
                    chatId
                );

                return;
            }

            // ==================================================
            // VIP
            // ==================================================

            if (
                action ===
                "VIP"
            ) {

                const subscribed =
                    await checkSubscription(
                        userId
                    );

                if (!subscribed) {

                    await showSubscription(
                        chatId
                    );

                    return;
                }

                await showVip(
                    chatId
                );

                return;
            }

            // ==================================================
            // BACK
            // ==================================================

            if (
                action ===
                "BACK_MENU"
            ) {

                await mainMenu(
                    chatId
                );

                return;
            }

            // ==================================================
            // TARIF
            // ==================================================

            if (
                action.startsWith(
                    "TARIF_"
                )
            ) {

                const subscribed =
                    await checkSubscription(
                        userId
                    );

                if (!subscribed) {

                    await showSubscription(
                        chatId
                    );

                    return;
                }

                const tarif =
                    getTarif(
                        action
                    );

                if (!tarif) {

                    await sendMessage(
                        chatId,
                        "❌ Tarif topilmadi."
                    );

                    return;
                }

                await showPayment(
                    chatId,
                    userId,
                    tarif
                );

                return;
            }

            // ==================================================
            // TO'LADIM
            // ==================================================

            if (
                action ===
                "PAID"
            ) {

                const state =
                    userStates.get(
                        userId
                    );

                if (
                    !state ||
                    state.action !==
                    "WAIT_PAYMENT"
                ) {

                    await sendMessage(
                        chatId,

                        "❌ Avval tarifni tanlang."
                    );

                    return;
                }

                userStates.set(
                    userId,
                    {
                        action:
                            "WAIT_RECEIPT",

                        tarifName:
                            state.tarifName,

                        price:
                            state.price
                    }
                );

                await askReceipt(
                    chatId
                );

                return;
            }

            // ==================================================
            // APPROVE
            // ==================================================

            if (
                action.startsWith(
                    "APPROVE_"
                )
            ) {

                if (
                    !isAdmin(userId)
                ) {
                    return;
                }

                const targetId =
                    action.replace(
                        "APPROVE_",
                        ""
                    );

                const data =
                    loadData();

                if (!data.vipLink) {

                    await sendMessage(
                        chatId,

`❌ VIP kanal linki sozlanmagan!

Admin panel → 👑 VIP kanal → 🔗 VIP link orqali link qo'shing.`
                    );

                    return;
                }

                try {

                    await sendMessage(
                        targetId,

`✅ TO'LOV TASDIQLANDI!

🎉 Tabriklaymiz!

👑 VIP kanalga kirish:

${data.vipLink}

Marhamat, kanalga qo'shiling ❤️`
                    );

                    await sendMessage(
                        chatId,

`✅ TO'LOV TASDIQLANDI!

👤 User ID:
${targetId}

📨 VIP kanal linki foydalanuvchiga yuborildi.`,

                        adminKeyboard()
                    );

                } catch (error) {

                    await sendMessage(
                        chatId,

`❌ Foydalanuvchiga xabar yuborilmadi.

Sabab:
${error.message}`
                    );
                }

                return;
            }

            // ==================================================
            // REJECT
            // ==================================================

            if (
                action.startsWith(
                    "REJECT_"
                )
            ) {

                if (
                    !isAdmin(userId)
                ) {
                    return;
                }

                const targetId =
                    action.replace(
                        "REJECT_",
                        ""
                    );

                try {

                    await sendMessage(
                        targetId,

`❌ TO'LOV RAD ETILDI.

Chek tasdiqlanmadi.

Iltimos, to'g'ri to'lov chekini qayta yuboring.`
                    );

                } catch (error) {

                    console.log(
                        "❌ RAD XABAR:",
                        error.message
                    );
                }

                await sendMessage(
                    chatId,

`❌ To'lov rad etildi.

👤 User ID:
${targetId}`,

                    adminKeyboard()
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

// ======================================================
// HTTP SERVER
// ======================================================

const server =
    http.createServer(
        (req, res) => {

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

            // Telegram webhook
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

                            res.writeHead(
                                200,
                                {
                                    "Content-Type":
                                        "text/plain"
                                }
                            );

                            res.end("OK");

                            await processUpdate(
                                update
                            );

                        } catch (error) {

                            console.log(
                                "❌ WEBHOOK XATOSI:",
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

            res.writeHead(404);

            res.end(
                "Not found"
            );
        }
    );

// ======================================================
// SERVER START
// ======================================================

server.listen(
    PORT,
    "0.0.0.0",
    async () => {

        console.log(
            `🌐 SERVER ${PORT} PORTDA ISHLAYAPTI`
        );

        const webhookUrl =
            PUBLIC_URL +
            WEBHOOK_PATH;

        try {

            // Eski webhookni o'chirish
            await telegram(
                "deleteWebhook",
                {
                    drop_pending_updates:
                        true
                }
            );

            console.log(
                "✅ ESKI WEBHOOK O'CHIRILDI"
            );

            // Yangi webhook
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

// ======================================================
// ERROR
// ======================================================

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
