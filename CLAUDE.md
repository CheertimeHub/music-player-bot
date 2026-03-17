# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # รันบอท
npm run dev      # รันบอทแบบ watch mode (node --watch)
```

## Environment Variables

ต้องมีไฟล์ `.env`:
```
DISCORD_TOKEN=...   # required
GUILD_ID=...        # optional — ถ้าใส่จะ register commands แบบ guild-specific (ทันที) แทน global (รอ ~1ชม.)
```

## Architecture

### Data Flow
```
Discord Message / Slash Command
  → index.js (prefix parser หรือ interactionCreate)
  → musicManager.js (business logic)
  → queue.js (Map<guildId, QueueEntry>)
  → player.js (yt-dlp stream → AudioResource)
  → connection.js (VoiceConnection)
```

### Two Command Systems
บอทรองรับ 2 ระบบพร้อมกัน:
1. **Slash commands** (`/play`) — registered ผ่าน Discord API ใน `clientReady`
2. **Prefix commands** (`nept play`, `nept p`) — `messageCreate` ใน index.js สร้าง `fakeInteraction` object แล้วส่งให้ handler เดิมใน musicManager

Aliases อยู่ใน `ALIASES` object ใน index.js (`p→play`, `s→skip`, `st→stop`, `q→queue`, `pa→pause`, `r→resume`, `l→leave`, `nowplaying→np`)

### Queue System
`src/music/queue.js` เก็บ `Map<guildId, queue>` โดย queue มี structure:
```js
{ guildId, connection, player, songs: [{ title, url, duration, thumbnail, info }], loop, volume }
```

### Streaming
ใช้ **yt-dlp** ผ่าน `youtube-dl-exec` (`create('yt-dlp')`) — ไม่ใช้ play-dl หรือ ytdl-core สำหรับ streaming เพราะถูก YouTube block

Search/metadata ยังใช้ **play-dl** (`play.yt_validate()`, `play.video_info()`, `play.search()`, `play.playlist_info()`)

### URL Handling (search.js)
ใช้ `play.yt_validate(url)` เพื่อตรวจสอบ input type:
- `'video'` → ดึง video ID แล้ว clean URL ก่อนส่ง (ตัด `?si=`, `&list=RD...` ออก)
- `'playlist'` → โหลดด้วย `playlist_info()` ยกเว้น Radio/Mix (`list=RD`, `FL`, `LL`, `PU`, `UC`)
- อื่นๆ → `play.search(query, { limit: 1 })`

### Deployment (Render)
Build Command: `YOUTUBE_DL_SKIP_DOWNLOAD=true npm install && pip install yt-dlp`
- `YOUTUBE_DL_SKIP_DOWNLOAD=true` เพื่อไม่ให้ postinstall download binary จาก GitHub (โดน rate limit)
- ติดตั้ง yt-dlp ผ่าน pip แทน แล้ว `create('yt-dlp')` ชี้ไปที่ system binary

### Discord Intents ที่ต้องเปิดใน Developer Portal
- **MESSAGE CONTENT INTENT** — จำเป็นสำหรับ prefix commands (`nept play ...`)
