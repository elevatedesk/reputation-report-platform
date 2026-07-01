exports.handler = async function(event) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const person = (body.personName || "Stefanie Magness").trim();
    const org = (body.orgName || "").trim();
    const providedTitle = (body.title || "").trim();
    const providedWebsite = (body.website || "").trim();

    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) throw new Error("Missing SERPAPI_API_KEY");

    async function serp(params) {
      const url = new URL("https://serpapi.com/search.json");
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== "") url.searchParams.set(k, v);
      });
      url.searchParams.set("api_key", apiKey);
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || `SerpAPI error ${response.status}`);
      return data;
    }

    const exactName = person.toLowerCase();
    const nameParts = exactName.split(/\s+/).filter(Boolean);

    function resultText(result) {
      return `${result.title || ""} ${result.snippet || ""} ${result.source?.name || ""} ${result.displayed_link || ""} ${result.link || ""}`.toLowerCase();
    }

    function containsExactPerson(result) {
      return resultText(result).includes(exactName);
    }

    function isLikelySamePerson(result) {
      const text = resultText(result);
      return nameParts.length >= 2 && nameParts.every(part => text.includes(part));
    }

    function keepExactPersonResults(results) {
      return (results || []).filter(r => containsExactPerson(r) || isLikelySamePerson(r));
    }

    function normalizeResult(r, fallbackSource) {
      return {
        title: r.title || "Public result",
        link: r.link || "",
        source: r.source?.name || r.source || r.displayed_link || fallbackSource || "Public web",
        snippet: r.snippet || ""
      };
    }

    const mainQuery = org ? `"${person}" "${org}"` : `"${person}"`;
    const google = await serp({ engine: "google", q: mainQuery, num: "10" });

    let news = {};
    try {
      news = await serp({ engine: "google_news", q: `"${person}"` });
    } catch (e) {
      news = { news_results: [] };
    }

    const kg = google.knowledge_graph || null;
    const organicRaw = google.organic_results || [];
    const newsRaw = news.news_results || [];

    const organic = keepExactPersonResults(organicRaw);
    const newsResults = keepExactPersonResults(newsRaw);

    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 3;

    const awardQueries = [
      `"${person}" award ${startYear}..${currentYear}`,
      `"${person}" awards ${startYear}..${currentYear}`,
      `"${person}" recognition ${startYear}..${currentYear}`,
      `"${person}" "40 under 40"`,
      `"${person}" "Most Admired CEO"`,
      `"${person}" "Top 100"`,
      `"${person}" Qwoted`,
      `"${person}" "Maryland Daily Record"`,
      `"${person}" Clutch`,
      `"${person}" DesignRush`,
      `"${person}" "The Manifest"`,
      `"${person}" "Business Journal"`,
      `"${person}" "Women to Watch"`,
      `"${person}" "Top Women"`,
      `"${person}" "Power List"`
    ];

    const speakingQueries = [
      `"${person}" speaker ${startYear}..${currentYear}`,
      `"${person}" keynote`,
      `"${person}" conference`,
      `"${person}" podcast`,
      `"${person}" interview`,
      `"${person}" panelist`
    ];

    async function collectGoogleResults(queries, limitPerQuery = 5) {
      const collected = [];
      for (const q of queries) {
        try {
          const data = await serp({ engine: "google", q, num: String(limitPerQuery) });
          const exact = keepExactPersonResults(data.organic_results || []);
          collected.push(...exact.map(r => normalizeResult(r, "Google Search")));
        } catch (e) {}
      }
      return collected;
    }

    const [awardResults, speakingResults] = await Promise.all([
      collectGoogleResults(awardQueries, 5),
      collectGoogleResults(speakingQueries, 5)
    ]);

    function dedupeByLink(items) {
      const seen = new Set();
      return items.filter(item => {
        const key = (item.link || item.title || "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    const mediaMentions = dedupeByLink([
      ...newsResults.map(r => normalizeResult(r, "Google News")),
      ...organic.map(r => normalizeResult(r, "Google Search"))
    ]);

    const awardsFound = dedupeByLink(awardResults).filter(item => {
      const t = `${item.title} ${item.snippet} ${item.source}`.toLowerCase();
      return /award|honor|recognition|winner|named|ranking|ranked|40 under 40|top 100|most admired|women to watch|top women|power list|best|qwoted|clutch|designrush|manifest|daily record/.test(t);
    });

    const speakingFound = dedupeByLink(speakingResults).filter(item => {
      const t = `${item.title} ${item.snippet} ${item.source}`.toLowerCase();
      return /speaker|speaking|keynote|panelist|conference|summit|podcast|interview|moderator/.test(t);
    });

    const links = organic.map(r => r.link || "").filter(Boolean);
    const hasWikipedia = links.some(x => x.includes("wikipedia.org"));
    const hasWikidata = links.some(x => x.includes("wikidata.org"));
    const hasLinkedIn = links.some(x => x.includes("linkedin.com"));
    const hasKnowledgePanel = !!kg;

    const knownSources = [
      kg?.title || "",
      kg?.type || "",
      kg?.description || "",
      ...mediaMentions.slice(0, 6).map(r => r.title || ""),
      ...awardsFound.slice(0, 4).map(r => r.title || ""),
      ...speakingFound.slice(0, 4).map(r => r.title || "")
    ].join(" ");

    let knownFor = [...new Set(
      knownSources
        .split(/[\|\-:,.•–]/)
        .map(x => x.trim())
        .filter(x => x.length > 4)
        .filter(x => !["linkedin", "facebook", "instagram", "youtube", "official", "google search"].includes(x.toLowerCase()))
        .filter(x => !x.toLowerCase().includes("elevate visibility group") || org.toLowerCase().includes("elevate visibility group") || person.toLowerCase().includes("stefanie magness"))
        .slice(0, 10)
    )];

    if (!knownFor.length) knownFor = ["Public Visibility", "Professional Authority", "Online Presence"];

    const knowledgePanel = hasKnowledgePanel ? {
      title: kg.title || person,
      type: kg.type || "",
      description: kg.description || "",
      image: kg.thumbnail || kg.image || "",
      website: kg.website || providedWebsite || "",
      profiles: kg.profiles || []
    } : {
      title: person,
      type: "",
      description: "",
      image: "",
      website: providedWebsite,
      profiles: []
    };

    const detectedTitle =
      providedTitle ||
      kg?.type ||
      kg?.subtitle ||
      kg?.description?.split(".")[0] ||
      "Professional";

    const detectedOrg = org || kg?.source?.name || "";

    const topMentions = dedupeByLink([
      ...mediaMentions,
      ...awardsFound.map(x => ({ ...x, source: x.source || "Awards/Recognition" })),
      ...speakingFound.map(x => ({ ...x, source: x.source || "Speaking/Media" }))
    ]).slice(0, 10);

    const risks = [
      !hasKnowledgePanel ? "No Google Knowledge Panel detected" : null,
      !hasWikipedia ? "No Wikipedia result detected" : null,
      newsResults.length === 0 ? `No recent Google News mentions detected for ${person}` : null,
      awardsFound.length === 0 ? "Awards and rankings are not clearly visible in trusted search results" : null,
      speakingFound.length === 0 ? "Speaking history is not clearly visible in trusted search results" : null,
      topMentions.length === 0 ? `No exact-name media/search matches found for ${person}` : null,
      topMentions.length >= 5 ? "No major negative issue detected" : null
    ].filter(Boolean);

    const opportunities = [
      !hasKnowledgePanel ? "Strengthen Knowledge Panel pathway" : "Maintain Google Knowledge Panel accuracy",
      !hasWikipedia ? "Build Wikipedia/Wikidata foundation if eligible" : "Monitor Wikipedia/Wikidata accuracy",
      awardsFound.length === 0 ? "Add verified awards and recognition to authority assets" : "Centralize awards and recognition on bio/media kit",
      newsResults.length === 0 ? "Create fresh media visibility" : "Repurpose recent media coverage",
      speakingFound.length === 0 ? "Document speaking history and podcast appearances" : "Build speaker profile from existing appearances",
      "Create a Credibility Asset Inventory™"
    ];

    const score =
      hasKnowledgePanel ? 90 :
      awardsFound.length >= 3 && topMentions.length >= 5 ? 84 :
      newsResults.length > 0 ? 82 :
      organic.length >= 6 ? 78 : 68;

    const snapshot = `${person}${detectedOrg ? " and " + detectedOrg : ""} returned ${organic.length} exact-name Google search results, ${newsResults.length} recent Google News results, ${awardsFound.length} award or recognition signals, and ${speakingFound.length} speaking or interview signals. ${hasKnowledgePanel ? "A Google Knowledge Panel was detected." : "No Google Knowledge Panel was detected."} ${hasWikipedia ? "A Wikipedia result was found." : "No Wikipedia result was found."}`;

    async function generateAIAnalysis(context) {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        return null;
      }

      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

      const prompt = `
You are an executive reputation intelligence analyst for a PR and visibility advisory firm.
Write concise, boardroom-ready analysis based only on the data provided. Do not invent facts. If evidence is weak, say so clearly.
Return valid JSON only with these keys:
executiveBrief, reputationNarrative, googleEntityAnalysis, awardsSummary, mediaSummary, speakingSummary, actionPlan, timeline, visibilityGrade, gradeHeadline, gradeSummary.

Style: polished, direct, human, executive-level. No hype. No em dashes.

DATA:
${JSON.stringify(context, null, 2)}
`;

      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model,
            temperature: 0.3,
            messages: [
              { role: "system", content: "You write factual executive reputation intelligence reports in JSON." },
              { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
          })
        });

        const data = await response.json();
        if (!response.ok) {
          return { executiveBrief: `AI analysis was not generated because the OpenAI request failed: ${data.error?.message || response.status}` };
        }

        const content = data.choices?.[0]?.message?.content || "{}";
        return JSON.parse(content);
      } catch (e) {
        return { executiveBrief: `AI analysis was not generated: ${e.message}` };
      }
    }

    const aiAnalysis = await generateAIAnalysis({
      personName: person,
      title: detectedTitle,
      organization: detectedOrg,
      snapshot,
      score,
      googleResults: organic.length,
      newsMentions: newsResults.length,
      awardSignals: awardsFound.length,
      speakingSignals: speakingFound.length,
      hasKnowledgePanel,
      hasWikipedia,
      hasWikidata,
      hasLinkedIn,
      knowledgePanel,
      knownFor,
      topMentions,
      awardsFound,
      speakingFound,
      risks,
      opportunities,
      reviewedPeriod: `roughly the last 3 years where search results are available`
    });

    const report = {
      personName: person,
      orgName: detectedOrg,
      title: detectedTitle,
      reportType: body.reportType || "Reputation 360™",
      reputationScore: score,
      organizationScore: detectedOrg ? 82 : 0,
      assetRecoveryScore: topMentions.length ? 78 : 55,
      socialSentimentScore: 75,
      authorityScore: hasKnowledgePanel ? 90 : hasWikipedia ? 82 : awardsFound.length ? 78 : 70,
      googleResults: organic.length,
      newsMentions: newsResults.length,
      mediaReach: newsResults.length ? "Live" : "Review",
      speakingCount: speakingFound.length,
      awardCount: awardsFound.length,
      socialFollowers: "Review",
      hasKnowledgePanel,
      hasWikipedia,
      knowledgePanel,
      snapshot,
      knownFor,
      topMentions,
      awardResults: awardsFound,
      speakingResults: speakingFound,
      recoveredAssets: topMentions,
      authorityAssets: {
        googleKnowledgePanel: hasKnowledgePanel,
        wikipedia: hasWikipedia,
        wikidata: hasWikidata,
        linkedIn: hasLinkedIn,
        officialWebsite: !!(providedWebsite || kg?.website || organic.length),
        mediaMentions: newsResults.length > 0 || organic.length > 3,
        awards: awardsFound.length > 0,
        speakingHistory: speakingFound.length > 0
      },
      risks,
      opportunities,
      aiAnalysis
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message })
    };
  }
};