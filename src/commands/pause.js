const { SlashCommandBuilder } = require('discord.js');
const { handlePause } = require('../music/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('pause').setDescription('หยุดพักเพลงชั่วคราว'),
  async execute(interaction) {
    handlePause(interaction);
  },
};
