const play = require('play-dl');

async function searchYouTube(query) {
  try {
    // ถ้า query เป็น URL อยู่แล้ว ดึง info ตรงๆ เลย
    if (query.startsWith('http')) {
      const info = await play.video_info(query);
      return {
        title: info.video_details.title,
        url: info.video_details.url,
        duration: info.video_details.durationInSec,
        thumbnail: info.video_details.thumbnails[0]?.url,
      };
    }

    const results = await play.search(query, { limit: 1 });
    if (!results || results.length === 0) return null;

    const video = results[0];
    return {
      title: video.title,
      url: video.url,
      duration: video.durationInSec,
      thumbnail: video.thumbnails[0]?.url,
    };
  } catch (err) {
    console.error('[search] Error:', err.message);
    return null;
  }
}

module.exports = { searchYouTube };
