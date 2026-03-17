const { SlashCommandBuilder } = require('discord.js');
const { handleSkip } = require('../music/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('skip').setDescription('ข้ามเพลงปัจจุบัน'),
  async execute(interaction) {
    handleSkip(interaction);
  },
};
