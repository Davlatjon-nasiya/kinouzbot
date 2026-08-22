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


// ======================================================
// TOKEN TEKSHIRISH
// ======================================================

if (!TOKEN) {
    console.log("❌ BOT_TOKEN topilmadi!");
    process.exit(1);
}

console.log("🤖 BOT ISHGA TUSHMOQDA...");


// ======================================================
// DEFAULT DATA
// ======================================================

const DEFAULT_DATA = {
    version: 30,

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

            saveData(
                JSON.parse(
                    JSON.stringify(
                        DEFAULT_DATA
                    )
                )
            );

            return JSON.parse(
                JSON.stringify(
                    DEFAULT_DATA
                )
            );
        }


        const oldData =
            JSON.parse(
                fs.readFileSync(
                    DATA_FILE,
                    "utf8"
                )
            );


        const channels =
            Array.isArray(
                oldData.channels
            )
                ? oldData.channels
                : [];


        // Eski kanallarni ham yangi formatga o'tkazamiz

        const fixedChannels =
            channels.map(
                (channel, index) => {

                    const link =
                        String(
                            channel.link ||
                            ""
                        ).trim();

                    let type =
                        channel.type;

                    if (!type) {

                        if (
                            link.includes("/+")
                        ) {
                            type = "private";
                        } else {
                            type = "public";
                        }
                    }

                    return {

                        id:
                            channel.id ||
                            Date.now() + index,

                        name:
                            channel.name ||
                            `Kanal ${index + 1}`,

                        link:
                            link,

                        type:
                            type,

                        chatId:
                            channel.chatId ||
                            null
                    };
                }
            );


        return {

            version: 30,

            users:
                Array.isArray(
                    oldData.users
                )
                    ? oldData.users
                    : [],

            totalStarts:
                Number(
                    oldData.totalStarts ||
                    0
                ),

            card:
                oldData.card ||
                "",

            vipName:
                oldData.vipName ||
                "👑 VIP KANAL",

            vipLink:
                oldData.vipLink ||
                "",

            channels:
                fixedChannels
        };


    } catch (error) {

        console.log(
            "❌ DATA XATOSI:",
            error.message
        );

        return JSON.parse(
            JSON.stringify(
                DEFAULT_DATA
            )
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
            "❌ DATA SAQLASH XATOSI:",
            error.message
        );
    }
}


// ======================================================
// ADMIN TEKSHIRISH
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

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Content-Length":
                                Buffer.byteLength(
                                    body
                                )
                        },

                        timeout:
                            30000
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
                "error",
                error => {

                    reject(
                        error
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


            req.write(
                body
            );

            req.end();

        }
    );
}


// ======================================================
// XABAR YUBORISH
// ======================================================

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


// ======================================================
// RASM YUBORISH
// ======================================================

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


// ======================================================
// CALLBACK JAVOB
// ======================================================

async function answerCallback(
    callbackId,
    text = ""
) {

    try {

        await telegram(
            "answerCallbackQuery",
            {

                callback_query_id:
                    callbackId,

                text:
                    text,

                show_alert:
                    false
            }
        );

    } catch (error) {

        console.log(
            "❌ CALLBACK XATOSI:",
            error.message
        );
    }
}


// ======================================================
// HOLATLAR
// ======================================================

const adminStates =
    new Map();

const userStates =
    new Map();


// ======================================================
// FOYDALANUVCHI MENYUSI
// ======================================================

function userKeyboard() {

    const data =
        loadData();


    const buttons = [];


    // ------------------------------------------
    // KANALLAR
    // ------------------------------------------

    if (
        Array.isArray(
            data.channels
        )
    ) {

        data.channels.forEach(
            channel => {

                if (
                    channel &&
                    channel.name &&
                    channel.link
                ) {

                    buttons.push(
                        [

                            {

                                text:
                                    "📢 " +
                                    channel.name,

                                url:
                                    channel.link

                            }

                        ]
                    );

                }

            }
        );
    }


    // ------------------------------------------
    // VIP
    // ------------------------------------------

    buttons.push(
        [

            {

                text:
                    data.vipName ||
                    "👑 VIP KANAL",

                callback_data:
                    "VIP"

            }

        ]
    );


    return {

        inline_keyboard:
            buttons

    };
}


// ======================================================
// ADMIN MENYUSI
// ======================================================

function adminKeyboard() {

    const data =
        loadData();


    return {

        keyboard: [

            [

                {

                    text:
                        `📢 Kanallar (${data.channels.length})`

                },

                {

                    text:
                        "👑 VIP kanal"

                }

            ],

            [

                {

                    text:
                        "💳 Karta"

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


// ======================================================
// KANAL ADMIN MENYUSI
// ======================================================

function channelAdminKeyboard() {

    return {

        keyboard: [

            [

                {

                    text:
                        "➕ Kanal qo'shish"

                }

            ],

            [

                {

                    text:
                        "✏️ Kanal o'zgartirish"

                },

                {

                    text:
                        "🗑 Kanal o'chirish"

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
            true,

        one_time_keyboard:
            false
    };
}


// ======================================================
// VIP ADMIN MENYUSI
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

        resize_keyboard:
            true
    };
}


// ======================================================
// KARTA MENYUSI
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

        resize_keyboard:
            true
    };
}


// ======================================================
// VIP TARIFLAR
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
// TO'LOV MENYUSI
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
// OBUNA TEKSHIRISH
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
// TELEGRAM LINK TEKSHIRISH
// ======================================================

function isTelegramLink(
    link
) {

    if (!link) {
        return false;
    }


    const value =
        link.trim();


    // @username

    if (
        /^@[A-Za-z0-9_]+$/.test(
            value
        )
    ) {

        return true;
    }


    // Public

    if (
        /^https?:\/\/t\.me\/[A-Za-z0-9_]+$/i.test(
            value
        )
    ) {

        return true;
    }


    // Private

    if (
        /^https?:\/\/t\.me\/\+[A-Za-z0-9_-]+$/i.test(
            value
        )
    ) {

        return true;
    }


    return false;
}


// ======================================================
// PRIVATE / PUBLIC ANIQLASH
// ======================================================

function getChannelType(
    link
) {

    if (
        link.includes(
            "t.me/+"
        )
    ) {

        return "private";
    }


    return "public";
}


// ======================================================
// PUBLIC CHANNEL CHAT ID
// ======================================================

function getPublicChannelId(
    link
) {

    if (!link) {
        return null;
    }


    const value =
        link.trim();


    if (
        value.startsWith("@")
    ) {

        return value;
    }


    const match =
        value.match(
            /^https?:\/\/t\.me\/([A-Za-z0-9_]+)$/i
        );


    if (match) {

        return (
            "@" +
            match[1]
        );
    }


    return null;
}


// ======================================================
// OBUNA TEKSHIRISH
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

        // ----------------------------------------
        // MAXFIY KANAL
        // ----------------------------------------

        if (
            channel.type ===
            "private"
        ) {

            // Private invite linkdan Telegram
            // chat_id bermaydi.
            //
            // Shuning uchun private kanal
            // link sifatida ishlaydi.

            continue;
        }


        // ----------------------------------------
        // OMMAVIY KANAL
        // ----------------------------------------

        const channelId =
            channel.chatId ||
            getPublicChannelId(
                channel.link
            );


        if (!channelId) {

            continue;
        }


        try {

            const member =
                await telegram(
                    "getChatMember",
                    {

                        chat_id:
                            channelId,

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
                "❌ OBUNA TEKSHIRISH:",
                channel.name,
                error.message
            );

            // API tekshira olmasa
            // foydalanuvchini bloklamaymiz.

            continue;
        }
    }


    return true;
}


// ======================================================
// KANALLARGA OBUNA BO'LISH SAHIFASI
// ======================================================

async function showSubscription(
    chatId
) {

    const data =
        loadData();


    if (
        !data.channels ||
        data.channels.length === 0
    ) {

        await mainMenu(
            chatId
        );

        return;
    }


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
                            "📢 " +
                            channel.name,

                        url:
                            channel.link

                    }

                ]
            );

        }
    );


    text +=

`\nKanallarga kirgandan keyin:

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
// MAIN MENU
// ======================================================

async function mainMenu(
    chatId
) {

    const data =
        loadData();


    let text =

`👋 Assalomu alaykum!

Kerakli bo'limni tanlang 👇`;


    if (
        data.channels.length > 0
    ) {

        text +=

`\n\n📢 Bizning kanallarimiz:`;

    }


    await sendMessage(
        chatId,
        text,
        userKeyboard()
    );
}


// ======================================================
// VIP SAHIFA
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

⚠️ Shu karta raqamiga to'lov qiling.

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

To'lovni amalga oshirgandan keyin chekni shu yerga RASM qilib yuboring.

⚠️ Faqat chek rasmini yuboring.

Chek sizning shaxsiy Telegram chat'ingizga yuboriladi.`
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
// CHEKNI ADMINGA YUBORISH
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
        ? "@" +
          user.username
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


// ======================================================
// KANALLAR RO'YXATI
// ======================================================

async function showChannelsAdmin(
    chatId
) {

    const data =
        loadData();


    let text =

`📢 KANALLAR BO'LIMI

📊 Jami kanallar:
${data.channels.length}

`;


    if (
        data.channels.length === 0
    ) {

        text +=
            "❌ Hozircha kanal yo'q.";

    } else {

        data.channels.forEach(
            (
                channel,
                index
            ) => {

                const typeText =
                    channel.type ===
                    "private"

                        ? "🔒 Maxfiy"

                        : "🌐 Ommaviy";


                text +=

`${index + 1}. ${channel.name}

${typeText}

🔗 ${channel.link}

`;

            }
        );
    }


    await sendMessage(
        chatId,
        text,
        channelAdminKeyboard()
    );
}


// ======================================================
// ADMIN PANEL
// ======================================================

async function adminPanel(
    chatId
) {

    const data =
        loadData();


    await sendMessage(
        chatId,

`👨‍💼 ADMIN PANEL

📢 Kanallar:
${data.channels.length} ta

💳 Karta:
${
    data.card
        ? "✅ Bor"
        : "❌ Yo'q"
}

👑 VIP:
${data.vipName}

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
                        data.totalStarts ||
                        0
                    ) + 1;


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


                if (!existing) {

                    data.users.push(

                        {

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

                        }

                    );

                } else {

                    existing.first_name =
                        msg.from.first_name ||
                        "";

                    existing.username =
                        msg.from.username ||
                        "";
                }


                saveData(
                    data
                );


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


            // ==================================================
            // ADMIN ACTIONS
            // ==================================================

            if (
                isAdmin(
                    userId
                )
            ) {

                // ==============================================
                // KANALLAR
                // ==============================================

                if (
                    text.startsWith(
                        "📢 Kanallar"
                    )
                ) {

                    adminStates.delete(
                        userId
                    );


                    await showChannelsAdmin(
                        chatId
                    );


                    return;
                }


                // ==============================================
                // KANAL QO'SHISH
                // ==============================================

                if (
                    text ===
                    "➕ Kanal qo'shish"
                ) {

                    adminStates.set(
                        userId,
                        {

                            action:
                                "CHANNEL_ADD_NAME"

                        }
                    );


                    await sendMessage(
                        chatId,

`📢 KANAL QO'SHISH

1️⃣ Avval KANAL NOMINI yuboring.

Masalan:

🎬 Kino Kanal`
                    );


                    return;
                }


                // ==============================================
                // KANAL O'ZGARTIRISH
                // ==============================================

                if (
                    text ===
                    "✏️ Kanal o'zgartirish"
                ) {

                    const data =
                        loadData();


                    if (
                        data.channels.length ===
                        0
                    ) {

                        await sendMessage(
                            chatId,

                            "❌ O'zgartirish uchun kanal yo'q.",

                            channelAdminKeyboard()
                        );

                        return;
                    }


                    let list =
                        "✏️ KANAL O'ZGARTIRISH\n\n";


                    data.channels.forEach(
                        (
                            channel,
                            index
                        ) => {

                            list +=

`${index + 1}. ${channel.name}

🔗 ${channel.link}

`;

                        }
                    );


                    list +=

`Qaysi kanalni o'zgartirmoqchisiz?

Faqat raqamini yuboring.

Masalan:
1`;


                    adminStates.set(
                        userId,
                        {

                            action:
                                "CHANNEL_EDIT_SELECT"

                        }
                    );


                    await sendMessage(
                        chatId,
                        list
                    );


                    return;
                }


                // ==============================================
                // KANAL O'CHIRISH
                // ==============================================

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

                            channelAdminKeyboard()
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

`${index + 1}. ${channel.name}

🔗 ${channel.link}

`;

                        }
                    );


                    list +=

`O'chirmoqchi bo'lgan kanal raqamini yuboring.

Masalan:
1`;


                    adminStates.set(
                        userId,
                        {

                            action:
                                "CHANNEL_DELETE"

                        }
                    );


                    await sendMessage(
                        chatId,
                        list
                    );


                    return;
                }


                // ==============================================
                // VIP
                // ==============================================

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

🔗 Hozirgi link:
${
    data.vipLink ||
    "❌ Kiritilmagan"
}

Kerakli bo'limni tanlang:`,

                        vipAdminKeyboard()
                    );


                    return;
                }


                // ==============================================
                // VIP NOMI
                // ==============================================

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

Yangi nomni yuboring.

Masalan:

👑 Mandarin VIP`
                    );


                    return;
                }


                // ==============================================
                // VIP LINK
                // ==============================================

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

Ommaviy yoki maxfiy link yuboring.

🌐 Ommaviy:

https://t.me/kanal

🔒 Maxfiy:

https://t.me/+AbCdEf123`
                    );


                    return;
                }


                // ==============================================
                // KARTA
                // ==============================================

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


                // ==============================================
                // KARTA QO'SHISH
                // ==============================================

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


                // ==============================================
                // KARTA O'CHIRISH
                // ==============================================

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

                        "✅ Karta o'chirildi!",

                        cardKeyboard()
                    );


                    return;
                }


                // ==============================================
                // STATISTIKA
                // ==============================================

                if (
                    text ===
                    "📊 Statistika"
                ) {

                    const data =
                        loadData();


                    const publicCount =
                        data.channels.filter(
                            channel =>
                                channel.type ===
                                "public"
                        ).length;


                    const privateCount =
                        data.channels.filter(
                            channel =>
                                channel.type ===
                                "private"
                        ).length;


                    await sendMessage(
                        chatId,

`📊 BOT STATISTIKASI

👥 Foydalanuvchilar:
${data.users.length}

▶️ Jami /start:
${data.totalStarts}

📢 Jami kanallar:
${data.channels.length}

🌐 Ommaviy:
${publicCount}

🔒 Maxfiy:
${privateCount}

💳 Karta:
${
    data.card
        ? "✅ Bor"
        : "❌ Yo'q"
}

👑 VIP:
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


                // ==============================================
                // BROADCAST
                // ==============================================

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


                // ==============================================
                // ADMIN STATE
                // ==============================================

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


                    // ==========================================
                    // KANAL QO'SHISH — NOMI
                    // ==========================================

                    if (
                        state.action ===
                        "CHANNEL_ADD_NAME"
                    ) {

                        const name =
                            text.trim();


                        if (!name) {

                            await sendMessage(
                                chatId,
                                "❌ Kanal nomi bo'sh bo'lmasin."
                            );

                            return;
                        }


                        adminStates.set(
                            userId,
                            {

                                action:
                                    "CHANNEL_ADD_LINK",

                                channelName:
                                    name

                            }
                        );


                        await sendMessage(
                            chatId,

`✅ Kanal nomi qabul qilindi:

📢 ${name}

2️⃣ Endi KANAL LINKINI yuboring.

🌐 Ommaviy:

https://t.me/kanal

🔒 Maxfiy:

https://t.me/+AbCdEf123`
                        );


                        return;
                    }


                    // ==========================================
                    // KANAL QO'SHISH — LINK
                    // ==========================================

                    if (
                        state.action ===
                        "CHANNEL_ADD_LINK"
                    ) {

                        const link =
                            text.trim();


                        if (
                            !isTelegramLink(
                                link
                            )
                        ) {

                            await sendMessage(
                                chatId,

`❌ Link noto'g'ri.

🌐 Ommaviy:

https://t.me/kanal

🔒 Maxfiy:

https://t.me/+AbCdEf123`
                            );

                            return;
                        }


                        const exists =
                            data.channels.some(
                                channel =>
                                    channel.link ===
                                    link
                            );


                        if (exists) {

                            await sendMessage(
                                chatId,

                                "❌ Bu kanal allaqachon qo'shilgan.",

                                channelAdminKeyboard()
                            );


                            adminStates.delete(
                                userId
                            );


                            return;
                        }


                        const type =
                            getChannelType(
                                link
                            );


                        let chatIdChannel =
                            null;


                        if (
                            type ===
                            "public"
                        ) {

                            chatIdChannel =
                                getPublicChannelId(
                                    link
                                );

                        }


                        data.channels.push(

                            {

                                id:
                                    Date.now(),

                                name:
                                    state.channelName,

                                link:
                                    link,

                                type:
                                    type,

                                chatId:
                                    chatIdChannel

                            }

                        );


                        saveData(
                            data
                        );


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

📌 Turi:
${
    type ===
    "private"
        ? "🔒 Maxfiy"
        : "🌐 Ommaviy"
}

📊 Jami kanallar:
${data.channels.length} ta`,

                            channelAdminKeyboard()
                        );


                        return;
                    }


                    // ==========================================
                    // KANAL EDIT — SELECT
                    // ==========================================

                    if (
                        state.action ===
                        "CHANNEL_EDIT_SELECT"
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
                                data.channels.length
                        ) {

                            await sendMessage(
                                chatId,
                                "❌ Kanal raqami noto'g'ri."
                            );

                            return;
                        }


                        const channel =
                            data.channels[
                                index
                            ];


                        adminStates.set(
                            userId,
                            {

                                action:
                                    "CHANNEL_EDIT_NAME",

                                index:
                                    index,

                                oldName:
                                    channel.name,

                                oldLink:
                                    channel.link

                            }
                        );


                        await sendMessage(
                            chatId,

`✏️ KANAL O'ZGARTIRISH

Eski nom:
${channel.name}

Yangi kanal NOMINI yuboring.

Agar nomini o'zgartirmoqchi bo'lmasangiz, eski nomni qayta yuboring.`
                        );


                        return;
                    }


                    // ==========================================
                    // KANAL EDIT — NAME
                    // ==========================================

                    if (
                        state.action ===
                        "CHANNEL_EDIT_NAME"
                    ) {

                        const name =
                            text.trim();


                        if (!name) {

                            await sendMessage(
                                chatId,
                                "❌ Nom bo'sh bo'lmasin."
                            );

                            return;
                        }


                        adminStates.set(
                            userId,
                            {

                                action:
                                    "CHANNEL_EDIT_LINK",

                                index:
                                    state.index,

                                newName:
                                    name

                            }
                        );


                        await sendMessage(
                            chatId,

`✅ Yangi nom:

📢 ${name}

Endi yangi KANAL LINKINI yuboring.

🌐 Ommaviy:

https://t.me/kanal

🔒 Maxfiy:

https://t.me/+AbCdEf123`
                        );


                        return;
                    }


                    // ==========================================
                    // KANAL EDIT — LINK
                    // ==========================================

                    if (
                        state.action ===
                        "CHANNEL_EDIT_LINK"
                    ) {

                        const link =
                            text.trim();


                        if (
                            !isTelegramLink(
                                link
                            )
                        ) {

                            await sendMessage(
                                chatId,

`❌ Link noto'g'ri.

🌐 Ommaviy:

https://t.me/kanal

🔒 Maxfiy:

https://t.me/+AbCdEf123`
                            );

                            return;
                        }


                        const index =
                            state.index;


                        data.channels[
                            index
                        ] = {

                            id:
                                data.channels[
                                    index
                                ].id ||
                                Date.now(),

                            name:
                                state.newName,

                            link:
                                link,

                            type:
                                getChannelType(
                                    link
                                ),

                            chatId:
                                getPublicChannelId(
                                    link
                                )

                        };


                        saveData(
                            data
                        );


                        adminStates.delete(
                            userId
                        );


                        await sendMessage(
                            chatId,

`✅ KANAL O'ZGARTIRILDI!

📢 Nomi:
${state.newName}

🔗 Link:
${link}

📌 Turi:
${
    getChannelType(link) ===
    "private"
        ? "🔒 Maxfiy"
        : "🌐 Ommaviy"
}`,

                            channelAdminKeyboard()
                        );


                        return;
                    }


                    // ==========================================
                    // KANAL DELETE
                    // ==========================================

                    if (
                        state.action ===
                        "CHANNEL_DELETE"
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
                                data.channels.length
                        ) {

                            await sendMessage(
                                chatId,
                                "❌ Kanal raqami noto'g'ri."
                            );

                            return;
                        }


                        const deleted =
                            data.channels.splice(
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

`🗑 KANAL O'CHIRILDI!

📢 ${deleted.name}

📊 Qolgan kanallar:
${data.channels.length} ta`,

                            channelAdminKeyboard()
                        );


                        return;
                    }


                    // ==========================================
                    // VIP NAME
                    // ==========================================

                    if (
                        state.action ===
                        "VIP_NAME"
                    ) {

                        data.vipName =
                            text.trim();


                        saveData(
                            data
                        );


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


                    // ==========================================
                    // VIP LINK
                    // ==========================================

                    if (
                        state.action ===
                        "VIP_LINK"
                    ) {

                        const link =
                            text.trim();


                        if (
                            !isTelegramLink(
                                link
                            )
                        ) {

                            await sendMessage(
                                chatId,

`❌ VIP link noto'g'ri.

🌐 Ommaviy:

https://t.me/kanal

🔒 Maxfiy:

https://t.me/+AbCdEf123`
                            );

                            return;
                        }


                        data.vipLink =
                            link;


                        saveData(
                            data
                        );


                        adminStates.delete(
                            userId
                        );


                        await sendMessage(
                            chatId,

`✅ VIP link saqlandi!

🔗 ${link}`,

                            adminKeyboard()
                        );


                        return;
                    }


                    // ==========================================
                    // CARD
                    // ==========================================

                    if (
                        state.action ===
                        "CARD"
                    ) {

                        const card =
                            text.trim();


                        if (
                            card.length <
                            8
                        ) {

                            await sendMessage(
                                chatId,
                                "❌ Karta raqami noto'g'ri."
                            );

                            return;
                        }


                        data.card =
                            card;


                        saveData(
                            data
                        );


                        adminStates.delete(
                            userId
                        );


                        await sendMessage(
                            chatId,

`✅ Karta saqlandi!

💳 ${card}`,

                            adminKeyboard()
                        );


                        return;
                    }


                    // ==========================================
                    // BROADCAST
                    // ==========================================

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
                !isAdmin(
                    userId
                )
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

Chekingiz adminning shaxsiy chatiga yuborildi.

⏳ Admin tekshiradi.

Tasdiqlangandan keyin VIP kanal linki yuboriladi.`
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
                            "❌ Chek yuborilmadi. Qayta yuboring."
                        );
                    }


                    return;
                }
            }


            // ==================================================
            // CHEK O'RNIGA MATN
            // ==================================================

            if (
                !isAdmin(
                    userId
                )
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


            // ================================================
            // CHECK SUB
            // ================================================

            if (
                action ===
                "CHECK_SUB"
            ) {

                const subscribed =
                    await checkSubscription(
                        userId
                    );


                if (
                    !subscribed
                ) {

                    await showSubscription(
                        chatId
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


            // ================================================
            // VIP
            // ================================================

            if (
                action ===
                "VIP"
            ) {

                const subscribed =
                    await checkSubscription(
                        userId
                    );


                if (
                    !subscribed
                ) {

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


            // ================================================
            // BACK
            // ================================================

            if (
                action ===
                "BACK_MENU"
            ) {

                await mainMenu(
                    chatId
                );


                return;
            }


            // ================================================
            // TARIF
            // ================================================

            if (
                action.startsWith(
                    "TARIF_"
                )
            ) {

                const subscribed =
                    await checkSubscription(
                        userId
                    );


                if (
                    !subscribed
                ) {

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


            // ================================================
            // TO'LADIM
            // ================================================

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


            // ================================================
            // APPROVE
            // ================================================

            if (
                action.startsWith(
                    "APPROVE_"
                )
            ) {

                if (
                    !isAdmin(
                        userId
                    )
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


            // ================================================
            // REJECT
            // ================================================

            if (
                action.startsWith(
                    "REJECT_"
                )
            ) {

                if (
                    !isAdmin(
                        userId
                    )
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

Iltimos, to'g'ri chekni qayta yuboring.`
                    );

                } catch (error) {

                    console.log(
                        "❌ REJECT:",
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
        (
            req,
            res
        ) => {


            // ----------------------------------------------
            // RENDER HEALTH CHECK
            // ----------------------------------------------

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


            // ----------------------------------------------
            // TELEGRAM WEBHOOK
            // ----------------------------------------------

            if (
                req.method ===
                    "POST" &&

                req.url ===
                    WEBHOOK_PATH
            ) {

                let body =
                    "";


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


            res.writeHead(
                404
            );


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

            // Eski webhookni o'chiramiz

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


// ======================================================
// XATOLAR
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
