const { createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const play = require('play-dl');
const { getQueue, deleteQueue } = require('./queue');

function createPlayer() {
  return createAudioPlayer();
}

async function playSong(queue, song) {
  try {
    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });

    queue.player.play(resource);
    queue.connection.subscribe(queue.player);
  } catch (err) {
    console.error('[player] Error streaming song:', err.message);
    // ข้ามเพลงนี้ แล้วเล่นต่อ
    skipSong(queue);
  }
}

function skipSong(queue) {
  if (queue.loop && queue.songs.length > 0) {
    // ถ้า loop mode ให้เอาเพลงปัจจุบันใส่กลับท้าย queue
    queue.songs.push(queue.songs[0]);
  }
  queue.songs.shift();

  if (queue.songs.length > 0) {
    playSong(queue, queue.songs[0]);
  } else {
    cleanup(queue);
  }
}

function cleanup(queue) {
  setTimeout(() => {
    const q = getQueue(queue.guildId);
    if (q && q.songs.length === 0) {
      q.connection.destroy();
      deleteQueue(queue.guildId);
    }
  }, 60_000); // รอ 1 นาทีก่อน leave อัตโนมัติ
}

function setupPlayerEvents(queue, textChannel) {
  queue.player.on(AudioPlayerStatus.Idle, () => {
    skipSong(queue);
  });

  queue.player.on('error', (err) => {
    console.error('[player] Player error:', err.message);
    textChannel?.send(`เกิด error ขณะเล่นเพลง: ${err.message}`).catch(() => {});
    skipSong(queue);
  });

  queue.connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      const { entersState } = require('@discordjs/voice');
      await Promise.race([
        entersState(queue.connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(queue.connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      deleteQueue(queue.guildId);
      queue.connection.destroy();
    }
  });
}

module.exports = { createPlayer, playSong, skipSong, cleanup, setupPlayerEvents };
