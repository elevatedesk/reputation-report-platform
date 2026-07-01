export function titleCaseName(value = "") {
  return value.trim().replace(/\s+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function isUrl(value = "") {
  return /^https?:\/\//i.test(value) || /(linkedin\.com|www\.|\.com|\.org|\.net)/i.test(value);
}

export function cleanSearchName(value = "") {
  const raw = value.trim();
  if (!raw) return "New Client";

  if (raw.includes("linkedin.com/in/")) {
    const slug = raw.split("linkedin.com/in/")[1].split(/[/?#]/)[0];
    return titleCaseName(slug.replace(/[-_]/g, " "));
  }

  if (isUrl(raw)) {
    const host = raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
    return titleCaseName(host.split(".")[0].replace(/[-_]/g, " "));
  }

  return titleCaseName(raw);
}

export function buildPossibleMatches({ query, linkedin, website, location, industry, organization }) {
  const baseName = cleanSearchName(query);
  const orgGuess = organization || (website ? titleCaseName(website.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(".")[0]) : "Organization not confirmed");

  let confidence = 58;
  if (linkedin) confidence += 22;
  if (website) confidence += 10;
  if (location) confidence += 6;
  if (industry) confidence += 4;
  if (!isUrl(query) && query.trim().split(/\s+/).length >= 2) confidence += 8;
  confidence = Math.min(confidence, 98);

  return [
    { name: baseName, title: industry ? `${industry} Leader` : "Executive / Thought Leader", organization: orgGuess, location: location || "Location not confirmed", source: linkedin ? "LinkedIn provided" : website ? "Website provided" : "Name search", confidence },
    { name: baseName, title: "Possible public profile match", organization: "Organization needs verification", location: location || "Location unknown", source: "Possible search result", confidence: Math.max(42, confidence - 19) },
    { name: baseName, title: "Possible same-name match", organization: "Different organization possible", location: "Needs verification", source: "Same or similar name", confidence: Math.max(31, confidence - 31) }
  ];
}

export function buildReportFromIdentity(identity) {
  const range = "Last 12 months";
  return {
    personName: identity.name,
    orgName: identity.organization || "Organization not entered",
    title: identity.title || "Executive / Thought Leader",
    location: identity.location || "Location not confirmed",
    reportType: "First-Pass Reputation Report™",
    researchConfidence: identity.confidence || 52,
    reputationScore: 72,
    orgScore: 68,
    riskScore: 42,
    opportunityScore: 86,
    assetScore: 55,
    bioScore: 52,
    authorityScore: 58,
    executiveSummary: `${identity.name} was selected through Identity Match Review™ with a ${identity.confidence || 52}% confidence score. This first-pass profile should be verified with LinkedIn, website, organization, media mentions, speaking history, awards, reviews, and authority assets.`,
    knownForSummary: `${identity.name} needs a verified public reputation scan before the platform can make a final claim about what they are known for. The system should verify their role, public-facing work, media mentions, speaking activity, awards, reviews, and authority assets.`,
    knownFor: ["Identity match selected", identity.title || "Role verification needed", identity.organization || "Organization verification needed", `Confidence ${identity.confidence || 52}%`, "Verification needed"],
    risks: ["Live reputation research has not been connected yet", "Knowledge Panel status needs verification", "Wikipedia and Wikidata status needs verification", "Social listening, reviews, and speaking engagement discovery need API connection"],
    mediaMentions: [{ title: "No verified news or media mentions loaded yet", source: "Research Required", date: range, note: `Only include articles from the last 12 months that mention ${identity.name} directly.` }],
    speakingEngagements: [{ title: "No verified speaking engagements loaded yet", eventType: "Research Required", role: "Unknown", date: range, note: `Only include conferences, forums, summits, keynotes, panels, workshops, webinars, podcasts, or lectures that mention ${identity.name} directly.` }]
  };
}
