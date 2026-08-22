const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const TOKEN = process.env.BOT_TOKEN;
const ADMIN = 8582398177;

const bot = new TelegramBot(TOKEN, {
  polling: true
});

let db = {
  channels: [],
  card: "",
  vipName: "👑 VIP KANAL",
  vipLink: "",
  users: []
};

if (fs.existsSync("data.json")) {
  try {
    db = JSON.parse(fs.readFileSync("data.json"));
  } catch {}
}

function save() {
  fs.writeFileSync(
    "data.json",
    JSON.stringify(db, null, 2)
  );
}

const state = {};

function adminMenu() {
  return {
    reply_markup: {
      keyboard: [
        [`📢 Kanallar (${db.channels.length})`],
        ["👑 VIP kanal", "💳 Karta"],
        ["📊 Statistika"]
      ],
      resize_keyboard: true
    }
  };
}

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

function userMenu() {
  let buttons = [];

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

  if (!db.users.find(x => x.id == id)) {
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
// ADMIN
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

  if (!text || id != ADMIN) return;

  // KANALLAR
  if (text.startsWith("📢 Kanallar")) {

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

  // KANAL QO'SHISH
  if (text == "➕ Kanal qo'shish") {

    state[id] = "channelName";

    return bot.sendMessage(
      id,
      "📢 Kanal nomini yuboring:"
    );
  }

  // KANAL O'ZGARTIRISH
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

  // KANAL O'CHIRISH
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

  // VIP
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

  if (text == "✏️ VIP nomi") {
    state[id] = "vipName";
    return bot.sendMessage(
      id,
      "👑 Yangi VIP kanal nomini yuboring:"
    );
  }

  if (text == "🔗 VIP link") {
    state[id] = "vipLink";
    return bot.sendMessage(
      id,
      "🔗 VIP kanal linkini yuboring:"
    );
  }

  // KARTA
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

  if (text == "➕ Karta qo'shish") {
    state[id] = "card";
    return bot.sendMessage(
      id,
      "💳 Karta raqamini yuboring:"
    );
  }

  if (text == "🗑 Karta o'chirish") {
    db.card = "";
    save();

    return bot.sendMessage(
      id,
      "✅ Karta o'chirildi.",
      adminMenu()
    );
  }

  // STATISTIKA
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

  // ORQAGA
  if (text == "🔙 Admin panel") {
    delete state[id];

    return bot.sendMessage(
      id,
      "👨‍💼 ADMIN PANEL",
      adminMenu()
    );
  }

  // =========================
  // STATE
  // =========================

  if (state[id] == "channelName") {

    state[id] = {
      type: "channelLink",
      name: text
    };

    return bot.sendMessage(
      id,
      `📢 Nomi: ${text}\n\nEndi kanal linkini yuboring:\n\nPublic:\nhttps://t.me/kanal\n\nPrivate:\nhttps://t.me/+xxxxx`
    );
  }

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

  // EDIT NUMBER
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

  if (
    state[id] &&
    state[id].type == "editLink"
  ) {

    const n = state[id].number;

    db.channels[n].name =
      state[id].name;

    db.channels[n].link =
      text.trim();

    save();

    delete state[id];

    return bot.sendMessage(
      id,
      "✅ Kanal o'zgartirildi.",
      channelMenu()
    );
  }

  // DELETE
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

  // VIP NAME
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

  // VIP LINK
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

  // CARD
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
// CALLBACK
// =========================

bot.on("callback_query", async (q) => {

  const id = q.from.id;
  const chat = q.message.chat.id;

  await bot.answerCallbackQuery(q.id);

  // VIP
  if (q.data == "vip") {

    return bot.sendMessage(
      chat,
      `👑 ${db.vipName}

Tarifni tanlang:`,
      vipMenu()
    );
  }

  // TARIF
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

  // TO'LADIM
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
});

// =========================
// CHEK
// =========================

bot.on("photo", async (msg) => {

  const id = msg.from.id;

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
    `💰 YANGI TO'LOV

👤 ${msg.from.first_name || ""}
📱 ${username}
🆔 ${id}

🔗 Profil:
${profile}

📌 Tarif:
${state[id].name}

💵 Summa:
${state[id].price.toLocaleString()} so'm`,
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

  bot.sendMessage(
    id,
    "✅ Chek adminga yuborildi.\n\n⏳ To'lov tekshirilmoqda."
  );
});

// =========================
// ADMIN TASDIQLASH
// =========================

bot.on("callback_query", async (q) => {

  if (q.from.id != ADMIN) return;

  const id = q.message.chat.id;

  if (q.data.startsWith("ok_")) {

    const userId =
      q.data.replace("ok_", "");

    if (!db.vipLink) {
      return bot.sendMessage(
        id,
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
      id,
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
      id,
      "❌ To'lov rad etildi."
    );
  }
});

console.log("✅ BOT ISHLADI!");
