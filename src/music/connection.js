const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');

async function connectToChannel(voiceChannel) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  try {
    // รอจนกว่าจะ connect สำเร็จ (timeout 30 วิ)
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    return connection;
  } catch (err) {
    connection.destroy();
    throw new Error('ไม่สามารถเชื่อมต่อ voice channel ได้');
  }
}

module.exports = { connectToChannel };
