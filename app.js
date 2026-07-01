
const defaultReport = {
  personName:"Stefanie Magness",
  orgName:"Elevate Visibility Group",
  title:"Founder & Visibility Consultant",
  reportType:"Reputation 360™",
  researchConfidence:98,
  reputationScore:89,
  orgScore:84,
  riskScore:34,
  opportunityScore:88,
  assetScore:76,
  bioScore:68,
  authorityScore:74,
  executiveSummary:"Stefanie Magness and Elevate Visibility Group have been reviewed across visibility, authority signals, social listening, reviews, Asset Recovery™, and leader-organization alignment.",
  knownForSummary:"Stefanie Magness is connected to executive visibility, reputation strategy, public relations, thought leadership, and public affairs. A deeper live scan should verify media mentions, speaking activity, awards, reviews, and authority assets.",
  knownFor:["Executive Visibility","Reputation Strategy","Public Relations","Thought Leadership","Public Affairs"],
  risks:["No Google Knowledge Panel detected","No Wikipedia or Wikidata profile found","Speaking history is not fully centralized"],
  mediaMentions:[{title:"No verified news or media mentions loaded yet",source:"Research Required",date:"Last 12 months",note:"Connect search APIs to populate verified articles that mention the searched name."}],
  speakingEngagements:[{title:"No verified speaking engagements loaded yet",eventType:"Research Required",role:"Unknown",date:"Last 12 months",note:"Connect search APIs or add speaking assets manually."}]
};

let report = load("rr_report", defaultReport);
let assets = load("rr_assets", []);
let reports = load("rr_reports", []);
let hidden = load("rr_hidden", []);
let bioChecked = load("rr_bio_checked", []);

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function load(key, fallback){ try{return JSON.parse(localStorage.getItem(key)) || fallback;}catch{return fallback;} }
function save(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2400); }
function initials(name){ return (name||"RR").trim().split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase() || "RR"; }
function titleCase(v){ return (v||"").trim().replace(/\s+/g," ").replace(/\b\w/g,c=>c.toUpperCase()); }
function isUrl(v){ return /^https?:\/\//i.test(v||"") || /(linkedin\.com|www\.|\.com|\.org|\.net)/i.test(v||""); }
function cleanName(v){
  const raw=(v||"").trim();
  if(!raw) return "New Client";
  if(raw.includes("linkedin.com/in/")){
    const slug=raw.split("linkedin.com/in/")[1].split(/[/?#]/)[0];
    return titleCase(slug.replace(/[-_]/g," "));
  }
  if(isUrl(raw)){
    const host=raw.replace(/^https?:\/\//i,"").replace(/^www\./i,"").split("/")[0];
    return titleCase(host.split(".")[0].replace(/[-_]/g," "));
  }
  return titleCase(raw);
}

function buildMatches(){
  const query=$("#searchInput").value;
  const linkedIn=$("#linkedinInput").value;
  const website=$("#websiteInput").value;
  const location=$("#locationInput").value;
  const industry=$("#industryInput").value;
  const name=cleanName(query);
  const org=website ? titleCase(website.replace(/^https?:\/\//i,"").replace(/^www\./i,"").split(".")[0]) : "Organization not confirmed";
  let confidence=58;
  if(linkedIn) confidence+=22;
  if(website) confidence+=10;
  if(location) confidence+=6;
  if(industry) confidence+=4;
  if(!isUrl(query) && query.trim().split(/\s+/).length >= 2) confidence+=8;
  confidence=Math.min(confidence,98);
  return [
    {name,title: industry ? industry+" Leader" : "Executive / Thought Leader",organization:org,location:location||"Location not confirmed",source:linkedIn ? "LinkedIn provided" : website ? "Website provided" : "Name search",confidence},
    {name,title:"Possible public profile match",organization:"Organization needs verification",location:location||"Location unknown",source:"Possible search result",confidence:Math.max(42,confidence-19)},
    {name,title:"Possible same-name match",organization:"Different organization possible",location:"Needs verification",source:"Same or similar name",confidence:Math.max(31,confidence-31)}
  ];
}

function buildReport(match){
  return {
    personName:match.name,
    orgName:match.organization||"Organization not entered",
    title:match.title||"Executive / Thought Leader",
    reportType:"First-Pass Reputation Report™",
    researchConfidence:match.confidence||52,
    reputationScore:72,
    orgScore:68,
    riskScore:42,
    opportunityScore:86,
    assetScore:55,
    bioScore:52,
    authorityScore:58,
    executiveSummary:`${match.name} was selected through Identity Match Review™ with a ${match.confidence||52}% confidence score. This first-pass profile should be verified with LinkedIn, website, organization, media mentions, speaking history, awards, reviews, and authority assets.`,
    knownForSummary:`${match.name} needs a verified public reputation scan before the platform can make a final claim about what they are known for. The system should verify role, public-facing work, media mentions, speaking activity, awards, reviews, and authority assets.`,
    knownFor:["Identity match selected",match.title||"Role verification needed",match.organization||"Organization verification needed",`Confidence ${match.confidence||52}%`,"Verification needed"],
    risks:["Live reputation research has not been connected yet","Knowledge Panel status needs verification","Wikipedia and Wikidata status needs verification","Social listening, reviews, and speaking engagement discovery need API connection"],
    mediaMentions:[{title:"No verified news or media mentions loaded yet",source:"Research Required",date:"Last 12 months",note:`Only include articles from the last 12 months that mention ${match.name} directly.`}],
    speakingEngagements:[{title:"No verified speaking engagements loaded yet",eventType:"Research Required",role:"Unknown",date:"Last 12 months",note:`Only include conferences, forums, summits, keynotes, panels, workshops, breakouts, webinars, podcasts, or lectures that mention ${match.name} directly.`}]
  };
}

function setPage(page){
  $$(".page").forEach(p=>p.classList.remove("active"));
  $("#"+page).classList.add("active");
  $$("nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  window.scrollTo({top:0,behavior:"smooth"});
  renderPages();
}

function render(){
  $("#topInitials").textContent=initials(report.personName);
  $("#profileInitials").textContent=initials(report.personName);
  $("#profileName").textContent=report.personName;
  $("#profileTitle").textContent=report.title;
  $("#profileOrg").textContent=report.orgName;
  $("#reportType").textContent=report.reportType;
  $("#confidenceBadge").textContent=`Confidence: ${report.researchConfidence}%`;
  $("#overallScore").textContent=report.reputationScore;
  $("#executiveSummary").textContent=report.executiveSummary;
  $("#knownForSummary").textContent=report.knownForSummary;
  $("#knownTags").innerHTML=report.knownFor.map(x=>`<span class="tag">${x}</span>`).join("");
  $("#riskList").innerHTML=report.risks.map(x=>`<div class="risk"><span class="warn">⚠</span><div>${x}</div></div>`).join("")+`<div class="risk"><span class="ok">✓</span><div>No major negative issue detected</div></div>`;
  $("#scoreRows").innerHTML=scoreRows();
  $("#authorityChecks").innerHTML=authorityChecks();
  $("#metricCards").innerHTML=metrics();
  $("#mediaList").innerHTML=report.mediaMentions.map(x=>detail(x.title,`${x.source} · ${x.date}`,x.note)).join("");
  $("#reportCount").textContent=reports.length || 1;
  bindDynamic();
  renderPages();
}

function scoreRows(){
  const bioScore=getBioScore();
  return [
    ["Reputation Score",report.reputationScore],
    ["Organization Score",report.orgScore],
    ["Risk Score",report.riskScore],
    ["Opportunity Score",report.opportunityScore],
    ["Asset Recovery Score",report.assetScore],
    ["Bio Score",bioScore],
    ["Authority Score",report.authorityScore]
  ].map(([l,v])=>`<div class="row"><span>${l}</span><div class="bar"><div class="fill" style="width:${v}%"></div></div><strong>${v}</strong></div>`).join("");
}

function authorityChecks(){
  return ["Google Knowledge Panel","Wikipedia Page","Wikidata Profile","Official Website","LinkedIn Profile","News Coverage","Awards & Recognition","Speaking History"].map((x,i)=>`<div class="asset"><span>${x}</span><span class="${i<3?'no':'yes'}">${i<3?'×':'✓'}</span><small>${i<3?'Check':'Verify'}</small></div>`).join("");
}

function counts(){
  const media=assets.filter(a=>["Media Mention","Podcast / Interview","Publication / Article"].includes(a.type)).length;
  return {
    google:Math.max(10,assets.length),
    news:media,
    reach:media ? "Pending" : "0",
    speaking:assets.filter(a=>a.type==="Speaking Engagement").length,
    awards:assets.filter(a=>a.type==="Award / Recognition").length,
    social:assets.filter(a=>a.type==="Review / Testimonial").length,
    bio:getBioScore()
  };
}

function metrics(){
  const c=counts();
  const cards=[
    ["google","⌕",c.google,"Google Results"],
    ["news","▤",c.news,"News"],
    ["reach","♚",c.reach,"Media Reach"],
    ["speaking","♬",c.speaking,"Speaking"],
    ["awards","♕",c.awards,"Awards"],
    ["social","♧",c.social,"Reviews/Social"],
    ["bio","✎",c.bio,"Bio Score"],
    ["missing","!","9","AI Recommendations"]
  ];
  return cards.map(([type,icon,value,label])=>`<button class="metric" data-metric="${type}"><div class="icon">${icon}</div><div class="value">${value}</div><small>${label}</small></button>`).join("");
}

function detail(title,meta,note){
  return `<div class="detail-item"><strong>${title}</strong><small>${meta||""}<br>${note||""}</small></div>`;
}

function drawerItem(type,title,meta,note){
  const key=`${type}|${title}|${meta}`;
  if(hidden.includes(key)) return "";
  return `<div class="detail-item" data-key="${key}"><strong>${title}</strong><small>${meta||""}<br>${note||""}</small><br><button class="verify-btn" data-toast="Marked verified.">Mark Verified</button><button class="outline" data-toast="Marked client submitted.">Client Submitted</button><button class="outline" data-toast="Marked AI found.">AI Found</button><button class="remove-btn" data-hide="${key}">Remove irrelevant</button></div>`;
}

function metricData(type){
  const person=report.personName;
  const base = {
    google:{title:"Google Results",subtitle:`Top search result drawer for ${person}`,items:[drawerItem("google","Google search not connected yet","API Required","Connect Google Custom Search or SerpAPI to show the top 10 results."),...assets.slice(0,10).map(a=>drawerItem("google",a.title,`${a.type} · ${a.source} · ${a.date}`,a.notes))]},
    news:{title:"News + Media Mentions",subtitle:"Last 12 months only. Must mention the searched person or organization.",items:[drawerItem("news","No verified media mentions loaded yet","Research Required · Last 12 months","Articles, interviews, podcasts, TV/radio, and press mentions will appear here."),...assets.filter(a=>["Media Mention","Podcast / Interview","Publication / Article"].includes(a.type)).map(a=>drawerItem("news",a.title,`${a.source} · ${a.date}`,`${a.role} · ${a.notes}`))]},
    reach:{title:"Media Reach",subtitle:"Reach and source authority for verified media.",items:[drawerItem("reach","Media reach not calculated yet","API Required","Reach needs verified media sources and authority data.")]},
    speaking:{title:"Speaking Intelligence",subtitle:"Conferences, summits, forums, keynotes, panels, workshops, breakouts, webinars, podcasts, and university lectures.",items:[drawerItem("speaking","No verified speaking engagements loaded yet","Research Required","Only include events that mention the searched person or organization."),...assets.filter(a=>a.type==="Speaking Engagement").map(a=>drawerItem("speaking",a.title,`${a.role} · ${a.source} · ${a.date}`,a.notes))]},
    awards:{title:"Awards + Recognition",subtitle:"Awards, rankings, nominations, honors, and recognition.",items:[drawerItem("awards","No verified awards loaded yet","Research Required","Only include awards that mention the searched person or organization."),...assets.filter(a=>a.type==="Award / Recognition").map(a=>drawerItem("awards",a.title,`${a.source} · ${a.date}`,`${a.role} · ${a.notes}`))]},
    social:{title:"Reviews + Social Listening",subtitle:"Reviews, testimonials, public mentions, and sentiment.",items:[drawerItem("social","Reviews and social listening not connected yet","API Required","Google Reviews, Facebook, LinkedIn, Glassdoor, Indeed, Candid, Charity Navigator, and social mentions will appear here."),...assets.filter(a=>a.type==="Review / Testimonial").map(a=>drawerItem("social",a.title,`${a.source} · ${a.date}`,a.notes))]},
    bio:{title:"Bio Score Details",subtitle:"Missing or incomplete bio elements.",items:["Current title","Years of experience","Awards","Speaking engagements","Media interviews","Board memberships","Signature projects","Personal mission"].map(x=>drawerItem("bio",x,"Bio Development","Add this to improve bio completeness."))},
    missing:{title:"AI Recommendations: Missing Items",subtitle:"Potential gaps the client may need to add or verify.",items:["Missing awards","Missing media","Missing speaking engagements","Missing certifications","Missing board memberships","Missing publications","Missing books","Missing projects","Missing volunteer work"].map(x=>drawerItem("missing",x,"Recommendation","Ask the client to confirm if this belongs in their profile."))}
  };
  return base[type];
}

function openDrawer(type){
  const d=metricData(type);
  $("#drawerTitle").textContent=d.title;
  $("#drawerSubtitle").textContent=d.subtitle;
  $("#drawerContent").innerHTML=d.items.join("") || `<p class="muted">No items to display.</p>`;
  $("#drawerBackdrop").classList.add("active");
  $("#drawer").classList.add("active");
  bindDynamic();
}

function closeDrawer(){
  $("#drawerBackdrop").classList.remove("active");
  $("#drawer").classList.remove("active");
}

function openIdentity(){
  const matches=buildMatches();
  $("#identitySubtitle").textContent=`Which ${matches[0].name} do you mean?`;
  $("#identityMatches").innerHTML=matches.map((m,i)=>`<div class="match-card">
    <div><h3>${m.name}</h3><div class="match-meta">${m.title}<br>${m.organization}<br>${m.location}<br>Source: ${m.source}</div></div>
    <div><div class="confidence">${m.confidence}%<small>confidence</small></div><button class="select-match" data-match="${i}">This is the person</button><button class="outline" data-toast="Marked not right." style="width:100%;margin-top:8px">Not right</button></div>
  </div>`).join("");
  window.currentMatches=matches;
  $("#identityBackdrop").classList.add("active");
  $("#identityModal").classList.add("active");
  bindDynamic();
}

function closeIdentity(){
  $("#identityBackdrop").classList.remove("active");
  $("#identityModal").classList.remove("active");
}

function selectMatch(i){
  const match=window.currentMatches[i];
  report=buildReport(match);
  reports.unshift({id:crypto.randomUUID(),...report,createdAt:new Date().toISOString()});
  save("rr_report",report); save("rr_reports",reports);
  $("#searchInput").value=report.personName;
  closeIdentity();
  render();
  toast(`Report created for ${report.personName}.`);
}

function manualIdentity(){
  const name=cleanName($("#searchInput").value);
  selectMatchFromObject({name,title:"Manual Profile",organization:"Organization not entered",location:$("#locationInput").value||"Location not confirmed",source:"Manual entry",confidence:45});
}
function selectMatchFromObject(match){
  report=buildReport(match);
  reports.unshift({id:crypto.randomUUID(),...report,createdAt:new Date().toISOString()});
  save("rr_report",report); save("rr_reports",reports);
  closeIdentity();
  render();
}

function renderPages(){
  $("#client").innerHTML=portal("Client Portal","Clients see dashboard, report history, intake, uploads, Bio Builder, and assets.",["Complete Intake","Upload Documents","Bio Builder","Report History","Assets"]);
  $("#admin").innerHTML=adminPage();
  $("#intake").innerHTML=intakePage();
  $("#individual").innerHTML=basicPage("Individual Intelligence","Executive reputation, authority signals, role clarity, public visibility, Knowledge Panel, Wikipedia, Wikidata, bio strength, and media footprint.");
  $("#organization").innerHTML=basicPage("Organization Intelligence","Organization reputation, Google Business Profile, reviews, trust pages, nonprofit profiles, employer reputation, press, and awards.");
  $("#rep360").innerHTML=basicPage("Reputation 360™","Compares the individual and organization to see whether both reputations reinforce each other.");
  $("#assetRecovery").innerHTML=assetRecoveryPage();
  $("#assets").innerHTML=assetManagerPage();
  $("#speaking").innerHTML=speakingPage();
  $("#bio").innerHTML=bioPage();
  $("#social").innerHTML=basicPage("Reviews & Social Listening","Reports what people are saying online about the person, organization, or both. Sources include LinkedIn, Instagram, Facebook Reviews, Google Reviews, Glassdoor, Indeed, Candid, and Charity Navigator.");
  $("#timeline").innerHTML=timelinePage();
  $("#settings").innerHTML=basicPage("Settings","This static version is ready for Netlify. Firebase Authentication, Firestore, live search APIs, and AI APIs can be connected in the next build phase.");
  bindDynamic();
}

function portal(title,text,items){
  return `<div class="card panel"><h4>${title}</h4><div class="detail-item"><strong>${text}</strong></div><div class="portal-list">${items.map(x=>`<button data-toast="${x} opened.">${x}<span>›</span></button>`).join("")}</div></div>`;
}

function adminPage(){
  return `<div class="card panel"><h4>Admin Portal</h4><p class="muted">Manage clients, search clients, edit reports, verify assets, approve changes, export PDFs, and view report history.</p><div class="grid top-grid"><div class="card quick"><h4>Admin Actions</h4>${["Search Clients","Add Client","Edit Reports","Verify Assets","Approve Changes","Export PDF"].map(x=>`<button data-toast="${x} opened.">${x}<span>›</span></button>`).join("")}</div><div class="card panel"><h4>Report History</h4>${reports.length?reports.map(r=>detail(r.personName,r.reportType,new Date(r.createdAt).toLocaleString())).join(""):"<p class='muted'>No reports yet.</p>"}</div></div></div>`;
}

function intakePage(){
  return `<div class="card panel"><h4>Client Intake</h4><div class="form-grid">
    <label>Report Type<select id="intakeReportType"><option>Reputation 360™</option><option>Individual Reputation Report™</option><option>Organization Reputation Report™</option></select></label>
    <label>Individual Name<input id="intakeName" value="${report.personName}"></label>
    <label>Title<input id="intakeTitle" value="${report.title}"></label>
    <label>Organization<input id="intakeOrg" value="${report.orgName}"></label>
    <label>Website<input id="intakeWebsite" placeholder="Website"></label>
    <label>LinkedIn<input id="intakeLinkedin" placeholder="LinkedIn"></label>
    <label class="full">Goals<textarea id="intakeGoals">Understand what the world sees, what they are known for, what people are saying, what assets are missing, and what visibility strategy should come next.</textarea></label>
  </div><button class="primary" data-action="save-intake" style="margin-top:18px">SAVE INTAKE</button></div>`;
}

function basicPage(title,text){
  return `<div class="card panel"><h4>${title}</h4><p class="muted">${text}</p></div>`;
}

function assetRecoveryPage(){
  return `<div class="card panel"><h4>Asset Recovery™</h4><p class="muted">Find and organize accomplishments clients forget to use: media, awards, speaking, board roles, podcasts, publications, and signature projects.</p></div><div class="card metrics">${[
    ["news","▤",counts().news,"Media"],
    ["speaking","♬",counts().speaking,"Speaking"],
    ["awards","♕",counts().awards,"Awards"],
    ["bio","✎",getBioScore(),"Bio Score"]
  ].map(([type,icon,value,label])=>`<button class="metric" data-metric="${type}"><div class="icon">${icon}</div><div class="value">${value}</div><small>${label}</small></button>`).join("")}</div>`;
}

function assetManagerPage(){
  return `<div class="card panel"><h4>Manual Asset Manager</h4><p class="muted">Add, edit, delete, verify, mark client submitted, mark AI found, and upload proof links for missing items.</p><div class="form-grid">
    <label>Asset Type<select id="assetType">${["Speaking Engagement","Award / Recognition","Media Mention","Podcast / Interview","Board / Committee Role","Publication / Article","Book","Certification / Credential","Volunteer Work","Signature Project","Review / Testimonial","Other Authority Asset"].map(x=>`<option>${x}</option>`).join("")}</select></label>
    <label>Status<select id="assetStatus">${["Client Submitted","Verified","AI Found","Pending Verification"].map(x=>`<option>${x}</option>`).join("")}</select></label>
    <label>Title / Name<input id="assetTitle"></label>
    <label>Organization / Source<input id="assetSource"></label>
    <label>Date / Year<input id="assetDate"></label>
    <label>Role<input id="assetRole"></label>
    <label>URL<input id="assetUrl"></label>
    <label>Proof / Upload Link<input id="assetProof"></label>
    <label class="full">Notes<textarea id="assetNotes"></textarea></label>
  </div><button class="primary" data-action="add-asset" style="margin-top:16px">ADD TO REPORT</button><h4 style="margin-top:24px">Manually Added Assets</h4><div id="assetList">${assetList()}</div></div>`;
}

function assetList(){
  return assets.length ? assets.map(a=>`<div class="detail-item"><strong>${a.title}</strong><small>${a.type} · ${a.source} · ${a.date}<br>${a.role} · ${a.status}<br>${a.notes||""}</small><br><button class="verify-btn" data-toast="Marked verified.">Mark Verified</button><button class="outline" data-edit-asset="${a.id}">Edit</button><button class="remove-btn" data-delete-asset="${a.id}">Delete</button></div>`).join("") : `<p class="muted">No manual assets added yet.</p>`;
}

function speakingPage(){
  return `<div class="card panel"><h4>Speaking Intelligence</h4><p class="muted">Checks conferences, summits, forums, keynotes, panels, workshops, breakout sessions, webinars, podcasts, university lectures, and community events tied to the person or organization.</p>${report.speakingEngagements.map(x=>detail(x.title,`${x.eventType} · ${x.role} · ${x.date}`,x.note)).join("")}</div><div class="card panel" style="margin-top:18px"><h4>Speaking Categories</h4><div class="tags">${["Conferences","Summits","Forums","Keynotes","Panels","Workshops","Breakout Sessions","Webinars","Podcasts","University Lectures"].map(x=>`<span class="tag">${x}</span>`).join("")}</div></div>`;
}

function getBioScore(){
  return Math.round((bioChecked.length / 59) * 100) || report.bioScore || 52;
}

const bioGroups={
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

function bioPage(){
  const score=getBioScore();
  return `<div class="card panel"><h4>Bio Development™</h4><p class="muted"><strong>Purpose:</strong> Help the client remember accomplishments they've forgotten and identify what is missing from their professional story.</p></div>
  <div class="card metrics">${[
    ["▣",score,"Bio Completeness Score"],
    ["♕",assets.filter(a=>a.type==="Award / Recognition").length,"Awards Added"],
    ["♬",assets.filter(a=>a.type==="Speaking Engagement").length,"Speaking Added"],
    ["▤",assets.filter(a=>["Media Mention","Podcast / Interview","Publication / Article"].includes(a.type)).length,"Media Added"],
    ["♧",assets.filter(a=>["Board / Committee Role","Volunteer Work"].includes(a.type)).length,"Service Assets"],
    ["✎",score>=75?"Ready":"Draft","Bio Status"]
  ].map(([icon,value,label])=>`<div class="metric"><div class="icon">${icon}</div><div class="value">${value}</div><small>${label}</small></div>`).join("")}</div>
  <div class="card panel" style="margin-top:18px"><h4>Bio Completeness</h4><div class="bar" style="height:14px"><div class="fill" style="width:${score}%"></div></div><p class="muted">${score}% Complete</p></div>
  <div class="grid middle-grid" style="grid-template-columns:1.2fr 1fr;margin-top:18px"><div class="card panel"><h4>Essential Bio Elements Checklist</h4><div class="bio-checklist">${Object.entries(bioGroups).map(([g,items])=>`<div class="bio-group"><h5>${g}</h5>${items.map(item=>`<label class="bio-item"><input type="checkbox" data-bio="${item}" ${bioChecked.includes(item)?"checked":""}> ${item}</label>`).join("")}</div>`).join("")}</div></div>
  <div class="card panel"><h4>Bio Memory Prompts</h4>${["Signature Projects: What projects are you most proud of?","Career Milestones: What accomplishments changed your career?","Biggest Wins: What are your top 10 accomplishments?","Memorable Quotes: What do people quote you for?","Topics You're Known For: What do people call you about?","Personal Mission: What impact do you want to make?"].map(x=>detail(x.split(":")[0],x.split(":")[1],"")).join("")}</div></div>
  <div class="grid middle-grid" style="grid-template-columns:1fr 1fr;margin-top:18px"><div class="card panel"><h4>AI Bio Suggestions</h4>${["CEO or current role","Years of experience","Former leadership roles","Keynote presentations","Media mentions","Board appointments","Awards and recognition","Books or publications","Podcast guest appearances","University lectures"].map(x=>`<div class="detail-item"><strong>${x}</strong><small><button class="outline" data-add-bio="${x}">Add to Bio</button><button class="remove-btn" data-toast="Marked not relevant.">Not Relevant</button></small></div>`).join("")}<h4>Missing From Your Bio</h4><div class="tags">${["Board memberships","Volunteer leadership","Speaking history","Awards","Published articles","Major projects","Certifications","Books","Podcasts","Media interviews"].map(x=>`<span class="tag">${x}</span>`).join("")}</div></div>
  <div class="card panel"><h4>Bio Builder</h4><div class="bio-tabs">${["50","100","150","speaker","board","award","linkedin","website","press"].map(x=>`<button data-bio-format="${x}">${x==="speaker"?"Conference Speaker":x==="board"?"Board Nomination":x==="award"?"Award Nomination":x==="linkedin"?"LinkedIn About":x==="website"?"Website Bio":x==="press"?"Press Kit Bio":x+"-word"}</button>`).join("")}</div><div class="bio-output" id="bioOutput">Choose a bio format.</div></div></div>`;
}

function timelinePage(){
  return `<div class="card panel"><h4>Timeline of Influence™</h4><p class="muted">Organizes recovered and manually added assets into a career timeline for bios, award nominations, media kits, and executive profiles.</p>${assets.length?assets.map(a=>`<div class="timeline-item"><strong>${a.date||"Date needed"}</strong><br>${a.title}<br><small>${a.type} · ${a.source}</small></div>`).join(""):"<p class='muted'>Add assets to build the Timeline of Influence™.</p>"}</div>`;
}

function generateBio(format){
  const assetText=assets.slice(0,6).map(a=>a.title).join(", ");
  const known=(report.knownFor||[]).slice(0,4).join(", ")||"leadership and professional impact";
  const name=report.personName, title=report.title||"leader", org=report.orgName||"their organization";
  const drafts={
    "50":`${name} is a ${title} connected to ${org}. Their work centers on ${known}. Key accomplishments to consider adding include ${assetText||"awards, speaking engagements, media mentions, board service, and signature projects"}.`,
    "100":`${name} is a ${title} whose reputation profile centers on ${known}. Through ${org}, they have built visibility around their expertise and public-facing work. A stronger bio should include verified accomplishments such as awards, media mentions, speaking engagements, board service, publications, credentials, and signature projects.`,
    "150":`${name} is a ${title} connected to ${org}, with a reputation profile that should be supported by verified accomplishments, public-facing leadership, and visible proof of impact. Their bio should clearly explain what they are known for, who they serve, what they have built, and why their work matters.`,
    speaker:`${name} is a ${title} available for conversations on ${known}. Their speaker bio should highlight keynote topics, panels, workshops, conferences, media experience, and practical lessons audiences can apply.`,
    board:`${name} is a ${title} with experience that may support board, advisory, or civic leadership opportunities. A board bio should emphasize leadership judgment, industry expertise, governance experience, community impact, financial or operational oversight, and relevant credentials.`,
    award:`${name} is a ${title} whose accomplishments may support award and recognition opportunities. An award nomination bio should include measurable impact, leadership roles, media recognition, speaking engagements, community service, awards, and proof of influence.`,
    linkedin:`${name} helps audiences understand ${known}. Their LinkedIn About section should open with their current role, clearly state what they are known for, include proof such as awards, media, speaking, board service, and close with the kind of opportunities they want next.`,
    website:`${name} is a ${title} connected to ${org}. This website bio should position them clearly, show proof of credibility, and point audiences toward their leadership, visibility, and reputation assets.`,
    press:`${name} is a ${title} whose public profile includes ${known}. A press kit bio should include verified media mentions, speaking topics, awards, credentials, and official contact information.`
  };
  $("#bioOutput").textContent=drafts[format]||drafts["100"];
}

function addAsset(){
  const a={
    id:crypto.randomUUID(),
    type:$("#assetType").value,
    status:$("#assetStatus").value,
    title:$("#assetTitle").value.trim(),
    source:$("#assetSource").value.trim(),
    date:$("#assetDate").value.trim(),
    role:$("#assetRole").value.trim(),
    url:$("#assetUrl").value.trim(),
    proof:$("#assetProof").value.trim(),
    notes:$("#assetNotes").value.trim()
  };
  if(!a.title){ toast("Add an asset title first."); return; }
  assets.unshift(a);
  save("rr_assets",assets);
  render();
  setPage("assets");
  toast("Authority asset added.");
}

function editAsset(id){
  const a=assets.find(x=>x.id===id); if(!a) return;
  setPage("assets");
  $("#assetType").value=a.type; $("#assetStatus").value=a.status; $("#assetTitle").value=a.title; $("#assetSource").value=a.source; $("#assetDate").value=a.date; $("#assetRole").value=a.role; $("#assetUrl").value=a.url; $("#assetProof").value=a.proof; $("#assetNotes").value=a.notes;
  assets=assets.filter(x=>x.id!==id); save("rr_assets",assets);
  toast("Edit the asset and save again.");
}
function deleteAsset(id){ assets=assets.filter(x=>x.id!==id); save("rr_assets",assets); render(); setPage("assets"); toast("Asset deleted."); }

function saveIntake(){
  report.reportType=$("#intakeReportType").value;
  report.personName=$("#intakeName").value;
  report.title=$("#intakeTitle").value;
  report.orgName=$("#intakeOrg").value;
  save("rr_report",report);
  render();
  setPage("dashboard");
  toast("Intake saved.");
}

function bindDynamic(){
  $$("[data-page]").forEach(b=>b.onclick=()=>setPage(b.dataset.page));
  $$("[data-page-link]").forEach(b=>b.onclick=()=>setPage(b.dataset.pageLink));
  $$("[data-action='identity-review']").forEach(b=>b.onclick=openIdentity);
  $$("[data-action='new-report']").forEach(b=>b.onclick=()=>setPage("intake"));
  $$("[data-action='export-pdf']").forEach(b=>b.onclick=()=>window.print());
  $$("[data-action='close-identity']").forEach(b=>b.onclick=closeIdentity);
  $$("[data-action='manual-identity']").forEach(b=>b.onclick=manualIdentity);
  $$("[data-action='close-drawer']").forEach(b=>b.onclick=closeDrawer);
  $$("[data-action='restore-hidden']").forEach(b=>b.onclick=()=>{hidden=[]; save("rr_hidden",hidden); if($("#drawer").classList.contains("active")) openDrawer("missing"); toast("Removed items restored.");});
  $$("[data-action='save-intake']").forEach(b=>b.onclick=saveIntake);
  $$("[data-action='add-asset']").forEach(b=>b.onclick=addAsset);
  $$("[data-match]").forEach(b=>b.onclick=()=>selectMatch(Number(b.dataset.match)));
  $$("[data-metric]").forEach(b=>b.onclick=()=>openDrawer(b.dataset.metric));
  $$("[data-toast]").forEach(b=>b.onclick=()=>toast(b.dataset.toast));
  $$("[data-hide]").forEach(b=>b.onclick=()=>{hidden.push(b.dataset.hide); save("rr_hidden",hidden); b.closest(".detail-item").remove(); toast("Removed irrelevant item.");});
  $$("[data-edit-asset]").forEach(b=>b.onclick=()=>editAsset(b.dataset.editAsset));
  $$("[data-delete-asset]").forEach(b=>b.onclick=()=>deleteAsset(b.dataset.deleteAsset));
  $$("[data-bio]").forEach(cb=>cb.onchange=()=>{
    const v=cb.dataset.bio;
    bioChecked=cb.checked ? [...new Set([...bioChecked,v])] : bioChecked.filter(x=>x!==v);
    save("rr_bio_checked",bioChecked);
    render();
    setPage("bio");
  });
  $$("[data-bio-format]").forEach(b=>b.onclick=()=>generateBio(b.dataset.bioFormat));
  $$("[data-add-bio]").forEach(b=>b.onclick=()=>toast("Added to bio draft."));
}

$("#drawerBackdrop").onclick=closeDrawer;
$("#identityBackdrop").onclick=closeIdentity;

render();
