const { SlashCommandBuilder } = require('discord.js');
const { handlePlay } = require('../music/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('เล่นเพลงจาก YouTube')
    .addStringOption((option) =>
      option.setName('query').setDescription('ชื่อเพลงหรือ YouTube URL').setRequired(true)
    ),
  async execute(interaction) {
    await handlePlay(interaction);
  },
};
