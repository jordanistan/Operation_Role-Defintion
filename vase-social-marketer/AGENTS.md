# Vase Social Marketer - Agent Instructions

## Project Overview
A social media marketing tool for small vase businesses to create engaging posts with transparent vase images composited onto beautiful backgrounds.

## Tech Stack
- **Runtime**: Node.js 20+
- **Image Processing**: Sharp
- **Frontend**: Vanilla HTML/CSS/JS

## Key Modules

### `src/image-composer.js`
- Composites transparent vase PNG images onto gradient/solid backgrounds
- Creates placeholder vase SVGs if no image provided
- Supports custom positioning and dimensions

### `src/marketing-copy.js`
- Generates catchy marketing copy for:
  - **New clients**: Welcome messages, benefits, urgency
  - **Returning clients**: Loyalty messages, exclusive offers, restock alerts
  - **General**: Promotional content
- Includes curated hashtag collections

### `src/server.js`
- Express-style HTTP server (pure Node.js)
- API endpoints for backgrounds, vases, post generation
- Serves static frontend files

## Running the Project

```bash
cd /tmp/vase-social-marketer
npm install
npm start
```

Then open http://localhost:3000

## Features
1. Select from predefined vase placeholders
2. Choose from 8 beautiful background styles
3. Target new or returning clients with tailored messaging
4. Add custom message or use generated copy
5. One-click copy to clipboard
6. Download generated image
