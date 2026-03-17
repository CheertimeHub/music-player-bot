const { EmbedBuilder } = require('discord.js');
const { getQueue, createQueue, deleteQueue } = require('./queue');
const { connectToChannel } = require('./connection');
const { createPlayer, playSong, setupPlayerEvents } = require('./player');
const { searchYouTube } = require('../utils/search');

const MAX_QUEUE_SIZE = 50;

function formatDuration(seconds) {
  if (!seconds) return 'ไม่ทราบ';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function buildNowPlayingEmbed(song, position = null) {
  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('▶️ กำลังเล่น')
    .setDescription(`**[${song.title}](${song.url})**`)
    .setThumbnail(song.thumbnail || null)
    .addFields({ name: '⏱️ ความยาว', value: formatDuration(song.duration), inline: true });

  if (position) {
    embed.addFields({ name: '📋 ตำแหน่งใน Queue', value: `#${position}`, inline: true });
  }

  return embed;
}

function buildAddedEmbed(song, position) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('✅ เพิ่มเข้า Queue แล้ว')
    .setDescription(`**[${song.title}](${song.url})**`)
    .setThumbnail(song.thumbnail || null)
    .addFields(
      { name: '⏱️ ความยาว', value: formatDuration(song.duration), inline: true },
      { name: '📋 ตำแหน่ง', value: `#${position}`, inline: true }
    );
}

async function handlePlay(interaction) {
  const query = interaction.options.getString('query');
  const voiceChannel = interaction.member?.voice?.channel;

  if (!voiceChannel) {
    return interaction.reply({ content: 'คุณต้องอยู่ใน voice channel ก่อนนะ!', ephemeral: true });
  }

  await interaction.deferReply();

  const result = await searchYouTube(query);
  if (!result) {
    return interaction.editReply('ไม่พบเพลงที่ค้นหา กรุณาลองใหม่อีกครั้ง');
  }

  const { songs, isPlaylist, playlistTitle } = result;

  const guildId = interaction.guild.id;
  let queue = getQueue(guildId);

  if (!queue) {
    let connection;
    try {
      connection = await connectToChannel(voiceChannel);
    } catch (err) {
      return interaction.editReply(err.message);
    }

    const player = createPlayer();
    queue = createQueue(guildId, connection, player);
    setupPlayerEvents(queue, interaction.channel);
  }

  if (queue.songs.length >= MAX_QUEUE_SIZE) {
    return interaction.editReply(`Queue เต็มแล้ว! (สูงสุด ${MAX_QUEUE_SIZE} เพลง)`);
  }

  // กรณี playlist → เพิ่มทีละเพลง (ไม่เกิน limit)
  if (isPlaylist) {
    const available = MAX_QUEUE_SIZE - queue.songs.length;
    const toAdd = songs.slice(0, available);
    const wasEmpty = queue.songs.length === 0;
    queue.songs.push(...toAdd);

    if (wasEmpty) await playSong(queue, queue.songs[0]);

    return interaction.editReply(
      `✅ เพิ่ม playlist **${playlistTitle}** (${toAdd.length} เพลง) เข้า queue แล้ว`
    );
  }

  // กรณีเพลงเดียว
  const song = songs[0];
  const wasEmpty = queue.songs.length === 0;
  queue.songs.push(song);

  if (wasEmpty) {
    await playSong(queue, song);
    return interaction.editReply({ embeds: [buildNowPlayingEmbed(song)] });
  } else {
    return interaction.editReply({ embeds: [buildAddedEmbed(song, queue.songs.length)] });
  }
}

function handleSkip(interaction) {
  const guildId = interaction.guild.id;
  const queue = getQueue(guildId);

  if (!queue || queue.songs.length === 0) {
    return interaction.reply({ content: 'ไม่มีเพลงให้ skip!', ephemeral: true });
  }

  const { skipSong } = require('./player');
  skipSong(queue);

  if (queue.songs.length > 0) {
    const next = queue.songs[0];
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('⏭️ ข้ามเพลงแล้ว')
      .setDescription(`**[${next.title}](${next.url})**`)
      .setThumbnail(next.thumbnail || null)
      .addFields({ name: '⏱️ ความยาว', value: formatDuration(next.duration), inline: true });
    return interaction.reply({ embeds: [embed] });
  } else {
    return interaction.reply('⏭️ ข้ามเพลงแล้ว ไม่มีเพลงใน queue แล้ว');
  }
}

function handleStop(interaction) {
  const guildId = interaction.guild.id;
  const queue = getQueue(guildId);

  if (!queue) {
    return interaction.reply({ content: 'ไม่มีเพลงกำลังเล่น!', ephemeral: true });
  }

  queue.songs = [];
  queue.player.stop();
  queue.connection.destroy();
  deleteQueue(guildId);

  return interaction.reply('⏹️ หยุดเล่นเพลงและออกจาก voice channel แล้ว');
}

function handlePause(interaction) {
  const guildId = interaction.guild.id;
  const queue = getQueue(guildId);

  if (!queue) {
    return interaction.reply({ content: 'ไม่มีเพลงกำลังเล่น!', ephemeral: true });
  }

  const paused = queue.player.pause();
  return interaction.reply(paused ? '⏸️ หยุดพักเพลงชั่วคราว' : 'ไม่สามารถ pause ได้');
}

function handleResume(interaction) {
  const guildId = interaction.guild.id;
  const queue = getQueue(guildId);

  if (!queue) {
    return interaction.reply({ content: 'ไม่มีเพลงกำลังเล่น!', ephemeral: true });
  }

  const resumed = queue.player.unpause();
  return interaction.reply(resumed ? '▶️ เล่นเพลงต่อแล้ว' : 'ไม่สามารถ resume ได้');
}

function handleQueue(interaction) {
  const guildId = interaction.guild.id;
  const queue = getQueue(guildId);

  if (!queue || queue.songs.length === 0) {
    return interaction.reply({ content: 'Queue ว่างเปล่า', ephemeral: true });
  }

  const songList = queue.songs
    .slice(0, 10)
    .map((s, i) => `${i === 0 ? '▶️' : `\`${i}.\``} [${s.title}](${s.url}) \`${formatDuration(s.duration)}\``)
    .join('\n');

  const remaining = queue.songs.length > 10 ? `\n...และอีก ${queue.songs.length - 10} เพลง` : '';

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📋 Queue (${queue.songs.length} เพลง)`)
    .setDescription(songList + remaining);

  return interaction.reply({ embeds: [embed] });
}

function handleNowPlaying(interaction) {
  const guildId = interaction.guild.id;
  const queue = getQueue(guildId);

  if (!queue || queue.songs.length === 0) {
    return interaction.reply({ content: 'ไม่มีเพลงกำลังเล่นอยู่!', ephemeral: true });
  }

  const song = queue.songs[0];
  return interaction.reply({ embeds: [buildNowPlayingEmbed(song)] });
}

function handleLeave(interaction) {
  const guildId = interaction.guild.id;
  const queue = getQueue(guildId);

  if (!queue) {
    return interaction.reply({ content: 'บอทไม่ได้อยู่ใน voice channel!', ephemeral: true });
  }

  queue.songs = [];
  queue.player.stop();
  queue.connection.destroy();
  deleteQueue(guildId);

  return interaction.reply('👋 ออกจาก voice channel แล้ว');
}

module.exports = {
  handlePlay,
  handleSkip,
  handleStop,
  handlePause,
  handleResume,
  handleQueue,
  handleNowPlaying,
  handleLeave,
};
