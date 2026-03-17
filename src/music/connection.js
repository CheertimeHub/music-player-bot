const { joinVoiceChannel } = require('@discordjs/voice');

async function connectToChannel(voiceChannel) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  connection.on('stateChange', (oldState, newState) => {
    console.log(`[connection] state: ${oldState.status} → ${newState.status}`);
  });

  connection.on('error', (err) => {
    console.error('[connection] error event:', err.message);
  });

  // return ทันทีโดยไม่รอ Ready
  return connection;
}

module.exports = { connectToChannel };
