require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ============================
//   INITIALIZE CLIENTS
// ============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ============================
//   CONVERSATION MEMORY
// ============================
const conversations = new Map(); // userId -> { model, history[] }

function getConversation(userId) {
  if (!conversations.has(userId)) {
    conversations.set(userId, { model: 'claude', history: [] });
  }
  return conversations.get(userId);
}

// ============================
//   AI RESPONSE FUNCTIONS
// ============================

async function askClaude(userId, userMessage) {
  const conv = getConversation(userId);
  conv.history.push({ role: 'user', content: userMessage });

  // Keep last 20 messages only
  if (conv.history.length > 20) conv.history = conv.history.slice(-20);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: 'أنت مساعد ذكي ومفيد على Discord. تتحدث العربية والإنجليزية بطلاقة. كن موجزاً ومفيداً.',
    messages: conv.history,
  });

  const reply = response.content[0].text;
  conv.history.push({ role: 'assistant', content: reply });
  return reply;
}

async function askGemini(userId, userMessage) {
  const conv = getConversation(userId);

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Build history for Gemini format
  const geminiHistory = conv.history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history: geminiHistory,
    generationConfig: { maxOutputTokens: 1024 },
    systemInstruction: 'أنت مساعد ذكي ومفيد على Discord. تتحدث العربية والإنجليزية بطلاقة. كن موجزاً ومفيداً.',
  });

  conv.history.push({ role: 'user', content: userMessage });
  if (conv.history.length > 20) conv.history = conv.history.slice(-20);

  const result = await chat.sendMessage(userMessage);
  const reply = result.response.text();
  conv.history.push({ role: 'assistant', content: reply });
  return reply;
}

// ============================
//   SLASH COMMANDS SETUP
// ============================
const commands = [
  new SlashCommandBuilder()
    .setName('claude')
    .setDescription('اسأل Claude (Anthropic)')
    .addStringOption(opt =>
      opt.setName('message').setDescription('رسالتك').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('gemini')
    .setDescription('اسأل Gemini (Google)')
    .addStringOption(opt =>
      opt.setName('message').setDescription('رسالتك').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('ai')
    .setDescription('اسأل الذكاء الاصطناعي المحدد (افتراضي: Claude)')
    .addStringOption(opt =>
      opt.setName('message').setDescription('رسالتك').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('switch')
    .setDescription('بدّل بين Claude و Gemini')
    .addStringOption(opt =>
      opt.setName('model')
        .setDescription('اختر النموذج')
        .setRequired(true)
        .addChoices(
          { name: '🟣 Claude (Anthropic)', value: 'claude' },
          { name: '🔵 Gemini (Google)', value: 'gemini' }
        )
    ),
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('مسح سجل المحادثة'),
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('عرض حالة البوت والنموذج الحالي'),
  new SlashCommandBuilder()
    .setName('compare')
    .setDescription('قارن إجابتي Claude و Gemini على نفس السؤال')
    .addStringOption(opt =>
      opt.setName('message').setDescription('سؤالك').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('عرض قائمة الأوامر'),
].map(cmd => cmd.toJSON());

// ============================
//   REGISTER COMMANDS
// ============================
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('⏳ Registering slash commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ Slash commands registered!');
  } catch (err) {
    console.error('❌ Error registering commands:', err);
  }
}

// ============================
//   HANDLE INTERACTIONS
// ============================
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user } = interaction;
  await interaction.deferReply();

  try {
    // /claude
    if (commandName === 'claude') {
      const msg = interaction.options.getString('message');
      const conv = getConversation(user.id);
      conv.model = 'claude';
      const reply = await askClaude(user.id, msg);
      const embed = buildEmbed('Claude', reply, msg, '🟣', '#7C3AED');
      return await interaction.editReply({ embeds: [embed] });
    }

    // /gemini
    if (commandName === 'gemini') {
      const msg = interaction.options.getString('message');
      const conv = getConversation(user.id);
      conv.model = 'gemini';
      const reply = await askGemini(user.id, msg);
      const embed = buildEmbed('Gemini', reply, msg, '🔵', '#1A73E8');
      return await interaction.editReply({ embeds: [embed] });
    }

    // /ai
    if (commandName === 'ai') {
      const msg = interaction.options.getString('message');
      const conv = getConversation(user.id);
      let reply, modelName, color, emoji;

      if (conv.model === 'gemini') {
        reply = await askGemini(user.id, msg);
        modelName = 'Gemini'; color = '#1A73E8'; emoji = '🔵';
      } else {
        reply = await askClaude(user.id, msg);
        modelName = 'Claude'; color = '#7C3AED'; emoji = '🟣';
      }

      const embed = buildEmbed(modelName, reply, msg, emoji, color);
      return await interaction.editReply({ embeds: [embed] });
    }

    // /switch
    if (commandName === 'switch') {
      const model = interaction.options.getString('model');
      const conv = getConversation(user.id);
      conv.model = model;
      const embed = new EmbedBuilder()
        .setColor(model === 'claude' ? '#7C3AED' : '#1A73E8')
        .setTitle(model === 'claude' ? '🟣 تم التبديل إلى Claude' : '🔵 تم التبديل إلى Gemini')
        .setDescription(`الآن يستخدم حسابك **${model === 'claude' ? 'Claude (Anthropic)' : 'Gemini (Google)'}** كنموذج افتراضي.`)
        .setFooter({ text: `طُلب بواسطة ${user.username}` })
        .setTimestamp();
      return await interaction.editReply({ embeds: [embed] });
    }

    // /clear
    if (commandName === 'clear') {
      conversations.delete(user.id);
      const embed = new EmbedBuilder()
        .setColor('#10B981')
        .setTitle('🗑️ تم مسح المحادثة')
        .setDescription('تم حذف سجل محادثتك بالكامل. ابدأ من جديد!')
        .setFooter({ text: `طُلب بواسطة ${user.username}` })
        .setTimestamp();
      return await interaction.editReply({ embeds: [embed] });
    }

    // /status
    if (commandName === 'status') {
      const conv = getConversation(user.id);
      const embed = new EmbedBuilder()
        .setColor('#F59E0B')
        .setTitle('📊 حالة البوت')
        .addFields(
          { name: '🤖 النموذج الحالي', value: conv.model === 'claude' ? '🟣 Claude (Anthropic)' : '🔵 Gemini (Google)', inline: true },
          { name: '💬 عدد الرسائل', value: `${conv.history.length} رسالة`, inline: true },
          { name: '🏓 Ping', value: `${client.ws.ping}ms`, inline: true },
          { name: '⏱️ وقت التشغيل', value: formatUptime(process.uptime()), inline: true },
        )
        .setFooter({ text: `طُلب بواسطة ${user.username}` })
        .setTimestamp();
      return await interaction.editReply({ embeds: [embed] });
    }

    // /compare
    if (commandName === 'compare') {
      const msg = interaction.options.getString('message');

      // Temp conversations for compare (don't save to main history)
      const [claudeReply, geminiReply] = await Promise.all([
        (async () => {
          const r = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 512,
            messages: [{ role: 'user', content: msg }],
          });
          return r.content[0].text;
        })(),
        (async () => {
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          const result = await model.generateContent(msg);
          return result.response.text();
        })(),
      ]);

      const embed = new EmbedBuilder()
        .setColor('#EC4899')
        .setTitle('⚔️ Claude vs Gemini')
        .setDescription(`**سؤالك:** ${msg}`)
        .addFields(
          { name: '🟣 Claude (Anthropic)', value: claudeReply.slice(0, 1000) || 'لا توجد إجابة' },
          { name: '🔵 Gemini (Google)', value: geminiReply.slice(0, 1000) || 'لا توجد إجابة' },
        )
        .setFooter({ text: `طُلب بواسطة ${user.username}` })
        .setTimestamp();
      return await interaction.editReply({ embeds: [embed] });
    }

    // /help
    if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setColor('#6366F1')
        .setTitle('📖 قائمة الأوامر')
        .setDescription('بوت ذكاء اصطناعي مدعوم بـ Claude و Gemini')
        .addFields(
          { name: '/claude [رسالة]', value: 'اسأل Claude مباشرةً' },
          { name: '/gemini [رسالة]', value: 'اسأل Gemini مباشرةً' },
          { name: '/ai [رسالة]', value: 'اسأل النموذج الافتراضي' },
          { name: '/switch [نموذج]', value: 'غيّر النموذج الافتراضي' },
          { name: '/compare [سؤال]', value: 'قارن إجابتي النموذجين' },
          { name: '/clear', value: 'امسح سجل محادثتك' },
          { name: '/status', value: 'اعرض حالة البوت' },
        )
        .setFooter({ text: 'Made with ❤️ using Claude & Gemini' })
        .setTimestamp();
      return await interaction.editReply({ embeds: [embed] });
    }

  } catch (err) {
    console.error(`Error in /${commandName}:`, err);
    const errEmbed = new EmbedBuilder()
      .setColor('#EF4444')
      .setTitle('❌ خطأ')
      .setDescription(`حدث خطأ: \`${err.message}\``)
      .setTimestamp();
    return await interaction.editReply({ embeds: [errEmbed] });
  }
});

// ============================
//   MENTION SUPPORT
// ============================
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const content = message.content.replace(/<@!?[0-9]+>/g, '').trim();
  if (!content) return;

  const conv = getConversation(message.author.id);
  let reply;

  try {
    if (conv.model === 'gemini') {
      reply = await askGemini(message.author.id, content);
    } else {
      reply = await askClaude(message.author.id, content);
    }
    await message.reply(reply.slice(0, 2000));
  } catch (err) {
    await message.reply(`❌ خطأ: ${err.message}`);
  }
});

// ============================
//   HELPERS
// ============================
function buildEmbed(model, reply, question, emoji, color) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} ${model}`)
    .setDescription(reply.slice(0, 4096))
    .setFooter({ text: `سؤالك: ${question.slice(0, 100)}` })
    .setTimestamp();
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

// ============================
//   STARTUP
// ============================
client.once('ready', async () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
  client.user.setActivity('Claude & Gemini | /help', { type: 0 });
  await registerCommands();
});

client.login(process.env.DISCORD_TOKEN);
