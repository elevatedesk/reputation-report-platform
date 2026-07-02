
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
    ["public relations", "Public Relations"],
    ["reputation", "Reputation Strategy"],
    ["visibility", "Visibility"],
    ["media", "Media Visibility"],
    ["speaker", "Speaking"],
    ["keynote", "Keynote Speaking"],
    ["award", "Awards & Recognition"],
    ["author", "Author"],
    ["founder", "Founder"],
    ["ceo", "Executive Leadership"],
    ["nonprofit", "Nonprofit Leadership"],
    ["political", "Public Affairs"],
    ["entrepreneur", "Entrepreneurship"],
    ["women", "Women in Leadership"],
    ["communications", "Communications"],
    ["consultant", "Consulting"],
    ["personal branding", "Personal Branding"]
  ];

  const found = [];
  for (const [term, label] of map) {
    if (text.includes(term) && !found.includes(label)) found.push(label);
  }
  return found.length ? found.slice(0, 6) : ["Public Profile", "Professional Reputation", "Authority Building"];
}

function pickEvidence(results, words, limit = 3) {
  const lowerWords = words.map(w => w.toLowerCase());
  return results
    .filter(r => {
      const t = `${r.title} ${r.snippet} ${r.source}`.toLowerCase();
      return lowerWords.some(w => t.includes(w));
    })
    .slice(0, limit);
}

function sourceName(r) {
  return r.source || (r.link || "").replace(/^https?:\/\//, "").split("/")[0] || "source";
}

function bullets(items, fallback) {
  if (!items || !items.length) return fallback;
  return items.map(r => `• ${r.title} (${sourceName(r)})`).join("\n");
}

function uniqueByTitle(items) {
  const seen = new Set();
  return items.filter(x => {
    if (seen.has(x.title)) return false;
    seen.add(x.title);
    return true;
  });
}

function buildCopilotSummary({ name, organization, webResults, newsResults, speakingResults, awardResults, knownFor, checks }) {
  const all = [...webResults, ...newsResults, ...speakingResults, ...awardResults];

  const achievementSignals = uniqueByTitle([
    ...pickEvidence(all, ["award", "recognized", "honored", "ranked", "top", "qwoted", "daily record", "designrush", "clutch"], 6),
    ...awardResults.slice(0, 5)
  ]).slice(0, 5);

  const mediaSignals = uniqueByTitle([
    ...newsResults.slice(0, 4),
    ...pickEvidence(all, ["interview", "featured", "article", "magazine", "podcast", "quoted"], 5)
  ]).slice(0, 5);

  const educationSignals = pickEvidence(all, ["university", "degree", "bachelor", "master", "education", "college", "alumni"], 4);
  const speakingSignals = speakingResults.slice(0, 5);

  const headline = `${name} appears to be a public-facing professional connected to ${knownFor.join(", ")}${organization ? ` and ${organization}` : ""}. The submitted LinkedIn URL is being used as the primary identity signal so the report focuses on the correct person, not just anyone with a similar name.`;

  const coreTakeaway = `${name}'s strongest reputation signals appear to be ${knownFor.slice(0, 4).join(", ")}. The profile becomes stronger when verified media mentions, recognitions, speaking activity, education, and leadership assets are added to the report and connected back to the same LinkedIn identity.`;

  return [
    headline,
    "",
    "Core Takeaway",
    coreTakeaway,
    "",
    "Notable Achievements",
    bullets(achievementSignals, "• No verified achievements were pulled yet. Add awards, rankings, recognitions, press features, and client-submitted accomplishments to strengthen this section."),
    "",
    "Media + Public Visibility",
    bullets(mediaSignals, "• No verified recent media signals were pulled yet. Add articles, interviews, podcasts, quotes, and press mentions that mention the person or organization."),
    "",
    "Speaking + Authority Signals",
    bullets(speakingSignals, "• No verified speaking signals were pulled yet. Add conferences, panels, keynotes, summits, webinars, podcasts, and university lectures."),
    "",
    "Education + Background",
    bullets(educationSignals, "• Education background was not clearly identified from this first scan. Add degrees, universities, certifications, fellowships, and executive education manually if known."),
    "",
    "Identity Review",
    "Because this report uses the submitted name and LinkedIn URL, the LinkedIn profile should remain the primary identity anchor. If search results show similar names, those items should be reviewed before they are added to the final report.",
    "",
    "Recommended Next Steps",
    "• Verify LinkedIn profile and official website.\n• Confirm Knowledge Panel, Wikipedia, and Wikidata status.\n• Add missing awards, speaking engagements, media mentions, board roles, publications, and signature projects.\n• Remove unrelated results connected to people with similar names.\n• Use verified findings to improve the executive bio and final Reputation 360 report."
  ].join("\n");
}

function buildKnownForSummary(name, knownFor, checks) {
  const proof = [];
  if (checks.linkedin) proof.push("LinkedIn profile");
  if (checks.knowledgePanel) proof.push("Google Knowledge Panel signal");
  if (checks.wikipedia) proof.push("Wikipedia signal");
  if (checks.wikidata) proof.push("Wikidata signal");
  const proofText = proof.length ? ` Current authority signals include ${proof.join(", ")}.` : " Authority signals still need verification.";
  return `${name} is currently showing reputation signals around ${knownFor.join(", ")}.${proofText} This should be reviewed like an intelligence snapshot, not a final biography, until each item is verified.`;
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
      serp({ engine:"google", q:`"${name}" ${organization ? `"${organization}"` : ""} (award OR recognition OR honored OR named OR ranking OR 40 under 40 OR women to watch OR top)`, num:10, hl:"en", gl:"us" })
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

    const executiveSummary = buildCopilotSummary({ name, organization, webResults, newsResults, speakingResults, awardResults, knownFor, checks });
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
