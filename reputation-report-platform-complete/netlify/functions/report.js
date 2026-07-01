exports.handler = async function(event) {
  const body = event.body ? JSON.parse(event.body) : {};
  const person = body.personName || "Stefanie Magness";
  const org = body.orgName || "Elevate Visibility Group";
  return {
    statusCode: 200,
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      personName: person,
      orgName: org,
      reputationScore: 89,
      assetRecoveryScore: 76,
      sentimentScore: 91,
      summary: `${person} and ${org} were reviewed across visibility, authority assets, social listening, reviews, Asset Recovery™, and Reputation 360™ alignment.`,
      assets: ["Media mentions", "Speaking engagements", "Awards", "Quotes", "Board and committee roles"],
      socialListening: ["LinkedIn", "Instagram", "Facebook Reviews", "Google Reviews", "Glassdoor", "Indeed", "Candid", "Charity Navigator"]
    })
  };
};
