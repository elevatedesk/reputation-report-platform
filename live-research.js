// The Reputation Report™ live research add-on
(function () {
  const oldSelectMatch = window.selectMatch;

  async function runLiveResearch(name) {
    const response = await fetch("/.netlify/functions/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: name })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Live research failed.");
    return data;
  }

  function applyResearch(data) {
    if (!window.report) return;

    const scores = data.scores || {};
    window.researchResults = data;

    report.personName = data.personName || report.personName;
    report.researchConfidence = data.confidence || report.researchConfidence;
    report.reputationScore = scores.reputationScore || report.reputationScore;
    report.orgScore = scores.orgScore || report.orgScore;
    report.riskScore = scores.riskScore || report.riskScore;
    report.opportunityScore = scores.opportunityScore || report.opportunityScore;
    report.assetScore = scores.assetScore || report.assetScore;
    report.bioScore = scores.bioScore || report.bioScore;
    report.authorityScore = scores.authorityScore || report.authorityScore;
    report.executiveSummary = data.executiveSummary || report.executiveSummary;
    report.knownForSummary = data.knownForSummary || report.knownForSummary;
    report.knownFor = data.knownFor || report.knownFor;

    report.mediaMentions = (data.newsResults || []).map(x => ({
      title: x.title,
      source: x.source || "News",
      date: x.date || "Last 12 months",
      note: x.snippet || x.link || ""
    }));

    report.speakingEngagements = (data.speakingResults || []).map(x => ({
      title: x.title,
      eventType: "Speaking Signal",
      role: "Possible speaker / panelist / guest",
      date: x.date || "Needs verification",
      note: x.snippet || x.link || ""
    }));

    report.risks = [
      data.checks && data.checks.knowledgePanel ? "Google Knowledge Panel signal detected" : "No Google Knowledge Panel signal detected yet",
      data.checks && data.checks.wikipedia ? "Wikipedia profile signal detected" : "No Wikipedia profile signal detected yet",
      data.checks && data.checks.wikidata ? "Wikidata profile signal detected" : "No Wikidata profile signal detected yet",
      "Review all live results before using them in a final client report"
    ];

    if (window.save) {
      save("rr_report", report);
      save("rr_research_results", data);
    }
    if (window.render) render();
  }

  window.selectMatch = async function (i) {
    if (oldSelectMatch) oldSelectMatch(i);

    try {
      const name = window.report && report.personName ? report.personName : document.querySelector("#searchInput").value;
      if (window.toast) toast("Running live research for " + name + "...");
      const data = await runLiveResearch(name);
      applyResearch(data);
      if (window.toast) toast("Live research completed for " + name + ".");
    } catch (error) {
      if (window.toast) toast(error.message || "Live research failed.");
      console.error(error);
    }
  };

  console.log("The Reputation Report live research add-on loaded.");
})();
