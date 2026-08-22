const http = require("http");
const https = require("https");
const fs = require("fs");

// ===============================
// SOZLAMALAR
// ===============================

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

// ===============================
// DATA
// ===============================

const DEFAULT_DATA = {
    version: 5,
    users: [],
    totalStarts: 0,

    card: "",

    vipName: "👑 VIP KANAL",
    vipLink: ""
};

function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            saveData(DEFAULT_DATA);
            return { ...DEFAULT_DATA };
        }

        const old = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );

        return {
            version: 5,

            users: Array.isArray(old.users)
                ? old.users
                : [],

            totalStarts: Number(
                old.totalStarts || 0
            ),

            card: old.card || "",

            vipName:
                old.vipName ||
                "👑 VIP KANAL",

            vipLink:
                old.vipLink || ""
        };

    } catch (error) {

        console.log(
            "❌ DATA XATOSI:",
            error.message
        );

        return {
            ...DEFAULT_DATA
        };
    }
}

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

// ===============================
// ADMIN
// ===============================

function isAdmin(userId) {
    return String(userId) === String(ADMIN_ID);
}

// ===============================
// TELEGRAM API
// ===============================

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

                        method: "POST",

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
                                        JSON.parse(result);

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
                "error",
                reject
            );

            req.on(
                "timeout",
                () => {
                    req.destroy(
                        new Error(
                            "Telegram timeout"
                        )
                    );
                }
            );

            req.write(body);
            req.end();
        }
    );
}

// ===============================
// XABAR
// ===============================

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

// ===============================
// RASM
// ===============================

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

// ===============================
// HOLATLAR
// ===============================

const adminStates = new Map();
const userStates = new Map();

// ===============================
// USER MENYU
// ===============================

function userKeyboard() {

    const data = loadData();

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

// ===============================
// ADMIN MENYU
// ===============================

function adminKeyboard() {

    return {
        keyboard: [

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

// ===============================
// VIP MENYU
// ===============================

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

// ===============================
// TO'LOV MENYU
// ===============================

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

// ===============================
// ADMIN VIP MENYU
// ===============================

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

// ===============================
// KARTA MENYU
// ===============================

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

// ===============================
// START
// ===============================

async function mainMenu(chatId) {

    await sendMessage(
        chatId,

        `👋 Assalomu alaykum!

Kerakli bo'limni tanlang 👇`,

        userKeyboard()
    );
}

// ===============================
// VIP
// ===============================

async function showVip(chatId) {

    const data = loadData();

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

// ===============================
// TARIF
// ===============================

function getTarif(type) {

    if (type === "TARIF_WEEK") {

        return {
            name: "1 haftalik",
            price: 15000
        };
    }

    if (type === "TARIF_MONTH") {

        return {
            name: "1 oylik",
            price: 50000
        };
    }

    if (type === "TARIF_YEAR") {

        return {
            name: "1 yillik",
            price: 180000
        };
    }

    return null;
}

// ===============================
// TO'LOV
// ===============================

async function showPayment(
    chatId,
    userId,
    tarif
) {

    const data = loadData();

    if (!data.card) {

        await sendMessage(
            chatId,

            `❌ Karta raqami hali sozlanmagan.

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

⚠️ Shu karta raqamiga to'lov qiling.

To'lovdan keyin pastdagi
"💰 To'ladim" tugmasini bosing.`,

        paymentKeyboard()
    );
}

// ===============================
// CHEK
// ===============================

async function askReceipt(chatId) {

    await sendMessage(
        chatId,

        `📸 CHEKNI YUBORING

To'lovni amalga oshirgandan keyin chekni shu yerga RASM qilib yuboring.

⚠️ Faqat chek rasmini yuboring.

Admin tekshiradi.`
    );
}

// ===============================
// PROFIL LINK
// ===============================

function getProfileLink(user) {

    if (user.username) {

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

// ===============================
// CHEKNI ADMINGA YUBORISH
// ===============================

async function sendReceiptToAdmin(
    user,
    photoId,
    tarifName,
    price
) {

    const profile =
        getProfileLink(user);

    const caption =

`💰 YANGI VIP TO'LOV

👤 Ism:
${user.first_name || "Noma'lum"}

📱 Username:
${user.username
    ? "@" + user.username
    : "Username yo'q"}

🆔 Telegram ID:
${user.id}

🔗 PROFIL:
${profile}

📌 Tarif:
${tarifName}

💵 Summa:
${price.toLocaleString("uz-UZ")} so'm

📸 Chek yuqorida.

👇 Tekshirish uchun tugmani bosing.`;

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

// ===============================
// ADMIN PANEL
// ===============================

async function adminPanel(chatId) {

    await sendMessage(
        chatId,

        `👨‍💼 ADMIN PANEL

Kerakli bo'limni tanlang 👇`,

        adminKeyboard()
    );
}

// ===============================
// UPDATE
// ===============================

async function processUpdate(update) {

    try {

        // ===========================
        // MESSAGE
        // ===========================

        if (update.message) {

            const msg =
                update.message;

            const chatId =
                msg.chat.id;

            const userId =
                msg.from.id;

            const text =
                msg.text || "";

            // =======================
            // START
            // =======================

            if (text.startsWith("/start")) {

                const data =
                    loadData();

                data.totalStarts =
                    Number(
                        data.totalStarts || 0
                    ) + 1;

                const exists =
                    data.users.some(
                        user =>
                            String(user.id) ===
                            String(userId)
                    );

                if (!exists) {

                    data.users.push({

                        id: userId,

                        first_name:
                            msg.from.first_name || "",

                        username:
                            msg.from.username || "",

                        date:
                            new Date().toISOString()
                    });
                }

                saveData(data);

                await mainMenu(chatId);

                return;
            }

            // =======================
            // ADMIN
            // =======================

            if (
                text === "/admin"
            ) {

                if (!isAdmin(userId)) {

                    await sendMessage(
                        chatId,
                        "❌ Siz admin emassiz."
                    );

                    return;
                }

                adminStates.delete(userId);

                await adminPanel(chatId);

                return;
            }

            // =======================
            // ADMIN MENU
            // =======================

            if (isAdmin(userId)) {

                // VIP
                if (
                    text === "👑 VIP kanal"
                ) {

                    adminStates.delete(
                        userId
                    );

                    const data =
                        loadData();

                    await sendMessage(
                        chatId,

`👑 VIP KANAL SOZLAMALARI

📌 Hozirgi nom:
${data.vipName}

🔗 Hozirgi link:
${data.vipLink || "❌ Kiritilmagan"}

Kerakli bo'limni tanlang:`,

                        vipAdminKeyboard()
                    );

                    return;
                }

                // VIP NOMI
                if (
                    text === "✏️ VIP nomi"
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
👑 VIP KANAL`
                    );

                    return;
                }

                // VIP LINK
                if (
                    text === "🔗 VIP link"
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

VIP kanalning taklif linkini yuboring.

Masalan:
https://t.me/+xxxxxxxx`
                    );

                    return;
                }

                // KARTA
                if (
                    text === "💳 Karta"
                ) {

                    adminStates.delete(
                        userId
                    );

                    const data =
                        loadData();

                    await sendMessage(
                        chatId,

`💳 KARTA SOZLAMALARI

Hozirgi karta:

${data.card || "❌ Karta kiritilmagan"}

Quyidagilardan birini tanlang:`,

                        cardKeyboard()
                    );

                    return;
                }

                // KARTA QO'SHISH
                if (
                    text === "➕ Karta qo'shish" ||
                    text === "✏️ Karta o'zgartirish"
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

                // KARTA O'CHIRISH
                if (
                    text === "🗑 Karta o'chirish"
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

                // ADMIN PANEL
                if (
                    text === "🔙 Admin panel"
                ) {

                    adminStates.delete(
                        userId
                    );

                    await adminPanel(
                        chatId
                    );

                    return;
                }

                // STATISTIKA
                if (
                    text === "📊 Statistika"
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

💳 Karta:
${data.card ? "✅ Bor" : "❌ Yo'q"}

👑 VIP nomi:
${data.vipName}

🔗 VIP link:
${data.vipLink ? "✅ Bor" : "❌ Yo'q"}

🤖 Bot:
✅ Ishlayapti`,

                        adminKeyboard()
                    );

                    return;
                }

                // BROADCAST
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

Barcha foydalanuvchilarga yuboriladigan xabarni yozing.

Bekor qilish:
 /admin`
                    );

                    return;
                }

                // ===================
                // ADMIN STATE
                // ===================

                const state =
                    adminStates.get(userId);

                if (
                    state &&
                    !text.startsWith("/")
                ) {

                    const data =
                        loadData();

                    // VIP NOMI
                    if (
                        state.action ===
                        "VIP_NAME"
                    ) {

                        data.vipName =
                            text;

                        saveData(data);

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,

`✅ VIP kanal nomi o'zgartirildi!

👑 ${text}`,

                            adminKeyboard()
                        );

                        return;
                    }

                    // VIP LINK
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
                            text;

                        saveData(data);

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,

`✅ VIP kanal linki saqlandi!

🔗 ${text}`,

                            adminKeyboard()
                        );

                        return;
                    }

                    // KARTA
                    if (
                        state.action ===
                        "CARD"
                    ) {

                        data.card =
                            text;

                        saveData(data);

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,

`✅ Karta saqlandi!

💳 ${text}`,

                            adminKeyboard()
                        );

                        return;
                    }

                    // BROADCAST
                    if (
                        state.action ===
                        "BROADCAST"
                    ) {

                        adminStates.delete(
                            userId
                        );

                        let success = 0;

                        for (
                            const user of data.users
                        ) {

                            try {

                                await sendMessage(
                                    user.id,
                                    text
                                );

                                success++;

                                await new Promise(
                                    resolve =>
                                        setTimeout(
                                            resolve,
                                            80
                                        )
                                );

                            } catch (error) {}
                        }

                        await sendMessage(
                            chatId,

`✅ XABAR YUBORILDI!

👥 Jami:
${data.users.length}

✅ Yetib bordi:
${success}`,

                            adminKeyboard()
                        );

                        return;
                    }
                }
            }

            // ===========================
            // CHEK RASMI
            // ===========================

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
                            msg.from.first_name || "",

                        username:
                            msg.from.username || ""
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

Chekingiz adminning shaxsiy chatiga yuborildi.

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
                            "❌ Chek yuborilmadi. Qayta urinib ko'ring."
                        );
                    }

                    return;
                }
            }

            // MATN YUBORSA
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

Oddiy matn yubormang.`
                    );

                    return;
                }
            }

            return;
        }

        // ===========================
        // CALLBACK
        // ===========================

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
                    "❌ CALLBACK:",
                    error.message
                );
            }

            // VIP
            if (
                action === "VIP"
            ) {

                await showVip(
                    chatId
                );

                return;
            }

            // ORQAGA
            if (
                action ===
                "BACK_MENU"
            ) {

                await mainMenu(
                    chatId
                );

                return;
            }

            // TARIF
            if (
                action.startsWith(
                    "TARIF_"
                )
            ) {

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

            // TO'LADIM
            if (
                action === "PAID"
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

            // TASDIQLASH
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

Admin panel → 👑 VIP kanal → 🔗 VIP link`
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

            // RAD ETISH
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

Iltimos, to'lov chekini qayta yuboring.`
                    );

                } catch (error) {}

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

// ===============================
// SERVER
// ===============================

const server =
    http.createServer(
        (req, res) => {

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
                                JSON.parse(body);

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

            res.writeHead(404);
            res.end("Not found");
        }
    );

// ===============================
// START SERVER
// ===============================

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

// ===============================
// XATOLAR
// ===============================

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
