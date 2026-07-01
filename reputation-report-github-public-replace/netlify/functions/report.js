exports.handler = async function(event) {
  const body = event.body ? JSON.parse(event.body) : {};
  const name = body.personName || "New Client";
  const org = body.orgName || "Organization not entered";

  return {
    statusCode: 200,
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      personName: name,
      orgName: org,
      reportType: "First-Pass Reputation Report™",
      reputationScore: 72,
      authorityScore: 64,
      riskScore: 38,
      opportunityScore: 86,
      bioScore: 52,
      snapshot: `${name} has a first-pass reputation profile. Live Google, media, review, speaking, and social listening results require connected APIs.`
    })
  };
};
