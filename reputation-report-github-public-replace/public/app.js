
const defaultReport = {
  personName:"Stefanie Magness", orgName:"Elevate Visibility Group", title:"Founder & Visibility Consultant", reportType:"Reputation 360™",
  reputationScore:89, orgScore:84, riskScore:34, opportunityScore:88, assetScore:76, bioScore:68, authorityScore:74, researchConfidence:98,
  snapshot:"Stefanie Magness and Elevate Visibility Group have been reviewed across visibility, authority signals, social listening, reviews, Asset Recovery™, and leader-organization alignment.",
  knownForSummary:"Stefanie Magness is connected to executive visibility, reputation strategy, public relations, thought leadership, and public affairs. A deeper live scan should verify media mentions, speaking activity, awards, reviews, and authority assets.",
  knownFor:["Executive Visibility","Reputation Strategy","Public Relations","Thought Leadership","Public Affairs"],
  opportunities:["Asset Inventory","Bio Refresh","Media Page","Speaker One-Sheet","Knowledge Panel Pathway"],
  risks:["No Google Knowledge Panel detected","No Wikipedia or Wikidata profile found","Speaking history is not fully centralized"],
  mediaMentions:[{title:"No verified news or media mentions loaded yet",source:"Research Required",date:"Last 12 months",note:"Connect search APIs to populate verified articles that mention the searched name."}],
  speakingEngagements:[{title:"No verified speaking engagements loaded yet",eventType:"Research Required",role:"Unknown",date:"Last 12 months",note:"Connect search APIs or add speaking assets manually."}]
};
let currentReportData = null;

const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];
const store = (k,v) => localStorage.setItem(k, JSON.stringify(v));
const read = (k, fallback=[]) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(fallback)); } catch { return fallback; } };

function makeInitials(name){return (name||"RR").trim().split(/\s+/).map(p=>p[0]).join("").slice(0,2).toUpperCase() || "RR";}
function titleCaseName(name){return (name||"").trim().replace(/\s+/g," ").replace(/\b\w/g,c=>c.toUpperCase());}
function isUrl(value){return /^https?:\/\//i.test(value || "") || /(linkedin\.com|www\.|\.com|\.org|\.net)/i.test(value || "");}
function cleanSearchName(value){
  const raw = (value || "").trim();
  if(!raw) return "New Client";
  if(raw.includes("linkedin.com/in/")){
    const slug = raw.split("linkedin.com/in/")[1].split(/[/?#]/)[0];
    return titleCaseName(slug.replace(/[-_]/g, " "));
  }
  if(isUrl(raw)){
    const host = raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
    return titleCaseName(host.split(".")[0].replace(/[-_]/g, " "));
  }
  return titleCaseName(raw);
}
function lastTwelveMonthsText(){const d=new Date();d.setFullYear(d.getFullYear()-1);return d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})+" to today";}
function tag(t){return `<span class="tag">${t}</span>`;}
function risk(t, ok=false){return `<div class="risk"><span class="${ok?'ok':'warn'}">${ok?'✓':'⚠'}</span><div>${t}</div></div>`;}
function scoreRow(label,value){return `<div class="row"><span>${label}</span><div class="bar"><div class="fill" style="width:${value}%"></div></div><strong>${value}</strong></div>`;}
function authority(name,yes,note){return `<div class="asset"><span>${name}</span><span class="${yes?'yes':'no'}">${yes?'✓':'×'}</span><small>${note}</small></div>`;}

function buildDynamicReport(personName, orgName=""){
  const cleanName = titleCaseName(personName || "New Client");
  const cleanOrg = orgName && orgName.trim() ? orgName.trim() : "Organization not entered";
  const range = lastTwelveMonthsText();
  return {
    personName: cleanName, orgName: cleanOrg,
    title: cleanOrg === "Organization not entered" ? "Executive / Thought Leader" : "Leader at " + cleanOrg,
    reportType:"First-Pass Reputation Report™", researchConfidence:52,
    reputationScore:72, orgScore:68, riskScore:42, opportunityScore:86, assetScore:55, bioScore:52, authorityScore:58,
    snapshot: cleanName + " has a reputation profile that needs to be reviewed across search visibility, media presence, authority assets, social listening, reviews, speaking history, and Asset Recovery™. This first-pass report creates a working snapshot based on the name entered. Live Google results, Wikipedia/Wikidata checks, reviews, speaking engagements, and social listening require connected APIs.",
    knownForSummary: cleanName + " needs a verified public reputation scan before the platform can make a final claim about what they are known for. The system should verify their role, public-facing work, media mentions, speaking activity, awards, reviews, and authority assets.",
    knownFor:["Role verification needed","Media mentions needed","Speaking history needed","Authority assets needed","Public reputation review"],
    opportunities:["Complete client intake","Add LinkedIn and website","Run Google visibility research","Check Knowledge Panel eligibility","Build Asset Recovery™ inventory","Review social, reviews, and speaking presence"],
    risks:["Live reputation research has not been connected yet","Knowledge Panel status needs verification","Wikipedia and Wikidata status needs verification","Social listening, reviews, and speaking engagement discovery need API connection"],
    mediaMentions:[{title:"No verified news or media mentions loaded yet",source:"Research Required",date:range,note:"Only include articles from the last 12 months that mention "+cleanName+" directly."}],
    speakingEngagements:[{title:"No verified speaking engagements loaded yet",eventType:"Research Required",role:"Unknown",date:range,note:"Only include conferences, forums, summits, keynotes, panels, breakout sessions, workshops, webinars, podcasts, or lectures that mention "+cleanName+" or "+cleanOrg+" directly."}]
  };
}

function buildPossibleMatches(query){
  const baseName = cleanSearchName(query);
  const linkedIn = qs("#linkedinInput")?.value || "";
  const website = qs("#websiteInput")?.value || "";
  const location = qs("#locationInput")?.value || "";
  const industry = qs("#industryInput")?.value || "";
  const orgGuess = qs("#orgName")?.value || (website ? titleCaseName(website.replace(/^https?:\/\//i,"").replace(/^www\./i,"").split(".")[0]) : "Organization not confirmed");

  let confidence = 58;
  if(linkedIn) confidence += 22;
  if(website) confidence += 10;
  if(location) confidence += 6;
  if(industry) confidence += 4;
  if(!isUrl(query) && query.trim().split(/\s+/).length >= 2) confidence += 8;
  confidence = Math.min(confidence, 98);

  return [
    {name:baseName,title:industry ? industry + " Leader" : "Executive / Thought Leader",organization:orgGuess,location:location || "Location not confirmed",source:linkedIn ? "LinkedIn provided" : website ? "Website provided" : "Name search",confidence},
    {name:baseName,title:"Possible public profile match",organization:"Organization needs verification",location:location || "Location unknown",source:"Possible search result",confidence:Math.max(42, confidence-19)},
    {name:baseName,title:"Possible same-name match",organization:"Different organization possible",location:"Needs verification",source:"Same or similar name",confidence:Math.max(31, confidence-31)}
  ];
}

function startIdentityMatchReview(){
  const query = qs("#searchInput").value;
  const matches = buildPossibleMatches(query);
  qs("#identitySubtitle").textContent = "Which " + cleanSearchName(query) + " do you mean?";
  qs("#identityMatches").innerHTML = matches.map(m => `
    <div class="match-card">
      <div>
        <h3>${m.name}</h3>
        <div class="match-meta">${m.title}<br>${m.organization}<br>${m.location}<br>Source: ${m.source}</div>
      </div>
      <div>
        <div class="confidence">${m.confidence}%<small>confidence</small></div>
        <button class="select-match" onclick='selectIdentityMatch(${JSON.stringify(m)})'>This is the person</button>
        <button class="outline" style="width:100%;margin-top:8px" onclick="toast('Marked not the right person.')">Not right</button>
      </div>
    </div>
  `).join("");
  qs("#identityBackdrop").classList.add("active");
  qs("#identityModal").classList.add("active");
}
function closeIdentityMatch(){qs("#identityBackdrop").classList.remove("active");qs("#identityModal").classList.remove("active");}
function selectIdentityMatch(match){
  closeIdentityMatch();
  const report = buildDynamicReport(match.name, match.organization);
  report.title = match.title;
  report.location = match.location;
  report.researchConfidence = match.confidence;
  report.knownForSummary = match.name + " was selected through Identity Match Review™ with a " + match.confidence + "% confidence score. This first-pass profile should be verified with LinkedIn, website, organization, media mentions, speaking history, awards, reviews, and authority assets.";
  report.knownFor = ["Identity match selected", match.title, match.organization, "Confidence " + match.confidence + "%", "Verification needed"];
  store("rr_current_report", report);
  hydrate(report);
  toast("Identity selected. Report generated for " + match.name + ".");
  showPage("dashboard");
}
function useManualIdentity(){
  closeIdentityMatch();
  const manualName = cleanSearchName(qs("#searchInput").value);
  const manualOrg = qs("#orgName")?.value || qs("#websiteInput")?.value || "Organization not entered";
  const report = buildDynamicReport(manualName, manualOrg);
  report.researchConfidence = 45;
  report.knownForSummary = manualName + " was added manually because the correct match was not found. Add LinkedIn, website, city, organization, and industry to improve research confidence.";
  store("rr_current_report", report);
  hydrate(report);
  toast("Manual identity created.");
  showPage("dashboard");
}

function hydrate(report){
  const r = {...defaultReport, ...report};
  currentReportData = r;
  qs("#profileName").textContent = r.personName;
  qs("#profileOrg").textContent = r.orgName || "Organization not entered";
  qs("#profileTitle").textContent = r.title || "";
  qs("#reportTypeBadge").textContent = r.reportType;
  if(qs("#confidenceBadge")) qs("#confidenceBadge").textContent = "Confidence: " + (r.researchConfidence || 98) + "%";
  qs("#overallScore").textContent = r.reputationScore;
  qs("#snapshotText").textContent = r.snapshot;
  qs("#searchInput").value = r.personName;
  qs("#profileInitials").textContent = makeInitials(r.personName);
  qs("#knownForSummary").textContent = r.knownForSummary || "";
  qs("#knownFor").innerHTML = (r.knownFor || []).map(tag).join("");
  qs("#riskList").innerHTML = (r.risks || []).map(x=>risk(x)).join("") + risk("No major negative issue detected", true);
  qs("#scoreRows").innerHTML =
    scoreRow("Reputation Score", r.reputationScore || 0) +
    scoreRow("Organization Score", r.orgScore || 0) +
    scoreRow("Risk Score", r.riskScore || 0) +
    scoreRow("Opportunity Score", r.opportunityScore || 0) +
    scoreRow("Asset Recovery Score", r.assetScore || 0) +
    scoreRow("Bio Score", r.bioScore || 0) +
    scoreRow("Authority Score", r.authorityScore || 0);
  qs("#authorityAssets").innerHTML =
    authority("Google Knowledge Panel", false, "Check") +
    authority("Wikipedia Page", false, "Check") +
    authority("Wikidata Profile", false, "Check") +
    authority("Official Website", true, "Verify") +
    authority("LinkedIn Profile", true, "Verify") +
    authority("News Coverage", true, "Verify") +
    authority("Awards & Recognition", true, "Verify") +
    authority("Speaking History", true, "Verify");
  renderMediaMentions(r);
  renderSpeakingEngagements(r);
  updateMetricCounts();
  updateBioCountsFromAssets();
}

function generateReport(){
  const report = buildDynamicReport(qs("#searchInput").value || qs("#personName")?.value || "New Client", qs("#orgName")?.value || "");
  store("rr_current_report", report);
  hydrate(report);
  toast("Report created for " + report.personName + ".");
  showPage("dashboard");
}

function showPage(id, el){
  qsa(".page").forEach(p=>p.classList.remove("active"));
  const page = qs("#"+id);
  if(!page){toast("That section is being added."); return;}
  page.classList.add("active");
  qsa(".nav a").forEach(a=>a.classList.remove("active"));
  if(el) el.classList.add("active");
  else qsa(".nav a").forEach(a => {
    const c = a.getAttribute("onclick") || "";
    if(c.includes("'"+id+"'") || c.includes('"'+id+'"')) a.classList.add("active");
  });
  window.scrollTo({top:0, behavior:"smooth"});
}

function saveIntake(){
  const data = {
    ...currentReportData,
    personName:qs("#personName").value,
    orgName:qs("#orgName").value,
    title:qs("#title").value,
    reportType:qs("#reportType").value
  };
  store("rr_current_report", data);
  hydrate(data);
  toast("Intake saved.");
}

function getManualAssets(){return read("rr_manual_assets", []);}
function saveManualAssets(a){store("rr_manual_assets", a);}
function getRemovedItems(){return read("rr_removed_items", []);}
function saveRemovedItems(i){store("rr_removed_items", i);}
function makeRemoveKey(type,title,meta){return type+"::"+(title||"")+"::"+(meta||"");}
function isRemoved(type,title,meta){return getRemovedItems().includes(makeRemoveKey(type,title,meta));}
function removeSignalItem(type,title,meta){const items=getRemovedItems();const key=makeRemoveKey(type,title,meta);if(!items.includes(key))items.push(key);saveRemovedItems(items);toast("Removed from this report.");openMetric(type);}
function restoreRemovedItems(){saveRemovedItems([]);toast("Removed items restored.");if(currentReportData)hydrate(currentReportData);}

function detailItem(title,meta,note){return `<div class="detail-item"><strong>${title}</strong><small>${meta||""}${note?"<br>"+note:""}</small></div>`;}
function removableDetailItem(type,title,meta,note){
  if(isRemoved(type,title,meta)) return "";
  return `<div class="detail-item"><strong>${title}</strong><small>${meta||""}${note?"<br>"+note:""}</small><br><button class="verify-btn" onclick="toast('Marked verified.')">Mark Verified</button><button class="outline" onclick="toast('Marked client submitted.')">Client Submitted</button><button class="outline" onclick="toast('Marked AI found.')">AI Found</button><button class="remove-btn" onclick="removeSignalItem('${type}', ${JSON.stringify(title)}, ${JSON.stringify(meta||"")})">Remove irrelevant</button></div>`;
}

function renderMediaMentions(r){qs("#mediaMentionsList").innerHTML = (r.mediaMentions || []).map(x=>detailItem(x.title,(x.source||"Source")+" · "+(x.date||"Date"),x.note)).join("");}
function renderSpeakingEngagements(r){qs("#speakingList").innerHTML = (r.speakingEngagements || []).map(x=>detailItem(x.title,(x.eventType||"Event")+" · "+(x.role||"Role")+" · "+(x.date||"Date"),x.note)).join("");}

function addManualAsset(){
  const asset = {
    type:qs("#assetType").value,
    title:qs("#assetTitle").value || "Untitled asset",
    source:qs("#assetSource").value || "Source needed",
    date:qs("#assetDate").value || "Date needed",
    role:qs("#assetRole").value || "Role/details needed",
    url:qs("#assetUrl").value || "",
    notes:qs("#assetNotes").value || "",
    proof:qs("#assetProof").value || "",
    status:qs("#assetStatus").value || "Client Submitted",
    addedAt:new Date().toISOString()
  };
  const assets = getManualAssets();
  assets.unshift(asset);
  saveManualAssets(assets);
  renderManualAssets();
  updateMetricCounts();
  updateBioCountsFromAssets();
  toast("Authority asset added.");
  ["#assetTitle","#assetSource","#assetDate","#assetRole","#assetUrl","#assetNotes","#assetProof"].forEach(id=>{if(qs(id)) qs(id).value=""});
}
function deleteManualAsset(i){const assets=getManualAssets();assets.splice(i,1);saveManualAssets(assets);renderManualAssets();updateMetricCounts();updateBioCountsFromAssets();toast("Asset deleted.");}
function editManualAsset(i){const a=getManualAssets()[i];if(!a)return;qs("#assetType").value=a.type;qs("#assetTitle").value=a.title;qs("#assetSource").value=a.source;qs("#assetDate").value=a.date;qs("#assetRole").value=a.role;qs("#assetUrl").value=a.url;qs("#assetNotes").value=a.notes;qs("#assetProof").value=a.proof||"";deleteManualAsset(i);showPage("assetManager");toast("Edit the asset and save again.");}
function renderManualAssets(){
  const el = qs("#manualAssetsList");
  const assets = getManualAssets();
  el.innerHTML = assets.length ? assets.map((a,i)=>`<div class="detail-item"><strong>${a.title}</strong><small>${a.type} · ${a.source} · ${a.date}<br>${a.role} · ${a.status||"Client Submitted"}${a.url?"<br>"+a.url:""}${a.proof?"<br>Proof: "+a.proof:""}<br>${a.notes||""}</small><br><button class="verify-btn" onclick="toast('Marked verified.')">Mark Verified</button><button class="outline" onclick="editManualAsset(${i})">Edit</button><button class="remove-btn" onclick="deleteManualAsset(${i})">Delete</button></div>`).join("") : '<p class="muted">No manual assets added yet.</p>';
}

function buildSignalLists(report){
  const person=report?.personName||"searched person", org=report?.orgName||"organization", manual=getManualAssets();
  return {
    google:{title:"Google Results",subtitle:"Top 10 result drawer for "+person,items:[removableDetailItem("google","Google search not connected yet","Research Required","Connect Google/SerpAPI to show the top 10 results that mention "+person+" or "+org+"."),...manual.slice(0,10).map(a=>removableDetailItem("google",a.title,a.type+" · "+a.source+" · "+a.date,a.notes))]},
    news:{title:"News + Media Mentions",subtitle:"Last 12 months only. Must mention "+person+" directly.",items:[removableDetailItem("news","No verified media mentions loaded yet","Research Required · Last 12 months","Articles, interviews, podcasts, TV/radio, and press mentions will appear here."),...manual.filter(a=>["Media Mention","Podcast / Interview","Publication / Article"].includes(a.type)).map(a=>removableDetailItem("news",a.title,a.source+" · "+a.date,a.role+" · "+a.notes))]},
    reach:{title:"Media Reach",subtitle:"Reach/source authority for verified media.",items:[removableDetailItem("reach","Media reach not calculated yet","API Required","Reach needs verified sources and authority data."),...manual.filter(a=>["Media Mention","Podcast / Interview","Publication / Article"].includes(a.type)).map(a=>removableDetailItem("reach",a.title,"Manual source · "+a.source,"Reach pending verification."))]},
    speaking:{title:"Speaking Intelligence",subtitle:"Conferences, summits, forums, keynotes, panels, workshops, breakouts, webinars, podcasts, and university lectures.",items:[removableDetailItem("speaking","No verified speaking engagements loaded yet","Research Required","Only include events that mention "+person+" or "+org+" directly."),...manual.filter(a=>a.type==="Speaking Engagement").map(a=>removableDetailItem("speaking",a.title,a.role+" · "+a.source+" · "+a.date,a.notes))]},
    awards:{title:"Awards + Recognition",subtitle:"Awards, rankings, nominations, honors, and recognition.",items:[removableDetailItem("awards","No verified awards loaded yet","Research Required","Only include awards that mention "+person+" or "+org+" directly."),...manual.filter(a=>a.type==="Award / Recognition").map(a=>removableDetailItem("awards",a.title,a.source+" · "+a.date,a.role+" · "+a.notes))]},
    social:{title:"Reviews + Social Listening",subtitle:"Reviews, testimonials, public mentions, and sentiment.",items:[removableDetailItem("social","Reviews and social listening not connected yet","API Required","Google Reviews, Facebook, LinkedIn, Glassdoor, Indeed, Candid, Charity Navigator, and social mentions will appear here."),...manual.filter(a=>a.type==="Review / Testimonial").map(a=>removableDetailItem("social",a.title,a.source+" · "+a.date,a.notes))]},
    missing:{title:"AI Recommendations: Missing Items",subtitle:"Potential gaps the client may need to add or verify.",items:["Missing awards","Missing media","Missing speaking engagements","Missing certifications","Missing board memberships","Missing publications","Missing books","Missing projects","Missing volunteer work"].map(x=>removableDetailItem("missing",x,"Recommendation","Ask the client to confirm if this belongs in their profile."))},
    bio:{title:"Bio Score Details",subtitle:"What is missing from the bio.",items:["Current title","Years of experience","Awards","Speaking engagements","Media interviews","Board memberships","Signature projects","Personal mission"].map(x=>removableDetailItem("bio",x,"Bio Development","Add this to improve bio completeness."))}
  };
}
function openMetric(type){const data=buildSignalLists(currentReportData||defaultReport)[type];if(!data)return;qs("#drawerTitle").textContent=data.title;qs("#drawerSubtitle").textContent=data.subtitle;qs("#drawerContent").innerHTML=data.items.join("")||'<p class="muted">No items to display.</p>';qs("#drawerBackdrop").classList.add("active");qs("#detailDrawer").classList.add("active");}
function closeDrawer(){qs("#drawerBackdrop").classList.remove("active");qs("#detailDrawer").classList.remove("active");}
function updateMetricCounts(){const a=getManualAssets();qs("#googleCount").textContent=Math.max(10,a.length);qs("#newsCount").textContent=a.filter(x=>["Media Mention","Podcast / Interview","Publication / Article"].includes(x.type)).length;qs("#reachCount").textContent=a.filter(x=>["Media Mention","Podcast / Interview","Publication / Article"].includes(x.type)).length?"Pending":"0";qs("#speakingCount").textContent=a.filter(x=>x.type==="Speaking Engagement").length;qs("#awardCount").textContent=a.filter(x=>x.type==="Award / Recognition").length;qs("#socialCount").textContent=a.filter(x=>x.type==="Review / Testimonial").length;qs("#bioMetric").textContent=currentReportData?.bioScore||52;qs("#authorityMetric")&&(qs("#authorityMetric").textContent=currentReportData?.authorityScore||58);}

function setupBioChecklist(){
  const groups = {
    "Professional Identity":["Current title","Current organization","Former positions","Years of experience","Industry expertise"],
    "Leadership":["CEO","Founder","Executive","Board Member","Advisory Board","Committee Leadership","Government Appointments"],
    "Education":["Degrees","Universities","Executive Education","Certifications","Fellowships"],
    "Awards + Recognition":["Awards","Honors","Rankings","40 Under 40","Women to Watch","Hall of Fame","Industry Awards","Community Recognition"],
    "Speaking":["Keynotes","Panels","Workshops","Conferences","Forums","Summits","University Lectures","Podcasts","Guest Speaker"],
    "Media":["TV","Radio","Newspapers","Magazines","Podcasts","Articles","Quotes","Interviews","Guest Columns"],
    "Publications":["Books","White Papers","Research","Blog","Journal Articles"],
    "Leadership + Service":["Board Memberships","Volunteer Leadership","Community Organizations","Professional Associations","Civic Engagement"],
    "Credentials":["Licenses","Certifications","Military Service","Security Clearance"]
  };
  qs("#bioChecklist").innerHTML = Object.entries(groups).map(([g,items])=>`<div class="bio-group"><h5>${g}</h5>${items.map(i=>`<label class="bio-item"><input type="checkbox" data-bio="${i}"> ${i}</label>`).join("")}</div>`).join("");
}
function updateBioScore(){const boxes=qsa("input[data-bio]"), checked=boxes.filter(b=>b.checked);const score=boxes.length?Math.round(checked.length/boxes.length*100):0;qs("#bioScore").textContent=score;qs("#bioProgress").style.width=score+"%";qs("#bioProgressText").textContent=score+"% Complete";qs("#bioReady").textContent=score>=75?"Ready":"Draft";renderBioSuggestions();toast("Bio score updated.");}
function renderBioSuggestions(){const manual=getManualAssets(), checked=qsa("input[data-bio]:checked").map(b=>b.dataset.bio);let suggestions=[];checked.forEach(i=>suggestions.push("Include "+i.toLowerCase()+" in the bio."));manual.slice(0,8).forEach(a=>suggestions.push("Consider adding: "+a.title+" ("+a.type+")."));if(!suggestions.length)suggestions=["CEO or current role","Years of experience","Former leadership roles","Keynote presentations","Media mentions","Board appointments","Awards and recognition","Books or publications","Podcast guest appearances","University lectures"];qs("#bioSuggestions").innerHTML=suggestions.map(s=>`<div class="detail-item"><strong>${s}</strong><small><button class="outline" onclick="toast('Added to bio draft.')">Add to Bio</button> <button class="remove-btn" onclick="this.closest('.detail-item').remove()">Not Relevant</button></small></div>`).join("");}
function updateBioCountsFromAssets(){const m=getManualAssets();if(qs("#bioAwards"))qs("#bioAwards").textContent=m.filter(a=>a.type==="Award / Recognition").length;if(qs("#bioSpeaking"))qs("#bioSpeaking").textContent=m.filter(a=>a.type==="Speaking Engagement").length;if(qs("#bioMedia"))qs("#bioMedia").textContent=m.filter(a=>["Media Mention","Podcast / Interview","Publication / Article"].includes(a.type)).length;if(qs("#bioService"))qs("#bioService").textContent=m.filter(a=>["Board / Committee Role","Other Authority Asset","Volunteer Work"].includes(a.type)).length;renderBioSuggestions();}
function generateBio(type){const r=currentReportData||defaultReport,m=getManualAssets(),assets=m.slice(0,6).map(a=>a.title).join(", "),known=(r.knownFor||[]).slice(0,4).join(", "),name=r.personName||"The client",title=r.title||"leader",org=r.orgName||"their organization";let bio="";if(type==="50")bio=`${name} is a ${title} connected to ${org}. Their work centers on ${known||"leadership, visibility, and professional impact"}. Key accomplishments to consider adding include ${assets||"awards, speaking engagements, media mentions, board service, and signature projects"}.`;else if(type==="100")bio=`${name} is a ${title} whose reputation profile centers on ${known||"leadership, professional authority, and community impact"}. Through ${org}, they have built visibility around their expertise and public-facing work. A stronger bio should include verified accomplishments such as awards, media mentions, speaking engagements, board service, publications, credentials, and signature projects. ${assets?"Potential assets to include: "+assets+".":"The next step is to complete the Authority Asset Inventory™ so the bio reflects the full record of their work."}`;else if(type==="150")bio=`${name} is a ${title} connected to ${org}, with a reputation profile that should be supported by verified accomplishments, public-facing leadership, and visible proof of impact. Their bio should clearly explain what they are known for, who they serve, what they have built, and why their work matters. Stronger versions should include awards, speaking engagements, media mentions, board service, publications, credentials, signature projects, and measurable outcomes. ${assets?"Known assets to consider include "+assets+".":"Additional client-provided assets are needed before finalizing this bio."}`;else if(type==="speaker")bio=`${name} is a ${title} available for conversations on ${known||"leadership, visibility, reputation, and impact"}. Their speaker bio should highlight keynote topics, panels, workshops, conferences, media experience, and practical lessons audiences can apply.`;else if(type==="linkedin")bio=`${name} helps audiences understand ${known||"leadership, credibility, and professional impact"}. Their LinkedIn About section should open with their current role, clearly state what they are known for, include proof such as awards, media, speaking, board service, and close with the kind of opportunities they want next.`;else if(type==="board")bio=`${name} is a ${title} with experience that may support board, advisory, or civic leadership opportunities. A board bio should emphasize leadership judgment, industry expertise, governance experience, community impact, financial or operational oversight, and relevant credentials.`;else bio=`${name} is a ${title} whose accomplishments may support award and recognition opportunities. An award nomination bio should include measurable impact, leadership roles, media recognition, speaking engagements, community service, awards, and proof of influence.`;qs("#bioOutput").textContent=bio;}
function renderTimeline(){const m=getManualAssets();const el=qs("#timelineList"); if(!el) return; el.innerHTML = m.length ? m.map(a=>`<div class="timeline-item"><strong>${a.date}</strong><br>${a.title}<br><small>${a.type} · ${a.source}</small></div>`).join("") : '<p class="muted">Add assets to build the Timeline of Influence™.</p>'; }
function toast(m){const t=qs("#toast");t.textContent=m;t.style.display="block";setTimeout(()=>t.style.display="none",2600);}
document.addEventListener("DOMContentLoaded",()=>{setupBioChecklist();const saved=read("rr_current_report", null);hydrate(saved || defaultReport);renderManualAssets();updateMetricCounts();updateBioCountsFromAssets();renderTimeline();});
