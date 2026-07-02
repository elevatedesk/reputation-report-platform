
const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";

const BLOCK_DOMAINS = [
  "facebook.com", "instagram.com", "threads.net", "tiktok.com", "x.com", "twitter.com",
  "youtube.com", "pinterest.com", "linkedin.com/posts", "linkedin.com/feed",
  "yelp.com", "google.com/search", "bbb.org/reviews"
];

const REVIEW_TERMS = [
  "review", "reviews", "stars", "rating", "rated", "testimonial", "customer feedback",
  "complaint", "glassdoor", "indeed reviews", "facebook review", "google reviews"
];

const AWARD_TERMS = [
  "best of", "top 10", "top 15", "top 20", "top 25", "top 30", "top 40", "top 50", "top 100",
  "ranked", "ranking", "rankings", "named to", "named one of", "recognized as",
  "recognition", "honoree", "honored", "winner", "finalist", "nominee",
  "most admired", "most influential", "trailblazer", "trailblazers", "leading women",
  "leading men", "leaders", "women to watch", "40 under 40", "30 under 30", "50 under 50",
  "power list", "best in", "top in", "top pr", "top firm", "top firms", "top agency",
  "best agency", "best pr", "women-owned", "black business", "business list", "award"
];

const MEDIA_TERMS = [
  "article", "interview", "profile", "spotlight", "feature", "featured", "quoted",
  "expert commentary", "commentary", "according to", "said", "told", "news",
  "magazine", "newspaper", "podcast", "q&a", "conversation", "press"
];

const AWARD_SOURCE_HINTS = [
  "clutch.co", "designrush.com", "themanifest.com", "thedailyrecord.com", "dailyrecord.com",
  "bizjournals.com", "forbes.com", "inc.com", "entrepreneur.com", "fortune.com",
  "fastcompany.com", "blackenterprise.com", "essence.com", "ebony.com",
  "prdaily.com", "ragan.com", "prweek.com", "adweek.com"
];

function clean(items = [], limit = 10) {
  return items.slice(0, limit).map(item => ({
    title: item.title || item.name || "Untitled result",
    link: item.link || item.url || "",
    source: item.source || item.displayed_link || item.publication || "Search result",
    snippet: item.snippet || item.description || item.date || "",
    date: item.date || item.published_date || ""
  }));
}

function textOf(r) {
  return `${r.title || ""} ${r.snippet || ""} ${r.source || ""} ${r.link || ""}`.toLowerCase();
}

function domainOf(link = "") {
  return link.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
}

function hasAny(text, terms) {
  return terms.some(t => text.includes(t.toLowerCase()));
}

function isBlocked(r) {
  const text = textOf(r);
  return BLOCK_DOMAINS.some(d => text.includes(d)) || hasAny(text, REVIEW_TERMS);
}

function unique(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = `${item.title}|${item.link}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function appearsSelfAuthored(r, name) {
  const text = textOf(r);
  return text.includes(`by ${name.toLowerCase()}`);
}

function filterThirdPartyMedia(items, name) {
  return unique(items)
    .filter(r => {
      if (isBlocked(r)) return false;
      if (appearsSelfAuthored(r, name)) return false;
      const text = textOf(r);
      if (hasAny(text, AWARD_TERMS)) return false;
      const mediaLanguage = hasAny(text, MEDIA_TERMS);
      return mediaLanguage;
    })
    .slice(0, 6);
}

function filterAwardsOnly(items) {
  return unique(items)
    .filter(r => {
      if (isBlocked(r)) return false;
      const text = textOf(r);
      const domain = domainOf(r.link);
      const awardLanguage = hasAny(text, AWARD_TERMS);
      const recognizedSource = AWARD_SOURCE_HINTS.some(src => domain.includes(src) || text.includes(src));
      const strongAwardPattern =
        /\b(best of|top\s?\d+|top\s?\d{2}|top\s?\d{3}|ranked|ranking|most admired|most influential|trailblazer|honoree|winner|finalist|40 under 40|30 under 30|50 under 50|women to watch|leading women|best in|top in|named to|named one of)\b/i.test(text);
      return awardLanguage && (recognizedSource || strongAwardPattern);
    })
    .slice(0, 10);
}

async function serp(params) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) throw new Error("Missing SERPAPI_API_KEY in Netlify Environment Variables.");

  const url = new URL(SERPAPI_ENDPOINT);
  Object.entries({ ...params, api_key: apiKey }).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "SerpAPI failed.");
  return data;
}

function knownForFrom(results) {
  const text = results.map(r => `${r.title} ${r.snippet}`).join(" ").toLowerCase();
  const map = [
    ["public relations", "Public relations"],
    ["personal branding", "Personal branding"],
    ["reputation", "Reputation management"],
    ["visibility", "Media visibility"],
    ["media", "Media visibility"],
    ["speaker", "Speaking"],
    ["keynote", "Keynote speaking"],
    ["award", "Awards and recognition"],
    ["author", "Author"],
    ["founder", "Founder"],
    ["ceo", "Executive leadership"],
    ["nonprofit", "Nonprofit leadership"],
    ["political", "Political visibility"],
    ["communications", "Communications strategy"],
    ["consultant", "Consulting"]
  ];

  const found = [];
  for (const [term, label] of map) {
    if (text.includes(term) && !found.includes(label)) found.push(label);
  }
  return found.length ? found.slice(0, 6) : ["Professional reputation", "Visibility", "Authority building"];
}

function sourceName(r) {
  return r.source || domainOf(r.link) || "source";
}

function bullets(items, fallback) {
  if (!items || !items.length) return fallback;
  return items.map(r => `• ${r.title} (${sourceName(r)})`).join("\n");
}

function buildSummary({ name, organization, newsResults, speakingResults, awardResults, knownFor, checks }) {
  const roleLine = organization
    ? `${name} is a public-facing professional connected to ${organization}.`
    : `${name} is a public-facing professional with visible online reputation signals.`;

  const identityNotes = [];
  if (checks.linkedin) identityNotes.push("LinkedIn profile found and used as the primary identity anchor.");
  if (checks.knowledgePanel) identityNotes.push("Google Knowledge Panel signal detected.");
  if (checks.wikipedia) identityNotes.push("Wikipedia signal detected.");
  if (checks.wikidata) identityNotes.push("Wikidata signal detected.");
  if (!identityNotes.length) identityNotes.push("Authority identity signals should be manually verified.");

  return [
    `Who ${name} Is`,
    `${roleLine} Based on available search signals, ${name} is most strongly associated with ${knownFor.join(", ")}. The submitted LinkedIn URL should remain the identity anchor so unrelated results are not mixed into the report.`,
    "",
    "Key Areas of Expertise",
    knownFor.map(x => `• ${x}`).join("\n"),
    "",
    "Notable Recognition",
    bullets(awardResults, "• No verified third-party awards or recognition were pulled yet. Look for best-of lists, rankings, honoree lists, trailblazer lists, most admired lists, top 10/top 50 lists, and official recognition platforms."),
    "",
    "Media Visibility",
    bullets(newsResults, "• No verified third-party media mentions were pulled yet. Look for articles, interviews, profiles, spotlights, expert commentary, podcasts, and news stories written by someone else."),
    "",
    "Speaking and Authority Signals",
    bullets(speakingResults, "• No verified speaking activity was pulled yet. Add conferences, summits, panels, keynotes, webinars, podcasts, and lectures."),
    "",
    "Identity Check",
    identityNotes.map(x => `• ${x}`).join("\n"),
    "",
    "Bottom Line",
    `${name}'s strongest verified positioning should come from third-party proof: media articles, rankings, awards, speaking engagements, and recognized authority assets. Remove self-authored posts, social media, reviews, and unrelated people with similar names.`
  ].join("\n");
}

exports.handler = async function(event) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const name = (body.name || body.query || "").trim();
    const linkedin = (body.linkedin || "").trim();
    const organization = (body.organization || "").trim();
    const website = (body.website || "").trim();

    if (!name) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok:false, error:"Name is required." }) };
    }

    if (!linkedin) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok:false, error:"LinkedIn URL is required to confirm the right person." }) };
    }

    const orgPart = organization ? `"${organization}"` : "";
    const websitePart = website ? `"${website}"` : "";

    const [webRaw, linkedinRaw, newsRaw, mediaRaw, speakingRaw, awardsRaw, awardsPlatformRaw] = await Promise.all([
      serp({ engine:"google", q:`"${name}" ${orgPart} ${websitePart}`, num:10, hl:"en", gl:"us" }),
      serp({ engine:"google", q:`"${name}" "${linkedin}"`, num:10, hl:"en", gl:"us" }),
      serp({ engine:"google_news", q:`"${name}" ${orgPart}`, hl:"en", gl:"us" }),
      serp({ engine:"google", q:`"${name}" ${orgPart} (article OR interview OR profile OR spotlight OR featured OR quoted OR "expert commentary" OR podcast OR magazine OR newspaper) -site:facebook.com -site:instagram.com -site:tiktok.com -site:youtube.com -site:linkedin.com`, num:10, hl:"en", gl:"us", tbs:"qdr:y" }),
      serp({ engine:"google", q:`"${name}" ${orgPart} (speaker OR keynote OR panel OR conference OR summit OR forum OR webinar OR workshop OR podcast OR lecture)`, num:10, hl:"en", gl:"us" }),
      serp({ engine:"google", q:`"${name}" ${orgPart} ("best of" OR "top 10" OR "top 15" OR "top 20" OR "top 50" OR ranked OR ranking OR "most admired" OR trailblazer OR "leading women" OR honoree OR winner OR finalist OR "40 under 40" OR "women to watch" OR "best in" OR "top in") -review -reviews -testimonial -facebook -instagram`, num:10, hl:"en", gl:"us" }),
      serp({ engine:"google", q:`"${name}" ${orgPart} (site:clutch.co OR site:designrush.com OR site:themanifest.com OR site:thedailyrecord.com OR site:bizjournals.com OR site:forbes.com OR site:inc.com OR site:blackenterprise.com OR site:essence.com OR site:ebony.com) ("top" OR "best" OR ranked OR recognition OR award OR honoree OR trailblazer)`, num:10, hl:"en", gl:"us" })
    ]);

    const webResults = clean([...(linkedinRaw.organic_results || []), ...(webRaw.organic_results || [])], 12);
    const rawMedia = clean([...(newsRaw.news_results || []), ...(mediaRaw.organic_results || [])], 20);
    const rawAwards = clean([...(awardsRaw.organic_results || []), ...(awardsPlatformRaw.organic_results || [])], 20);

    const newsResults = filterThirdPartyMedia(rawMedia, name);
    const awardResults = filterAwardsOnly(rawAwards);
    const speakingResults = clean(speakingRaw.organic_results || [], 10).filter(r => !isBlocked(r)).slice(0, 10);

    const allResults = [...webResults, ...newsResults, ...speakingResults, ...awardResults];
    const knownFor = knownForFrom(allResults);

    const linkedinMatch = webResults.some(x => (x.link || "").toLowerCase().includes("linkedin.com"));
    const checks = {
      knowledgePanel: Boolean(webRaw.knowledge_graph || linkedinRaw.knowledge_graph),
      wikipedia: webResults.some(x => /wikipedia\.org/i.test(x.link)),
      wikidata: webResults.some(x => /wikidata\.org/i.test(x.link)),
      linkedin: linkedinMatch,
      officialWebsite: website ? webResults.some(x => (x.link || "").includes(website.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0])) : webResults.length > 0
    };

    const confidence = Math.min(98, 55 + (linkedinMatch ? 20 : 0) + Math.min(webResults.length * 2, 16) + Math.min(newsResults.length * 2, 10) + Math.min(speakingResults.length * 2, 8) + Math.min(awardResults.length * 2, 8));

    const executiveSummary = buildSummary({ name, organization, newsResults, speakingResults, awardResults, knownFor, checks });
    const knownForSummary = `${name} appears connected to ${knownFor.join(", ")}. Media mentions are limited to third-party articles and expert mentions. Awards are limited to third-party rankings, honors, best-of lists, trailblazer lists, and formal recognition.`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok:true,
        name,
        linkedin,
        organization,
        website,
        generatedAt:new Date().toISOString(),
        confidence,
        knownFor,
        scores: {
          reputationScore: Math.min(96, 55 + webResults.length * 2 + newsResults.length * 2 + speakingResults.length + awardResults.length),
          orgScore: organization ? 74 : 62,
          riskScore: 28,
          opportunityScore: 88,
          assetScore: Math.min(92, 50 + speakingResults.length * 2 + awardResults.length * 2 + newsResults.length),
          bioScore: 62,
          authorityScore: Math.min(94, 50 + speakingResults.length * 3 + awardResults.length * 2 + newsResults.length)
        },
        executiveSummary,
        knownForSummary,
        webResults,
        newsResults,
        speakingResults,
        awardResults,
        checks
      })
    };
  } catch (error) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok:false, error:error.message }) };
  }
};
