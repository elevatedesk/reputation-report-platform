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
    ["women", "Women in Leadership"]
  ];

  const found = [];
  for (const [term, label] of map) {
    if (text.includes(term) && !found.includes(label)) found.push(label);
  }
  return found.length ? found.slice(0, 6) : ["Public Profile", "Professional Reputation", "Authority Building"];
}

exports.handler = async function(event) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const query = (body.query || "").trim();
    if (!query) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok:false, error:"Missing query." }) };
    }

    const [webRaw, newsRaw, speakingRaw, awardsRaw] = await Promise.all([
      serp({ engine:"google", q:`"${query}"`, num:10, hl:"en", gl:"us" }),
      serp({ engine:"google_news", q:`"${query}"`, hl:"en", gl:"us" }),
      serp({ engine:"google", q:`"${query}" (speaker OR keynote OR panel OR conference OR summit OR forum OR webinar OR workshop OR podcast OR lecture)`, num:10, hl:"en", gl:"us" }),
      serp({ engine:"google", q:`"${query}" (award OR recognition OR honored OR named OR ranking OR 40 under 40 OR women to watch)`, num:10, hl:"en", gl:"us" })
    ]);

    const webResults = clean(webRaw.organic_results || []);
    const newsResults = clean(newsRaw.news_results || []);
    const speakingResults = clean(speakingRaw.organic_results || []);
    const awardResults = clean(awardsRaw.organic_results || []);
    const allResults = [...webResults, ...newsResults, ...speakingResults, ...awardResults];
    const knownFor = knownForFrom(allResults);

    const confidence = Math.min(98, 45 + Math.min(webResults.length * 3, 24) + Math.min(newsResults.length * 2, 12) + Math.min(speakingResults.length * 2, 10) + Math.min(awardResults.length * 2, 10));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok:true,
        query,
        personName: query,
        confidence,
        knownFor,
        scores: {
          reputationScore: Math.min(96, 55 + webResults.length * 2 + newsResults.length * 2 + speakingResults.length + awardResults.length),
          orgScore: 68,
          riskScore: 28,
          opportunityScore: 88,
          assetScore: 72,
          bioScore: 62,
          authorityScore: Math.min(94, 50 + speakingResults.length * 3 + awardResults.length * 2 + newsResults.length)
        },
        executiveSummary: `${query} has a visible online footprint based on live search signals. Strong early signals include ${knownFor.join(", ")}. Review and verify all results before client delivery.`,
        knownForSummary: `Based on live search signals, ${query} appears connected to ${knownFor.join(", ")}. This is a first-pass reputation snapshot and should be verified against official bios, LinkedIn, media, awards, speaking history, and client-submitted assets.`,
        webResults,
        newsResults,
        speakingResults,
        awardResults,
        checks: {
          knowledgePanel: Boolean(webRaw.knowledge_graph),
          wikipedia: webResults.some(x => /wikipedia\.org/i.test(x.link)),
          wikidata: webResults.some(x => /wikidata\.org/i.test(x.link)),
          linkedin: webResults.some(x => /linkedin\.com/i.test(x.link)),
          officialWebsite: webResults.length > 0
        }
      })
    };
  } catch (error) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok:false, error:error.message }) };
  }
};
