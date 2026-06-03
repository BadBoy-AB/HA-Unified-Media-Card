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
<blockquote>/config/www/ha-unified-media-card/</blockquote>
</b></p>
Example:
</b></p>
<blockquote>/config/www/ha-unified-media-card/ha-unified-media-card.js</blockquote></p>
<li>Add the resource:</li></p>
<blockquote>url: /local/ha-unified-media-card/ha-unified-media-card.js <br>
type: module</blockquote></p>
<li>Reload Home Assistant.</li></ol>
</b></p>
<h2>Basic Configuration</h2>
<blockquote>type: custom:ha-unified-media-card<br>
entities:<br>
  - media_player.wohnzimmer<br>
  - media_player.schlafzimmer<br>
</blockquote>

<h2>Full Configuration Example</h2>
<blockquote>type: custom:ha-unified-media-card<br>
source_name: HEOS<br>
card_height: 560<br>
entities:<br>
  - media_player.wohnzimmer<br>
  - media_player.schlafzimmer<br>
entities_ma:<br>
  - media_player.wohnzimmer_ma<br>
  - media_player.schlafzimmer_ma<br>
default_source: heos<br>
stop_instead_of_pause: auto<br>
settings_in_footer: false<br>
queue_enable: false<br>
</blockquote>

<h2>Configuration Options</h2>
<table style="width:100%"><tr>
    <th>Option</th>
    <th>Type</th>
    <th>Default</th>
    <th>Description</th></tr>
<tr>
    <td><mark>entity</mark></td>
    <td>string</td>
    <td>-</td>
    <td>Fallback media player if <mark>entities</mark> is not defined</td></tr>
<tr>
    <td><mark>entities</mark></td>
    <td>list</td>
    <td><mark>[]</mark></td>
    <td>HEOS / Sonos players</td></tr>
<tr>
    <td><mark>entities_ma</mark></td>
    <td>list</td>
    <td><mark>[]</mark></td>
    <td>Music Assistant players</td></tr>
<tr>
    <td><mark>card_height</mark></td>
    <td>number</td>
    <td><mark>600</mark></td>
    <td>Card height in pixels</td></tr>
<tr>
    <td><mark>default_source</mark></td>
    <td>string</td>
    <td><mark>heos</mark></td>
    <td>Initial source (<mark>heos</mark> or <mark>ma</mark>)</td></tr>
<tr>
    <td><mark>stop_instead_of_pause</mark></td>
    <td>string</td>
    <td><mark>auto</mark></td>
    <td>Playback behavior</td></tr>
<tr>
    <td><mark>queue_enable</mark></td>
    <td>boolean</td>
    <td><mark>true</mark></td>
    <td>Show queue button in footer</td></tr>
<tr>
    <td><mark>settings_in_footer</mark></td>
    <td>boolean</td>
    <td><mark>true</mark></td>
    <td>Show settings button in footer</td></tr>
<tr>
    <td><mark>source_name</mark></td>
    <td>string</td>
    <td><mark>HEOS</mark></td>
    <td>Custom display name for HEOS/Sonos source</td></tr>
</table>
			
			
			

<h3>stop_instead_of_pause</h3>

Controls how the main playback button behaves.

<mark>auto</mark>

Automatically chooses between pause and stop.

Recommended for most setups.

<blockquote>stop_instead_of_pause: auto</blockquote>

<mark>always</mark>

Always sends a stop command.

<blockquote>stop_instead_of_pause: always</blockquote>

<mark>never</mark>

Always sends a pause command.

<blockquote>stop_instead_of_pause: never</blockquote>

<h3>Navigation Tabs</h3>
<table style="width:100%"><tr>
    <th>Tab</th>
    <th>Function</th></tr>
<tr>
    <td>Home</td>
    <td>Current playback view</td></tr>
<tr>
    <td>Browser</td>
    <td>Browse media libraries</td></tr>
<tr>
    <td>Favorites</td>
    <td>Quick access to favorites</td></tr>
<tr>
    <td>Speakers</td>
    <td>Speaker selection and grouping</td></tr>
<tr>
    <td>Queue</td>
    <td>Current playback queue</td></tr>
<tr>
    <td>Settings</td>
    <td>Card configuration and diagnostics</td></tr>
</table>
	
	
