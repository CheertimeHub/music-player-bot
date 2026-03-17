const { SlashCommandBuilder } = require('discord.js');
const { handleQueue } = require('../music/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('queue').setDescription('ดูรายการเพลงใน queue'),
  async execute(interaction) {
    handleQueue(interaction);
  },
};
