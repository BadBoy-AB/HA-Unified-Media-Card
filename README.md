<h1>HA Unified Media Card</h1>

A modern all-in-one media control card for Home Assistant Lovelace that combines:

<ul><li>HEOS</li>
<li>Sonos</li>
<li>Music Assistant</li></ul>

into a single, touch-friendly interface.

The card provides a large "Now Playing" view, media browsing, favorites, speaker management, queue handling, and multiroom grouping in one compact UI.

<h2>Features</h2>

<h3>🎵 Home View</h3>
<ul><li>Large album artwork</li>
<li>Background blur effect based on current cover</li>
<li>Track title, artist, album, or station information</li>
<li>Playback controls</li>
<li>Shuffle support</li>
<li>Live progress bar with position tracking</li>
<li>Volume control</li></ul>

<h3>📚 Media Browser</h3>
<ul><li>Browse available media sources</li>
<li>Navigate folders, playlists, albums, artists, and tracks</li>
<li>Automatic icons based on source and media type</li></ul>

<h3>❤️ Favorites</h3>
<ul><li>Direct access to HEOS favorites</li>
<li>Improved root browsing support</li></ul>

<h3>🔊 Speaker Management</h3>
<ul><li>Select individual players</li>
<li>Active speaker determines playback control</li>
<li>Similar workflow to Maxi Media Player</li>
<li>Multiroom grouping support</li></ul>

<h3>🎼 Queue View</h3>
<ul><li>View current playback queue</li></ul>

<h3>⚙️ Settings</h3>
<ul><li>Runtime information</li>
<li>Entity overview</li>
<li>Source switching</li></ul>

<h3>🎨 Modern Design</h3>
<ul><li>Responsive layout</li>
<li>Glass-style UI elements</li>
<li>Dynamic cover artwork</li>
<li>Dark-theme optimized</li>
<li>Configurable card height</li></ul>

<h2>Supported Platforms</h2>
<h3>HEOS</h3>
<ul><li>Denon HEOS</li>
<li>Marantz HEOS</li></ul>

<h3>Sonos</h3>
<ul><li>Native Home Assistant Sonos integration</li></ul>

<h3>Music Assistant</h3>
<ul><li>Music Assistant media players</li></ul>

<h2>Installation</h2>
<h3>HACS (Recommended)</h3>
<ol><li>Open HACS.</li>
<li>Navigate to Frontend.</li>
<li>Add this repository as a custom repository.</li>
<li>Install HA Unified Media Card.</li>
<li>Reload Home Assistant.</li></ol>

<h3>Manual Installation</h3>
<ol><li>Copy the card file into:</li></p>
/config/www/ha-unified-media-card/
</b></p>
Example:
</b></p>
/config/www/ha-unified-media-card/ha-unified-media-card.js</p>
<li>Add the resource:</li></p>
url: /local/ha-unified-media-card/ha-unified-media-card.js</b></p>
type: module</p>
<li>Reload Home Assistant.</li></ol>
</b></p>
<h2>Basic Configuration</h2>
type: custom:ha-unified-media-card

entities:
  - media_player.heos_kueche
  - media_player.heos_wohnzimmer
  - media_player.heos_schlafzimmer

entity: media_player.heos_kueche

title: Heimkino
card_height: 600
default_source: heos
stop_instead_of_pause: auto

<h2>Full Configuration Example</h2>
type: custom:ha-unified-media-card

title: Heimkino

entities:
  - media_player.heos_kueche
  - media_player.heos_wohnzimmer
  - media_player.heos_schlafzimmer

entities_ma:
  - media_player.ma_kueche
  - media_player.ma_wohnzimmer

card_height: 650

default_source: heos

stop_instead_of_pause: auto

settings_in_footer: true

source_name: Sonos

<h2>Configuration Options</h2>
Option	Type	Default	Description
entity	string	-	Fallback media player if entities is not defined
entities	list	[]	HEOS / Sonos players
entities_ma	list	[]	Music Assistant players
title	string	""	Card title
card_height	number	600	Card height in pixels
default_source	string	heos	Initial source (heos or ma)
stop_instead_of_pause	string	auto	Playback behavior
settings_in_footer	boolean	true	Show settings button in footer
source_name	string	HEOS	Custom display name for HEOS/Sonos source

<h3>stop_instead_of_pause</h3>

Controls how the main playback button behaves.

auto

Automatically chooses between pause and stop.

Recommended for most setups.

stop_instead_of_pause: auto
always

Always sends a stop command.

stop_instead_of_pause: always
never

Always sends a pause command.

stop_instead_of_pause: never

<h3>Navigation Tabs</h3>
Tab	Function
Home	Current playback view
Browser	Browse media libraries
Favorites	Quick access to favorites
Speakers	Speaker selection and grouping
Queue	Current playback queue
Settings	Card configuration and diagnostics
