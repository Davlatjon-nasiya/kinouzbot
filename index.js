require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const http = require("http");

// =====================================================
// SOZLAMALAR
// =====================================================

const TOKEN = process.env.BOT_TOKEN;
const ADMIN = Number(process.env.ADMIN_ID || 8582398177);

if (!TOKEN) {
  console.error("❌ BOT_TOKEN topilmadi. Render Environment Variables ga BOT_TOKEN qo'ying.");
  process.exit(1);
}

if (!Number.isInteger(ADMIN) || ADMIN <= 0) {
  console.error("❌ ADMIN_ID noto'g'ri.");
  process.exit(1);
}

// Render Persistent Disk ulangan bo'lsa /data ishlatiladi.
const DATA_DIR = fs.existsSync("/data") ? "/data" : ".";
const DATA_FILE = `${DATA_DIR}/data.json`;

// =====================================================
// DATABASE
// =====================================================

const defaultDb = {
  channels: [],
  card: "",
  vipName: "👑 VIP KANAL",
  vipLink: "",
  users: [],
  state: {}
};

let db = { ...defaultDb };

function loadDb() {
  if (!fs.existsSync(DATA_FILE)) {
    save();
    return;
  }

  try {
    const oldData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

    db = {
      ...defaultDb,
      ...oldData,
      channels: Array.isArray(oldData.channels) ? oldData.channels : [],
      users: Array.isArray(oldData.users) ? oldData.users : [],
      state: oldData.state && typeof oldData.state === "object" ? oldData.state : {}
    };

    console.log("✅ Database yuklandi");
    console.log("📢 Kanallar:", db.channels.length);
    console.log("👥 Users:", db.users.length);
  } catch (err) {
    console.error("❌ Database xatosi:", err.message);
    db = { ...defaultDb };
  }
}

function save() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("❌ Database saqlanmadi:", err.message);
  }
}

function setState(userId, value) {
  db.state[String(userId)] = value;
  save();
}

function getState(userId) {
  return db.state[String(userId)];
}

function clearState(userId) {
  delete db.state[String(userId)];
  save();
}

loadDb();

// =====================================================
// BOT
// =====================================================

const bot = new TelegramBot(TOKEN, { polling: true });

console.log("🚀 Bot ishga tushmoqda...");

// =====================================================
// MENULAR
// =====================================================

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
  const buttons = [];

  db.channels.forEach((c) => {
    if (c.link) {
      buttons.push([{ text: "📢 " + c.name, url: c.link }]);
    }
  });

  buttons.push([{ text: "🔄 Tekshirish", callback_data: "check_join" }]);
  buttons.push([{ text: db.vipName, callback_data: "vip" }]);

  return { reply_markup: { inline_keyboard: buttons } };
}

function vipMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🗓 1 haftalik — 15 000 so'm", callback_data: "week" }],
        [{ text: "📅 1 oylik — 50 000 so'm", callback_data: "month" }],
        [{ text: "🗓 1 yillik — 180 000 so'm", callback_data: "year" }]
      ]
    }
  };
}

function isJoinedStatus(status) {
  return ["member", "administrator", "creator"].includes(status);
}

async function getNotJoined(userId) {
  const notJoined = [];

  for (const channel of db.channels) {
    if (!channel.chatId) {
      notJoined.push(channel);
      continue;
    }

    try {
      const member = await bot.getChatMember(channel.chatId, userId);
      if (!isJoinedStatus(member.status)) {
        notJoined.push(channel);
      }
    } catch (err) {
      console.error(`⚠️ ${channel.name} tekshirilmayapti:`, err.message);
      notJoined.push(channel);
    }
  }

  return notJoined;
}

async function requireJoined(userId) {
  return (await getNotJoined(userId)).length === 0;
}

async function sendJoinMessage(chatId) {
  const notJoined = await getNotJoined(chatId);

  if (notJoined.length === 0) {
    await bot.sendMessage(
      chatId,
      "✅ Barcha majburiy kanallarga a'zo bo'lgansiz.\n\nEndi VIP kanalni tanlashingiz mumkin 👇",
      {
        reply_markup: {
          inline_keyboard: [[{ text: db.vipName, callback_data: "vip" }]]
        }
      }
    );
    return true;
  }

  const buttons = notJoined
    .filter((c) => c.link)
    .map((c) => [{ text: "📢 " + c.name, url: c.link }]);

  buttons.push([{ text: "🔄 Qayta tekshirish", callback_data: "check_join" }]);

  await bot.sendMessage(
    chatId,
    `❌ Hali barcha kanallarga a'zo bo'lmagansiz.\n\n${notJoined
      .map((c) => "❌ " + c.name)
      .join("\n")}\n\nKanalga kirib bo'lgach 🔄 Qayta tekshirish tugmasini bosing.`,
    { reply_markup: { inline_keyboard: buttons } }
  );

  return false;
}

// =====================================================
// START
// =====================================================

bot.onText(/^\/start(?:\s+.*)?$/, async (msg) => {
  const id = msg.from.id;

  if (!db.users.some((u) => u.id === id)) {
    db.users.push({
      id,
      username: msg.from.username || "",
      name: msg.from.first_name || ""
    });
    save();
  }

  await bot.sendMessage(
    id,
    "👋 Assalomu alaykum!\n\nBotdan foydalanish uchun quyidagi kanallarga a'zo bo'ling 👇\n\nA'zo bo'lganingizdan keyin 🔄 Tekshirish tugmasini bosing.",
    userMenu()
  );
});

// =====================================================
// ADMIN COMMAND
// =====================================================

bot.onText(/^\/admin$/, async (msg) => {
  if (msg.from.id !== ADMIN) {
    return bot.sendMessage(msg.chat.id, "❌ Siz admin emassiz.");
  }

  clearState(msg.from.id);
  return bot.sendMessage(msg.chat.id, "👨‍💼 ADMIN PANEL", adminMenu());
});

// =====================================================
// TEXT HANDLER
// =====================================================

bot.on("message", async (msg) => {
  const id = msg.from.id;
  const text = msg.text;

  if (id !== ADMIN || !text) return;

  const state = getState(id);

  // ---------------------------------------------
  // BROADCAST BOSHLASH
  // ---------------------------------------------
  if (text === "📢 Xabar yuborish") {
    setState(id, { type: "broadcast" });

    return bot.sendMessage(
      id,
      `📢 XABAR YUBORISH\n\n👥 Jami foydalanuvchilar: ${db.users.length} ta\n\nEndi matn yoki rasm yuboring.\n\nBekor qilish: 🔙 Admin panel`
    );
  }

  if (text === "📢 Kanallar" || text.startsWith("📢 Kanallar (")) {
    let result = `📢 KANALLAR\n\nJami: ${db.channels.length} ta\n\n`;

    db.channels.forEach((c, i) => {
      result += `${i + 1}. ${c.name}\n🔗 ${c.link || "Link yo'q"}\n🆔 ${c.chatId || "ID yo'q"}\n\n`;
    });

    return bot.sendMessage(id, result, channelMenu());
  }

  if (text === "➕ Kanal qo'shish") {
    setState(id, { type: "channelName" });
    return bot.sendMessage(id, "📢 Kanal nomini yuboring:");
  }

  if (state?.type === "channelName") {
    if (!text.trim()) return bot.sendMessage(id, "❌ Kanal nomi bo'sh bo'lmasin.");
    setState(id, { type: "channelLink", name: text.trim() });
    return bot.sendMessage(id, "🔗 Kanal linkini yuboring.\nMasalan: https://t.me/kanal");
  }

  if (state?.type === "channelLink") {
    const link = text.trim();
    if (!/^https?:\/\/t\.me\//i.test(link)) {
      return bot.sendMessage(id, "❌ To'g'ri Telegram link yuboring.\nMasalan: https://t.me/kanal");
    }

    setState(id, {
      type: "channelId",
      name: state.name,
      link
    });

    return bot.sendMessage(
      id,
      "🆔 Endi kanal @username yoki -100... ko'rinishidagi ID sini yuboring.\n\n⚠️ Bot kanalga admin qilib qo'yilgan bo'lishi kerak."
    );
  }

  if (state?.type === "channelId") {
    const channelId = text.trim();
    if (!channelId) return bot.sendMessage(id, "❌ Kanal ID bo'sh bo'lmasin.");

    db.channels.push({
      name: state.name,
      link: state.link,
      chatId: channelId
    });
    clearState(id);
    save();

    return bot.sendMessage(id, "✅ Kanal muvaffaqiyatli qo'shildi.", channelMenu());
  }

  if (text === "✏️ Kanal o'zgartirish") {
    if (!db.channels.length) return bot.sendMessage(id, "❌ Kanal yo'q.");

    setState(id, { type: "editNumber" });
    const list = db.channels.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
    return bot.sendMessage(id, `✏️ Qaysi kanalni o'zgartiramiz?\n\n${list}`);
  }

  if (state?.type === "editNumber") {
    const n = Number(text) - 1;
    if (!Number.isInteger(n) || !db.channels[n]) {
      return bot.sendMessage(id, "❌ Raqam noto'g'ri.");
    }
    setState(id, { type: "editName", number: n });
    return bot.sendMessage(id, "📢 Yangi kanal nomini yuboring:");
  }

  if (state?.type === "editName") {
    setState(id, { type: "editLink", number: state.number, name: text.trim() });
    return bot.sendMessage(id, "🔗 Yangi kanal linkini yuboring:");
  }

  if (state?.type === "editLink") {
    const link = text.trim();
    if (!/^https?:\/\/t\.me\//i.test(link)) {
      return bot.sendMessage(id, "❌ To'g'ri Telegram link yuboring.");
    }
    setState(id, { type: "editId", number: state.number, name: state.name, link });
    return bot.sendMessage(id, "🆔 Yangi kanal @username yoki -100... ID sini yuboring:");
  }

  if (state?.type === "editId") {
    const channel = db.channels[state.number];
    if (!channel) {
      clearState(id);
      return bot.sendMessage(id, "❌ Kanal topilmadi.", channelMenu());
    }

    channel.name = state.name;
    channel.link = state.link;
    channel.chatId = text.trim();
    clearState(id);
    save();

    return bot.sendMessage(id, "✅ Kanal to'liq o'zgartirildi.", channelMenu());
  }

  if (text === "🗑 Kanal o'chirish") {
    if (!db.channels.length) return bot.sendMessage(id, "❌ Kanal yo'q.");

    setState(id, { type: "deleteNumber" });
    const list = db.channels.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
    return bot.sendMessage(id, `🗑 Qaysi kanalni o'chiramiz?\n\n${list}`);
  }

  if (state?.type === "deleteNumber") {
    const n = Number(text) - 1;
    if (!Number.isInteger(n) || !db.channels[n]) {
      return bot.sendMessage(id, "❌ Raqam noto'g'ri.");
    }

    const deleted = db.channels.splice(n, 1)[0];
    clearState(id);
    save();
    return bot.sendMessage(id, `🗑 ${deleted.name} o'chirildi.`, channelMenu());
  }

  // ---------------------------------------------
  // VIP ADMIN
  // ---------------------------------------------
  if (text === "👑 VIP kanal") {
    return bot.sendMessage(
      id,
      `👑 VIP KANAL\n\nNomi:\n${db.vipName}\n\nLink:\n${db.vipLink || "Kiritilmagan"}`,
      {
        reply_markup: {
          keyboard: [["✏️ VIP nomi", "🔗 VIP link"], ["🔙 Admin panel"]],
          resize_keyboard: true
        }
      }
    );
  }

  if (text === "✏️ VIP nomi") {
    setState(id, { type: "vipName" });
    return bot.sendMessage(id, "👑 Yangi VIP kanal nomini yuboring:");
  }

  if (state?.type === "vipName") {
    db.vipName = text.trim() || "👑 VIP KANAL";
    clearState(id);
    save();
    return bot.sendMessage(id, "✅ VIP nomi saqlandi.", adminMenu());
  }

  if (text === "🔗 VIP link") {
    setState(id, { type: "vipLink" });
    return bot.sendMessage(id, "🔗 VIP kanal linkini yuboring:");
  }

  if (state?.type === "vipLink") {
    const link = text.trim();
    if (!/^https?:\/\/t\.me\//i.test(link)) {
      return bot.sendMessage(id, "❌ To'g'ri Telegram link yuboring.");
    }
    db.vipLink = link;
    clearState(id);
    save();
    return bot.sendMessage(id, "✅ VIP link saqlandi.", adminMenu());
  }

  // ---------------------------------------------
  // KARTA
  // ---------------------------------------------
  if (text === "💳 Karta") {
    return bot.sendMessage(
      id,
      `💳 KARTA\n\n${db.card || "Karta qo'yilmagan"}`,
      {
        reply_markup: {
          keyboard: [["➕ Karta qo'shish"], ["🗑 Karta o'chirish"], ["🔙 Admin panel"]],
          resize_keyboard: true
        }
      }
    );
  }

  if (text === "➕ Karta qo'shish") {
    setState(id, { type: "card" });
    return bot.sendMessage(id, "💳 Karta raqamini yuboring:");
  }

  if (state?.type === "card") {
    db.card = text.trim();
    clearState(id);
    save();
    return bot.sendMessage(id, "✅ Karta saqlandi.", adminMenu());
  }

  if (text === "🗑 Karta o'chirish") {
    db.card = "";
    save();
    return bot.sendMessage(id, "✅ Karta o'chirildi.", adminMenu());
  }

  // ---------------------------------------------
  // STATISTIKA
  // ---------------------------------------------
  if (text === "📊 Statistika") {
    return bot.sendMessage(
      id,
      `📊 STATISTIKA\n\n👥 Foydalanuvchilar: ${db.users.length}\n📢 Kanallar: ${db.channels.length}\n💳 Karta: ${db.card ? "Bor" : "Yo'q"}\n👑 VIP: ${db.vipName}`,
      adminMenu()
    );
  }

  // ---------------------------------------------
  // BROADCAST MATN
  // ---------------------------------------------
  if (state?.type === "broadcast") {
    if (text === "🔙 Admin panel") {
      clearState(id);
      return bot.sendMessage(id, "👨‍💼 ADMIN PANEL", adminMenu());
    }

    clearState(id);
    await bot.sendMessage(id, "⏳ Xabar yuborilmoqda...");

    let sent = 0;
    let failed = 0;

    for (const user of db.users) {
      try {
        await bot.sendMessage(user.id, text);
        sent++;
        await new Promise((resolve) => setTimeout(resolve, 80));
      } catch (err) {
        failed++;
      }
    }

    return bot.sendMessage(
      id,
      `✅ XABAR YUBORILDI\n\n📨 Yetkazildi: ${sent}\n❌ Yetkazilmadi: ${failed}\n👥 Jami: ${db.users.length}`,
      adminMenu()
    );
  }

  if (text === "🔙 Admin panel") {
    clearState(id);
    return bot.sendMessage(id, "👨‍💼 ADMIN PANEL", adminMenu());
  }
});

// =====================================================
// PHOTO HANDLER
// =====================================================

bot.on("photo", async (msg) => {
  const id = msg.from.id;
  const photo = msg.photo?.[msg.photo.length - 1]?.file_id;
  if (!photo) return;

  // ADMIN -> BROADCAST
  if (id === ADMIN) {
    const state = getState(id);
    if (!state || state.type !== "broadcast") return;

    clearState(id);

    const caption = msg.caption || "";
    let sent = 0;
    let failed = 0;

    await bot.sendMessage(id, "⏳ Rasm yuborilmoqda...");

    for (const user of db.users) {
      try {
        await bot.sendPhoto(user.id, photo, { caption });
        sent++;
        await new Promise((resolve) => setTimeout(resolve, 80));
      } catch (err) {
        failed++;
      }
    }

    return bot.sendMessage(
      id,
      `✅ RASM YUBORILDI\n\n📨 Yetkazildi: ${sent}\n❌ Yetkazilmadi: ${failed}\n👥 Jami: ${db.users.length}`,
      adminMenu()
    );
  }

  // USER -> RECEIPT
  const state = getState(id);
  if (!state || state.type !== "receipt") return;

  const username = msg.from.username ? "@" + msg.from.username : "Username yo'q";
  const profile = msg.from.username
    ? `https://t.me/${msg.from.username}`
    : `tg://user?id=${id}`;

  await bot.sendPhoto(ADMIN, photo, {
    caption: `💰 YANGI TO'LOV\n\n👤 ${msg.from.first_name || ""}\n📱 ${username}\n🆔 ${id}\n\n🔗 Profil:\n${profile}\n\n📌 Tarif:\n${state.name}\n\n💵 Summa:\n${state.price.toLocaleString()} so'm`
  });

  await bot.sendMessage(ADMIN, "👇 TO'LOVNI TEKSHIRING", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Tasdiqlash", callback_data: `ok_${id}` }],
        [{ text: "❌ Rad etish", callback_data: `no_${id}` }]
      ]
    }
  });

  clearState(id);
  return bot.sendMessage(id, "✅ Chek adminga yuborildi.\n\n⏳ To'lov tekshirilmoqda.");
});

// =====================================================
// CALLBACK
// =====================================================

bot.on("callback_query", async (q) => {
  const id = q.from.id;
  const chat = q.message?.chat?.id;

  try {
    await bot.answerCallbackQuery(q.id);
  } catch {}

  if (!chat) return;

  // TEKSHIRISH
  if (q.data === "check_join") {
    try {
      return sendJoinMessage(chat);
    } catch (err) {
      console.error("check_join xatosi:", err);
      return bot.sendMessage(chat, "❌ Tekshirishda xatolik yuz berdi. Qayta urinib ko'ring.");
    }
  }

  // VIP
  if (q.data === "vip") {
    const joined = await requireJoined(id);

    if (!joined) {
      return sendJoinMessage(chat);
    }

    if (!db.vipLink) {
      return bot.sendMessage(chat, "❌ VIP kanal hali sozlanmagan.");
    }

    return bot.sendMessage(chat, `👑 ${db.vipName}\n\nTarifni tanlang 👇`, vipMenu());
  }

  // TARIF
  if (["week", "month", "year"].includes(q.data)) {
    let price;
    let name;

    if (q.data === "week") {
      price = 15000;
      name = "1 haftalik";
    } else if (q.data === "month") {
      price = 50000;
      name = "1 oylik";
    } else {
      price = 180000;
      name = "1 yillik";
    }

    setState(id, {
      type: "payment",
      name,
      price
    });

    return bot.sendMessage(
      chat,
      `💳 TO'LOV\n\n📌 Tarif: ${name}\n\n💰 Narxi:\n${price.toLocaleString()} so'm\n\n💳 Karta:\n${db.card || "Karta hali qo'yilmagan"}\n\nTo'lovni amalga oshirgandan keyin 👇 "💰 To'ladim" tugmasini bosing.`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "💰 To'ladim", callback_data: "paid" }]]
        }
      }
    );
  }

  // TO'LADIM
  if (q.data === "paid") {
    const state = getState(id);

    if (!state || state.type !== "payment") {
      return bot.sendMessage(chat, "❌ Avval tarifni tanlang.");
    }

    setState(id, {
      type: "receipt",
      name: state.name,
      price: state.price
    });

    return bot.sendMessage(chat, "📸 Endi to'lov chekini RASM qilib yuboring.");
  }

  // FAQAT ADMIN TASDIQLAYDI
  if (id !== ADMIN) return;

  if (q.data.startsWith("ok_")) {
    const userId = Number(q.data.slice(3));

    if (!db.vipLink) {
      return bot.sendMessage(chat, "❌ VIP link hali qo'yilmagan.");
    }

    try {
      await bot.sendMessage(
        userId,
        `✅ TO'LOV TASDIQLANDI!\n\n👑 VIP KANAL:\n${db.vipLink}\n\nMarhamat, kanalga qo'shiling ❤️`
      );
      return bot.sendMessage(chat, "✅ To'lov tasdiqlandi.");
    } catch (err) {
      console.error("VIP yuborish xatosi:", err.message);
      return bot.sendMessage(chat, "❌ Foydalanuvchiga VIP link yuborilmadi.");
    }
  }

  if (q.data.startsWith("no_")) {
    const userId = Number(q.data.slice(3));

    try {
      await bot.sendMessage(userId, "❌ To'lov rad etildi.\n\nIltimos, chekni qayta yuboring.");
    } catch (err) {
      console.error("Rad javobi yuborilmadi:", err.message);
    }

    return bot.sendMessage(chat, "❌ To'lov rad etildi.");
  }
});

// =====================================================
// RENDER WEB SERVER
// =====================================================

const PORT = Number(process.env.PORT || 10000);

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("KinoUZ Bot ishlayapti ✅");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Render server ${PORT} portda ishlayapti`);
  console.log("✅ BOT ISHLADI!");
});

// =====================================================
// XATOLAR
// =====================================================

bot.on("polling_error", (error) => {
  console.error("⚠️ Telegram polling:", error.message);
});

process.on("uncaughtException", (error) => {
  console.error("❌ uncaughtException:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ unhandledRejection:", error);
});