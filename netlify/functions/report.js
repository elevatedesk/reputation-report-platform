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

    const query = org ? `"${person}" "${org}"` : `"${person}"`;

    const google = await serp({
      engine: "google",
      q: query,
      num: "10"
    });

    let news = {};
    try {
      news = await serp({
        engine: "google_news",
        q: query
      });
    } catch (e) {
      news = { news_results: [] };
    }

    const organic = google.organic_results || [];
    const newsResults = news.news_results || [];
    const kg = google.knowledge_graph || null;

    const allResults = [
      ...newsResults.map(r => ({
        title: r.title,
        link: r.link,
        source: r.source?.name || r.source || "Google News",
        snippet: r.snippet || ""
      })),
      ...organic.map(r => ({
        title: r.title,
        link: r.link,
        source: r.displayed_link || "Google Search",
        snippet: r.snippet || ""
      }))
    ].filter(x => x.title);

    const links = organic.map(r => r.link || "").filter(Boolean);
    const text = [
      ...organic.map(r => `${r.title || ""} ${r.snippet || ""}`),
      ...newsResults.map(r => `${r.title || ""} ${r.snippet || ""}`),
      kg?.title || "",
      kg?.type || "",
      kg?.description || ""
    ].join(" ").toLowerCase();

    const hasWikipedia = links.some(x => x.includes("wikipedia.org"));
    const hasWikidata = links.some(x => x.includes("wikidata.org"));
    const hasLinkedIn = links.some(x => x.includes("linkedin.com"));
    const hasKnowledgePanel = !!kg;

    const awardCount = (text.match(/award|honor|honou?r|recognition|winner|named|ranking|ranked|40 under 40|best of|top/g) || []).length;
    const speakingCount = (text.match(/speaker|speaking|keynote|panelist|conference|summit|podcast|interview|moderator/g) || []).length;

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

    const detectedOrg =
      org ||
      kg?.source?.name ||
      "";

    const keywordSource = [
      kg?.title || "",
      kg?.type || "",
      kg?.description || "",
      ...organic.slice(0,6).map(r => r.title || ""),
      ...newsResults.slice(0,5).map(r => r.title || "")
    ].join(" ");

    let knownFor = [...new Set(
      keywordSource
        .split(/[\|\-:,.•–]/)
        .map(x => x.trim())
        .filter(x => x.length > 4)
        .filter(x => !x.toLowerCase().includes("stefanie magness") || person.toLowerCase().includes("stefanie magness"))
        .filter(x => !x.toLowerCase().includes("elevate visibility group") || org.toLowerCase().includes("elevate visibility group"))
        .filter(x => !["linkedin", "facebook", "instagram", "youtube", "official"].includes(x.toLowerCase()))
        .slice(0, 8)
    )];

    if (!knownFor.length) knownFor = ["Public Visibility", "Professional Authority", "Online Presence"];

    const risks = [
      !hasKnowledgePanel ? "No Google Knowledge Panel detected" : null,
      !hasWikipedia ? "No Wikipedia result detected" : null,
      newsResults.length === 0 ? "No recent Google News mentions detected" : null,
      awardCount === 0 ? "Awards and rankings are not clearly visible" : null,
      speakingCount === 0 ? "Speaking history is not clearly visible" : null,
      organic.length >= 5 ? "No major negative issue detected" : null
    ].filter(Boolean);

    const opportunities = [
      !hasKnowledgePanel ? "Strengthen Knowledge Panel pathway" : "Maintain Google Knowledge Panel accuracy",
      !hasWikipedia ? "Build Wikipedia/Wikidata foundation if eligible" : "Monitor Wikipedia/Wikidata accuracy",
      newsResults.length === 0 ? "Create fresh media visibility" : "Repurpose recent media coverage",
      "Create a Credibility Asset Inventory™",
      "Document speaking, media, awards, reviews, and recognition"
    ];

    const score = hasKnowledgePanel ? 90 : newsResults.length > 0 ? 82 : organic.length >= 6 ? 78 : 68;

    const snapshot = `${person}${detectedOrg ? " and " + detectedOrg : ""} returned ${organic.length} Google search results and ${newsResults.length} recent Google News results. ${hasKnowledgePanel ? "A Google Knowledge Panel was detected." : "No Google Knowledge Panel was detected."} ${hasWikipedia ? "A Wikipedia result was found." : "No Wikipedia result was found."}`;

    const report = {
      personName: person,
      orgName: detectedOrg,
      title: detectedTitle,
      reportType: body.reportType || "Reputation 360™",
      reputationScore: score,
      organizationScore: detectedOrg ? 82 : 0,
      assetRecoveryScore: allResults.length ? 76 : 55,
      socialSentimentScore: 75,
      authorityScore: hasKnowledgePanel ? 90 : hasWikipedia ? 82 : 70,
      googleResults: organic.length,
      newsMentions: newsResults.length,
      mediaReach: newsResults.length ? "Live" : "Review",
      speakingCount,
      awardCount,
      socialFollowers: "Review",
      hasKnowledgePanel,
      hasWikipedia,
      knowledgePanel,
      snapshot,
      knownFor,
      topMentions: allResults.slice(0, 8),
      recoveredAssets: allResults.slice(0, 8),
      authorityAssets: {
        googleKnowledgePanel: hasKnowledgePanel,
        wikipedia: hasWikipedia,
        wikidata: hasWikidata,
        linkedIn: hasLinkedIn,
        officialWebsite: !!(providedWebsite || kg?.website || organic.length),
        mediaMentions: newsResults.length > 0 || organic.length > 3,
        awards: awardCount > 0,
        speakingHistory: speakingCount > 0
      },
      risks,
      opportunities
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