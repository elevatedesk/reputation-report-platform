exports.handler = async function(event) {
  const body = event.body ? JSON.parse(event.body) : {};
  const name = body.name || "New Client";
  const organization = body.organization || "Organization not entered";

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personName: name,
      orgName: organization,
      message: "This is the Phase 1 placeholder function. Connect Google Custom Search, SerpAPI, Wikipedia/Wikidata, OpenAI, review APIs, and social listening APIs in Phase 2."
    })
  };
};
