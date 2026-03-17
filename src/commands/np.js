const { SlashCommandBuilder } = require('discord.js');
const { handleNowPlaying } = require('../music/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('np').setDescription('ดูเพลงที่กำลังเล่นอยู่ตอนนี้'),
  async execute(interaction) {
    handleNowPlaying(interaction);
  },
};
