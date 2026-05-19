# Scoreboard

A live baseball scoreboard for two players to share during a remote [Strat-O-Matic](https://www.strato-matic.com/) game. One player creates a game and gets a 6-digit code; the other player joins with that code. Both see the same scoreboard and either player can update it. Changes sync within about 1.5 seconds.

## Features

- Tracks innings 1–9, outs, runs, hits, errors, and strikeouts for both teams
- Auto-advances to the next half-inning at 3 outs
- 6-digit game codes for easy sharing
- Scales to fill any browser window (designed for tablet use)
- Games expire automatically after 48 hours

## Tech stack

Pure vanilla JS frontend, PHP backend, no framework or build step required. Game state is stored as JSON files on the server and synced via polling.

## Deployment

Upload these files to any PHP-capable web server:

```
.htaccess
scoreboard.html
scoreboard.js
scoreboard.css
api.php
games/.htaccess
```

The `games/` directory must exist on the server with its `.htaccess` file in place before anyone creates a game. If it's missing, `api.php` will create it automatically on the first request, but uploading it ensures the directory is protected from the start.

## Usage

**Player 1 — create a game:**
1. Open `scoreboard.html` in a browser
2. Enter both team names and click **Create Game**
3. A 6-digit code appears at the top — share it with Player 2

**Player 2 — join a game:**
1. Open the same URL
2. Enter the 6-digit code and click **Join Game**

Either player can click any inning cell to select it, then use the `−`/`+` buttons to update outs, runs, hits, errors, and strikeouts. At 3 outs the scoreboard automatically advances to the next half-inning.

Click **New Game** (top right) to return to the start screen.

## Version history

- **v1.0-perl** — original Perl CGI version (single-player, local use)
- **v2.0** — rewritten as a static PHP/JS app with real-time two-player sync
