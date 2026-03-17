const { SlashCommandBuilder } = require('discord.js');
const { handleResume } = require('../music/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('resume').setDescription('เล่นเพลงต่อหลัง pause'),
  async execute(interaction) {
    handleResume(interaction);
  },
};
