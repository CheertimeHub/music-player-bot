const { SlashCommandBuilder } = require('discord.js');
const { handleLeave } = require('../music/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('leave').setDescription('ให้บอทออกจาก voice channel'),
  async execute(interaction) {
    handleLeave(interaction);
  },
};
