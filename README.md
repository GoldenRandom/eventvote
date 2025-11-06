# ⭐ Star Voting System

A modern voting system built with Cloudflare Workers and Pages. Upload images, create events, and let participants vote using star ratings via QR code scanning.

## Features

- 🎯 **Event Management**: Create and manage voting events
- 📸 **Image Upload**: Upload multiple images per event
- ⭐ **Star Rating**: 1-5 star voting system
- 📱 **QR Code Integration**: Easy event access via QR codes
- 📊 **Real-time Statistics**: View average ratings and vote counts
- 🎨 **Modern UI**: Beautiful, responsive interface

## Architecture

- **Backend**: Cloudflare Workers (serverless API)
- **Database**: Cloudflare D1 (SQLite-based, serverless)
- **Frontend**: Vanilla JavaScript (deployed on Cloudflare Pages)
- **Storage**: Base64 image storage (can be upgraded to Cloudflare R2)

### Database (Cloudflare D1)

The system uses Cloudflare D1, which is a serverless SQL database built on SQLite. All database operations use the D1 API through the `env.DB` binding:

- **Binding**: `DB` (configured in `wrangler.toml`)
- **Tables**: `events`, `images`, `votes`
- **Features**: Foreign keys, indexes, and constraints are all supported

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Cloudflare D1 Database

```bash
npm run db:create
```

This will output a database ID. Update `wrangler.toml` with your database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "voting-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

**Note**: The database binding `DB` is used throughout the code to access D1. Make sure this matches in your Cloudflare Pages environment variables if deploying to Pages.

### 3. Run Database Migrations

```bash
npm run db:migrate
```

### 4. Development

Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:8787`

### 5. Deployment

#### Option 1: Cloudflare Pages (Recommended)

1. **Push to Git Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Connect to Cloudflare Pages**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
   - Click "Create a project" → "Connect to Git"
   - Select your repository and branch

3. **Configure Build Settings**
   - **Build command**: (leave empty - no build needed)
   - **Build output directory**: `public`
   - **Root directory**: `/` (root)

4. **Configure D1 Database Binding** ⚠️ **CRITICAL STEP**
   - Go to your Pages project → **Settings** → **Functions**
   - Scroll to **D1 database bindings**
   - Click **"Add binding"**
   - **Variable name**: `DB` (must be exactly `DB`, case-sensitive)
   - **D1 database**: Select `voting-db`
   - Click **Save**

5. **Deploy!**
   - Click **"Save and Deploy"**
   - Your site will be live at `https://your-project.pages.dev`

**Important**: The D1 binding name `DB` must match exactly what's in the code (`env.DB`).

#### Option 2: Cloudflare Workers

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

**Note**: For Workers-only deployment, you'll need to configure static asset serving separately or use Cloudflare Pages for the frontend.

## Usage

### Admin Flow

1. Click "Admin Panel" on the home page
2. Click "Create New Event" and enter an event name
3. Upload images for the event (you'll need the event ID)
4. Start the event to make it active
5. Share the QR code with participants

### Voting Flow

1. Click "Scan QR Code to Vote" on the home page
2. Scan the QR code or enter it manually
3. View images and rate them with 1-5 stars
4. Navigate between images using Previous/Next buttons
5. Submit your votes

## API Endpoints

### Events
- `POST /api/events` - Create a new event
- `GET /api/events/:id` - Get event details with images and stats
- `GET /api/events/qr/:qrCode` - Get event by QR code
- `PUT /api/events/:id/status` - Update event status

### Images
- `POST /api/images` - Upload an image (multipart/form-data)
- `GET /api/images/:id/votes` - Get votes for an image

### Votes
- `POST /api/votes` - Submit a vote

## Database Schema

### Events
- `id` (TEXT PRIMARY KEY)
- `name` (TEXT)
- `status` (TEXT: draft, active, closed)
- `created_at` (INTEGER)
- `qr_code` (TEXT UNIQUE)

### Images
- `id` (TEXT PRIMARY KEY)
- `event_id` (TEXT FOREIGN KEY)
- `url` (TEXT)
- `filename` (TEXT)
- `uploaded_at` (INTEGER)

### Votes
- `id` (TEXT PRIMARY KEY)
- `event_id` (TEXT FOREIGN KEY)
- `image_id` (TEXT FOREIGN KEY)
- `voter_id` (TEXT)
- `stars` (INTEGER: 1-5)
- `created_at` (INTEGER)

## Improvements for Production

1. **Image Storage**: Replace base64 storage with Cloudflare R2 for better performance
2. **QR Code Generation**: Integrate a QR code library (e.g., qrcode.js) for visual QR codes
3. **QR Code Scanning**: Add jsQR library for actual camera-based QR scanning
4. **Authentication**: Add admin authentication for event management
5. **Rate Limiting**: Implement rate limiting to prevent abuse
6. **Real-time Updates**: Add WebSocket support for live vote updates
7. **Analytics**: Add detailed analytics dashboard

## License

MIT

