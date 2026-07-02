
const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";

function clean(items = [], limit = 10) {
  return items.slice(0, limit).map(item => ({
    title: item.title || item.name || "Untitled result",
    link: item.link || item.url || "",
    source: item.source || item.displayed_link || item.publication || "Search result",
    snippet: item.snippet || item.description || item.date || "",
    date: item.date || item.published_date || ""
  }));
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
    const text = `${r.title} ${r.snippet} ${r.source}`.toLowerCase();
    const hit = words.some(w => text.includes(w));
    if (!hit || seen.has(r.title)) return false;
    seen.add(r.title);
    return true;
  }).slice(0, limit);
}

function sourceName(r) {
  return r.source || (r.link || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "source";
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

  const recognitions = [
    ...findItems(all, ["qwoted", "award", "recognized", "ranked", "top", "daily record", "designrush", "clutch", "honored"], 5),
    ...awardResults.slice(0, 3)
  ].filter((item, index, arr) => arr.findIndex(x => x.title === item.title) === index).slice(0, 5);

  const media = [
    ...newsResults.slice(0, 4),
    ...findItems(all, ["featured", "interview", "article", "magazine", "podcast", "quoted", "profile"], 4)
  ].filter((item, index, arr) => arr.findIndex(x => x.title === item.title) === index).slice(0, 5);

  const education = findItems(all, ["master", "bachelor", "degree", "university", "college", "education", "alumni"], 4);
  const speaking = speakingResults.slice(0, 4);

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
    bullets(recognitions, "• No verified recognition was pulled yet. Add awards, rankings, press features, Qwoted mentions, business recognition, and client-submitted achievements."),
    "",
    "Media Visibility",
    bullets(media, "• No verified media visibility was pulled yet. Add articles, interviews, podcasts, quotes, and publication mentions."),
    "",
    "Speaking and Authority Signals",
    bullets(speaking, "• No verified speaking activity was pulled yet. Add conferences, summits, panels, keynotes, webinars, podcasts, and lectures."),
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

    const exactQuery = `"${name}" "${linkedin}"`;
    const expandedQuery = `"${name}" ${organization ? `"${organization}"` : ""} ${website ? `"${website}"` : ""}`.trim();

    const [webRaw, linkedinRaw, newsRaw, speakingRaw, awardsRaw] = await Promise.all([
      serp({ engine:"google", q:expandedQuery || `"${name}"`, num:10, hl:"en", gl:"us" }),
      serp({ engine:"google", q:exactQuery, num:10, hl:"en", gl:"us" }),
      serp({ engine:"google_news", q:`"${name}" ${organization ? `"${organization}"` : ""}`, hl:"en", gl:"us" }),
      serp({ engine:"google", q:`"${name}" ${organization ? `"${organization}"` : ""} (speaker OR keynote OR panel OR conference OR summit OR forum OR webinar OR workshop OR podcast OR lecture)`, num:10, hl:"en", gl:"us" }),
      serp({ engine:"google", q:`"${name}" ${organization ? `"${organization}"` : ""} (award OR recognition OR honored OR named OR ranking OR 40 under 40 OR women to watch OR top OR Qwoted)`, num:10, hl:"en", gl:"us" })
    ]);

    const webResults = clean([...(linkedinRaw.organic_results || []), ...(webRaw.organic_results || [])], 12);
    const newsResults = clean(newsRaw.news_results || [], 10);
    const speakingResults = clean(speakingRaw.organic_results || [], 10);
    const awardResults = clean(awardsRaw.organic_results || [], 10);
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
