# 🤖 Discord AI Bot — Claude & Gemini

بوت Discord مدعوم بالذكاء الاصطناعي يجمع بين **Claude (Anthropic)** و **Gemini (Google)** في مكان واحد.

---

## ✨ الميزات

| الميزة | الوصف |
|--------|-------|
| 🟣 Claude | دعم كامل لنموذج Claude Sonnet |
| 🔵 Gemini | دعم كامل لنموذج Gemini 1.5 Flash |
| 💬 ذاكرة المحادثة | يتذكر آخر 20 رسالة لكل مستخدم |
| ⚔️ المقارنة | قارن إجابتي النموذجين على نفس السؤال |
| 🔄 التبديل | بدّل بين النموذجين بسهولة |
| 📡 Slash Commands | أوامر /slash احترافية |
| 📢 المنشن | يرد عند الإشارة إليه @bot |

---

## 🚀 طريقة التثبيت

### 1️⃣ إنشاء بوت Discord

1. اذهب إلى [Discord Developer Portal](https://discord.com/developers/applications)
2. اضغط **New Application** وأعطه اسماً
3. اذهب إلى **Bot** → **Reset Token** وانسخ التوكن
4. فعّل هذه الـ Intents:
   - ✅ `MESSAGE CONTENT INTENT`
   - ✅ `SERVER MEMBERS INTENT`
   - ✅ `PRESENCE INTENT`
5. اذهب إلى **OAuth2 → URL Generator**:
   - اختر `bot` و `applications.commands`
   - الصلاحيات: `Send Messages`, `Read Messages`, `Use Slash Commands`
   - انسخ الرابط وأضف البوت لسيرفرك

### 2️⃣ الحصول على API Keys

- **Anthropic:** [console.anthropic.com](https://console.anthropic.com) → API Keys
- **Gemini:** [aistudio.google.com](https://aistudio.google.com) → Get API Key

### 3️⃣ التثبيت والتشغيل

```bash
# استنسخ المجلد أو انزّل الملفات
cd discord-bot

# ثبّت المكتبات
npm install

# أنشئ ملف .env من المثال
cp .env.example .env

# عدّل .env وأضف مفاتيحك
nano .env

# شغّل البوت
npm start
```

---

## 📋 الأوامر المتاحة

| الأمر | الوصف |
|-------|-------|
| `/claude [رسالة]` | اسأل Claude مباشرةً |
| `/gemini [رسالة]` | اسأل Gemini مباشرةً |
| `/ai [رسالة]` | اسأل النموذج الافتراضي |
| `/switch [نموذج]` | غيّر النموذج الافتراضي |
| `/compare [سؤال]` | قارن إجابتي النموذجين |
| `/clear` | امسح سجل محادثتك |
| `/status` | اعرض حالة البوت |
| `/help` | اعرض قائمة الأوامر |

---

## 📁 هيكل الملفات

```
discord-bot/
├── bot.js          ← الكود الرئيسي للبوت
├── package.json    ← المكتبات والإعدادات
├── .env            ← مفاتيح API (لا تشاركها!)
├── .env.example    ← مثال على ملف .env
└── README.md       ← هذا الملف
```

---

## ☁️ النشر على خادم (اختياري)

### Railway (مجاني)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### PM2 (للخوادم الخاصة)
```bash
npm install -g pm2
pm2 start bot.js --name "discord-ai-bot"
pm2 save
pm2 startup
```

---

## 🔒 ملاحظات أمنية

- لا تشارك ملف `.env` أبداً
- أضف `.env` إلى `.gitignore`
- جدّد مفاتيح API دورياً

---

## 📞 المشاكل الشائعة

**البوت لا يرد على الأوامر؟**
→ تأكد من تفعيل `MESSAGE CONTENT INTENT` في Developer Portal

**خطأ في API?**
→ تحقق من صحة مفاتيح API في ملف `.env`

**الأوامر لا تظهر؟**
→ انتظر دقيقتين بعد تشغيل البوت لأول مرة

---

Made with ❤️ using Claude & Gemini
