const { createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, StreamType } = require('@discordjs/voice');
const youtubedl = require('youtube-dl-exec');
const { getQueue, deleteQueue } = require('./queue');

function createPlayer() {
  return createAudioPlayer();
}

async function playSong(queue, song) {
  try {
    console.log('[player] Streaming URL:', song.url);
    const subprocess = youtubedl.exec(song.url, {
      format: 'bestaudio[ext=webm]/bestaudio/best',
      output: '-',
      quiet: true,
      noWarnings: true,
    }, { stdio: ['ignore', 'pipe', 'ignore'] });
    const resource = createAudioResource(subprocess.stdout, {
      inputType: StreamType.Arbitrary,
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
