exports.handler = async function(event) {
  const body = event.body ? JSON.parse(event.body) : {};
  const person = body.personName || "New Client";
  const org = body.orgName || "Organization not entered";
  return {
    statusCode: 200,
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      personName: person,
      orgName: org,
      reportType: "First-Pass Reputation Report™",
      reputationScore: 72,
      snapshot: `${person} has a first-pass reputation profile. Live search, social listening, review monitoring, speaking discovery, and media intelligence require connected APIs.`
    })
  };
};
