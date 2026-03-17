const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ชี้ ffmpeg ไปที่ package แทนการติดตั้ง system-wide
process.env.FFMPEG_PATH = require('ffmpeg-static');

const PREFIX = 'nept';

// alias สั้นๆ → ชื่อ command จริง
const ALIASES = {
  p: 'play',
  s: 'skip',
  st: 'stop',
  q: 'queue',
  pa: 'pause',
  r: 'resume',
  l: 'leave',
  nowplaying: 'np',
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // ต้องเปิดใน Developer Portal ด้วย
  ],
});

// โหลด commands ทั้งหมดจากโฟลเดอร์ commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

// Register slash commands เมื่อ bot พร้อม
client.once('clientReady', async () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const commands = [...client.commands.values()].map((c) => c.data.toJSON());

  try {
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Register ${commands.length} commands สำเร็จ (guild mode)`);
    } else {
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log(`✅ Register ${commands.length} commands สำเร็จ (global mode)`);
    }
  } catch (err) {
    console.error('❌ Register commands ล้มเหลว:', err);
  }
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[command/${interaction.commandName}] Error:`, err);
    const errorMsg = { content: 'เกิด error ขณะรันคำสั่ง!', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(errorMsg).catch(() => {});
    } else {
      await interaction.reply(errorMsg).catch(() => {});
    }
  }
});

// Handle prefix commands: "nept play ...", "nept p ..."
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const content = message.content.trim().toLowerCase();

  if (!content.startsWith(PREFIX)) return;

  // ตัด prefix ออก แล้ว split เป็น args
  const args = message.content.trim().slice(PREFIX.length).trim().split(/\s+/);
  const rawCmd = args.shift().toLowerCase();
  const cmdName = ALIASES[rawCmd] ?? rawCmd;

  const manager = require('./music/musicManager');

  // สร้าง fake interaction object เพื่อใช้ handler เดิมได้เลย
  const fakeInteraction = {
    guild: message.guild,
    member: message.member,
    channel: message.channel,
    deferred: false,
    replied: false,
    options: {
      getString: (key) => (key === 'query' ? args.join(' ') : null),
    },
    deferReply: async () => {
      fakeInteraction.deferred = true;
    },
    reply: async (data) => {
      fakeInteraction.replied = true;
      const content = typeof data === 'string' ? data : data.content;
      await message.reply(content).catch(() => {});
    },
    editReply: async (data) => {
      const content = typeof data === 'string' ? data : data.content;
      await message.reply(content).catch(() => {});
    },
    followUp: async (data) => {
      const content = typeof data === 'string' ? data : data.content;
      await message.reply(content).catch(() => {});
    },
  };

  const handlerMap = {
    play: manager.handlePlay,
    skip: manager.handleSkip,
    stop: manager.handleStop,
    pause: manager.handlePause,
    resume: manager.handleResume,
    queue: manager.handleQueue,
    np: manager.handleNowPlaying,
    leave: manager.handleLeave,
  };

  const handler = handlerMap[cmdName];
  if (!handler) return;

  try {
    await handler(fakeInteraction);
  } catch (err) {
    console.error(`[prefix/${cmdName}] Error:`, err);
    message.reply('เกิด error ขณะรันคำสั่ง!').catch(() => {});
  }
});

client.login(process.env.DISCORD_TOKEN);
