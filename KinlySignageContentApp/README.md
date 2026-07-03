# KinlySignageContentApp

KinlySignageContentApp is a reception dashboard concept for Appspace Web View cards. The local travel update is now one component within a calmer master page, with room for additional widgets such as weather, news, guest sign-in, and guest Wi-Fi details.

## What the application does

- Serves a modular reception dashboard from an Express backend
- Uses the travel update as one reusable widget inside the master page
- Includes mock Weather, News, and Guest Services widgets to shape the broader dashboard
- Uses a Kinly-style looping waves MP4 background for a more polished visual feel
- Exposes a normalised API endpoint at `GET /api/traffic-summary?site=sunbury`
- Uses mock National Highways and DfT Street Manager data for the first version
- Summarises current travel conditions in plain English with `Green`, `Amber`, `Red`, and `Grey` statuses
- Refreshes travel data every 5 minutes in the browser and reloads the full page every 60 minutes for signage stability

## Layout modes

- `http://localhost:3000/` shows the master dashboard with Travel, Weather, Guest Services, and News widgets.
- `http://localhost:3000/?layout=widget` shows the travel card on its own for standalone reuse later.

## Canonical entrypoints

- The main local runtime is `public/index.html`, served by Express from `/`.
- The root `index.html` is now a redirect shim to avoid duplicate page copies drifting apart.
- If you use `scripts/preview-server.mjs`, it now serves from `public/` so preview mode matches `npm start`.

## Shared signage page content

- Shared page definitions live in `content/pages-data.js`.
- `content/pages.js` maps that shared data to `window.KINLY_SIGNAGE_PAGES` for browser use.
- The worker build now copies `content/pages-data.js` into `dist/content/` so deployed artifact content comes from the same file.

## Project structure

```text
KinlySignageContentApp/
|-- .env.example
|-- package.json
|-- server.js
|-- content/
|   |-- pages-data.js
|   `-- pages.js
|-- public/
|   |-- app.js
|   |-- index.html
|   |-- media/
|   |   `-- waves-background.mp4
|   `-- styles.css
`-- README.md
```

## Install dependencies

```sh
npm install
```

## Run locally

```sh
npm start
```

Then open `http://localhost:3000`.

## API endpoint

The backend exposes:

```text
GET /api/traffic-summary?site=sunbury
```

## Future data integrations

The backend is structured so the frontend does not need to change when live data is connected. Future National Highways and DfT Street Manager integrations should be added in `server.js` inside:

- `getNationalHighwaysItems(site)`
- `getStreetManagerItems(site)`
- `getTrafficSummary(site)`

Future widget integrations for Weather, News, Guest Sign In, and Guest Wi-Fi can be added incrementally in `public/app.js` or moved to new backend endpoints when you are ready.
