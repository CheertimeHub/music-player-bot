const { SlashCommandBuilder } = require('discord.js');
const { handleStop } = require('../music/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('stop').setDescription('หยุดเล่นเพลงและออกจาก voice channel'),
  async execute(interaction) {
    handleStop(interaction);
  },
};
