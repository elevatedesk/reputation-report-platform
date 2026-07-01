exports.handler = async function(event) {
  const body = event.body ? JSON.parse(event.body) : {};
  const person = body.personName || "Stefanie Magness";
  const org = body.orgName || "Elevate Visibility Group";

  const report = {
    personName: person,
    orgName: org,
    reportType: body.reportType || "Reputation 360™",
    reputationScore: 89,
    organizationScore: 84,
    assetRecoveryScore: 76,
    socialSentimentScore: 91,
    authorityScore: 74,
    snapshot: `${person} and ${org} were reviewed across visibility, authority signals, Asset Recovery™, social listening, reviews, and leader-organization alignment.`,
    knownFor: [
      "Executive Visibility",
      "Reputation Strategy",
      "Public Relations",
      "Thought Leadership",
      "Public Affairs"
    ],
    authorityAssets: {
      googleKnowledgePanel: false,
      wikipedia: false,
      wikidata: false,
      linkedIn: true,
      officialWebsite: true,
      mediaMentions: true,
      awards: true,
      speakingHistory: true
    },
    recoveredAssets: [
      "Media mentions",
      "Speaking engagements",
      "Awards and rankings",
      "Published quotes",
      "Board and committee roles"
    ],
    socialListening: [
      "LinkedIn professional sentiment",
      "Instagram and Facebook community perception",
      "Google Reviews for organization reputation",
      "Glassdoor and Indeed for employer reputation",
      "Candid and Charity Navigator for nonprofit trust"
    ],
    risks: [
      "Scattered credibility assets",
      "No visible Google Knowledge Panel pathway",
      "No Wikipedia or Wikidata foundation",
      "Speaking history is not centralized"
    ],
    opportunities: [
      "Create a Credibility Asset Inventory™",
      "Refresh executive bio",
      "Build media and awards page",
      "Create speaker one-sheet",
      "Strengthen Reputation 360™ alignment"
    ]
  };

  return {
    statusCode: 200,
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(report)
  };
};
