const play = require('play-dl');

// ดึง video ID จากทุก format ของ YouTube URL
function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
    if (u.searchParams.has('v')) return u.searchParams.get('v');
  } catch {}
  return null;
}

// ดึง playlist ID และเช็คว่าเป็น playlist จริงๆ (ไม่ใช่ Radio/Mix)
function extractPlaylistId(url) {
  try {
    const u = new URL(url);
    const list = u.searchParams.get('list');
    if (!list) return null;
    // Radio/Mix playlist ขึ้นต้นด้วย RD, FL, LL ฯลฯ → ไม่ใช่ playlist จริง
    if (/^(RD|FL|LL|PU|UC)/.test(list)) return null;
    return list;
  } catch {}
  return null;
}

async function searchYouTube(query) {
  try {
    const validated = play.yt_validate(query);

    if (validated === 'video' || validated === 'playlist') {
      const videoId = extractVideoId(query);
      const playlistId = extractPlaylistId(query);

      // เป็น playlist จริงๆ และไม่มี video ID (คือ playlist-only URL)
      if (playlistId && !videoId) {
        const cleanPlaylistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
        const playlist = await play.playlist_info(cleanPlaylistUrl, { incomplete: true });
        const videos = await playlist.all_videos();
        return {
          songs: videos.filter((v) => v.url).map((v) => ({
            title: v.title,
            url: v.url,
            duration: v.durationInSec,
            thumbnail: v.thumbnails[0]?.url,
          })),
          isPlaylist: true,
          playlistTitle: playlist.title,
        };
      }

      // มี video ID → เล่นแค่เพลงนั้น (ตัด list/si/pp ออกให้หมด)
      if (videoId) {
        const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const info = await play.video_info(cleanUrl);
        return {
          songs: [{
            title: info.video_details.title,
            url: info.video_details.url,
            duration: info.video_details.durationInSec,
            thumbnail: info.video_details.thumbnails[0]?.url,
            info, // เก็บ info ไว้ใช้ stream_from_info ตอนเล่น
          }],
          isPlaylist: false,
        };
      }
    }

    // text search หรือ URL ที่ไม่รู้จัก
    const results = await play.search(query, { limit: 1 });
    if (!results || results.length === 0) return null;
    const v = results[0];
    return {
      songs: [{
        title: v.title,
        url: v.url,
        duration: v.durationInSec,
        thumbnail: v.thumbnails[0]?.url,
      }],
      isPlaylist: false,
    };

  } catch (err) {
    console.error('[search] Error:', err.message);
    return null;
  }
}

module.exports = { searchYouTube };
