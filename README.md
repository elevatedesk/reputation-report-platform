# The Reputation Report™ Multi-Client Admin Build

Upload the contents of this folder directly to the GitHub repository root.

Root should show:
- index.html
- styles.css
- app.js
- netlify.toml
- assets/
- netlify/functions/research.js
- README.md

Netlify settings:
- Build command: leave blank
- Publish directory: .
- Functions directory: netlify/functions

Required environment variable:
- SERPAPI_API_KEY

What changed:
- The system now supports many clients.
- Admin starts from Clients.
- Add, select, delete, and manage clients.
- Each client has separate reports, assets, bio checklist, notes, and status.
- Generate Report saves the report under the selected client.
- Status tracking: Draft, Researching, Needs Review, Ready, Delivered, Monitoring, Error.
- Client view only shows the selected client's dashboard, reports, bio, assets, timeline, and uploads.
- News/media is stricter: third-party media only.
- Awards/recognition is stricter: best-of lists, top lists, rankings, trailblazers, honorees, and formal recognition.

Important:
This version still uses browser localStorage for the client database. That means it is good for testing and demos, but not production. The next production step is Firebase Auth + Firestore so clients and reports are saved securely across devices.
