const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const http = require("http");

// =========================
// SOZLAMALAR
// =========================

const TOKEN = process.env.BOT_TOKEN;
const ADMIN = 8582398177;

// Render Disk ulansa /data ishlatiladi.
// Lokal kompyuterda esa data.json ishlaydi.
const DATA_DIR = fs.existsSync("/data") ? "/data" : ".";
const DATA_FILE = `${DATA_DIR}/data.json`;

if (!TOKEN) {
  console.error("❌ BOT_TOKEN topilmadi!");
  process.exit(1);
}

// =========================
// BOT
// =========================

const bot = new TelegramBot(TOKEN, {
  polling: true
});

// =========================
// DATABASE
// =========================

let db = {
  channels: [],
  card: "",
  vipName: "👑 VIP KANAL",
  vipLink: "",
  users: []
};

// Eski data.json bo'lsa yuklash
if (fs.existsSync(DATA_FILE)) {
  try {
    const oldData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

    db = {
      channels: Array.isArray(oldData.channels) ? oldData.channels : [],
      card: oldData.card || "",
      vipName: oldData.vipName || "👑 VIP KANAL",
      vipLink: oldData.vipLink || "",
      users: Array.isArray(oldData.users) ? oldData.users : []
    };

    console.log("✅ Database yuklandi");
    console.log(`📢 Kanallar: ${db.channels.length}`);
    console.log(`👥 Users: ${db.users.length}`);
  } catch (err) {
    console.log("⚠️ Database o'qishda xato:", err.message);
  }
}

// =========================
// SAVE
// =========================

function save() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(db, null, 2),
      "utf8"
    );

    console.log("💾 Database saqlandi");
  } catch (err) {
    console.error("❌ Database saqlanmadi:", err.message);
  }
}

// =========================
// STATE
// =========================

const state = {};

// =========================
// ADMIN MENU
// =========================

function adminMenu() {
  return {
    reply_markup: {
      keyboard: [
        [`📢 Kanallar (${db.channels.length})`],
        ["👑 VIP kanal", "💳 Karta"],
        ["📢 Xabar yuborish", "📊 Statistika"]
      ],
      resize_keyboard: true
    }
  };
}

// =========================
// CHANNEL MENU
// =========================

function channelMenu() {
  return {
    reply_markup: {
      keyboard: [
        ["➕ Kanal qo'shish"],
        ["✏️ Kanal o'zgartirish", "🗑 Kanal o'chirish"],
        ["🔙 Admin panel"]
      ],
      resize_keyboard: true
    }
  };
}

// =========================
// USER MENU
// =========================

function userMenu() {
  const buttons = [];

  db.channels.forEach((c) => {
    buttons.push([
      {
        text: "📢 " + c.name,
        url: c.link
      }
    ]);
  });

  buttons.push([
    {
      text: db.vipName,
      callback_data: "vip"
    }
  ]);

  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

// =========================
// VIP MENU
// =========================

function vipMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🗓 1 haftalik — 15 000 so'm",
            callback_data: "week"
          }
        ],
        [
          {
            text: "📅 1 oylik — 50 000 so'm",
            callback_data: "month"
          }
        ],
        [
          {
            text: "🗓 1 yillik — 180 000 so'm",
            callback_data: "year"
          }
        ]
      ]
    }
  };
}

// =========================
// START
// =========================

bot.onText(/\/start/, (msg) => {
  const id = msg.from.id;

  if (!db.users.find((x) => x.id == id)) {
    db.users.push({
      id: id,
      username: msg.from.username || "",
      name: msg.from.first_name || ""
    });

    save();
  }

  bot.sendMessage(
    id,
    "👋 Assalomu alaykum!\n\nKerakli bo'limni tanlang 👇",
    userMenu()
  );
});

// =========================
// ADMIN COMMAND
// =========================

bot.onText(/\/admin/, (msg) => {
  if (msg.from.id != ADMIN) {
    return bot.sendMessage(
      msg.chat.id,
      "❌ Siz admin emassiz."
    );
  }

  bot.sendMessage(
    msg.chat.id,
    "👨‍💼 ADMIN PANEL",
    adminMenu()
  );
});

// =========================
// ADMIN BUTTONS
// =========================

bot.on("message", async (msg) => {
  const id = msg.from.id;
  const text = msg.text;

  if (id != ADMIN) return;

  // =========================
  // XABAR YUBORISH
  // =========================

  if (text == "📢 Xabar yuborish") {
    state[id] = "broadcast";

    return bot.sendMessage(
      id,
      `📢 XABAR YUBORISH

👥 Jami foydalanuvchilar: ${db.users.length} ta

Endi yuboriladigan xabarni yozing.

📝 Oddiy matn yuborishingiz mumkin.
🖼 Rasm yuborib, caption yozishingiz ham mumkin.`
    );
  }

  // =========================
  // BROADCAST MATN
  // =========================

  if (state[id] == "broadcast" && text) {
    delete state[id];

    let sent = 0;
    let failed = 0;

    await bot.sendMessage(
      id,
      "⏳ Xabar yuborish boshlandi..."
    );

    for (const user of db.users) {
      try {
        await bot.sendMessage(
          user.id,
          text
        );

        sent++;

        // Telegramga juda tez so'rov yubormaslik
        await new Promise((resolve) =>
          setTimeout(resolve, 50)
        );

      } catch (err) {
        failed++;
      }
    }

    return bot.sendMessage(
      id,
      `✅ XABAR YUBORILDI

📨 Yuborildi: ${sent} ta
❌ Yetkazilmadi: ${failed} ta
👥 Jami: ${db.users.length} ta`,
      adminMenu()
    );
  }

  // =========================
  // KANALLAR
  // =========================

  if (text && text.startsWith("📢 Kanallar")) {
    let t =
      `📢 KANALLAR\n\nJami: ${db.channels.length} ta\n\n`;

    db.channels.forEach((c, i) => {
      t += `${i + 1}. ${c.name}\n${c.link}\n\n`;
    });

    return bot.sendMessage(
      id,
      t,
      channelMenu()
    );
  }

  // =========================
  // KANAL QO'SHISH
  // =========================

  if (text == "➕ Kanal qo'shish") {
    state[id] = "channelName";

    return bot.sendMessage(
      id,
      "📢 Kanal nomini yuboring:"
    );
  }

  // =========================
  // KANAL O'ZGARTIRISH
  // =========================

  if (text == "✏️ Kanal o'zgartirish") {
    if (!db.channels.length) {
      return bot.sendMessage(
        id,
        "❌ Kanal yo'q."
      );
    }

    state[id] = "editNumber";

    let t = "Qaysi kanal?\n\n";

    db.channels.forEach((c, i) => {
      t += `${i + 1}. ${c.name}\n`;
    });

    return bot.sendMessage(id, t);
  }

  // =========================
  // KANAL O'CHIRISH
  // =========================

  if (text == "🗑 Kanal o'chirish") {
    if (!db.channels.length) {
      return bot.sendMessage(
        id,
        "❌ Kanal yo'q."
      );
    }

    state[id] = "deleteNumber";

    let t = "Qaysi kanalni o'chiramiz?\n\n";

    db.channels.forEach((c, i) => {
      t += `${i + 1}. ${c.name}\n`;
    });

    return bot.sendMessage(id, t);
  }

  // =========================
  // VIP
  // =========================

  if (text == "👑 VIP kanal") {
    return bot.sendMessage(
      id,
      `👑 VIP KANAL

Nomi:
${db.vipName}

Link:
${db.vipLink || "Kiritilmagan"}

O'zgartirish uchun:
VIP nomi
VIP link`,
      {
        reply_markup: {
          keyboard: [
            ["✏️ VIP nomi", "🔗 VIP link"],
            ["🔙 Admin panel"]
          ],
          resize_keyboard: true
        }
      }
    );
  }

  // =========================
  // VIP NAME
  // =========================

  if (text == "✏️ VIP nomi") {
    state[id] = "vipName";

    return bot.sendMessage(
      id,
      "👑 Yangi VIP kanal nomini yuboring:"
    );
  }

  // =========================
  // VIP LINK
  // =========================

  if (text == "🔗 VIP link") {
    state[id] = "vipLink";

    return bot.sendMessage(
      id,
      "🔗 VIP kanal linkini yuboring:"
    );
  }

  // =========================
  // KARTA
  // =========================

  if (text == "💳 Karta") {
    return bot.sendMessage(
      id,
      `💳 KARTA

${db.card || "Karta qo'yilmagan"}`,
      {
        reply_markup: {
          keyboard: [
            ["➕ Karta qo'shish"],
            ["🗑 Karta o'chirish"],
            ["🔙 Admin panel"]
          ],
          resize_keyboard: true
        }
      }
    );
  }

  // =========================
  // KARTA QO'SHISH
  // =========================

  if (text == "➕ Karta qo'shish") {
    state[id] = "card";

    return bot.sendMessage(
      id,
      "💳 Karta raqamini yuboring:"
    );
  }

  // =========================
  // KARTA O'CHIRISH
  // =========================

  if (text == "🗑 Karta o'chirish") {
    db.card = "";
    save();

    return bot.sendMessage(
      id,
      "✅ Karta o'chirildi.",
      adminMenu()
    );
  }

  // =========================
  // STATISTIKA
  // =========================

  if (text == "📊 Statistika") {
    return bot.sendMessage(
      id,
      `📊 STATISTIKA

👥 Foydalanuvchilar: ${db.users.length}
📢 Kanallar: ${db.channels.length}
💳 Karta: ${db.card ? "Bor" : "Yo'q"}
👑 VIP: ${db.vipName}`,
      adminMenu()
    );
  }

  // =========================
  // ORQAGA
  // =========================

  if (text == "🔙 Admin panel") {
    delete state[id];

    return bot.sendMessage(
      id,
      "👨‍💼 ADMIN PANEL",
      adminMenu()
    );
  }

  // =========================
  // CHANNEL NAME
  // =========================

  if (state[id] == "channelName") {
    state[id] = {
      type: "channelLink",
      name: text
    };

    return bot.sendMessage(
      id,
      `📢 Nomi: ${text}

Endi kanal linkini yuboring:

Public:
https://t.me/kanal

Private:
https://t.me/+xxxxx`
    );
  }

  // =========================
  // CHANNEL LINK
  // =========================

  if (
    state[id] &&
    state[id].type == "channelLink"
  ) {
    const link = text.trim();

    if (!link.includes("t.me/")) {
      return bot.sendMessage(
        id,
        "❌ Telegram link yuboring."
      );
    }

    db.channels.push({
      name: state[id].name,
      link: link
    });

    save();

    delete state[id];

    return bot.sendMessage(
      id,
      `✅ Kanal qo'shildi!

📢 ${db.channels[db.channels.length - 1].name}

📊 Jami: ${db.channels.length} ta`,
      channelMenu()
    );
  }

  // =========================
  // EDIT NUMBER
  // =========================

  if (state[id] == "editNumber") {
    const n = Number(text) - 1;

    if (!db.channels[n]) {
      return bot.sendMessage(
        id,
        "❌ Raqam noto'g'ri."
      );
    }

    state[id] = {
      type: "editName",
      number: n
    };

    return bot.sendMessage(
      id,
      "📢 Yangi kanal nomini yuboring:"
    );
  }

  // =========================
  // EDIT NAME
  // =========================

  if (
    state[id] &&
    state[id].type == "editName"
  ) {
    state[id].name = text;
    state[id].type = "editLink";

    return bot.sendMessage(
      id,
      "🔗 Yangi kanal linkini yuboring:"
    );
  }

  // =========================
  // EDIT LINK
  // =========================

  if (
    state[id] &&
    state[id].type == "editLink"
  ) {
    const n = state[id].number;

    db.channels[n].name = state[id].name;
    db.channels[n].link = text.trim();

    save();

    delete state[id];

    return bot.sendMessage(
      id,
      "✅ Kanal o'zgartirildi.",
      channelMenu()
    );
  }

  // =========================
  // DELETE
  // =========================

  if (state[id] == "deleteNumber") {
    const n = Number(text) - 1;

    if (!db.channels[n]) {
      return bot.sendMessage(
        id,
        "❌ Raqam noto'g'ri."
      );
    }

    const deleted =
      db.channels.splice(n, 1)[0];

    save();

    delete state[id];

    return bot.sendMessage(
      id,
      `🗑 ${deleted.name} o'chirildi.`,
      channelMenu()
    );
  }

  // =========================
  // VIP NAME
  // =========================

  if (state[id] == "vipName") {
    db.vipName = text;

    save();

    delete state[id];

    return bot.sendMessage(
      id,
      "✅ VIP nomi o'zgartirildi.",
      adminMenu()
    );
  }

  // =========================
  // VIP LINK
  // =========================

  if (state[id] == "vipLink") {
    if (!text.includes("t.me/")) {
      return bot.sendMessage(
        id,
        "❌ Telegram link yuboring."
      );
    }

    db.vipLink = text.trim();

    save();

    delete state[id];

    return bot.sendMessage(
      id,
      "✅ VIP link saqlandi.",
      adminMenu()
    );
  }

  // =========================
  // CARD
  // =========================

  if (state[id] == "card") {
    db.card = text.trim();

    save();

    delete state[id];

    return bot.sendMessage(
      id,
      "✅ Karta saqlandi.",
      adminMenu()
    );
  }
});

// =========================
// PHOTO BROADCAST
// =========================

bot.on("photo", async (msg) => {
  const id = msg.from.id;

  if (id != ADMIN) return;

  if (state[id] != "broadcast") return;

  const photo =
    msg.photo[msg.photo.length - 1].file_id;

  const caption =
    msg.caption || "";

  delete state[id];

  let sent = 0;
  let failed = 0;

  await bot.sendMessage(
    id,
    "⏳ Rasm yuborish boshlandi..."
  );

  for (const user of db.users) {
    try {
      await bot.sendPhoto(
        user.id,
        photo,
        {
          caption: caption
        }
      );

      sent++;

      await new Promise((resolve) =>
        setTimeout(resolve, 50)
      );

    } catch (err) {
      failed++;
    }
  }

  return bot.sendMessage(
    id,
    `✅ RASM YUBORILDI

📨 Yuborildi: ${sent} ta
❌ Yetkazilmadi: ${failed} ta
👥 Jami: ${db.users.length} ta`,
    adminMenu()
  );
});

// =========================
// CALLBACK
// =========================

bot.on("callback_query", async (q) => {
  const id = q.from.id;
  const chat = q.message.chat.id;

  await bot.answerCallbackQuery(q.id);

  // =========================
  // VIP
  // =========================

  if (q.data == "vip") {
    return bot.sendMessage(
      chat,
      `👑 ${db.vipName}

Tarifni tanlang:`,
      vipMenu()
    );
  }

  // =========================
  // TARIF
  // =========================

  if (
    q.data == "week" ||
    q.data == "month" ||
    q.data == "year"
  ) {
    let price = 0;
    let name = "";

    if (q.data == "week") {
      price = 15000;
      name = "1 haftalik";
    }

    if (q.data == "month") {
      price = 50000;
      name = "1 oylik";
    }

    if (q.data == "year") {
      price = 180000;
      name = "1 yillik";
    }

    state[id] = {
      payment: true,
      name: name,
      price: price
    };

    return bot.sendMessage(
      chat,
      `💳 TO'LOV

📌 Tarif: ${name}
💰 Narxi: ${price.toLocaleString()} so'm

💳 Karta:
${db.card || "Karta hali qo'yilmagan"}

To'lov qilgandan keyin pastdagi tugmani bosing.`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "💰 To'ladim",
                callback_data: "paid"
              }
            ]
          ]
        }
      }
    );
  }

  // =========================
  // TO'LADIM
  // =========================

  if (q.data == "paid") {
    if (!state[id] || !state[id].payment) {
      return bot.sendMessage(
        chat,
        "❌ Avval tarifni tanlang."
      );
    }

    state[id].payment = false;
    state[id].receipt = true;

    return bot.sendMessage(
      chat,
      "📸 Chekni RASM qilib yuboring."
    );
  }

  // =========================
  // ADMIN TASDIQLASH
  // =========================

  if (id != ADMIN) return;

  if (q.data.startsWith("ok_")) {
    const userId =
      q.data.replace("ok_", "");

    if (!db.vipLink) {
      return bot.sendMessage(
        chat,
        "❌ VIP link hali qo'yilmagan."
      );
    }

    await bot.sendMessage(
      userId,
      `✅ TO'LOV TASDIQLANDI!

👑 VIP kanal:

${db.vipLink}

Marhamat, kanalga qo'shiling ❤️`
    );

    return bot.sendMessage(
      chat,
      "✅ To'lov tasdiqlandi."
    );
  }

  if (q.data.startsWith("no_")) {
    const userId =
      q.data.replace("no_", "");

    await bot.sendMessage(
      userId,
      "❌ To'lov rad etildi.\n\nIltimos, chekni qayta yuboring."
    );

    return bot.sendMessage(
      chat,
      "❌ To'lov rad etildi."
    );
  }
});

// =========================
// CHEK
// =========================

bot.on("photo", async (msg) => {
  const id = msg.from.id;

  if (id == ADMIN) return;

  if (!state[id] || !state[id].receipt) {
    return;
  }

  const photo =
    msg.photo[msg.photo.length - 1].file_id;

  const username =
    msg.from.username
      ? "@" + msg.from.username
      : "Username yo'q";

  const profile =
    msg.from.username
      ? `https://t.me/${msg.from.username}`
      : `tg://user?id=${id}`;

  await bot.sendPhoto(
    ADMIN,
    photo,
    {
      caption:
`💰 YANGI TO'LOV

👤 ${msg.from.first_name || ""}
📱 ${username}
🆔 ${id}

🔗 Profil:
${profile}

📌 Tarif:
${state[id].name}

💵 Summa:
${state[id].price.toLocaleString()} so'm`
    }
  );

  // Tasdiqlash tugmalarini alohida yuboramiz
  await bot.sendMessage(
    ADMIN,
    `👤 ${msg.from.first_name || ""}
📱 ${username}

To'lovni tasdiqlaysizmi?`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Tasdiqlash",
              callback_data: `ok_${id}`
            }
          ],
          [
            {
              text: "❌ Rad etish",
              callback_data: `no_${id}`
            }
          ]
        ]
      }
    }
  );

  delete state[id];

  await bot.sendMessage(
    id,
    "✅ Chek adminga yuborildi.\n\n⏳ To'lov tekshirilmoqda."
  );
});

// =========================
// RENDER WEB SERVER
// =========================

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("KinoUZ Bot ishlayapti ✅");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server ${PORT} portda ishlayapti`);
  console.log("✅ BOT ISHLADI!");
});

// =========================
// ERROR
// =========================

bot.on("polling_error", (error) => {
  console.log("⚠️ Telegram polling:", error.message);
});

process.on("uncaughtException", (error) => {
  console.error("❌ uncaughtException:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ unhandledRejection:", error);
});
