# DarkShield V2

Chrome extension + Laravel backend for dark pattern detection.  
Detects confirmshaming, false urgency, and preselected checkboxes using a regex baseline and an LLM (Gemini Flash Lite via OpenRouter).

---

## Structure

```
darkShield-v2/
├── manifest.json          Chrome extension manifest (MV3)
├── content.js             Text extraction, regex scan, API call, Shadow DOM alert
├── regex-detector.js      Heuristic baseline detector
├── popup.html             Extension popup UI
├── popup.js               Popup logic
├── icon.png               128×128 extension icon (add your own)
└── laravel-backend/
    ├── .env.example
    ├── app/
    │   ├── Http/Controllers/Api/ScanController.php
    │   ├── Models/Scan.php
    │   └── Services/DarkPatternClassifier.php
    ├── config/services.php
    ├── database/migrations/..._create_scans_table.php
    ├── resources/views/dashboard.blade.php
    └── routes/
        ├── api.php
        └── web.php
```

---

## Setup: Chrome Extension

1. Go to `chrome://extensions/` → enable Developer mode
2. Click **Load unpacked** → select `darkShield-v2/`
3. Click the extension icon → Settings → confirm the API base URL (`http://127.0.0.1:8000/api`)

---

## Setup: Laravel Backend

```bash
# 1. Create a new Laravel project
composer create-project laravel/laravel darkshield-api
cd darkshield-api

# 2. Copy backend files into place
#    (copy each file from laravel-backend/ to the matching path in your project)

# 3. Create the SQLite database
touch database/database.sqlite

# 4. Configure .env
cp .env.example .env
php artisan key:generate
# Set OPENROUTER_API_KEY=sk-or-v1-...
# Set DB_DATABASE to the absolute path of database/database.sqlite

# 5. Run migrations
php artisan migrate

# 6. Start the server
php artisan serve
```

Test the API:
```bash
curl -X POST http://127.0.0.1:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","text":"Only 2 left! Buy now or miss out forever."}'
```

Dashboard: `http://127.0.0.1:8000/dashboard`

---

## How It Works

```
User clicks "Scan current page"
        |
        v
content.js extracts all visible text (TreeWalker, no class/ID inspection)
        |
        v
regex-detector.js runs locally → score 0–1
        |
        v
POST /api/scan → Laravel → OpenRouter (Gemini Flash Lite) → LLM classification
        |
        v
Result stored in SQLite, returned to extension
        |
        v
If dark pattern detected → Shadow DOM alert slides in from top
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/scan` | Submit page text, get classification |
| GET | `/api/scans` | Last 20 scans |
| GET | `/api/scans/stats` | Aggregate stats |

---

## Notes

- The OpenRouter API key lives on the server, not in the extension.
- CORS: add `'allowed_origins' => ['*']` to `config/cors.php` for local dev.
- SQLite permissions on Linux: `chmod 664 database/database.sqlite`
- If `php artisan serve` is stopped, all extension scans will fail silently.
