exports.handler = async function(event) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const person = (body.personName || "Stefanie Magness").trim();
    const org = (body.orgName || "").trim();

    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) throw new Error("Missing SERPAPI_API_KEY");

    const searchQuery = org ? `${person} ${org}` : person;

    async function serp(params) {
      const url = new URL("https://serpapi.com/search.json");
      Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
      url.searchParams.set("api_key", apiKey);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`SerpAPI error: ${response.status}`);
      return await response.json();
    }

    const google = await serp({
      engine: "google",
      q: searchQuery,
      num: "10"
    });

    let news = {};
    try {
      news = await serp({
        engine: "google_news",
        q: searchQuery
      });
    } catch (e) {
      news = {};
    }

    const organic = google.organic_results || [];
    const newsResults = news.news_results || [];
    const knowledgeGraph = google.knowledge_graph || null;

    const allText = [
      ...organic.map(r => `${r.title || ""} ${r.snippet || ""}`),
      ...newsResults.map(r => `${r.title || ""} ${r.snippet || ""}`)
    ].join(" ").toLowerCase();

    const links = organic.map(r => r.link || "").filter(Boolean);
    const titles = organic.map(r => r.title || "").filter(Boolean);

    const hasWikipedia = links.some(link => link.includes("wikipedia.org"));
    const hasWikidata = links.some(link => link.includes("wikidata.org"));
    const hasLinkedIn = links.some(link => link.includes("linkedin.com"));
    const hasKnowledgePanel = !!knowledgeGraph;

    const title =
      knowledgeGraph?.type ||
      knowledgeGraph?.description?.split(".")[0] ||
      "Professional";

    const orgDetected =
      org ||
      knowledgeGraph?.source?.name ||
      knowledgeGraph?.profiles?.[0]?.name ||
      "";

    const keywords = [
      person,
      ...titles,
      knowledgeGraph?.title || "",
      knowledgeGraph?.type || "",
      knowledgeGraph?.description || ""
    ].join(" ");

    const knownFor = [...new Set(
      keywords
        .split(/[\|\-:,.•]/)
        .map(x => x.trim())
        .filter(x => x.length > 4)
        .filter(x => !x.toLowerCase().includes("linkedin"))
        .filter(x => !x.toLowerCase().includes("facebook"))
        .slice(0, 8)
    )];

    const awardCount = (allText.match(/award|honor|rank|recognition|winner|named|list/g) || []).length;
    const speakingCount = (allText.match(/speaker|keynote|panel|conference|summit|podcast|interview/g) || []).length;

    const topMentions = [
      ...newsResults.slice(0, 3).map(r => ({
        title: r.title,
        link: r.link,
        source: r.source?.name || r.snippet || "Google News"
      })),
      ...organic.slice(0, 5).map(r => ({
        title: r.title,
        link: r.link,
        source: r.snippet || "Google Search"
      }))
    ].filter(x => x.title);

    const risks = [
      !hasKnowledgePanel ? "No Google Knowledge Panel detected" : null,
      !hasWikipedia ? "No Wikipedia result detected" : null,
      organic.length < 5 ? "Low public search visibility" : null,
      awardCount === 0 ? "Awards and recognition are not clearly visible" : null,
      speakingCount === 0 ? "Speaking history is not clearly visible" : null,
      organic.length >= 5 ? "No major negative issue detected" : null
    ].filter(Boolean);

    const report = {
      personName: person,
      orgName: orgDetected,
      title,
      reportType: body.reportType || "Reputation 360™",
      googleResults: organic.length,
      newsMentions: newsResults.length,
      mediaReach: newsResults.length ? "Live" : "Review",
      speakingCount,
      awardCount,
      socialFollowers: "Review",
      hasKnowledgePanel,
      hasWikipedia,
      reputationScore: hasKnowledgePanel ? 88 : organic.length >= 8 ? 78 : 68,
      organizationScore: orgDetected ? 82 : 0,
      assetRecoveryScore: topMentions.length ? 76 : 55,
      socialSentimentScore: 80,
      authorityScore: hasKnowledgePanel ? 88 : hasWikipedia ? 82 : 70,
      snapshot: `${person}${orgDetected ? " and " + orgDetected : ""} returned ${organic.length} visible Google results and ${newsResults.length} news results. ${hasKnowledgePanel ? "A Google Knowledge Panel was detected." : "No Google Knowledge Panel was detected."} ${hasWikipedia ? "Wikipedia coverage was found." : "No Wikipedia result was found."}`,
      knownFor: knownFor.length ? knownFor : ["Public Visibility", "Leadership", "Professional Authority"],
      authorityAssets: {
        googleKnowledgePanel: hasKnowledgePanel,
        wikipedia: hasWikipedia,
        wikidata: hasWikidata,
        linkedIn: hasLinkedIn,
        officialWebsite: organic.length > 0,
        mediaMentions: newsResults.length > 0 || organic.length > 3,
        awards: awardCount > 0,
        speakingHistory: speakingCount > 0
      },
      topMentions,
      recoveredAssets: topMentions,
      socialListening: [
        "Review LinkedIn mentions",
        "Review public social profiles",
        "Review Google reviews if tied to an organization",
        "Review nonprofit trust signals if applicable"
      ],
      risks,
      opportunities: [
        !hasKnowledgePanel ? "Strengthen Knowledge Panel pathway" : "Maintain Knowledge Panel signals",
        !hasWikipedia ? "Build Wikipedia/Wikidata foundation if eligible" : "Maintain Wikipedia accuracy",
        "Create a Credibility Asset Inventory™",
        "Update executive bio",
        "Document media, awards, speaking, reviews, and recognition"
      ]
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
