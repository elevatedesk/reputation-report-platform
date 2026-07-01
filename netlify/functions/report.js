exports.handler = async function(event) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const person = body.personName || "Stefanie Magness";
    const org = body.orgName || "";

    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing SERPAPI_API_KEY");
    }

    const searchQuery = org ? `${person} ${org}` : person;

    const serpUrl =
      `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(searchQuery)}&api_key=${apiKey}`;

    const response = await fetch(serpUrl);
    const data = await response.json();

    const results = data.organic_results || [];
    const knowledgeGraph = data.knowledge_graph || null;

    const titles = results.map(r => r.title || "").filter(Boolean);
    const snippets = results.map(r => r.snippet || "").filter(Boolean);
    const links = results.map(r => r.link || "").filter(Boolean);

    const hasWikipedia = links.some(link => link.includes("wikipedia.org"));
    const hasLinkedIn = links.some(link => link.includes("linkedin.com"));
    const hasOfficialWebsite = links.length > 0;
    const hasKnowledgePanel = !!knowledgeGraph;

    const knownFor = [
      ...new Set(
        titles
          .join(" ")
          .split(/[\|\-:,.]/)
          .map(x => x.trim())
          .filter(x => x.length > 4)
          .slice(0, 8)
      )
    ];

    const report = {
      personName: person,
      orgName: org,
      reportType: body.reportType || "Reputation 360™",
      reputationScore: hasKnowledgePanel ? 91 : 78,
      organizationScore: org ? 82 : 0,
      assetRecoveryScore: 76,
      socialSentimentScore: 80,
      authorityScore: hasKnowledgePanel ? 88 : 72,

      snapshot: `${person}${org ? " and " + org : ""} returned ${results.length} visible Google results. ${hasKnowledgePanel ? "A Google Knowledge Panel appears to be present." : "No Google Knowledge Panel was detected in this search."} ${hasWikipedia ? "A Wikipedia presence was found." : "No Wikipedia result was found."}`,

      knownFor: knownFor.length ? knownFor : [
        "Public Visibility",
        "Leadership",
        "Reputation",
        "Professional Authority"
      ],

      authorityAssets: {
        googleKnowledgePanel: hasKnowledgePanel,
        wikipedia: hasWikipedia,
        wikidata: links.some(link => link.includes("wikidata.org")),
        linkedIn: hasLinkedIn,
        officialWebsite: hasOfficialWebsite,
        mediaMentions: results.length > 3,
        awards: snippets.join(" ").toLowerCase().includes("award"),
        speakingHistory: snippets.join(" ").toLowerCase().includes("speaker")
      },

      recoveredAssets: results.slice(0, 5).map(r => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet
      })),

      socialListening: [
        "Review LinkedIn mentions",
        "Review public social profiles",
        "Review Google reviews if tied to an organization",
        "Review nonprofit trust signals if applicable"
      ],

      risks: [
        !hasKnowledgePanel ? "No Google Knowledge Panel detected" : null,
        !hasWikipedia ? "No Wikipedia result detected" : null,
        results.length < 5 ? "Low search visibility" : null
      ].filter(Boolean),

      opportunities: [
        "Create a Credibility Asset Inventory™",
        "Update executive bio",
        "Build a media and awards page",
        "Strengthen Knowledge Panel pathway",
        "Document speaking, media, reviews, and recognition"
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
