
const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";

const AWARD_SOURCES = [
  "clutch.co", "designrush.com", "themanifest.com", "dailyrecord.com", "thedailyrecord.com",
  "bizjournals.com", "forbes.com", "inc.com", "entrepreneur.com", "fortune.com",
  "fastcompany.com", "prnews.io", "prdaily.com", "ragan.com", "campaignlive.com",
  "blackenterprise.com", "essence.com", "ebony.com", "adweek.com", "prweek.com"
];

const AWARD_TERMS = [
  "award", "awards", "recognition", "recognized", "honoree", "honored", "named",
  "ranked", "ranking", "top", "best", "leading", "leader", "leaders", "trailblazer",
  "trailblazers", "most admired", "most influential", "women to watch", "40 under 40",
  "50 under 50", "30 under 30", "power list", "notable", "list", "winner", "finalist",
  "nominee", "women-owned", "black business", "business list"
];

const MEDIA_TERMS = [
  "article", "interview", "profile", "spotlight", "feature", "featured", "quoted",
  "media mention", "podcast", "magazine", "newspaper", "press", "news", "story",
  "column", "guest column", "q&a", "conversation"
];

const BLOCK_SOCIAL = [
  "facebook.com", "instagram.com", "threads.net", "tiktok.com", "x.com", "twitter.com",
  "youtube.com", "pinterest.com"
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

function isBlockedSocial(r) {
  const t = textOf(r);
  return BLOCK_SOCIAL.some(d => t.includes(d));
}

function hasAny(text, words) {
  return words.some(w => text.includes(w.toLowerCase()));
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

function filterAwards(items) {
  return unique(items)
    .filter(r => {
      if (isBlockedSocial(r)) return false;
      const text = textOf(r);
      const domain = domainOf(r.link);
      const sourceAllowed = AWARD_SOURCES.some(src => domain.includes(src) || text.includes(src));
      const awardLanguage = hasAny(text, AWARD_TERMS);
      const looksLikeList = /\b(top|best|leading|notable|most admired|most influential|trailblazer|40 under 40|50 under 50|30 under 30)\b/i.test(text);
      return awardLanguage && (sourceAllowed || looksLikeList);
    })
    .slice(0, 10);
}

function filterMedia(items) {
  return unique(items)
    .filter(r => {
      if (isBlockedSocial(r)) return false;
      const text = textOf(r);
      const awardOnly = hasAny(text, ["top pr firm", "top firms", "ranked", "ranking", "award", "awards", "honoree", "winner", "finalist"]);
      const mediaLanguage = hasAny(text, MEDIA_TERMS);
      return mediaLanguage && !awardOnly;
    })
    .slice(0, 6);
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

function findItems(results, keywords, limit = 4) {
  const words = keywords.map(w => w.toLowerCase());
  const seen = new Set();
  return results.filter(r => {
    const text = textOf(r);
    const hit = words.some(w => text.includes(w));
    if (!hit || seen.has(r.title) || isBlockedSocial(r)) return false;
    seen.add(r.title);
    return true;
  }).slice(0, limit);
}

function sourceName(r) {
  return r.source || domainOf(r.link) || "source";
}

function bullets(items, fallback) {
  if (!items || !items.length) return fallback;
  return items.map(r => `• ${r.title} (${sourceName(r)})`).join("\n");
}

function buildPersonLookupSummary({ name, organization, webResults, newsResults, speakingResults, awardResults, knownFor, checks }) {
  const all = [...webResults, ...newsResults, ...speakingResults, ...awardResults];

  const roleLine = organization
    ? `${name} is a public-facing professional connected to ${organization}.`
    : `${name} is a public-facing professional with visible online reputation signals.`;

  const expertise = knownFor.length
    ? knownFor.map(x => `• ${x}`).join("\n")
    : "• Reputation\n• Visibility\n• Authority building";

  const education = findItems(all, ["master", "bachelor", "degree", "university", "college", "education", "alumni"], 4);

  const identityNotes = [];
  if (checks.linkedin) identityNotes.push("LinkedIn profile found and used as the primary identity anchor.");
  if (checks.knowledgePanel) identityNotes.push("Google Knowledge Panel signal detected.");
  if (checks.wikipedia) identityNotes.push("Wikipedia signal detected.");
  if (checks.wikidata) identityNotes.push("Wikidata signal detected.");
  if (!identityNotes.length) identityNotes.push("Authority identity signals should be manually verified.");

  return [
    `Who ${name} Is`,
    `${roleLine} Based on the available search signals, ${name} is most strongly associated with ${knownFor.join(", ")}. The submitted LinkedIn URL should be treated as the main identity anchor so the report does not mix this person with people who have similar names.`,
    "",
    "Key Areas of Expertise",
    expertise,
    "",
    "Notable Recognition",
    bullets(awardResults, "• No verified third-party recognition was pulled yet. Add awards, rankings, recognitions, Qwoted mentions, business lists, and client-submitted achievements."),
    "",
    "Media Visibility",
    bullets(newsResults, "• No verified media visibility was pulled yet. Add articles, interviews, podcasts, quotes, spotlights, and publication mentions."),
    "",
    "Speaking and Authority Signals",
    bullets(speakingResults, "• No verified speaking activity was pulled yet. Add conferences, summits, panels, keynotes, webinars, podcasts, and lectures."),
    "",
    "Education and Background",
    bullets(education, "• Education was not clearly identified in this scan. Add degrees, schools, certifications, fellowships, and executive education if known."),
    "",
    "Identity Check",
    identityNotes.map(x => `• ${x}`).join("\n"),
    "",
    "Bottom Line",
    `${name}'s profile should be positioned around ${knownFor.slice(0, 4).join(", ")}. The next step is to verify the strongest results, remove unrelated items, and use the confirmed assets to strengthen the final bio, Reputation 360 report, and visibility strategy.`
  ].join("\n");
}

function buildKnownForSummary(name, knownFor, checks) {
  const proof = [];
  if (checks.linkedin) proof.push("LinkedIn");
  if (checks.knowledgePanel) proof.push("Google Knowledge Panel");
  if (checks.wikipedia) proof.push("Wikipedia");
  if (checks.wikidata) proof.push("Wikidata");
  return `${name} appears connected to ${knownFor.join(", ")}. ${proof.length ? "Authority signals found: " + proof.join(", ") + "." : "Authority signals still need manual verification."}`;
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
    const expandedQuery = `"${name}" ${orgPart} ${website ? `"${website}"` : ""}`.trim();

    const [webRaw, linkedinRaw, newsRaw, mediaRaw, speakingRaw, awardsRaw, awardsPlatformRaw] = await Promise.all([
      serp({ engine:"google", q:expandedQuery || `"${name}"`, num:10, hl:"en", gl:"us" }),
      serp({ engine:"google", q:`"${name}" "${linkedin}"`, num:10, hl:"en", gl:"us" }),

      // Last 12 months news and media-style search.
      serp({ engine:"google_news", q:`"${name}" ${orgPart}`, hl:"en", gl:"us" }),
      serp({ engine:"google", q:`"${name}" ${orgPart} (article OR interview OR profile OR spotlight OR featured OR quote OR podcast OR magazine OR newspaper)`, num:10, hl:"en", gl:"us", tbs:"qdr:y" }),

      // Speaking.
      serp({ engine:"google", q:`"${name}" ${orgPart} (speaker OR keynote OR panel OR conference OR summit OR forum OR webinar OR workshop OR podcast OR lecture)`, num:10, hl:"en", gl:"us" }),

      // Recognition only.
      serp({ engine:"google", q:`"${name}" ${orgPart} (award OR awards OR recognition OR recognized OR honored OR honoree OR finalist OR winner OR ranked OR top OR best OR leading OR trailblazer OR "40 under 40" OR "50 under 50" OR "women to watch" OR "most admired" OR "most influential")`, num:10, hl:"en", gl:"us" }),

      // Third-party platform recognition search.
      serp({ engine:"google", q:`"${name}" ${orgPart} (site:clutch.co OR site:designrush.com OR site:themanifest.com OR site:thedailyrecord.com OR site:bizjournals.com OR site:forbes.com OR site:inc.com OR site:blackenterprise.com OR site:essence.com OR site:ebony.com)`, num:10, hl:"en", gl:"us" })
    ]);

    const webResults = clean([...(linkedinRaw.organic_results || []), ...(webRaw.organic_results || [])], 12);
    const rawNews = clean([...(newsRaw.news_results || []), ...(mediaRaw.organic_results || [])], 16);
    const rawAwards = clean([...(awardsRaw.organic_results || []), ...(awardsPlatformRaw.organic_results || [])], 20);

    const newsResults = filterMedia(rawNews);
    const awardResults = filterAwards(rawAwards);
    const speakingResults = clean(speakingRaw.organic_results || [], 10).filter(r => !isBlockedSocial(r)).slice(0, 10);

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

    const executiveSummary = buildPersonLookupSummary({ name, organization, webResults, newsResults, speakingResults, awardResults, knownFor, checks });
    const knownForSummary = buildKnownForSummary(name, knownFor, checks);

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
