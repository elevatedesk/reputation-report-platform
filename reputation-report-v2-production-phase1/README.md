# The Reputation Report™ v2 Production Phase 1

This is the first real application foundation, not a single patched HTML file.

Included:
- React/Vite app
- Modular services
- Firebase-ready Auth, Firestore, and Storage setup
- Admin/client role foundation
- Identity Match Review™
- Search by name, LinkedIn URL, website, organization
- Possible matches with confidence score
- Select identity before generating report
- Research Confidence Score
- Client Portal page
- Admin Portal page
- Intake
- Individual Intelligence
- Organization Intelligence
- Reputation 360™
- Asset Recovery™
- Manual Asset Manager
- Add assets
- Edit assets
- Delete assets locally
- Mark Verified / Client Submitted / AI Found buttons
- Proof/upload link field
- Bio Development™
- Bio Completeness Score
- Bio Checklist
- Missing accomplishments
- AI Bio Suggestions
- Bio Builder formats
- Speaking Intelligence
- Clickable metric drawers
- Google, News, Media Reach, Speaking, Awards, Reviews/Social, Bio, AI Recommendations drawers
- Timeline of Influence™
- Netlify function placeholder for Phase 2 API connections

## Netlify settings

Build command:

npm run build

Publish directory:

dist

Functions directory:

netlify/functions

## Firebase setup

1. Copy `.env.example` to `.env`
2. Add Firebase config values
3. Run `npm install`
4. Run `npm run dev`
5. Deploy to Netlify through GitHub

## Phase 2 integrations

- Google Custom Search or SerpAPI
- Wikipedia/Wikidata APIs
- OpenAI API
- News API
- Review sources
- Social listening APIs
- PDF generation workflow
