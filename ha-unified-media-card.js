/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          HA UNIFIED MEDIA CARD  —  v6.4.0                  ║
 * ║    HEOS · Sonos · Music Assistant  —  Lovelace Card        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Changelog v6.4.0:
 *  [NEU]  Tab "Startseite" (Home) → großes Cover, Titel, Steuerung, Progress
 *  [FIX]  HEOS Favoriten: browse ohne content_id-Parameter (Root-Browse → Favoriten-Kategorie)
 *  [NEU]  Lautsprecher-Auswahl: jeder Player ist einzeln anwählbar (wie Maxi Media Player)
 *         → Aktiver Player steuert die Wiedergabe
 *  [NEU]  Gruppierung bezieht sich auf den jeweils gewählten aktiven Lautsprecher
 *  [FIX]  Kartenhöhe: wird jetzt ausschließlich per YAML (card_height) gesetzt;
 *         kein Runtime-Setter mehr (Lovelace überschreibt das sowieso)
 *
 * Konfiguration:
 *   type: custom:ha-unified-media-card
 *
 *   entities:                              # HEOS / Sonos — alle Player
 *     - media_player.heos_kueche
 *     - media_player.heos_wohnzimmer
 *     - media_player.heos_schlafzimmer
 *   entity: media_player.heos_kueche      # Fallback wenn entities leer
 *
 *   entities_ma:                           # Music Assistant (optional)
 *     - media_player.ma_kueche
 *     - media_player.ma_wohnzimmer
 *
 *   title: "Heimkino"                      # Kartenüberschrift
 *   card_height: 600                       # Kartenhöhe px (Standard 600)
 *   default_source: heos                   # heos | ma
 *   stop_instead_of_pause: auto            # auto | always | never
 */
'use strict';

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════
const fmtTime = s => {
  if (!s || s <= 0) return '–';
  const t = Math.round(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

const esc = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const isLive = a => {
  if (!a?.entity) return false;
  const dur = a.mediaDuration;
  const cls = (a.attr.media_class ?? '').toLowerCase();
  return !dur || dur <= 0 || cls === 'channel' || !!a.attr.media_station;
};

const classIcon = cls => ({
  directory:'mdi:folder-music', album:'mdi:album', artist:'mdi:account-music',
  track:'mdi:music-note', playlist:'mdi:playlist-music', podcast:'mdi:podcast',
  episode:'mdi:podcast', channel:'mdi:radio', music:'mdi:music', radio:'mdi:radio',
  favorites:'mdi:heart', url:'mdi:link', app:'mdi:application',
}[cls] ?? 'mdi:play-circle-outline');

const srcIcon = name => {
  const n = (name ?? '').toLowerCase();
  if (n.includes('spotify'))    return 'mdi:spotify';
  if (n.includes('amazon'))     return 'mdi:amazon';
  if (n.includes('tunein'))     return 'mdi:radio-tower';
  if (n.includes('tidal'))      return 'mdi:music-box-multiple';
  if (n.includes('deezer'))     return 'mdi:music-box-multiple';
  if (n.includes('qobuz'))      return 'mdi:music-box-multiple';
  if (n.includes('soundcloud')) return 'mdi:soundcloud';
  if (n.includes('radio'))      return 'mdi:radio';
  if (n.includes('local') || n.includes('nas') ||
      n.includes('bibliothek') || n.includes('library')) return 'mdi:harddisk';
  if (n.includes('playlist'))   return 'mdi:playlist-music';
  if (n.includes('aux') || n.includes('analog')) return 'mdi:audio-input-stereo-minijack';
  if (n.includes('bluetooth'))  return 'mdi:bluetooth-audio';
  if (n.includes('hdmi') || n.includes('tv')) return 'mdi:television';
  if (n.includes('optical'))    return 'mdi:cable-data';
  if (n.includes('favorit') || n.includes('favorite')) return 'mdi:heart';
  if (n.includes('podcast'))    return 'mdi:podcast';
  if (n.includes('artist'))     return 'mdi:account-music';
  if (n.includes('album'))      return 'mdi:album';
  if (n.includes('track'))      return 'mdi:music-note';
  if (n.includes('internet') || n.includes('web'))   return 'mdi:web';
  if (n.includes('image') || n.includes('photo') ||
      n.includes('synology') || n.includes('camera')) return 'mdi:image-multiple';
  if (n.includes('ai generated') || n.includes('ai ') ||
      n.includes('artificial'))                       return 'mdi:robot';
  if (n.includes('camera'))                           return 'mdi:camera';
  if (n.includes('text to speech') || n.includes('tts') ||
      n.includes('speech'))                           return 'mdi:text-to-speech';
  if (n.includes('my media') || n.includes('media server')) return 'mdi:plex';
  if (n.includes('history') || n.includes('verlauf')) return 'mdi:history';
  if (n.includes('queue') || n.includes('warteschlange')) return 'mdi:playlist-play';
  if (n.includes('server') || n.includes('dlna') ||
      n.includes('network') || n.includes('upnp'))   return 'mdi:server';
  if (n.includes('folder') || n.includes('ordner'))  return 'mdi:folder-music';
  if (n.includes('upload'))                           return 'mdi:cloud-upload';
  if (n.includes('aux') || n.includes('input'))      return 'mdi:audio-input-stereo-minijack';
  return 'mdi:music-circle-outline';
};

// Gibt das beste Icon für ein Browse-Item zurück (Titel + media_class)
const itemIcon = item => {
  const title = (item.title ?? '').toLowerCase();
  const cls   = (item.media_class ?? '').toLowerCase();
  // Titel-basiertes Matching hat Vorrang (präziser als media_class)
  const byTitle = srcIcon(title);
  if (byTitle !== 'mdi:music-circle-outline') return byTitle;
  // Fallback: media_class
  const byCls = classIcon(cls);
  if (byCls !== 'mdi:play-circle-outline') return byCls;
  // Letzter Fallback: Ordner-Icon statt Fragezeichen
  return item.can_expand ? 'mdi:folder-music' : 'mdi:music-note';
};

// ═══════════════════════════════════════════════════════════════
// ENTITY ADAPTER
// ═══════════════════════════════════════════════════════════════
class Adapter {
  constructor(hass, id) {
    this.hass   = hass;
    this.id     = id;
    this.entity = hass?.states[id] ?? null;
  }

  get ok()            { return !!this.entity; }
  get state()         { return this.entity?.state ?? 'unknown'; }
  get isPlaying()     { return this.state === 'playing'; }
  get isPaused()      { return this.state === 'paused'; }
  get isUnavailable() { return this.state === 'unavailable' || this.state === 'unknown'; }

  get attr()          { return this.entity?.attributes ?? {}; }
  get friendlyName()  { return this.attr.friendly_name ?? this.id; }
  get mediaTitle()    { return this.attr.media_title ?? ''; }
  get mediaArtist()   { return this.attr.media_artist ?? ''; }
  get mediaAlbum()    { return this.attr.media_album_name ?? ''; }
  get mediaStation()  { return this.attr.media_station ?? ''; }
  get mediaDuration() { return this.attr.media_duration ?? 0; }
  get mediaPosition() { return this.attr.media_position ?? 0; }
  get volume()        { return Math.round((this.attr.volume_level ?? 0) * 100); }
  get isMuted()       { return this.attr.is_volume_muted ?? false; }
  get shuffle()       { return this.attr.shuffle ?? false; }
  get repeat()        { return this.attr.repeat ?? 'off'; }
  get source()        { return this.attr.source ?? ''; }
  get sourceList()    { return this.attr.source_list ?? []; }
  get groupMembers()  { return this.attr.group_members ?? []; }

  // supported_features bitmask
  get _sf()        { return this.attr.supported_features ?? 0; }
  get canPause()   { return !!(this._sf & 1);      }
  get canSeek()    { return !!(this._sf & 4);      }
  get canStop()    { return !!(this._sf & 4096);   }
  get canShuffle() { return !!(this._sf & 32768);  }
  get canRepeat()  { return !!(this._sf & 262144); }
  get canBrowse()  { return !!(this._sf & 131072); }
  get canGroup()   { return !!(this._sf & 524288); }

  // Cover: entity_picture (relativ oder absolut) → absolute URL
  get cover() {
    const ep = this.attr.entity_picture;
    if (!ep) return null;
    if (ep.startsWith('http')) return ep;
    try { return `${window.location.origin}${ep}`; } catch { return ep; }
  }

  // Live-Position (kompensiert HA-Update-Latenz)
  get livePosition() {
    let pos = this.mediaPosition;
    const upd = this.attr.media_position_updated_at;
    if (upd && this.isPlaying && this.mediaDuration > 0) {
      pos = Math.min(this.mediaDuration,
        pos + (Date.now() - new Date(upd).getTime()) / 1000);
    }
    return Math.max(0, pos);
  }
  get progressPct() {
    if (!this.mediaDuration) return 0;
    return Math.min(100, (this.livePosition / this.mediaDuration) * 100);
  }
  get posFmt() { return fmtTime(this.livePosition); }
  get durFmt() { return fmtTime(this.mediaDuration); }

  // HA Service Calls
  _svc(s, d = {}) { return this.hass.callService('media_player', s, { entity_id: this.id, ...d }); }

  playOrStop(mode) {
    if (this.isPlaying) {
      const stop = mode === 'always' || (mode === 'auto' && (!this.canPause || isLive(this)));
      this._svc(stop ? 'media_stop' : 'media_pause');
    } else {
      this._svc('media_play');
    }
  }
  prev()          { this._svc('media_previous_track'); }
  next()          { this._svc('media_next_track'); }
  setVol(v)       { this._svc('volume_set',  { volume_level: Math.max(0, Math.min(1, v / 100)) }); }
  mute(b)         { this._svc('volume_mute', { is_volume_muted: b }); }
  toggleShuffle() { this._svc('shuffle_set', { shuffle: !this.shuffle }); }
  setRepeat(m)    { this._svc('repeat_set',  { repeat: m }); }
  seek(pos)       { this._svc('media_seek',  { seek_position: pos }); }
  playMedia(t, i) { this._svc('play_media',  { media_content_type: t, media_content_id: i }); }
  joinGroup(main) { this.hass.callService('media_player', 'join',  { entity_id: main, group_members: [this.id] }); }
  leaveGroup()    { this.hass.callService('media_player', 'unjoin', { entity_id: this.id }); }

  // Media Browse WebSocket
  async browse(type, id) {
    const cmd = { type: 'media_player/browse_media', entity_id: this.id };
    if (type !== undefined) { cmd.media_content_type = type; cmd.media_content_id = id ?? ''; }
    return this.hass.callWS(cmd);
  }
}

// ═══════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════
const CSS = `
  :host {
    --bg:   var(--ha-card-background, #12121a);
    --s1:   rgba(255,255,255,0.05);
    --s2:   rgba(255,255,255,0.09);
    --bd:   rgba(255,255,255,0.09);
    --tx:   var(--primary-text-color,   #ededf5);
    --mu:   var(--secondary-text-color, #7878a0);
    --dim:  rgba(255,255,255,0.27);
    --hc:   #e8634a;
    --mc:   #3d9cf0;
    --ac:   #a67cfa;
    --ac2:  #7a50e6;
    --r:    13px;
    --rs:   9px;
    display: block;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  ha-card {
    background: var(--bg); border-radius: var(--r);
    overflow: hidden; display: flex; flex-direction: column;
    color: var(--tx); position: relative;
    font-family: var(--paper-font-body1_-_font-family, 'Roboto', sans-serif);
  }

  /* ── Art-Hintergrund ──────────────────────────────── */
  .art-bg {
    position: absolute; inset: 0;
    background-size: cover; background-position: center;
    filter: blur(55px) saturate(2) brightness(0.22);
    opacity: 0; transition: opacity 1.4s, background-image 0.7s;
    z-index: 0; pointer-events: none;
  }
  .art-bg.vis { opacity: 1; }

  /* ── Header ───────────────────────────────────────── */
  .hdr {
    position: relative; z-index: 10;
    padding: 11px 13px 0;
    display: flex; align-items: center; gap: 7px;
  }
  .p-name {
    font-size: 13px; font-weight: 600; color: var(--tx);
    flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .p-stat {
    font-size: 10px; color: var(--mu);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .src-tog {
    display: flex; background: rgba(255,255,255,.07);
    border-radius: 20px; padding: 3px; gap: 1px; flex-shrink: 0;
  }
  .stb {
    padding: 6px 14px; border-radius: 16px; border: none;
    background: transparent; color: var(--mu);
    font-size: 12px; font-weight: 700; cursor: pointer;
    transition: all .2s; font-family: inherit; white-space: nowrap;
  }
  .stb.ha { background: var(--hc); color: #fff; }
  .stb.ma { background: var(--mc); color: #fff; }
  .ico-btn {
    background: rgba(255,255,255,.07); border: none; border-radius: 50%;
    width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--mu); flex-shrink: 0; transition: background .2s;
  }
  .ico-btn:hover { background: rgba(255,255,255,.14); }
  .ico-btn ha-icon { --mdc-icon-size: 18px; }

  /* ── Startseite: großes Now-Playing ──────────────── */
  .home-view {
    position: relative; z-index: 10;
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 8px 20px 0; gap: 0; min-height: 0;
  }
  .big-cover {
    width: 200px; height: 200px; border-radius: 18px;
    background: var(--s1); border: 1px solid var(--bd);
    overflow: hidden; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 10px 48px rgba(0,0,0,.55);
    transition: box-shadow .4s;
    margin: 0 auto 16px auto;
  }
  .big-cover.playing { box-shadow: 0 0 0 3px var(--ac), 0 8px 40px rgba(0,0,0,.5); }
  .big-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .big-cover-ph  { color: var(--mu); --mdc-icon-size: 80px; }
  .home-badge {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 2px 8px; border-radius: 7px;
    font-size: 9px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; margin-bottom: 6px;
  }
  .home-badge ha-icon { --mdc-icon-size: 9px; }
  .home-badge.h { background: rgba(232,99,74,.18); color: var(--hc); }
  .home-badge.m { background: rgba(61,156,240,.18); color: var(--mc); }
  .home-title {
    font-size: 17px; font-weight: 700; color: var(--tx);
    text-align: center; overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap; width: 100%; margin-bottom: 3px;
  }
  .home-sub {
    font-size: 12px; color: var(--mu);
    text-align: center; overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap; width: 100%; margin-bottom: 14px;
  }
  .home-ctrls {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    margin-bottom: 16px;
  }
  .hcb {
    background: none; border: none; color: var(--mu); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; transition: all .15s;
  }
  .hcb:hover   { color: var(--tx); background: rgba(255,255,255,.08); }
  .hcb.on      { color: var(--ac); }
  .hcb.sm { width: 32px; height: 32px; --mdc-icon-size: 19px; }
  .hcb.md { width: 36px; height: 36px; --mdc-icon-size: 22px; }
  .hcb.pl {
    background: var(--ac); color: #fff;
    width: 52px; height: 52px; --mdc-icon-size: 28px;
  }
  .hcb.pl:hover { background: var(--ac2); }
  .hcb:disabled { opacity: .35; cursor: not-allowed; pointer-events: none; }

  /* Progress & Volume auf Startseite */
  .home-prog {
    width: 100%; padding: 0 4px; margin-bottom: 8px;
  }
  .prog-track {
    height: 3px; background: rgba(255,255,255,.12); border-radius: 2px;
    cursor: pointer; position: relative; overflow: visible;
  }
  .prog-track.live { cursor: default; }
  .prog-fill {
    height: 100%; border-radius: 2px; background: var(--ac);
    position: relative; transition: width .5s linear;
  }
  .prog-fill::after {
    content: ''; position: absolute; right: -4px; top: -3px;
    width: 9px; height: 9px; border-radius: 50%;
    background: var(--ac); border: 1.5px solid var(--bg);
  }
  .prog-track.live .prog-fill::after { display: none; }
  .prog-times {
    display: flex; justify-content: space-between;
    margin-top: 4px; font-size: 10px; color: var(--dim);
  }
  .home-vol {
    width: 100%; padding: 0 4px;
    display: flex; align-items: center; gap: 7px; margin-bottom: 4px;
  }
  .home-vol ha-icon { color: var(--mu); --mdc-icon-size: 15px; flex-shrink: 0; }
  input.vol-sl {
    flex: 1; -webkit-appearance: none; height: 3px; border-radius: 2px;
    background: rgba(255,255,255,.15); outline: none; cursor: pointer;
  }
  input.vol-sl::-webkit-slider-thumb {
    -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
    background: var(--tx); border: 2px solid var(--bg); cursor: pointer;
  }
  .vol-lbl { font-size: 11px; color: var(--mu); min-width: 26px; text-align: right; }

  .divider { height: 1px; background: var(--bd); margin: 0 13px; position: relative; z-index: 10; }

  /* ── Content-Bereich (Browser/Favoriten/Lautsprecher/Queue/Settings) ── */
  .content {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    padding: 10px 13px; position: relative; z-index: 10; min-height: 0;
    scrollbar-width: thin; scrollbar-color: var(--bd) transparent;
  }
  .content::-webkit-scrollbar       { width: 3px; }
  .content::-webkit-scrollbar-track { background: transparent; }
  .content::-webkit-scrollbar-thumb { background: var(--bd); border-radius: 2px; }

  .sec { font-size: 10px; font-weight: 700; color: var(--mu); letter-spacing: .09em;
         text-transform: uppercase; margin-bottom: 8px; margin-top: 12px; }
  .sec:first-child { margin-top: 0; }

  /* ── Media Browser ────────────────────────────────── */
  .brow-hdr {
    display: flex; align-items: center; gap: 7px;
    position: sticky; top: -10px;
    margin: -10px -13px 10px -13px;
    padding: 10px 13px 10px 13px;
    background: var(--bg);
    z-index: 5;
    border-bottom: 1px solid var(--bd);
  }
  .brow-back {
    display: flex; align-items: center; gap: 4px; color: var(--ac); font-size: 13px;
    font-weight: 600; cursor: pointer;
    background: rgba(166,124,250,.12); border: none; font-family: inherit;
    padding: 6px 12px 6px 8px; border-radius: 20px; flex-shrink: 0;
    transition: background .15s;
  }
  .brow-back:hover { background: rgba(166,124,250,.22); }
  .brow-back ha-icon { --mdc-icon-size: 18px; }
  .brow-title { font-size: 12px; font-weight: 600; color: var(--tx); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .tile-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 9px; }
  .tile {
    background: var(--s1); border-radius: 12px; padding: 12px 10px 10px;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    cursor: pointer; border: 1px solid transparent; transition: all .18s; text-align: center;
  }
  .tile:hover  { background: var(--s2); border-color: var(--bd); }
  .tile.active { border-color: var(--ac); background: rgba(166,124,250,.1); }
  .tile-art {
    width: 90px; height: 90px; border-radius: 14px; overflow: hidden;
    position: relative;
    display: flex; align-items: center; justify-content: center; background: var(--s2);
  }
  /* Bild als absolutes Overlay über dem Icon */
  .tile-art img {
    position: absolute; inset: 0; z-index: 1;
    width: 100%; height: 100%;
    object-fit: contain;    /* Logo nicht beschneiden */
    padding: 8px;           /* etwas Luft zu den Kanten */
  }
  /* Icon als Fallback: flex:0 0 auto verhindert Streckung auf volle Breite */
  .tile-art ha-icon { color: var(--mu); --mdc-icon-size: 36px; flex: 0 0 auto; }
  .tile-name { font-size: 11px; color: var(--mu); line-height: 1.3; overflow: hidden;
               text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2;
               -webkit-box-orient: vertical; width: 100%; }

  .row-list { display: flex; flex-direction: column; gap: 2px; }
  .brow-row {
    display: flex; align-items: center; gap: 9px; padding: 6px 9px;
    border-radius: 8px; cursor: pointer; border: 1px solid transparent; transition: background .15s;
  }
  .brow-row:hover  { background: var(--s2); }
  .brow-row.active { border-color: rgba(166,124,250,.35); background: rgba(166,124,250,.07); }
  .row-art {
    width: 40px; height: 40px; border-radius: 9px; overflow: hidden;
    position: relative;
    display: flex; align-items: center; justify-content: center;
    background: var(--s2); flex-shrink: 0;
  }
  .row-art img {
    position: absolute; inset: 0; z-index: 1;
    width: 100%; height: 100%; object-fit: cover;
  }
  .row-art ha-icon { color: var(--mu); --mdc-icon-size: 19px; }
  .row-inf { flex: 1; min-width: 0; }
  .row-ttl { font-size: 12px; color: var(--tx); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row-sub { font-size: 10px; color: var(--mu); }
  .row-rgt { display: flex; align-items: center; gap: 4px; }
  .row-dur { font-size: 10px; color: var(--mu); }
  .row-chv { color: var(--mu); --mdc-icon-size: 14px; }
  .play-btn-row {
    background: none; border: none; color: var(--mu); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    width: 26px; height: 26px; border-radius: 50%; transition: all .15s; --mdc-icon-size: 16px;
  }
  .play-btn-row:hover { color: var(--ac); background: rgba(255,255,255,.07); }

  .msg-l { font-size: 12px; color: var(--mu); padding: 20px 0; text-align: center; }
  .msg-e { font-size: 12px; color: var(--mu); padding: 12px 0; text-align: center; }

  /* ── Suchleiste MA ────────────────────────────────── */
  .srch-bar {
    display: flex; align-items: center; gap: 7px;
    background: var(--s1); border: 1px solid var(--bd);
    border-radius: var(--rs); padding: 0 10px; margin-bottom: 10px; --mdc-icon-size: 15px;
  }
  .srch-bar ha-icon { color: var(--mu); flex-shrink: 0; }
  .srch-bar input {
    flex: 1; background: none; border: none; outline: none;
    color: var(--tx); font-size: 13px; font-family: inherit; padding: 8px 0;
  }
  .srch-bar input::placeholder { color: var(--mu); }
  .srch-clr { background: none; border: none; color: var(--mu); cursor: pointer; padding: 0; display: flex; --mdc-icon-size: 15px; }

  /* ── Lautsprecher-Panel ───────────────────────────── */
  .spk-list { display: flex; flex-direction: column; gap: 6px; }
  .spk-item {
    background: var(--s1); border-radius: var(--rs); padding: 9px 11px;
    border: 1px solid transparent; transition: border-color .2s, background .2s; cursor: pointer;
  }
  .spk-item:hover    { background: var(--s2); }
  /* Aktiver Player: lila Rahmen */
  .spk-item.sel      { border-color: var(--ac) !important; background: rgba(166,124,250,.08); }
  /* In-Gruppe: blauer Rahmen */
  .spk-item.grp      { border-color: rgba(61,156,240,.35); }
  /* Beide */
  .spk-item.sel.grp  { border-color: var(--ac); background: rgba(166,124,250,.1); }

  .spk-top { display: flex; align-items: center; gap: 8px; }
  .spk-top .spk-ico { --mdc-icon-size: 18px; color: var(--mu); }
  .spk-item.sel .spk-ico { color: var(--ac); }
  .spk-item.grp .spk-ico { color: var(--mc); }
  .spk-item.sel.grp .spk-ico { color: var(--ac); }
  .spk-names { flex: 1; min-width: 0; }
  .spk-name   { font-size: 12px; font-weight: 600; color: var(--tx); }
  .spk-status { font-size: 10px; color: var(--mu); }
  .spk-actions { display: flex; align-items: center; gap: 6px; }

  /* Gruppen-Toggle */
  .tgl {
    width: 32px; height: 18px; border-radius: 9px;
    background: var(--s2); border: none; cursor: pointer;
    position: relative; transition: background .22s; flex-shrink: 0;
  }
  .tgl::after {
    content: ''; position: absolute; left: 2px; top: 2px;
    width: 14px; height: 14px; border-radius: 50%;
    background: #fff; transition: transform .22s;
  }
  .tgl.on { background: var(--mc); }
  .tgl.on::after { transform: translateX(14px); }

  .spk-vol {
    display: flex; align-items: center; gap: 6px; margin-top: 6px; padding-left: 2px;
  }
  .spk-vol ha-icon { --mdc-icon-size: 13px; color: var(--mu); flex-shrink: 0; }
  input.spk-sl {
    flex: 1; -webkit-appearance: none; height: 2px; border-radius: 2px;
    background: rgba(255,255,255,.15); outline: none; cursor: pointer;
  }
  input.spk-sl::-webkit-slider-thumb {
    -webkit-appearance: none; width: 11px; height: 11px; border-radius: 50%;
    background: var(--mu); border: 2px solid var(--bg); cursor: pointer;
  }
  .spk-vval { font-size: 10px; color: var(--mu); min-width: 20px; text-align: right; }

  /* ── Queue ────────────────────────────────────────── */
  .q-list { display: flex; flex-direction: column; gap: 2px; }
  .q-item { display: flex; align-items: center; gap: 7px; padding: 6px 8px; border-radius: 7px; cursor: pointer; transition: background .15s; }
  .q-item:hover  { background: var(--s1); }
  .q-item.now    { background: rgba(166,124,250,.1); }
  .q-num  { font-size: 11px; color: var(--mu); min-width: 15px; text-align: right; }
  .q-art  { width: 30px; height: 30px; border-radius: 5px; background: var(--s2); overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .q-art img     { width: 100%; height: 100%; object-fit: cover; }
  .q-art ha-icon { --mdc-icon-size: 14px; color: var(--mu); }
  .q-txt  { flex: 1; min-width: 0; }
  .q-ttl  { font-size: 11px; color: var(--tx); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .q-sub  { font-size: 10px; color: var(--mu); }
  .q-dur  { font-size: 10px; color: var(--mu); }

  /* ── Settings ─────────────────────────────────────── */
  .s-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,.04); }
  .s-lbl { font-size: 12px; color: var(--mu); flex: 1; }
  select.s-sel {
    background: var(--s1); border: 1px solid var(--bd); color: var(--mu);
    border-radius: 6px; padding: 4px 7px; font-size: 11px; font-family: inherit; outline: none; cursor: pointer;
  }
  .ent-row { padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,.04); }
  .ent-name { font-size: 12px; color: var(--tx); }
  .ent-id   { font-size: 10px; color: var(--dim); }

  /* ── Footer ───────────────────────────────────────── */
  .footer {
    display: flex; align-items: center; justify-content: space-around;
    height: 56px; border-top: 1px solid var(--bd);
    background: rgba(0,0,0,.18); position: relative; z-index: 20; flex-shrink: 0;
  }
  .ftb {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    background: none; border: none; cursor: pointer;
    padding: 6px 10px; border-radius: 9px; transition: background .15s;
    font-family: inherit; min-width: 46px;
  }
  .ftb:hover { background: rgba(255,255,255,.05); }
  .ftb ha-icon { --mdc-icon-size: 20px; color: var(--mu); transition: color .15s; }
  .ftb-lbl    { font-size: 9px; color: var(--mu); letter-spacing: .04em; text-transform: uppercase; transition: color .15s; }
  .ftb.act ha-icon  { color: var(--ac); }
  .ftb.act .ftb-lbl { color: var(--ac); }

  .hidden { display: none !important; }
  .panel  { display: none; }
  .panel.show { display: block; }
`;

// ═══════════════════════════════════════════════════════════════
// CARD ELEMENT
// ═══════════════════════════════════════════════════════════════
class HaUnifiedMediaCard extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass    = null;
    this._config  = {};
    this._src     = 'heos';   // 'heos' | 'ma'
    this._tab     = 'home';   // 'home' | 'browser' | 'favorites' | 'speakers' | 'queue' | 'settings'
    this._actId   = null;     // aktuell gewählte Entitäts-ID (für Lautsprecher-Selektion)
    this._ready   = false;
    this._tickT   = null;
    this._srchT   = null;
    this._hStk    = [];
    this._mStk    = [];
    this._settDone = false;
  }

  // ── Lovelace API ──────────────────────────────────────
  static getStubConfig() {
    return {
      entity: 'media_player.heos_kueche',
      entities: [],
      entities_ma: [],
      title: '',
      card_height: 600,
      default_source: 'heos',
      stop_instead_of_pause: 'auto',
      settings_in_footer: true,   // true = Settings im Footer; false = nur Header-Icon
      source_name: '',               // Freitext: z. B. 'Sonos', 'Denon', 'HEOS' (Standard)
    };
  }

  setConfig(cfg) {
    if (!cfg.entity && !cfg.entities?.length && !cfg.entities_ma?.length)
      throw new Error('ha-unified-media-card: Mindestens eine Entität angeben.');
    this._config = cfg;
    this._src    = cfg.default_source === 'ma' ? 'ma' : 'heos';
    // Standardmäßig den ersten Player auswählen
    const ids = cfg.entities?.length ? cfg.entities : (cfg.entity ? [cfg.entity] : []);
    if (!this._actId && ids.length) this._actId = ids[0];
  }

  set hass(h) {
    this._hass = h;
    // Falls actId noch nicht gesetzt (z. B. beim allerersten Aufruf)
    if (!this._actId) {
      const ids = this._currentIds;
      if (ids.length) this._actId = ids[0];
    }
    if (!this._ready) { this._ready = true; this._build(); }
    else              { this._update(); }
  }

  getCardSize() {
    return Math.ceil((parseInt(this._config.card_height) || 600) / 70);
  }

  connectedCallback()    { this._startTick(); }
  disconnectedCallback() { this._stopTick(); }

  // ── ID-Listen ─────────────────────────────────────────
  get _heosIds() {
    return this._config.entities?.length
      ? this._config.entities
      : (this._config.entity ? [this._config.entity] : []);
  }
  get _maIds()   { return this._config.entities_ma ?? []; }
  get _currentIds() { return this._src === 'ma' ? this._maIds : this._heosIds; }

  // Aktiver Adapter (der gewählte Player)
  get _ada()     { return new Adapter(this._hass, this._actId); }
  _a(id)         { return new Adapter(this._hass, id); }

  get _stopMode() {
    const c = this._config.stop_instead_of_pause;
    if (c === true  || c === 'always') return 'always';
    if (c === false || c === 'never')  return 'never';
    return 'auto';
  }
  // Frei konfigurierbarer Name der HEOS/Sonos-Quelle (YAML: source_name)
  get _heosName() { return this._config.source_name || 'HEOS'; }

  // ── Kartenhöhe (YAML) ──────────────────────────────────
  get _cardH() {
    return Math.max(480, Math.min(900, parseInt(this._config.card_height) || 600));
  }

  // ── Build ──────────────────────────────────────────────
  _build() {
    const sty = document.createElement('style');
    sty.textContent = CSS;
    this.shadowRoot.appendChild(sty);

    const card = document.createElement('ha-card');
    card.style.height = `${this._cardH}px`;
    card.innerHTML = this._tmpl();
    this.shadowRoot.appendChild(card);

    this._bindEvents();
    this._applyFooterConfig();
    this._update();
    this._loadBrowser();
  }

  // Konfiguriert Footer-Layout nach YAML
  _applyFooterConfig() {
    const $ = id => this.shadowRoot.getElementById(id);
    const settInFooter = this._config.settings_in_footer !== false; // Standard: true
    const fSet = $('fSet');
    if (fSet) fSet.classList.toggle('hidden', !settInFooter);
    // Header-Settings-Button: sichtbar wenn Settings NICHT im Footer
    const bSetHdr = $('bSetHdr');
    if (bSetHdr) bSetHdr.classList.toggle('hidden', settInFooter);
  }

  // ── HTML-Template ──────────────────────────────────────
  _tmpl() {
    const hasMA = this._maIds.length > 0;
    return `
      <div class="art-bg" id="artBg"></div>

      <!-- HEADER -->
      <div class="hdr">
        <div style="flex:1;min-width:0">
          <div class="p-name" id="pName">–</div>
          <div class="p-stat" id="pStat">–</div>
        </div>
        ${hasMA ? `<div class="src-tog">
          <button class="stb ha" id="bHeos">${this._heosName}</button>
          <button class="stb"    id="bMA">Music Assistant</button>
        </div>` : ''}
        <button class="ico-btn" id="bSetHdr" aria-label="Einstellungen">
          <ha-icon icon="mdi:tune"></ha-icon>
        </button>
      </div>

      <!-- STARTSEITE (Home) -->
      <div class="home-view panel show" id="panelHome">
        <div class="big-cover" id="bigCover">
          <ha-icon class="big-cover-ph" icon="mdi:music-note" id="bigCoverPh"></ha-icon>
          <img id="bigCoverImg" alt="" style="display:none">
        </div>

        <div class="home-badge h" id="homeBadge">
          <ha-icon icon="mdi:antenna" id="homeBadgeIco"></ha-icon>
          <span id="homeBadgeLbl">${this._heosName}</span>
        </div>
        <div class="home-title" id="homeTitle">–</div>
        <div class="home-sub"   id="homeSub">–</div>

        <div class="home-ctrls">
          <button class="hcb sm on" id="hShuf" aria-label="Shuffle">
            <ha-icon icon="mdi:shuffle"></ha-icon>
          </button>
          <button class="hcb md" id="hPrev" aria-label="Zurück">
            <ha-icon icon="mdi:skip-previous"></ha-icon>
          </button>
          <button class="hcb pl" id="hPlay" aria-label="Play/Stop">
            <ha-icon icon="mdi:play" id="hPlayIco"></ha-icon>
          </button>
          <button class="hcb md" id="hNext" aria-label="Weiter">
            <ha-icon icon="mdi:skip-next"></ha-icon>
          </button>
          <button class="hcb sm" id="hRep" aria-label="Repeat">
            <ha-icon icon="mdi:repeat" id="hRepIco"></ha-icon>
          </button>
        </div>

        <div class="home-prog">
          <div class="prog-track" id="progBar">
            <div class="prog-fill" id="progFill" style="width:0%"></div>
          </div>
          <div class="prog-times"><span id="tNow">–</span><span id="tTot">–</span></div>
        </div>

        <div class="home-vol">
          <ha-icon icon="mdi:volume-medium" id="volIco"></ha-icon>
          <input type="range" class="vol-sl" id="volSl" min="0" max="100" step="1" value="40">
          <span class="vol-lbl" id="volLbl">40</span>
        </div>
      </div>

      <div class="divider" id="homeDivider"></div>

      <!-- BROWSER (HEOS + MA) -->
      <div class="content panel" id="panelBrowser">
        <div id="hBrow">
          <div class="brow-hdr hidden" id="hBrowHdr">
            <button class="brow-back" id="hBack">
              <ha-icon icon="mdi:chevron-left"></ha-icon>
              <span id="hBackLbl">Start</span>
            </button>
            <span class="brow-title" id="hBrowTtl"></span>
          </div>
          <div id="hBrowContent"><div class="msg-l">Lade…</div></div>
        </div>
        <div id="mBrow" class="hidden">
          <div class="srch-bar">
            <ha-icon icon="mdi:magnify"></ha-icon>
            <input type="text" id="maIn" placeholder="Künstler, Album, Track, Podcast…" autocomplete="off">
            <button class="srch-clr hidden" id="maClr" aria-label="Löschen">
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
          </div>
          <div class="brow-hdr hidden" id="mBrowHdr">
            <button class="brow-back" id="mBack">
              <ha-icon icon="mdi:chevron-left"></ha-icon>
              <span id="mBackLbl">Start</span>
            </button>
            <span class="brow-title" id="mBrowTtl"></span>
          </div>
          <div id="mBrowContent"><div class="msg-l">Lade…</div></div>
        </div>
      </div>

      <!-- LAUTSPRECHER -->
      <div class="content panel" id="panelSpeakers">
        <div class="sec" id="spkSec">Lautsprecher wählen &amp; Gruppen</div>
        <div class="spk-list" id="spkList"></div>
      </div>

      <!-- QUEUE -->
      <div class="content panel" id="panelQueue">
        <div class="sec" id="qSec">Warteschlange</div>
        <div class="q-list" id="qList"><div class="msg-l">Lade…</div></div>
      </div>

      <!-- SETTINGS -->
      <div class="content panel" id="panelSettings">
        <div class="sec">Einstellungen</div>
        <div id="settC"></div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <button class="ftb act" id="fHome" aria-label="Startseite">
          <ha-icon icon="mdi:music-circle-outline"></ha-icon>
          <span class="ftb-lbl">Start</span>
        </button>
        <button class="ftb" id="fBrow" aria-label="Browser">
          <ha-icon icon="mdi:folder-music-outline"></ha-icon>
          <span class="ftb-lbl">Browser</span>
        </button>
        <button class="ftb" id="fSpk" aria-label="Lautsprecher">
          <ha-icon icon="mdi:speaker-multiple"></ha-icon>
          <span class="ftb-lbl">Lautsprecher</span>
        </button>
        <button class="ftb" id="fQ" aria-label="Queue">
          <ha-icon icon="mdi:playlist-play"></ha-icon>
          <span class="ftb-lbl">Queue</span>
        </button>
        <button class="ftb" id="fSet" aria-label="Settings">
          <ha-icon icon="mdi:tune-variant"></ha-icon>
          <span class="ftb-lbl">Settings</span>
        </button>
      </div>
    `;
  }

  // ── Events ────────────────────────────────────────────
  _bindEvents() {
    const $ = id => this.shadowRoot.getElementById(id);

    // Source-Toggle
    $('bHeos')?.addEventListener('click', () => this._setSrc('heos'));
    $('bMA')?.addEventListener('click',   () => this._setSrc('ma'));

    // Playback-Controls (Startseite)
    $('hPlay').addEventListener('click', () => this._ada.playOrStop(this._stopMode));
    $('hPrev').addEventListener('click', () => this._ada.prev());
    $('hNext').addEventListener('click', () => this._ada.next());
    $('hShuf').addEventListener('click', () => this._ada.toggleShuffle());
    $('hRep').addEventListener('click', () => {
      const m = ['off','one','all'], c = this._ada.repeat;
      this._ada.setRepeat(m[(m.indexOf(c)+1) % m.length]);
    });

    // Lautstärke
    $('volSl').addEventListener('input', e => {
      $('volLbl').textContent = e.target.value;
      this._ada.setVol(+e.target.value);
    });

    // Progress Seek
    $('progBar').addEventListener('click', e => {
      const a = this._ada;
      if (isLive(a) || !a.canSeek || !a.mediaDuration) return;
      const r = $('progBar').getBoundingClientRect();
      a.seek(((e.clientX - r.left) / r.width) * a.mediaDuration);
    });

    // Footer
    const tabMap = {
      fHome:'home', fBrow:'browser',
      fSpk:'speakers', fQ:'queue', fSet:'settings'
    };
    Object.entries(tabMap).forEach(([id, tab]) =>
      $(id).addEventListener('click', () => this._showTab(tab)));

    $('bSetHdr').addEventListener('click', () =>
      this._showTab(this._tab === 'settings' ? 'home' : 'settings'));

    // HEOS Browser: Zurück
    $('hBack').addEventListener('click', () => this._hBack());
    // MA Browser: Zurück
    $('mBack').addEventListener('click', () => this._mBack());

    // MA Suche
    $('maIn').addEventListener('input', e => {
      const v = e.target.value;
      $('maClr').classList.toggle('hidden', !v);
      clearTimeout(this._srchT);
      this._srchT = setTimeout(() => this._maSearch(v), 380);
    });
    $('maClr').addEventListener('click', () => {
      $('maIn').value = '';
      $('maClr').classList.add('hidden');
      this._mStk = [];
      this._loadMaBrow();
    });
  }

  // ── Reaktiver Update ───────────────────────────────────
  _update() {
    if (!this._hass) return;

    // Sicherstellen dass aktive ID noch gültig
    const ids = this._currentIds;
    if (!this._actId || !ids.includes(this._actId)) {
      this._actId = ids[0] ?? null;
    }

    const a    = this._ada;
    const isMA = this._src === 'ma';
    const $    = id => this.shadowRoot.getElementById(id);

    // Art-Hintergrund
    const bg = $('artBg');
    if (a.cover) {
      const u = `url("${a.cover}")`;
      if (bg.style.backgroundImage !== u) bg.style.backgroundImage = u;
      bg.classList.add('vis');
    } else {
      bg.classList.remove('vis');
    }

    // Header
    $('pName').textContent = this._config.title || a.friendlyName;
    const grp = a.groupMembers.length;
    $('pStat').textContent = grp > 1
      ? `Gruppe · ${grp} Lautsprecher`
      : isMA ? 'Music Assistant'
      : { playing:'Wiedergabe', paused:'Pausiert', idle:'Bereit', off:'Aus' }[a.state] ?? a.state;

    // Source-Buttons
    if ($('bHeos')) $('bHeos').className = `stb${!isMA ? ' ha' : ''}`;
    if ($('bMA'))   $('bMA').className   = `stb${isMA  ? ' ma' : ''}`;

    // Browser-Sichtbarkeit
    $('hBrow').classList.toggle('hidden', isMA);
    $('mBrow').classList.toggle('hidden', !isMA);
    $('spkSec').textContent = isMA ? 'MA-Lautsprecher wählen & Gruppen' : `${this._heosName}-Lautsprecher wählen & Gruppen`;
    $('qSec').textContent   = isMA ? 'MA Queue' : `${this._heosName} Queue`;

    // Big Cover
    if (a.cover) {
      if ($('bigCoverImg').src !== a.cover) $('bigCoverImg').src = a.cover;
      $('bigCoverImg').style.display = 'block';
      $('bigCoverPh').style.display  = 'none';
    } else {
      $('bigCoverImg').style.display = 'none';
      $('bigCoverPh').style.display  = '';
    }
    $('bigCover').classList.toggle('playing', a.isPlaying);

    // Home-Badge
    $('homeBadge').className = `home-badge ${isMA ? 'm' : 'h'}`;
    $('homeBadgeIco').setAttribute('icon', isMA ? 'mdi:music-box-multiple' : 'mdi:antenna');
    $('homeBadgeLbl').textContent = isMA ? 'Music Assistant' : this._heosName;

    // Track-Info
    $('homeTitle').textContent = a.mediaTitle || a.mediaStation || (a.isUnavailable ? 'Nicht verfügbar' : 'Nichts läuft');
    $('homeSub').textContent   = [a.mediaArtist, a.mediaAlbum].filter(Boolean).join(' · ') || a.source || '';

    // Play-Icon (Stop / Pause / Play)
    const live  = isLive(a);
    const doStop = this._stopMode === 'always' || (this._stopMode === 'auto' && (!a.canPause || live));
    $('hPlayIco').setAttribute('icon', a.isPlaying ? (doStop ? 'mdi:stop' : 'mdi:pause') : 'mdi:play');

    // Shuffle / Repeat
    $('hShuf').classList.toggle('hidden', !a.canShuffle);
    $('hRep').classList.toggle('hidden',  !a.canRepeat);
    $('hShuf').classList.toggle('on', !!a.shuffle);
    const RI = { off:'mdi:repeat-off', one:'mdi:repeat-once', all:'mdi:repeat' };
    $('hRepIco').setAttribute('icon', RI[a.repeat] ?? 'mdi:repeat');
    $('hRep').classList.toggle('on', a.repeat !== 'off');

    // Buttons disabled
    ['hPlay','hPrev','hNext'].forEach(id => { const e=$(id); if(e) e.disabled = a.isUnavailable; });

    // Progress
    const hasDur = a.mediaDuration > 0;
    $('progBar').className = 'prog-track' + (live ? ' live' : '');
    $('progFill').style.width = hasDur ? `${a.progressPct.toFixed(1)}%` : '0%';
    $('tNow').textContent = hasDur ? a.posFmt : '–';
    $('tTot').textContent = hasDur ? a.durFmt : '–';

    // Volume
    $('volSl').value       = a.volume;
    $('volLbl').textContent = a.volume;
    $('volIco').setAttribute('icon', a.isMuted ? 'mdi:volume-off' : 'mdi:volume-medium');

    // Aktive Panel-Inhalte
    if (this._tab === 'speakers') this._renderSpeakers();
    if (this._tab === 'settings') this._renderSettings();
  }

  // ── Quelle umschalten ─────────────────────────────────
  _setSrc(src) {
    if (this._src === src) return;
    this._src = src;
    this._settDone = false;
    // Ersten Player der neuen Quelle wählen
    const ids = this._currentIds;
    this._actId = ids[0] ?? null;
    this._update();
    this._loadBrowser();
    if (this._tab === 'speakers')   this._renderSpeakers();
    if (this._tab === 'queue')      this._loadQueue();
  }

  // ── Tab-Navigation ────────────────────────────────────
  _showTab(tab) {
    this._tab = tab;

    // Panels
    const panels = ['Home','Browser','Speakers','Queue','Settings'];
    panels.forEach(p =>
      this.shadowRoot.getElementById('panel'+p)
        ?.classList.toggle('show', p.toLowerCase() === tab));

    // Divider nur auf Startseite
    const div = this.shadowRoot.getElementById('homeDivider');
    if (div) div.classList.toggle('hidden', tab !== 'home');

    // Footer aktiv-Klasse
    const fm = { home:'fHome', browser:'fBrow', speakers:'fSpk', queue:'fQ', settings:'fSet' };
    Object.entries(fm).forEach(([t, id]) =>
      this.shadowRoot.getElementById(id)?.classList.toggle('act', t === tab));

    if (tab === 'browser')   this._loadBrowser();
    if (tab === 'speakers')  this._renderSpeakers();
    if (tab === 'queue')     this._loadQueue();
    if (tab === 'settings')  this._renderSettings();
  }

  _loadBrowser() {
    if (this._src === 'heos') { this._hStk = []; this._loadHeosBrow(); }
    else                      { this._mStk = []; this._loadMaBrow(); }
  }

  // ══════════════════════════════════════════════════════
  // HEOS BROWSER
  // ══════════════════════════════════════════════════════
  async _loadHeosBrow(type, id) {
    const eid = this._actId;
    if (!eid || !this._hass) return;
    const el  = this.shadowRoot.getElementById('hBrowContent');
    const hdr = this.shadowRoot.getElementById('hBrowHdr');
    if (!el) return;
    el.innerHTML = '<div class="msg-l">Lade…</div>';
    try {
      const res = await this._a(eid).browse(type, id);
      if (!res) { el.innerHTML = '<div class="msg-e">Keine Inhalte</div>'; return; }
      const isRoot = !this._hStk.length;
      hdr.classList.toggle('hidden', isRoot);
      if (!isRoot) {
        const top  = this._hStk[this._hStk.length-1];
        const prev = this._hStk.length > 1 ? this._hStk[this._hStk.length-2].title : 'Start';
        this.shadowRoot.getElementById('hBackLbl').textContent = prev;
        this.shadowRoot.getElementById('hBrowTtl').textContent = top.title;
      }
      this._renderBrow(el, res, 'heos');
    } catch(e) {
      el.innerHTML = `<div class="msg-e">Fehler: ${esc(e?.message ?? '')}</div>`;
    }
  }

  _hNav(item) {
    this._hStk.push({ title:item.title, type:item.media_content_type, id:item.media_content_id });
    this._loadHeosBrow(item.media_content_type, item.media_content_id);
  }
  _hBack() {
    this._hStk.pop();
    if (!this._hStk.length) this._loadHeosBrow();
    else { const t = this._hStk[this._hStk.length-1]; this._loadHeosBrow(t.type, t.id); }
  }

  // ══════════════════════════════════════════════════════
  // MA BROWSER
  // ══════════════════════════════════════════════════════
  async _loadMaBrow(type, id) {
    const eid = this._actId;
    if (!eid || !this._hass) return;
    const el  = this.shadowRoot.getElementById('mBrowContent');
    const hdr = this.shadowRoot.getElementById('mBrowHdr');
    if (!el) return;
    el.innerHTML = '<div class="msg-l">Lade…</div>';
    try {
      const res = await this._a(eid).browse(type, id);
      if (!res) { el.innerHTML = '<div class="msg-e">Keine Inhalte</div>'; return; }
      const isRoot = !this._mStk.length;
      hdr.classList.toggle('hidden', isRoot);
      if (!isRoot) {
        const top  = this._mStk[this._mStk.length-1];
        const prev = this._mStk.length > 1 ? this._mStk[this._mStk.length-2].title : 'Start';
        this.shadowRoot.getElementById('mBackLbl').textContent = prev;
        this.shadowRoot.getElementById('mBrowTtl').textContent = top.title;
      }
      this._renderBrow(el, res, 'ma');
    } catch(e) {
      el.innerHTML = `<div class="msg-e">Fehler: ${esc(e?.message ?? '')}</div>`;
    }
  }

  _mNav(item) {
    this._mStk.push({ title:item.title, type:item.media_content_type, id:item.media_content_id });
    this._loadMaBrow(item.media_content_type, item.media_content_id);
  }
  _mBack() {
    this._mStk.pop();
    if (!this._mStk.length) this._loadMaBrow();
    else { const t = this._mStk[this._mStk.length-1]; this._loadMaBrow(t.type, t.id); }
  }

  async _maSearch(q) {
    if (!q || q.length < 2) { this._mStk = []; this._loadMaBrow(); return; }
    const el = this.shadowRoot.getElementById('mBrowContent');
    if (!el) return;
    el.innerHTML = '<div class="msg-l">Suche…</div>';
    try {
      const res = await this._a(this._actId).browse('search', q);
      this._renderBrow(el, res, 'ma');
    } catch { el.innerHTML = '<div class="msg-e">Suche fehlgeschlagen</div>'; }
  }

  // ══════════════════════════════════════════════════════
  // UNIVERSELLER BROWSER-RENDERER
  // ══════════════════════════════════════════════════════
  _renderBrow(container, result, mode) {
    const items = result?.children ?? [];
    if (!items.length) { container.innerHTML = '<div class="msg-e">Keine Einträge</div>'; return; }

    const allDir  = items.every(i => i.can_expand);
    const anyTrk  = items.some(i => ['track','episode'].includes(i.media_class));
    const useTile = allDir && !anyTrk && items.length <= 36;

    container.innerHTML = useTile
      ? `<div class="tile-grid">${items.map((i,n) => this._tileH(i,n)).join('')}</div>`
      : `<div class="row-list">${items.map((i,n) => this._rowH(i,n)).join('')}</div>`;

    container.querySelectorAll('[data-act]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const act  = el.dataset.act;
        const item = items[parseInt(el.dataset.idx)];
        if (!item) return;
        if (act === 'nav') {
          mode.startsWith('heos') ? this._hNav(item) : this._mNav(item);
        } else if (act === 'play') {
          this._a(this._actId).playMedia(
            item.media_content_type ?? 'music',
            item.media_content_id   ?? ''
          );
          container.querySelectorAll('.tile.active,.brow-row.active')
            .forEach(x => x.classList.remove('active'));
          el.closest('.tile,.brow-row')?.classList.add('active');
        }
      });
    });
  }

  _tileH(item, n) {
    const act  = (item.can_expand && !item.can_play) ? 'nav' : 'play';
    const icon = itemIcon(item);
    // Icon immer als Hintergrund; Bild als Overlay (transparent/broken → hidden)
    const img  = item.thumbnail
      ? `<img src="${esc(item.thumbnail)}" alt="" loading="lazy"
             onerror="this.style.display='none'"
             onload="if(this.naturalWidth<=4||this.naturalHeight<=4)this.style.display='none'">`
      : '';
    return `<div class="tile" data-act="${act}" data-idx="${n}" tabindex="0" role="button">
      <div class="tile-art"><ha-icon icon="${icon}"></ha-icon>${img}</div>
      <div class="tile-name">${esc(item.title ?? '–')}</div>
    </div>`;
  }

  _rowH(item, n) {
    const nav  = item.can_expand ?? false;
    const play = item.can_play   ?? true;
    const act  = nav ? 'nav' : 'play';
    const icon2 = itemIcon(item);
    const imgR  = item.thumbnail
      ? `<img src="${esc(item.thumbnail)}" alt="" loading="lazy"
             onerror="this.style.display='none'"
             onload="if(this.naturalWidth<=4||this.naturalHeight<=4){this.style.display='none'}else{this.previousElementSibling.style.display='none'}">`
      : '';
    const art  = `<ha-icon icon="${icon2}"></ha-icon>${imgR}`;
    const sub  = [item.media_artist, item.media_album_name].filter(Boolean).join(' · ');
    const dur  = item.media_duration ? `<span class="row-dur">${fmtTime(item.media_duration)}</span>` : '';
    const chv  = nav  ? `<ha-icon class="row-chv" icon="mdi:chevron-right"></ha-icon>` : '';
    const pbtn = play && !nav
      ? `<button class="play-btn-row" data-act="play" data-idx="${n}" aria-label="Abspielen">
           <ha-icon icon="mdi:play-circle-outline"></ha-icon></button>` : '';
    return `<div class="brow-row" data-act="${act}" data-idx="${n}" tabindex="0" role="button">
      <div class="row-art">${art}</div>
      <div class="row-inf">
        <div class="row-ttl">${esc(item.title ?? '–')}</div>
        ${sub ? `<div class="row-sub">${esc(sub)}</div>` : ''}
      </div>
      <div class="row-rgt">${dur}${chv}${pbtn}</div>
    </div>`;
  }

  // ══════════════════════════════════════════════════════
  // LAUTSPRECHER-PANEL
  //
  // Jeder Lautsprecher ist einzeln anwählbar → steuert die Wiedergabe.
  // Gruppierung bezieht sich auf den gewählten aktiven Player.
  // ══════════════════════════════════════════════════════
  _renderSpeakers() {
    const el = this.shadowRoot.getElementById('spkList');
    if (!el) return;

    const ids = this._currentIds;
    if (!ids.length) { el.innerHTML = '<div class="msg-e">Keine Lautsprecher konfiguriert</div>'; return; }

    const activeId   = this._actId;
    const activeAdp  = this._a(activeId);
    const grpMembers = activeAdp.groupMembers; // Gruppe des aktiven Players

    el.innerHTML = ids.map(id => {
      const a      = this._a(id);
      const isSel  = id === activeId;                          // aktuell gewählt
      const inGrp  = isSel || grpMembers.includes(id);        // in Gruppe des aktiven Players

      const stateLabel = isSel
        ? (a.isPlaying ? '▶ Aktiv · Wiedergabe' : '● Aktiv')
        : inGrp
          ? 'In Gruppe'
          : { playing:'Wiedergabe', paused:'Pausiert', idle:'Bereit', off:'Aus' }[a.state] ?? a.state;

      return `
        <div class="spk-item${isSel ? ' sel' : ''}${inGrp && !isSel ? ' grp' : ''}"
             data-id="${esc(id)}">
          <div class="spk-top">
            <ha-icon class="spk-ico" icon="mdi:speaker${a.isPlaying ? '' : '-off'}"></ha-icon>
            <div class="spk-names">
              <div class="spk-name">${esc(a.friendlyName)}</div>
              <div class="spk-status">${stateLabel}</div>
            </div>
            <div class="spk-actions">
              ${!isSel ? `
              <button class="tgl${inGrp ? ' on' : ''}"
                      data-id="${esc(id)}" data-main="${esc(activeId)}"
                      aria-label="${inGrp ? 'Aus Gruppe' : 'In Gruppe'}"
                      title="Zur Gruppe von ${esc(activeAdp.friendlyName)} hinzufügen / entfernen">
              </button>` : ''}
            </div>
          </div>
          <div class="spk-vol">
            <ha-icon icon="mdi:volume-medium"></ha-icon>
            <input type="range" class="spk-sl" min="0" max="100" step="1"
                   value="${a.volume}" data-id="${esc(id)}">
            <span class="spk-vval">${a.volume}</span>
          </div>
        </div>`;
    }).join('');

    // Lautsprecher anklicken → aktiven Player wechseln
    el.querySelectorAll('.spk-item').forEach(item => {
      item.addEventListener('click', e => {
        // Nicht auslösen wenn Toggle oder Slider geklickt
        if (e.target.closest('.tgl') || e.target.closest('input')) return;
        const newId = item.dataset.id;
        if (newId && newId !== this._actId) {
          this._actId = newId;
          this._update();
          this._renderSpeakers();
        }
      });
    });

    // Lautstärke-Slider
    el.querySelectorAll('input.spk-sl').forEach(inp => {
      inp.addEventListener('input', e => {
        e.target.nextElementSibling.textContent = e.target.value;
        this._a(e.target.dataset.id).setVol(+e.target.value);
      });
    });

    // Gruppen-Toggle
    el.querySelectorAll('.tgl').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const a2  = this._a(btn.dataset.id);
        const on  = btn.classList.contains('on');
        if (on) a2.leaveGroup();
        else    a2.joinGroup(btn.dataset.main);
        btn.classList.toggle('on');
        btn.closest('.spk-item')?.classList.toggle('grp');
      });
    });
  }

  // ══════════════════════════════════════════════════════
  // QUEUE
  // ══════════════════════════════════════════════════════
  async _loadQueue() {
    const el = this.shadowRoot.getElementById('qList');
    if (!el) return;
    el.innerHTML = '<div class="msg-l">Lade Queue…</div>';
    if (!this._actId) { el.innerHTML = '<div class="msg-e">Kein Player gewählt</div>'; return; }

    let items = [];
    // Strategie 1: browse ohne Argumente → Root, dann 'queue'-Kategorie suchen
    // Strategie 2: browse('music', 'queue') — für MA
    // Strategie 3: browse('queue') — für einige DLNA-Player
    const strategies = [
      () => this._a(this._actId).browse('music', 'queue'),
      () => this._a(this._actId).browse('app', 'queue'),
      () => this._a(this._actId).browse('queue', 'queue'),
      () => this._a(this._actId).browse('queue', ''),
      async () => {
        const root = await this._a(this._actId).browse();
        const cat = root?.children?.find(c =>
          (c.title ?? '').toLowerCase().includes('queue') ||
          (c.title ?? '').toLowerCase().includes('warteschlange') ||
          c.media_content_type === 'queue'
        );
        if (cat) return this._a(this._actId).browse(cat.media_content_type, cat.media_content_id);
        return null;
      },
    ];

    for (const strategy of strategies) {
      try {
        const res = await strategy();
        if (res?.children?.length) { items = res.children; break; }
      } catch { /* nächste Strategie */ }
    }

    if (!items.length) {
      // Zeige aktuell laufenden Track als einzigen Queue-Eintrag (Fallback)
      const a = this._ada;
      if (a.mediaTitle) {
        el.innerHTML = `
          <div class="q-item now">
            <div class="q-num">♪</div>
            <div class="q-art">
              ${a.cover ? `<img src="${esc(a.cover)}" alt="">` : `<ha-icon icon="mdi:music-note"></ha-icon>`}
            </div>
            <div class="q-txt">
              <div class="q-ttl">${esc(a.mediaTitle)}</div>
              <div class="q-sub">${esc([a.mediaArtist, a.mediaAlbum].filter(Boolean).join(' · '))}</div>
            </div>
            <span class="q-dur">${a.durFmt}</span>
          </div>
          <div class="msg-e" style="margin-top:8px;font-size:10px">Queue-Browse wird von diesem Player nicht unterstützt.</div>`;
      } else {
        el.innerHTML = '<div class="msg-e">Queue leer oder nicht verfügbar</div>';
      }
      return;
    }

    el.innerHTML = items.map((it, i) => `
      <div class="q-item${i === 0 ? ' now' : ''}">
        <div class="q-num">${i === 0 ? '♪' : i + 1}</div>
        <div class="q-art">
          ${it.thumbnail
            ? `<img src="${esc(it.thumbnail)}" alt="" loading="lazy">`
            : `<ha-icon icon="${classIcon(it.media_class)}"></ha-icon>`}
        </div>
        <div class="q-txt">
          <div class="q-ttl">${esc(it.title ?? '–')}</div>
          <div class="q-sub">${esc([it.media_artist, it.media_album_name].filter(Boolean).join(' · '))}</div>
        </div>
        <span class="q-dur">${fmtTime(it.media_duration)}</span>
      </div>`).join('');
  }

  // ══════════════════════════════════════════════════════
  // SETTINGS
  // ══════════════════════════════════════════════════════
  _renderSettings() {
    if (this._settDone) return;
    this._settDone = true;
    const el = this.shadowRoot.getElementById('settC');
    if (!el) return;

    const isMA    = this._src === 'ma';
    const stopCfg = this._config.stop_instead_of_pause ?? 'auto';
    const ids     = this._currentIds;

    el.innerHTML = `
      <div class="sec">Wiedergabe</div>
      <div class="s-row">
        <span class="s-lbl">Stop statt Pause</span>
        <select class="s-sel" id="sStop">
          <option value="auto"   ${(!stopCfg || stopCfg === 'auto')   ? 'selected':''}>Auto (Radio → Stop)</option>
          <option value="always" ${(stopCfg === 'always' || stopCfg === true)  ? 'selected':''}>Immer Stop</option>
          <option value="never"  ${(stopCfg === 'never'  || stopCfg === false) ? 'selected':''}>Immer Pause</option>
        </select>
      </div>

      <div class="sec">Info</div>
      <div class="s-row">
        <span class="s-lbl">Version</span>
        <span style="font-size:11px;color:var(--dim)">v6.4.0</span>
      </div>
      <div class="s-row">
        <span class="s-lbl">Quelle</span>
        <span style="font-size:11px;color:var(--dim)">${isMA ? 'Music Assistant' : 'HEOS / Sonos'}</span>
      </div>
      <div class="s-row">
        <span class="s-lbl">Kartenhöhe</span>
        <span style="font-size:11px;color:var(--dim)">${this._cardH}px (via YAML card_height)</span>
      </div>

      <div class="sec">${isMA ? 'Music Assistant' : 'HEOS / Sonos'} · Entitäten (${ids.length})</div>
      ${ids.map(id => {
        const a = this._a(id);
        const sel = id === this._actId;
        return `<div class="ent-row">
          <div class="ent-name">${sel ? '▶ ' : ''}${esc(a.friendlyName)}</div>
          <div class="ent-id">${esc(id)} · Vol ${a.volume}% · ${esc(a.state)}</div>
        </div>`;
      }).join('')}
    `;

    el.querySelector('#sStop')?.addEventListener('change', e => {
      this._config = { ...this._config, stop_instead_of_pause: e.target.value };
      this._settDone = false;
      this._update();
    });
  }

  // ══════════════════════════════════════════════════════
  // PROGRESS TICKER
  // ══════════════════════════════════════════════════════
  _startTick() {
    this._stopTick();
    this._tickT = setInterval(() => {
      if (!this._hass || this._tab !== 'home') return;
      const a = this._ada;
      if (!a.isPlaying || !a.mediaDuration) return;
      const pf = this.shadowRoot.getElementById('progFill');
      const tn = this.shadowRoot.getElementById('tNow');
      if (pf) pf.style.width = `${a.progressPct.toFixed(1)}%`;
      if (tn) tn.textContent  = a.posFmt;
    }, 500);
  }
  _stopTick() {
    if (this._tickT) { clearInterval(this._tickT); this._tickT = null; }
  }
}

// ═══════════════════════════════════════════════════════════════
// REGISTRATION
// ═══════════════════════════════════════════════════════════════
customElements.define('ha-unified-media-card', HaUnifiedMediaCard);

window.customCards ??= [];
window.customCards.push({
  type:        'ha-unified-media-card',
  name:        'HA Unified Media Card',
  description: 'HEOS · Sonos · Music Assistant — vollständiger Media Browser mit Player-Auswahl',
  preview:     true,
});

console.info(
  '%c HA-UNIFIED-MEDIA-CARD %c v6.4.0 ',
  'background:#a67cfa;color:#fff;padding:2px 8px;border-radius:4px 0 0 4px;font-weight:bold',
  'background:#12121a;color:#a67cfa;padding:2px 8px;border-radius:0 4px 4px 0'
);
