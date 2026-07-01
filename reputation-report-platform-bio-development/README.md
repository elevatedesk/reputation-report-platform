# The Reputation Report™ Platform

Visibility & Reputation Intelligence Platform by Elevate Visibility Group.

## GitHub upload

Upload these items directly to the root of your GitHub repository:

- `public`
- `netlify`
- `package.json`
- `netlify.toml`
- `README.md`

Do not upload the ZIP file itself.

## Netlify settings

Build command:

```bash
npm run build
```

Publish directory:

```text
public
```

Functions directory:

```text
netlify/functions
```

## Demo access

This front-end version has a visual client/admin portal toggle and local report generation.

This keeps the approved look and branding, including the EVG logo.

## Included modules

- Dashboard
- Client Portal view
- Admin Portal view
- Intake
- Individual Reputation Report™
- Organization Reputation Report™
- Reputation 360™
- Asset Recovery™
- Social Listening + Reviews
- Authority Assets
- Reputation Risks
- Opportunity Map™
- Export PDF through browser print
- Netlify function starter

## Production roadmap

To make this a full SaaS product, connect:

- Real authentication
- Database
- OpenAI API
- Google Search API or SerpAPI
- Wikipedia/Wikidata API
- Review APIs
- Social listening APIs
- PDF report generation


## Name search fix

This version fixes the Generate Report button so a new searched name updates:

- profile name
- initials circle
- snapshot text
- known-for tags
- risk alerts
- opportunity tags

This is still a first-pass report. Real external research requires Google/Search, Wikipedia/Wikidata, social listening, and reviews APIs.


## Actions and clickable metrics fixed

This version fixes:
- Quick Actions open the right pages
- Create Asset Inventory opens Asset Recovery
- Reputation 360 opens Reputation 360
- Social + Reviews opens Social + Reviews
- Update Information opens Intake
- Middle metric cards open a detail drawer
- Google Results, News Mentions, Media Reach, Speaking Signals, Award Signals, Reviews + Social are clickable
- Manual Authority Asset Manager added
- Manually added assets populate the drawer details and counts


## Delete/remove irrelevant items

This version adds:
- Remove irrelevant button in metric drawers
- Delete asset button for manually added assets
- Restore removed items button
- Removed items are saved in browser localStorage


## Bio Development added

This version adds:
- Bio Development™ section
- Bio Completeness Score
- Essential Bio Elements Checklist
- Bio Memory Prompts
- AI Bio Suggestions
- Bio Builder with multiple formats
- Connection to manually added assets
