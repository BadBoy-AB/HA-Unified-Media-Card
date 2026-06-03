# HA Unified Media Card

A modern all-in-one media control card for **Home Assistant Lovelace** that combines:

- HEOS
- Sonos
- Music Assistant

into a single, touch-friendly interface.

The card provides a large "Now Playing" view, media browsing, favorites, speaker management, queue handling, and multiroom grouping in one compact UI.

## Features

### 🎵 Home View
- Large album artwork
- Background blur effect based on current cover
- Track title, artist, album, or station information
- Playback controls
- Shuffle support
- Live progress bar with position tracking
- Volume control

### 📚 Media Browser
- Browse available media sources
- Navigate folders, playlists, albums, artists, and tracks
- Automatic icons based on source and media type

### ❤️ Favorites
- Direct access to HEOS favorites
- Improved root browsing support

### 🔊 Speaker Management
- Select individual players
- Active speaker determines playback control
- Similar workflow to Maxi Media Player
- Multiroom grouping support

### 🎼 Queue View
- View current playback queue

### ⚙️ Settings
- Runtime information
- Entity overview
- Source switching

### 🎨 Modern Design
- Responsive layout
- Glass-style UI elements
- Dynamic cover artwork
- Dark-theme optimized
- Configurable card height

## Supported Platforms
### HEOS
- Denon HEOS
- Marantz HEOS

### Sonos
- Native Home Assistant Sonos integration

### Music Assistant
- Music Assistant media players

## Installation
### HACS (Recommended)
1. Open HACS.
1. Navigate to **Frontend**.
1. Add this repository as a custom repository.
1. Install **HA Unified Media Card**.
1. Reload Home Assistant.

### Manual Installation
1. Copy the card file into:
```yaml
/config/www/ha-unified-media-card/
```

Example:

```yaml
/config/www/ha-unified-media-card/ha-unified-media-card.js
```

2. Add the resource:
```yaml
url: /local/ha-unified-media-card/ha-unified-media-card.js 
type: module
```
3. Reload Home Assistant.

## Basic Configuration
```yaml
type: custom:ha-unified-media-card
entities:
  - media_player.wohnzimmer
  - media_player.schlafzimmer
```

## Full Configuration Example
```yaml
type: custom:ha-unified-media-card
source_name: HEOS
card_height: 560
entities:
  - media_player.wohnzimmer
  - media_player.schlafzimmer
entities_ma:
  - media_player.wohnzimmer_ma
  - media_player.schlafzimmer_ma
default_source: heos
stop_instead_of_pause: auto
settings_in_footer: false
queue_enable: false
```

## Configuration Options
| Option                  | Type     | Default | Description                                         |
| ----------------------- | -------- | ------- | --------------------------------------------------- |
| `entity`                | string   | -       | Fallback media player if `entities` is not defined  |
| `entities`              | list     | `[]`    | HEOS / Sonos players                                |
| `entities_ma`           | list     | `[]`    | Music Assistant players                             |
| `card_height`           | number   | `600`   | Card height in pixels                               |
| `default_source`        | string   | `heos`  | Initial source (`heos` or `ma`)                     |
| `stop_instead_of_pause` | string   | `auto`  | Playback behavior                                   |
| `queue_enable`          | boolean  | `true`  | Show settings button in footer                      |
| `settings_in_footer`    | boolean  | `true`  | Show queue button in footer                         |
| `source_name`           | string   | `HEOS`  | Custom display name for HEOS/Sonos source           |


### stop_instead_of_pause

Controls how the main playback button behaves.

`auto`

Automatically chooses between pause and stop.

Recommended for most setups.

```yaml
stop_instead_of_pause: auto
```

`always`

Always sends a stop command.

```yaml
stop_instead_of_pause: always
```

`never`

Always sends a pause command.

```yaml
stop_instead_of_pause: never
```

### Navigation Tabs

| Tab               | Function                            |
| ----------------- | ----------------------------------- |
| Home              | Current playback view               |
| Browser           | Browse media libraries              |
| Speakers          | Speaker selection and grouping      |
| Queue             | Current playback queue              |
| Settings          | Card configuration and diagnostics  |

	
