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
// DEFAULT DATA
// ========================================

const DEFAULT_DATA = {
    version: 2,

    users: [],

    links: [],

    totalStarts: 0,

    card: "",

    vipName: "👑 VIP KANAL",

    vipLink: ""
};

// ========================================
// DATA YUKLASH
// ========================================

function loadData() {
    try {

        if (!fs.existsSync(DATA_FILE)) {

            saveData(DEFAULT_DATA);

            return {
                ...DEFAULT_DATA
            };
        }

        const oldData = JSON.parse(
            fs.readFileSync(
                DATA_FILE,
                "utf8"
            )
        );

        // Eski versiya bo'lsa,
        // eski linklarni bir marta tozalaymiz
        if (
            Number(oldData.version || 0) < 2
        ) {

            const newData = {
                ...DEFAULT_DATA,

                users:
                    Array.isArray(oldData.users)
                        ? oldData.users
                        : [],

                totalStarts:
                    Number(
                        oldData.totalStarts || 0
                    )
            };

            saveData(newData);

            console.log(
                "🧹 Eski linklar tozalandi!"
            );

            return newData;
        }

        return {
            version: 2,

            users:
                Array.isArray(oldData.users)
                    ? oldData.users
                    : [],

            links:
                Array.isArray(oldData.links)
                    ? oldData.links
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
                oldData.vipLink || ""
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

    } catch (error) {

        console.log(
            "❌ SAQLASH XATOSI:",
            error.message
        );
    }
}

// ========================================
// ADMIN TEKSHIRISH
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

function telegram(
    method,
    data
) {

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

                        timeout:
                            30000,

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Content-Length":
                                Buffer.byteLength(
                                    body
                                )
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

                                } catch (
                                    error
                                ) {

                                    reject(
                                        error
                                    );
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
        }
    );
}

// ========================================
// ODDIY XABAR
// ========================================

async function sendMessage(
    chatId,
    text,
    keyboard = null
) {

    const data = {
        chat_id:
            chatId,

        text:
            text
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
// RASM YUBORISH
// ========================================

async function sendPhoto(
    chatId,
    photo,
    caption = "",
    keyboard = null
) {

    const data = {

        chat_id:
            chatId,

        photo:
            photo
    };

    if (caption) {
        data.caption =
            caption;
    }

    if (keyboard) {
        data.reply_markup =
            keyboard;
    }

    return telegram(
        "sendPhoto",
        data
    );
}

// ========================================
// ADMIN HOLATLARI
// ========================================

const adminStates =
    new Map();

const userStates =
    new Map();

// ========================================
// ADMIN KLAVIATURA
// ========================================

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
                        "🔗 Linklar"
                },

                {
                    text:
                        "📊 Statistika"
                }
            ],

            [
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
// USER MENYU
// ========================================

function userKeyboard() {

    const data =
        loadData();

    const buttons = [];

    // VIP kanal
    buttons.push([
        {
            text:
                data.vipName ||
                "👑 VIP KANAL",

            callback_data:
                "VIP"
        }
    ]);

    // Admin qo'shgan linklar
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

    return {
        inline_keyboard:
            buttons
    };
}

// ========================================
// VIP TARIFLAR
// ========================================

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

// ========================================
// TO'LOV KNOPKASI
// ========================================

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

// ========================================
// ADMIN PANEL
// ========================================

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

// ========================================
// START MENU
// ========================================

async function mainMenu(
    chatId
) {

    await sendMessage(
        chatId,

`👋 Assalomu alaykum!

Kerakli bo'limni tanlang 👇`,

        userKeyboard()
    );
}

// ========================================
// VIP SAHIFA
// ========================================

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

// ========================================
// TARIF MA'LUMOTI
// ========================================

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

// ========================================
// TO'LOV
// ========================================

async function showPayment(
    chatId,
    userId,
    tarif
) {

    const data =
        loadData();

    if (
        !data.card
    ) {

        await sendMessage(
            chatId,

`❌ Hozircha karta raqami sozlanmagan.

Iltimos, admin bilan bog'laning.

📩 @yakhubov_004`
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

⚠️ To'lovni amalga oshirgandan keyin:

👇 "💰 To'ladim" tugmasini bosing.`,

        paymentKeyboard()
    );
}

// ========================================
// CHEK KUTISH
// ========================================

async function askReceipt(
    chatId
) {

    await sendMessage(
        chatId,

`📸 CHEKNI YUBORING

To'lov qilganingizni tasdiqlash uchun chek rasmini shu yerga yuboring.

⚠️ Chekni oddiy rasm ko'rinishida yuboring.

Admin tekshiradi va VIP kanalga kirish ma'lumotini yuboradi.`
    );
}

// ========================================
// PROFIL LINK
// ========================================

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

// ========================================
// CHEKNI ADMINGA YUBORISH
// ========================================

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

`💰 YANGI TO'LOV

👤 Ism:
${user.first_name || ""}

🔗 Profil:
${profile}

🆔 ID:
${user.id}

📱 Username:
${user.username
    ? "@" + user.username
    : "Username yo'q"}

📌 Tarif:
${tarifName}

💵 Summa:
${price.toLocaleString("uz-UZ")} so'm

📸 Chek yuqorida.

👇 Tekshirish kerak.`;

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

// ========================================
// BARCHAGA XABAR
// ========================================

async function broadcastMessage(
    adminChatId,
    messageText
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
                messageText
            );

            sent++;

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        50
                    )
            );

        } catch (
            error
        ) {

            failed++;

            console.log(
                `❌ ${user.id} ga yuborilmadi`
            );
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

// ========================================
// UPDATE
// ========================================

async function processUpdate(
    update
) {

    try {

        // ==================================
        // MESSAGE
        // ==================================

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

            // ==================================
            // ADMIN
            // ==================================

            if (
                text ===
                "/admin"
            ) {

                if (
                    !isAdmin(
                        userId
                    )
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
            // /START
            // ==================================

            if (
                text.startsWith(
                    "/start"
                )
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
                }

                saveData(
                    data
                );

                await mainMenu(
                    chatId
                );

                return;
            }

            // ==================================
            // ADMIN TEKSHIRISH
            // ==================================

            if (
                isAdmin(
                    userId
                )
            ) {

                // ==================================
                // VIP ADMIN
                // ==================================

                if (
                    text ===
                    "👑 VIP kanal"
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
${data.vipLink || "Kiritilmagan"}

Quyidagi bo'limlardan birini tanlang:`,

                        {
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

                            resize_keyboard:
                                true
                        }
                    );

                    return;
                }

                // ==================================
                // VIP NOMI
                // ==================================

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

Yangi nomni yozing.

Masalan:

👑 Mandarin VIP`
                    );

                    return;
                }

                // ==================================
                // VIP LINK
                // ==================================

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

Yangi VIP kanal linkini yuboring.

Masalan:

https://t.me/+xxxxxxxx`
                    );

                    return;
                }

                // ==================================
                // KARTA
                // ==================================

                if (
                    text ===
                    "💳 Karta"
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

${data.card || "❌ Karta kiritilmagan"}`,

                        {
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

                            resize_keyboard:
                                true
                        }
                    );

                    return;
                }

                // ==================================
                // KARTA QO'SHISH
                // ==================================

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

                // ==================================
                // KARTA O'CHIRISH
                // ==================================

                if (
                    text ===
                    "🗑 Karta o'chirish"
                ) {

                    const data =
                        loadData();

                    data.card =
                        "";

                    saveData(
                        data
                    );

                    await sendMessage(
                        chatId,

`✅ Karta o'chirildi!`,

                        adminKeyboard()
                    );

                    return;
                }

                // ==================================
                // ADMIN PANEL
                // ==================================

                if (
                    text ===
                    "🔙 Admin panel"
                ) {

                    adminStates.delete(
                        userId
                    );

                    await adminPanel(
                        chatId
                    );

                    return;
                }

                // ==================================
                // LINKLAR
                // ==================================

                if (
                    text ===
                    "🔗 Linklar"
                ) {

                    adminStates.delete(
                        userId
                    );

                    const data =
                        loadData();

                    let list =
                        "🔗 BOT LINKLARI\n\n";

                    if (
                        data.links.length ===
                        0
                    ) {

                        list +=
                            "❌ Link yo'q.";

                    } else {

                        data.links.forEach(
                            (
                                item,
                                index
                            ) => {

                                list +=
                                    `${index + 1}. ${item.name}\n`;

                                list +=
                                    `${item.link}\n\n`;
                            }
                        );
                    }

                    await sendMessage(
                        chatId,
                        list,

                        {
                            keyboard: [

                                [
                                    {
                                        text:
                                            "➕ Link qo'shish"
                                    }
                                ],

                                [
                                    {
                                        text:
                                            "✏️ Link o'zgartirish"
                                    },

                                    {
                                        text:
                                            "🗑 Link o'chirish"
                                    }
                                ],

                                [
                                    {
                                        text:
                                            "🔙 Admin panel"
                                    }
                                ]

                            ],

                            resize_keyboard:
                                true
                        }
                    );

                    return;
                }

                // ==================================
                // LINK QO'SHISH
                // ==================================

                if (
                    text ===
                    "➕ Link qo'shish"
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

📢 Telegram | https://t.me/kanal

❌ Bekor qilish:
 /admin`
                    );

                    return;
                }

                // ==================================
                // LINK O'ZGARTIRISH
                // ==================================

                if (
                    text ===
                    "✏️ Link o'zgartirish"
                ) {

                    const data =
                        loadData();

                    if (
                        data.links.length ===
                        0
                    ) {

                        await sendMessage(
                            chatId,
                            "❌ Link yo'q.",
                            adminKeyboard()
                        );

                        return;
                    }

                    let list =
                        "✏️ LINK O'ZGARTIRISH\n\n";

                    data.links.forEach(
                        (
                            item,
                            index
                        ) => {

                            list +=
                                `${index + 1}. ${item.name}\n`;

                            list +=
                                `${item.link}\n\n`;
                        }
                    );

                    list += `

Format:

Raqam | Yangi nom | Yangi link

Masalan:

1 | 📢 Telegram | https://t.me/kanal`;

                    adminStates.set(
                        userId,
                        {
                            action:
                                "EDIT_LINK"
                        }
                    );

                    await sendMessage(
                        chatId,
                        list
                    );

                    return;
                }

                // ==================================
                // LINK O'CHIRISH
                // ==================================

                if (
                    text ===
                    "🗑 Link o'chirish"
                ) {

                    const data =
                        loadData();

                    if (
                        data.links.length ===
                        0
                    ) {

                        await sendMessage(
                            chatId,
                            "❌ Link yo'q.",
                            adminKeyboard()
                        );

                        return;
                    }

                    let list =
                        "🗑 LINK O'CHIRISH\n\n";

                    data.links.forEach(
                        (
                            item,
                            index
                        ) => {

                            list +=
                                `${index + 1}. ${item.name}\n`;
                        }
                    );

                    list +=
                        "\nRaqamini yuboring.\nMasalan: 1";

                    adminStates.set(
                        userId,
                        {
                            action:
                                "DELETE_LINK"
                        }
                    );

                    await sendMessage(
                        chatId,
                        list
                    );

                    return;
                }

                // ==================================
                // STATISTIKA
                // ==================================

                if (
                    text ===
                    "📊 Statistika"
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

▶️ Jami /start:
${data.totalStarts}

🔗 Linklar:
${data.links.length}

💳 Karta:
${data.card
    ? "✅ Bor"
    : "❌ Yo'q"}

👑 VIP link:
${data.vipLink
    ? "✅ Bor"
    : "❌ Yo'q"}

🤖 Bot:
✅ Ishlayapti`,

                        adminKeyboard()
                    );

                    return;
                }

                // ==================================
                // XABAR YUBORISH
                // ==================================

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

❌ Bekor qilish:
 /admin`
                    );

                    return;
                }

                // ==================================
                // ADMIN STATE
                // ==================================

                const state =
                    adminStates.get(
                        userId
                    );

                if (
                    state &&
                    !text.startsWith(
                        "/"
                    )
                ) {

                    const data =
                        loadData();

                    // ==================================
                    // VIP NOM
                    // ==================================

                    if (
                        state.action ===
                        "VIP_NAME"
                    ) {

                        data.vipName =
                            text;

                        saveData(
                            data
                        );

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

                    // ==================================
                    // VIP LINK
                    // ==================================

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

                        saveData(
                            data
                        );

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

                    // ==================================
                    // KARTA
                    // ==================================

                    if (
                        state.action ===
                        "CARD"
                    ) {

                        data.card =
                            text;

                        saveData(
                            data
                        );

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

                    // ==================================
                    // XABAR
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
                            "⏳ Xabar yuborilmoqda..."
                        );

                        await broadcastMessage(
                            chatId,
                            text
                        );

                        return;
                    }

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
                            parts.length <
                            2
                        ) {

                            await sendMessage(
                                chatId,

`❌ Format xato!

Nomi | Link

Masalan:

📢 Kanal | https://t.me/kanal`
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
                            "✅ Link qo'shildi!",
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
                            Number(
                                text
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

`🗑 Link o'chirildi!

${deleted.name}`,

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
                            parts.length <
                            3
                        ) {

                            await sendMessage(
                                chatId,

`❌ Format xato!

Raqam | Yangi nom | Yangi link

Masalan:

1 | 📢 Kanal | https://t.me/kanal`
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

                        saveData(
                            data
                        );

                        adminStates.delete(
                            userId
                        );

                        await sendMessage(
                            chatId,
                            "✅ Link o'zgartirildi!",
                            adminKeyboard()
                        );

                        return;
                    }
                }
            }

            // ==================================
            // RASM / CHEK
            // ==================================

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

                    const data =
                        loadData();

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

`✅ Chekingiz adminga yuborildi!

⏳ Admin tekshiradi.

Tasdiqlangandan keyin VIP kanalga kirish linki yuboriladi.`
                        );

                    } catch (
                        error
                    ) {

                        console.log(
                            "❌ CHEK XATOSI:",
                            error.message
                        );

                        await sendMessage(
                            chatId,
                            "❌ Chekni yuborishda xatolik bo'ldi. Qayta urinib ko'ring."
                        );
                    }

                    return;
                }
            }

            // ==================================
            // TO'LOV MATNI
            // ==================================

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

`📸 Iltimos, chekni rasm qilib yuboring.

Oddiy matn emas, chek rasmini yuboring.`
                    );

                    return;
                }
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

            const userId =
                query.from.id;

            try {

                await telegram(
                    "answerCallbackQuery",
                    {
                        callback_query_id:
                            query.id
                    }
                );

            } catch (
                error
            ) {}

            // ==================================
            // VIP
            // ==================================

            if (
                action ===
                "VIP"
            ) {

                await showVip(
                    chatId
                );

                return;
            }

            // ==================================
            // ORQAGA
            // ==================================

            if (
                action ===
                "BACK_MENU"
            ) {

                await mainMenu(
                    chatId
                );

                return;
            }

            // ==================================
            // TARIF
            // ==================================

            if (
                action.startsWith(
                    "TARIF_"
                )
            ) {

                const tarif =
                    getTarif(
                        action
                    );

                if (
                    !tarif
                ) {

                    return;
                }

                await showPayment(
                    chatId,
                    userId,
                    tarif
                );

                return;
            }

            // ==================================
            // TO'LADIM
            // ==================================

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

`❌ Avval tarifni tanlang.`
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

            // ==================================
            // ADMIN TASDIQLASH
            // ==================================

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

                if (
                    !data.vipLink
                ) {

                    await sendMessage(
                        chatId,

`❌ VIP kanal linki hali sozlanmagan!

Admin panel → 👑 VIP kanal → 🔗 VIP link orqali qo'shing.`
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

`✅ To'lov tasdiqlandi.

👤 User ID:
${targetId}

📨 VIP kanal linki foydalanuvchiga yuborildi.`,

                        adminKeyboard()
                    );

                } catch (
                    error
                ) {

                    await sendMessage(
                        chatId,

`❌ Foydalanuvchiga xabar yuborilmadi.

Sabab:
${error.message}`
                    );
                }

                return;
            }

            // ==================================
            // RAD ETISH
            // ==================================

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

Iltimos, to'lov chekini qayta yuboring yoki admin bilan bog'laning.

📩 @yakhubov_004`
                    );

                } catch (
                    error
                ) {}

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

    } catch (
        error
    ) {

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

                        } catch (
                            error
                        ) {

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

        } catch (
            error
        ) {

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
