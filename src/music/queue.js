// Map<guildId, QueueEntry>
const queues = new Map();

function getQueue(guildId) {
  return queues.get(guildId) || null;
}

function createQueue(guildId, connection, player) {
  const queue = {
    guildId,
    connection,
    player,
    songs: [],
    volume: 1,
    loop: false,
  };
  queues.set(guildId, queue);
  return queue;
}

function deleteQueue(guildId) {
  queues.delete(guildId);
}

function hasQueue(guildId) {
  return queues.has(guildId);
}

module.exports = { getQueue, createQueue, deleteQueue, hasQueue };
