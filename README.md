# ⭐ Star Voting System

A simple voting system where admins create events, upload images, and participants vote using star ratings.

## Features

- **Admin Flow**: Create event → Upload images → Show code → Start voting
- **Big Code Display**: Large, easy-to-read join code
- **Real-time Tracking**: See participant count update live
- **Synchronized Voting**: All participants vote on the same image shown on projector
- **Auto-advance**: Moves to next image when everyone votes
- **Leaderboard**: Shows final rankings at the end

## Setup

1. Install dependencies: `npm install`
2. Create D1 database: `npm run db:create`
3. Update `wrangler.toml` with your database ID
4. Run migrations: `npm run db:migrate`
5. Deploy: `npm run deploy`

## Usage

1. Admin creates event and enters name
2. Upload images (auto-prompted after creation)
3. Show code page displays large join code
4. Participants visit: `yoursite.com?code=12345`
5. Admin clicks "Start Voting" to begin
6. Presentation mode shows images on screen
7. Participants vote on their phones
8. System auto-advances when all vote
9. Leaderboard shows final results

