
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function load(key, fallback){ try{return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch{return fallback;} }
function save(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2600); }
function uid(){ return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2); }
function initials(name){ return (name||"RR").trim().split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase() || "RR"; }

let mode = localStorage.getItem("rr_mode") || "";
let clients = load("rr_clients", []);
let activeClientId = load("rr_active_client_id", "");
let currentPage = "dashboard";
let hidden = load("rr_hidden", {});
let bioCheckedAll = load("rr_bio_checked_by_client", {});

function defaultReport(client){
  return {
    id: uid(),
    clientId: client?.id || "",
    personName: client?.name || "No client selected",
    orgName: client?.organization || "Client Workspace",
    title: client?.title || "Select a client",
    reportType:"No Report",
    status:"Draft",
    researchConfidence:0,
    reputationScore:0,
    orgScore:0,
    riskScore:0,
    opportunityScore:0,
    assetScore:0,
    bioScore:0,
    authorityScore:0,
    executiveSummary:"Select or create a client, add their LinkedIn URL, then generate a report. Each client now has their own reports, assets, bio, and history.",
    knownForSummary:"No client research has been generated yet.",
    knownFor:[],
    risks:[],
    mediaMentions:[],
    speakingEngagements:[],
    researchResults:{}
  };
}

function ensureSeed(){
  if(!clients.length){
    const id = uid();
    clients.push({
      id,
      name:"Stefanie Magness",
      title:"Founder & Visibility Consultant",
      organization:"Elevate Visibility Group",
      linkedin:"https://www.linkedin.com/in/stefanie-magness/",
      website:"",
      industry:"Public Relations",
      status:"Draft",
      notes:"",
      createdAt:new Date().toISOString(),
      reports:[],
      assets:[]
    });
    activeClientId = id;
    saveAll();
  }
}
function saveAll(){
  save("rr_clients", clients);
  save("rr_active_client_id", activeClientId);
}
function activeClient(){
  let client = clients.find(c=>c.id===activeClientId) || clients[0] || null;
  if(client && client.id !== activeClientId){
    activeClientId = client.id;
    saveAll();
  }
  return client;
}
function currentReport(){
  const c = activeClient();
  if(!c) return defaultReport(null);
  const report = (c.reports || [])[0];

  // Prevent one client's report from showing under another client.
  if(report && report.clientId === c.id && (report.personName || "").trim().toLowerCase() === (c.name || "").trim().toLowerCase()){
    return report;
  }

  return defaultReport(c);
}

function setActiveClient(id, pageToKeep){
  const exists = clients.some(c => c.id === id);
  if(!exists) return;
  activeClientId = id;
  saveAll();

  const c = activeClient();
  if($("#nameInput")) $("#nameInput").value = c?.name || "";
  if($("#linkedinInput")) $("#linkedinInput").value = c?.linkedin || "";
  if($("#orgInput")) $("#orgInput").value = c?.organization || "";
  if($("#websiteInput")) $("#websiteInput").value = c?.website || "";

  render();
  setPage(pageToKeep || currentPage || "dashboard");
  toast("Switched client.");
}

function wipeActiveClientData(){
  const c = activeClient();
  if(!c){ toast("Select a client first."); return; }
  const ok = confirm(`Wipe clean data for "${c.name}"?\n\nThis clears reports, assets, removed items, bio checklist, status, and notes for this client only. The client record will stay.`);
  if(!ok) return;

  c.reports = [];
  c.assets = [];
  c.status = "Draft";
  c.notes = "";
  delete hidden[c.id];
  delete bioCheckedAll[c.id];

  save("rr_hidden", hidden);
  save("rr_bio_checked_by_client", bioCheckedAll);
  saveAll();

  render();
  setPage("dashboard");
  toast("Client data wiped clean. You can start a new search.");
}


function activeAssets(){
  return activeClient()?.assets || [];
}

function hiddenKeysForClient(){
  hidden[activeClientId] = hidden[activeClientId] || [];
  return hidden[activeClientId];
}

function isHiddenMetricItem(type, item){
  const keys = hiddenKeysForClient();
  const title = item?.title || "";
  const meta = item?.source || item?.eventType || item?.type || "";
  return keys.some(k => k.startsWith(type + "|") && k.includes(title));
}

function visibleResearchItems(type, items){
  return (items || []).filter(item => !isHiddenMetricItem(type, item));
}

function visibleAssetsByType(assetType){
  return activeAssets().filter(a => !hiddenKeysForClient().includes(`asset|${a.id}`) && (!assetType || a.type === assetType));
}
function activeBioChecked(){
  return bioCheckedAll[activeClientId] || [];
}
function setActiveBioChecked(values){
  bioCheckedAll[activeClientId] = values;
  save("rr_bio_checked_by_client", bioCheckedAll);
}

function clientSwitcher(title){
  if(mode !== "admin") return "";
  return `<div class="card panel" style="margin-bottom:18px">
    <h4>${title || "Active Client"}</h4>
    <p class="muted">Switch clients here. This section updates to the selected client.</p>
    <div class="search-stack" style="grid-template-columns:1fr 170px 210px">
      <select class="globalClientSelect">
        ${clients.map(c=>`<option value="${c.id}" ${c.id===activeClientId?"selected":""}>${c.name}${c.organization ? " | " + c.organization : ""}</option>`).join("")}
      </select>
      <button class="outline" data-page-link="clients">Manage Clients</button>
      <button class="remove-btn" data-action="wipe-client">Wipe Clean Client Data</button>
    </div>
  </div>`;
}

function bindGlobalClientSelectors(){
  $$(".globalClientSelect").forEach(sel=>{
    sel.onchange = e => {
      activeClientId = e.target.value;
      saveAll();
      render();
      toast("Switched client.");
    };
  });
}

function enterMode(newMode){
  ensureSeed();
  mode = newMode;
  localStorage.setItem("rr_mode", mode);
  $("#entryScreen").style.display = "none";
  $("#appShell").classList.add("active");
  document.body.classList.toggle("admin-mode", mode === "admin");
  document.body.classList.toggle("client-mode", mode === "client");
  $("#modeLabel").textContent = mode === "admin" ? "Admin Workspace" : "Executive Dashboard";
  buildNav();
  setPage(mode==="admin" ? "clients" : "dashboard");
  render();
}

function buildNav(){
  const adminNav = [
    ["clients","Clients"],["dashboard","Active Client Dashboard"],["reports","Reports"],["intake","Intake"],["rep360","Reputation 360™"],["assetRecovery","Asset Recovery™"],["assets","Manual Asset Manager"],["speaking","Speaking Intelligence"],["bio","Bio Development™"],["social","Reviews + Social"],["timeline","Timeline of Influence™"],["settings","Settings"]
  ];
  const clientNav = [
    ["dashboard","My Reputation Dashboard"],["reports","My Reports"],["rep360","Reputation 360™"],["speaking","Speaking History"],["bio","Bio Builder"],["social","Reviews + Social"],["timeline","Timeline of Influence™"],["uploads","Upload Accomplishments"]
  ];
  const nav = mode === "admin" ? adminNav : clientNav;
  $("#nav").innerHTML = nav.map(([id,label]) => `<button data-page="${id}">${label}</button>`).join("");
}

function setPage(page){
  currentPage = page;
  $$(".page").forEach(p=>p.classList.remove("active"));
  const el = $("#"+page);
  if(el) el.classList.add("active");
  $$("nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  window.scrollTo({top:0,behavior:"smooth"});
  renderPages();
  bindDynamic();
}

function addClient(){
  const name = $("#clientName").value.trim();
  if(!name){toast("Add client name first."); return;}
  const client = {
    id: uid(),
    name,
    title: $("#clientTitle").value.trim(),
    organization: $("#clientOrg").value.trim(),
    linkedin: $("#clientLinkedin").value.trim(),
    website: $("#clientWebsite").value.trim(),
    industry: $("#clientIndustry").value.trim(),
    status: $("#clientStatus").value,
    notes: $("#clientNotes").value.trim(),
    createdAt:new Date().toISOString(),
    reports:[],
    assets:[]
  };
  clients.unshift(client);
  activeClientId = client.id;
  saveAll();
  render();
  setPage("clients");
  toast("Client added and selected.");
}
function selectClient(id){
  setActiveClient(id, "dashboard");
}
function deleteClient(id){
  const client = clients.find(c=>c.id===id);
  if(!client) return;
  const ok = confirm(`Delete client "${client.name}"?

This deletes intake, reports, assets, scores, notes, manual additions, and bio checklist saved in this browser. This cannot be undone.`);
  if(!ok) return;

  clients = clients.filter(c=>c.id!==id);
  delete bioCheckedAll[id];
  delete hidden[id];

  save("rr_bio_checked_by_client", bioCheckedAll);
  save("rr_hidden", hidden);

  activeClientId = clients[0]?.id || "";
  saveAll();
  render();
  setPage("clients");
  toast("Client deleted.");
}
function updateClient(){
  const c = activeClient();
  if(!c){toast("Select a client first."); return;}
  c.name = $("#intakeName").value.trim();
  c.title = $("#intakeTitle").value.trim();
  c.organization = $("#intakeOrg").value.trim();
  c.linkedin = $("#intakeLinkedin").value.trim();
  c.website = $("#intakeWebsite").value.trim();
  c.industry = $("#intakeIndustry").value.trim();
  c.status = $("#intakeStatus").value;
  c.notes = $("#intakeNotes").value.trim();
  saveAll();
  render();
  setPage("dashboard");
  toast("Client updated.");
}

function fillSearchFromClient(){
  const c = activeClient();
  if(!c) return;
  $("#nameInput").value = c.name || "";
  $("#linkedinInput").value = c.linkedin || "";
  $("#orgInput").value = c.organization || "";
  $("#websiteInput").value = c.website || "";
}

async function runResearch(){
  const c = activeClient();
  if(!c){ toast("Create or select a client first."); setPage("clients"); return; }

  const name = $("#nameInput").value.trim() || c.name;
  const linkedin = $("#linkedinInput").value.trim() || c.linkedin;
  const organization = $("#orgInput").value.trim() || c.organization;
  const website = $("#websiteInput").value.trim() || c.website;

  if(!name){ toast("Client name is required."); return; }
  if(!linkedin){ toast("LinkedIn URL is required."); return; }

  c.name = name; c.linkedin = linkedin; c.organization = organization; c.website = website; c.status = "Researching";
  saveAll(); render();

  toast("Running live research...");
  try{
    const response = await fetch("/.netlify/functions/research", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ name, linkedin, organization, website })
    });
    const data = await response.json();
    if(!response.ok || !data.ok) throw new Error(data.error || "Research failed.");

    const scores = data.scores || {};
    const report = {
      id: uid(),
      clientId:c.id,
      personName:name,
      orgName:organization || "Organization not entered",
      title: c.title || (organization ? `Leader connected to ${organization}` : "Executive / Thought Leader"),
      reportType:"Live Reputation Report™",
      status:"Needs Review",
      researchConfidence:data.confidence || 80,
      reputationScore:scores.reputationScore || 0,
      orgScore:scores.orgScore || 0,
      riskScore:scores.riskScore || 0,
      opportunityScore:scores.opportunityScore || 0,
      assetScore:scores.assetScore || 0,
      bioScore:scores.bioScore || 0,
      authorityScore:scores.authorityScore || 0,
      executiveSummary:data.executiveSummary || "",
      knownForSummary:data.knownForSummary || "",
      knownFor:data.knownFor || [],
      mediaMentions:(data.newsResults || []).map(x=>({title:x.title,source:x.source || "News",date:x.date || "Last 12 months",note:x.snippet || x.link || ""})),
      speakingEngagements:(data.speakingResults || []).map(x=>({title:x.title,eventType:"Speaking Signal",role:"Possible speaker / panelist / guest",date:x.date || "Needs verification",note:x.snippet || x.link || ""})),
      awardResults:data.awardResults || [],
      webResults:data.webResults || [],
      researchResults:data,
      risks:[
        data.checks?.knowledgePanel ? "Google Knowledge Panel signal detected" : "No Google Knowledge Panel signal detected yet",
        data.checks?.wikipedia ? "Wikipedia profile signal detected" : "No Wikipedia profile signal detected yet",
        data.checks?.wikidata ? "Wikidata profile signal detected" : "No Wikidata profile signal detected yet",
        data.checks?.linkedin ? "LinkedIn confirmation signal detected" : "LinkedIn signal needs review",
        "Review all live results before using them in a final client report"
      ],
      createdAt:new Date().toISOString()
    };
    c.reports = c.reports || [];
    c.reports.unshift(report);
    c.status = "Needs Review";
    saveAll();
    render();
    setPage("dashboard");
    toast("Client report generated and saved.");
  }catch(err){
    c.status = "Error";
    saveAll();
    render();
    toast(err.message || "Research failed.");
  }
}

function updateStatus(status){
  const c = activeClient();
  if(!c) return;
  c.status = status;
  saveAll();
  render();
  toast("Status updated.");
}

function render(){
  const c = activeClient();
  const report = currentReport();

  if($("#activeClientSelect")){
    $("#activeClientSelect").innerHTML = clients.map(c=>`<option value="${c.id}" ${c.id===activeClientId?"selected":""}>${c.name} ${c.organization ? " | " + c.organization : ""}</option>`).join("");
    $("#activeClientSelect").value = activeClientId;
    $("#activeClientSelect").onchange = e => setActiveClient(e.target.value, "dashboard");
    fillSearchFromClient();
  }

  $("#clientCount").textContent = clients.length;
  $("#topInitials").textContent=initials(mode==="admin" ? "EVG Admin" : report.personName);
  $("#profileInitials").textContent=initials(report.personName);
  $("#profileName").textContent=report.personName;
  $("#profileTitle").textContent=report.title;
  $("#profileOrg").textContent=report.orgName;
  $("#reportType").textContent=report.reportType;
  $("#confidenceBadge").textContent=`Confidence: ${report.researchConfidence}%`;
  $("#statusBadge").textContent=`Status: ${c?.status || report.status || "Draft"}`;
  $("#overallScore").textContent=report.reputationScore;
  $("#executiveSummary").textContent=report.executiveSummary;
  $("#knownForSummary").textContent=report.knownForSummary;
  $("#knownTags").innerHTML=(report.knownFor || []).map(x=>`<span class="tag">${x}</span>`).join("");
  $("#scoreRows").innerHTML=scoreRows(report);
  $("#authorityChecks").innerHTML=authorityChecks(report);
  $("#metricCards").innerHTML=metrics(report);
  const visibleMedia = visibleResearchItems("news", report.researchResults?.newsResults || []).map(x=>({title:x.title,source:x.source||"Media",date:x.date||"Last 12 months",note:x.snippet||x.link}));
  const manualMedia = visibleAssetsByType().filter(a=>["Media Mention","Podcast / Interview","Publication / Article"].includes(a.type)).map(a=>({title:a.title,source:a.source,date:a.date,note:a.notes||a.url}));
  $("#mediaList").innerHTML=[...visibleMedia, ...manualMedia].slice(0,6).map(x=>detail(x.title,`${x.source} · ${x.date}`,x.note)).join("") || "<p class='muted'>No third-party media mentions found yet.</p>";
  $("#recommendations").innerHTML=["Verify strongest third-party media results","Remove unrelated results","Add missing awards or recognition","Confirm speaking activity","Update executive bio"].map(x=>detail(x,"Recommendation","Add to next visibility plan.")).join("");
  $("#userRole").textContent = mode === "admin" ? "EVG Admin" : report.personName;
  $("#userMode").textContent = mode === "admin" ? "Admin Workspace" : "Executive Dashboard";
  renderPages();
  bindDynamic();
}

function getBioScore(){
  const checked = activeBioChecked();
  return Math.round((checked.length / 59) * 100) || currentReport().bioScore || 0;
}

function scoreRows(report){
  const bioScore=getBioScore();
  return [["Reputation Score",report.reputationScore],["Organization Score",report.orgScore],["Risk Score",report.riskScore],["Opportunity Score",report.opportunityScore],["Asset Recovery Score",report.assetScore],["Bio Score",bioScore],["Authority Score",report.authorityScore]]
    .map(([l,v])=>`<div class="row"><span>${l}</span><div class="bar"><div class="fill" style="width:${v}%"></div></div><strong>${v}</strong></div>`).join("");
}

function authorityChecks(report){
  const checks = report.researchResults?.checks || {};
  const rows = [
    ["Google Knowledge Panel", checks.knowledgePanel],
    ["Wikipedia Page", checks.wikipedia],
    ["Wikidata Profile", checks.wikidata],
    ["LinkedIn Profile", checks.linkedin],
    ["Official Website", checks.officialWebsite],
    ["News Coverage", (report.researchResults?.newsResults || []).length > 0],
    ["Awards & Recognition", (report.researchResults?.awardResults || []).length > 0],
    ["Speaking History", (report.researchResults?.speakingResults || []).length > 0]
  ];
  return rows.map(([x, yes])=>`<div class="asset"><span>${x}</span><span class="${yes?'yes':'no'}">${yes?'✓':'×'}</span><small>${yes?'Detected':'Check'}</small></div>`).join("");
}

function counts(report){
  const visibleWeb = visibleResearchItems("google", report.researchResults?.webResults || []);
  const visibleNews = visibleResearchItems("news", report.researchResults?.newsResults || []);
  const visibleSpeaking = visibleResearchItems("speaking", report.researchResults?.speakingResults || []);
  const visibleAwards = visibleResearchItems("awards", report.researchResults?.awardResults || []);

  const manualNews = visibleAssetsByType().filter(a=>["Media Mention","Podcast / Interview","Publication / Article"].includes(a.type));
  const manualSpeaking = visibleAssetsByType("Speaking Engagement");
  const manualAwards = visibleAssetsByType("Award / Recognition");
  const manualSocial = visibleAssetsByType("Review / Testimonial");

  return {
    google: visibleWeb.length,
    news: visibleNews.length + manualNews.length,
    reach: (visibleNews.length + manualNews.length) ? "Pending" : "0",
    speaking: visibleSpeaking.length + manualSpeaking.length,
    awards: visibleAwards.length + manualAwards.length,
    social: manualSocial.length,
    bio:getBioScore()
  };
}

function metrics(report){
  const c=counts(report);
  return [["google","⌕",c.google,"Google Results"],["news","▤",c.news,"News"],["reach","♚",c.reach,"Media Reach"],["speaking","♬",c.speaking,"Speaking"],["awards","♕",c.awards,"Awards"],["social","♧",c.social,"Reviews/Social"],["bio","✎",c.bio,"Bio Score"],["missing","!","9","AI Recommendations"]]
    .map(([type,icon,value,label])=>`<button class="metric" data-metric="${type}"><div class="icon">${icon}</div><div class="value">${value}</div><small>${label}</small></button>`).join("");
}

function detail(title,meta,note){ return `<div class="detail-item"><strong>${title}</strong><small>${meta||""}<br>${note||""}</small></div>`; }

function drawerItem(type,title,meta,note){
  const keys = hiddenKeysForClient();
  const key=`${type}|${title}|${meta}`;
  if(keys.includes(key)) return "";
  const adminControls = mode === "admin" ? `<br><button class="verify-btn" data-toast="Marked verified.">Mark Verified</button><button class="outline" data-toast="Marked client submitted.">Client Submitted</button><button class="outline" data-toast="Marked AI found.">AI Found</button><button class="remove-btn" data-hide="${key}">Remove irrelevant</button>` : "";
  return `<div class="detail-item" data-key="${key}"><strong>${title}</strong><small>${meta||""}<br>${note||""}</small>${adminControls}</div>`;
}

function manualAssetTypeForMetric(type){
  const map = {
    news: "Media Mention",
    speaking: "Speaking Engagement",
    awards: "Award / Recognition",
    social: "Review / Testimonial",
    google: "Other Authority Asset",
    reach: "Media Mention",
    missing: "Other Authority Asset"
  };
  return map[type] || "Other Authority Asset";
}

function manualAddForm(type){
  if(mode !== "admin") return "";
  const label = {
    news:"Add News / Media Mention",
    speaking:"Add Speaking Engagement",
    awards:"Add Award / Recognition",
    social:"Add Review / Social Item",
    google:"Add Google / Authority Result",
    reach:"Add Media Reach Item",
    missing:"Add Missing Asset",
    bio:"Add Bio Asset"
  }[type] || "Add Item";
  return `<div class="detail-item" style="background:#fff8f6">
    <strong>${label}</strong>
    <div class="form-grid" style="grid-template-columns:1fr;gap:10px;margin-top:10px">
      <input id="manualTitle" placeholder="Title">
      <input id="manualSource" placeholder="Source / organization / publication">
      <input id="manualDate" placeholder="Date / year">
      <input id="manualUrl" placeholder="URL">
      <textarea id="manualNotes" placeholder="Notes"></textarea>
    </div>
    <button class="primary" data-manual-add="${type}" style="margin-top:10px">ADD TO THIS CLIENT</button>
  </div>`;
}

function addManualFromDrawer(type){
  const c=activeClient();
  if(!c){toast("Select a client first."); return;}
  const title=$("#manualTitle")?.value.trim();
  if(!title){toast("Add a title first."); return;}
  const asset={
    id:uid(),
    type:manualAssetTypeForMetric(type),
    status:"Client Submitted",
    title,
    source:$("#manualSource")?.value.trim() || "",
    date:$("#manualDate")?.value.trim() || "",
    role:type==="speaking" ? "Speaker / participant" : "",
    url:$("#manualUrl")?.value.trim() || "",
    proof:$("#manualUrl")?.value.trim() || "",
    notes:$("#manualNotes")?.value.trim() || ""
  };
  c.assets=c.assets||[];
  c.assets.unshift(asset);
  saveAll();
  render();
  openDrawer(type);
  toast("Item added to this client.");
}


function metricData(type){
  const report = currentReport();
  const rr = report.researchResults || {};
  const assets = activeAssets();
  const data = {
    google:{title:"Google Results",subtitle:"Live web results tied to name and LinkedIn.",items:[...visibleResearchItems("google", rr.webResults||[]).map(x=>drawerItem("google",x.title,x.source,x.snippet||x.link))]},
    news:{title:"News + Media Mentions",subtitle:"Third-party articles, profiles, spotlights, expert commentary, and publication features.",items:[...visibleResearchItems("news", rr.newsResults||[]).map(x=>drawerItem("news",x.title,x.source,x.snippet||x.link)),...assets.filter(a=>["Media Mention","Podcast / Interview","Publication / Article"].includes(a.type)).map(a=>drawerItem("news",a.title,`${a.source} · ${a.date}`,`${a.role} · ${a.notes}`))]},
    reach:{title:"Media Reach",subtitle:"Reach and source authority for verified media.",items:[drawerItem("reach","Media reach not calculated yet","API Required","Reach needs verified media sources and authority data.")]},
    speaking:{title:"Speaking Intelligence",subtitle:"Conferences, summits, forums, keynotes, panels, workshops, breakouts, webinars, podcasts, and university lectures.",items:[...visibleResearchItems("speaking", rr.speakingResults||[]).map(x=>drawerItem("speaking",x.title,x.source,x.snippet||x.link)),...assets.filter(a=>a.type==="Speaking Engagement").map(a=>drawerItem("speaking",a.title,`${a.role} · ${a.source} · ${a.date}`,a.notes))]},
    awards:{title:"Awards + Recognition",subtitle:"Third-party awards, rankings, best-of lists, top lists, trailblazers, honorees, and formal recognition.",items:[...visibleResearchItems("awards", rr.awardResults||[]).map(x=>drawerItem("awards",x.title,x.source,x.snippet||x.link)),...assets.filter(a=>a.type==="Award / Recognition").map(a=>drawerItem("awards",a.title,`${a.source} · ${a.date}`,`${a.role} · ${a.notes}`))]},
    social:{title:"Reviews + Social Listening",subtitle:"Reviews, testimonials, public mentions, and sentiment.",items:[drawerItem("social","Reviews and social listening not connected yet","Phase 2","Google Reviews, Facebook, LinkedIn, Glassdoor, Indeed, Candid, Charity Navigator, and social mentions will appear here.")]},
    bio:{title:"Bio Score Details",subtitle:"Missing or incomplete bio elements.",items:["Current title","Years of experience","Awards","Speaking engagements","Media interviews","Board memberships","Signature projects","Personal mission"].map(x=>drawerItem("bio",x,"Bio Development","Add this to improve bio completeness."))},
    missing:{title:"AI Recommendations: Missing Items",subtitle:"Potential gaps the client may need to add or verify.",items:["Missing awards","Missing media","Missing speaking engagements","Missing certifications","Missing board memberships","Missing publications","Missing books","Missing projects","Missing volunteer work"].map(x=>drawerItem("missing",x,"Recommendation","Ask the client to confirm if this belongs in their profile."))}
  };
  return data[type];
}

function openDrawer(type){
  const d=metricData(type);
  $("#drawerTitle").textContent=d.title;
  $("#drawerSubtitle").textContent=d.subtitle;
  $("#drawerContent").innerHTML=manualAddForm(type) + (d.items.join("") || `<p class="muted">No items to display.</p>`);
  $("#drawerBackdrop").classList.add("active");
  $("#drawer").classList.add("active");
  bindDynamic();
}
function closeDrawer(){ $("#drawerBackdrop").classList.remove("active"); $("#drawer").classList.remove("active"); }

function renderPages(){
  $("#clients").innerHTML = clientsPage();
  $("#reports").innerHTML = reportsPage();
  $("#intake").innerHTML = intakePage();
  $("#rep360").innerHTML = clientSwitcher("Active Client") + basicPage("Reputation 360™",currentReport().executiveSummary || "Generate a report for this client.");
  $("#assetRecovery").innerHTML = clientSwitcher("Active Client") + basicPage("Asset Recovery™","Find and organize accomplishments clients forget to use: media, awards, speaking, board roles, podcasts, publications, and signature projects.");
  $("#assets").innerHTML = assetManagerPage();
  $("#speaking").innerHTML = speakingPage();
  $("#bio").innerHTML = bioPage();
  $("#social").innerHTML = clientSwitcher("Active Client") + basicPage("Reviews & Social Listening","Reports what people are saying online about the person, organization, or both. Sources include LinkedIn, Instagram, Facebook Reviews, Google Reviews, Glassdoor, Indeed, Candid, and Charity Navigator.");
  $("#timeline").innerHTML = timelinePage();
  $("#uploads").innerHTML = `<div class="card panel"><h4>Upload Accomplishments</h4><p class="muted">Client-facing area for uploading new achievements, awards, bios, headshots, speaking links, media links, and proof documents.</p><div class="detail-item"><strong>Upload feature placeholder</strong><small>Firebase Storage will be connected in the next phase.</small></div></div>`;
  $("#settings").innerHTML = clientSwitcher("Active Client") + basicPage("Settings","Firebase Authentication, Firestore, AI APIs, PDF storage, and monitoring can be connected in the next phase.");
  bindGlobalClientSelectors();
}

function clientsPage(){
  return `<div class="grid middle-grid" style="grid-template-columns:1fr 1.3fr">
    <div class="card panel">
      <h4>Add New Client</h4>
      <div class="form-grid" style="grid-template-columns:1fr">
        <label>Name<input id="clientName" placeholder="Client name"></label>
        <label>Title<input id="clientTitle" placeholder="Title"></label>
        <label>Organization<input id="clientOrg" placeholder="Organization"></label>
        <label>LinkedIn URL<input id="clientLinkedin" placeholder="Required for research"></label>
        <label>Website<input id="clientWebsite" placeholder="Website"></label>
        <label>Industry<input id="clientIndustry" placeholder="Industry"></label>
        <label>Status<select id="clientStatus"><option>Draft</option><option>Researching</option><option>Needs Review</option><option>Ready</option><option>Delivered</option><option>Monitoring</option></select></label>
        <label>Notes<textarea id="clientNotes" placeholder="Internal notes"></textarea></label>
      </div>
      <button class="primary" data-action="add-client" style="margin-top:14px">ADD CLIENT</button>
    </div>
    <div class="card panel">
      <h4>Client Management</h4>
      <p class="muted">Select a client before generating reports. This lets the system support 100+ clients.</p>
      <div class="client-toolbar">
        <input id="clientSearch" placeholder="Search clients">
        <select id="clientStatusFilter"><option value="">All Statuses</option><option>Draft</option><option>Researching</option><option>Needs Review</option><option>Ready</option><option>Delivered</option><option>Monitoring</option></select>
      </div>
      <div id="clientTableWrap">${clientTable()}</div>
    </div>
  </div>`;
}
function clientTable(list=clients){
  return `<table class="client-table"><thead><tr><th>Client</th><th>Status</th><th>Reports</th><th>Assets</th><th>Actions</th></tr></thead><tbody>${list.map(c=>`<tr>
    <td><strong>${c.name}</strong><br><small>${c.title||""}${c.organization ? " | " + c.organization : ""}<br>${c.linkedin||""}</small></td>
    <td><span class="status">${c.status||"Draft"}</span></td>
    <td>${(c.reports||[]).length}</td>
    <td>${(c.assets||[]).length}</td>
    <td><button class="outline" data-select-client="${c.id}">Open</button><button class="remove-btn" data-delete-client="${c.id}">Delete Client</button></td>
  </tr>`).join("")}</tbody></table>`;
}

function reportsPage(){
  const c = activeClient();
  if(!c) return clientSwitcher("Active Client") + `<div class="card panel"><h4>Reports</h4><p class="muted">No client selected.</p></div>`;
  return clientSwitcher("Active Client") + `<div class="card panel"><h4>${mode==="admin" ? "Reports for " + c.name : "My Reports"}</h4>
    <p class="muted">Every generated report is saved under this client.</p>
    <div class="client-toolbar admin-only">
      <button class="outline" data-status="Draft">Draft</button>
      <button class="outline" data-status="Needs Review">Needs Review</button>
      <button class="outline" data-status="Ready">Ready</button>
      <button class="outline" data-status="Delivered">Delivered</button>
      <button class="outline" data-status="Monitoring">Monitoring</button>
    </div>
    ${(c.reports||[]).length ? c.reports.map(r=>detail(r.personName,`${r.reportType} · ${r.status || c.status} · ${new Date(r.createdAt).toLocaleString()}`,`Score: ${r.reputationScore} | Confidence: ${r.researchConfidence}%`)).join("") : "<p class='muted'>No reports yet.</p>"}
  </div>`;
}

function intakePage(){
  const c = activeClient();
  if(!c) return clientSwitcher("Active Client") + `<div class="card panel"><h4>Client Intake</h4><p class="muted">Select a client first.</p></div>`;
  return clientSwitcher("Active Client") + `<div class="card panel"><h4>Client Intake</h4><div class="form-grid">
    <label>Client Name<input id="intakeName" value="${c.name||""}"></label>
    <label>Title<input id="intakeTitle" value="${c.title||""}"></label>
    <label>Organization<input id="intakeOrg" value="${c.organization||""}"></label>
    <label>LinkedIn<input id="intakeLinkedin" value="${c.linkedin||""}"></label>
    <label>Website<input id="intakeWebsite" value="${c.website||""}"></label>
    <label>Industry<input id="intakeIndustry" value="${c.industry||""}"></label>
    <label>Status<select id="intakeStatus">${["Draft","Researching","Needs Review","Ready","Delivered","Monitoring","Error"].map(s=>`<option ${c.status===s?"selected":""}>${s}</option>`).join("")}</select></label>
    <label class="full">Notes<textarea id="intakeNotes">${c.notes||""}</textarea></label>
  </div><button class="primary" data-action="update-client" style="margin-top:18px">SAVE CLIENT</button></div>`;
}
function basicPage(title,text){ return `<div class="card panel"><h4>${title}</h4><p class="muted">${text}</p></div>`; }

function assetManagerPage(){
  const c = activeClient();
  if(!c) return clientSwitcher("Active Client") + `<div class="card panel"><h4>Assets</h4><p class="muted">Select a client first.</p></div>`;
  const form = mode === "admin" ? `<div class="form-grid">
    <label>Asset Type<select id="assetType">${["Speaking Engagement","Award / Recognition","Media Mention","Podcast / Interview","Board / Committee Role","Publication / Article","Book","Certification / Credential","Volunteer Work","Signature Project","Review / Testimonial","Other Authority Asset"].map(x=>`<option>${x}</option>`).join("")}</select></label>
    <label>Status<select id="assetStatus">${["Client Submitted","Verified","AI Found","Pending Verification"].map(x=>`<option>${x}</option>`).join("")}</select></label>
    <label>Title / Name<input id="assetTitle"></label><label>Organization / Source<input id="assetSource"></label>
    <label>Date / Year<input id="assetDate"></label><label>Role<input id="assetRole"></label>
    <label>URL<input id="assetUrl"></label><label>Proof / Upload Link<input id="assetProof"></label>
    <label class="full">Notes<textarea id="assetNotes"></textarea></label>
  </div><button class="primary" data-action="add-asset" style="margin-top:16px">ADD TO CLIENT</button>` : "";
  return clientSwitcher("Active Client") + `<div class="card panel"><h4>${mode==="admin"?"Manual Asset Manager":"My Submitted Assets"}: ${c.name}</h4><p class="muted">${mode==="admin"?"Assets stay tied to this client only.":"View assets submitted or included in your report."}</p>${form}<h4 style="margin-top:24px">Assets</h4><div id="assetList">${assetList()}</div></div>`;
}
function assetList(){
  const assets = activeAssets();
  return assets.length ? assets.map(a=>`<div class="detail-item"><strong>${a.title}</strong><small>${a.type} · ${a.source} · ${a.date}<br>${a.role} · ${a.status}<br>${a.notes||""}</small>${mode==="admin"?`<br><button class="verify-btn" data-toast="Marked verified.">Mark Verified</button><button class="outline" data-edit-asset="${a.id}">Edit</button><button class="remove-btn" data-delete-asset="${a.id}">Delete Client</button>`:""}</div>`).join("") : `<p class="muted">No assets added yet.</p>`;
}
function speakingPage(){ const r=currentReport(); return clientSwitcher("Active Client") + `<div class="card panel"><h4>Speaking Intelligence</h4><p class="muted">Checks conferences, summits, forums, keynotes, panels, workshops, breakout sessions, webinars, podcasts, university lectures, and community events tied to the selected client.</p>${(r.speakingEngagements||[]).map(x=>detail(x.title,`${x.eventType} · ${x.role} · ${x.date}`,x.note)).join("") || "<p class='muted'>No speaking signals yet.</p>"}</div>`; }

const bioGroups={"Professional Identity":["Current title","Current organization","Former positions","Years of experience","Industry expertise"],"Leadership":["CEO","Founder","Executive","Board Member","Advisory Board","Committee Leadership","Government Appointments"],"Education":["Degrees","Universities","Executive Education","Certifications","Fellowships"],"Awards + Recognition":["Awards","Honors","Rankings","40 Under 40","Women to Watch","Hall of Fame","Industry Awards","Community Recognition"],"Speaking":["Keynotes","Panels","Workshops","Conferences","Forums","Summits","University Lectures","Podcasts","Guest Speaker"],"Media":["TV","Radio","Newspapers","Magazines","Podcasts","Articles","Quotes","Interviews","Guest Columns"],"Publications":["Books","White Papers","Research","Blog","Journal Articles"],"Leadership + Service":["Board Memberships","Volunteer Leadership","Community Organizations","Professional Associations","Civic Engagement"],"Credentials":["Licenses","Certifications","Military Service","Security Clearance"]};
function bioPage(){
  const score=getBioScore();
  const c = activeClient();
  return clientSwitcher("Active Client") + `<div class="card panel"><h4>Bio Development™ ${c ? "for " + c.name : ""}</h4><p class="muted"><strong>Purpose:</strong> Help each client remember accomplishments they've forgotten and identify what is missing from their professional story.</p></div><div class="card panel" style="margin-top:18px"><h4>Bio Completeness</h4><div class="bar" style="height:14px"><div class="fill" style="width:${score}%"></div></div><p class="muted">${score}% Complete</p></div><div class="grid middle-grid" style="grid-template-columns:1.2fr 1fr;margin-top:18px"><div class="card panel"><h4>Essential Bio Elements Checklist</h4><div class="bio-checklist">${Object.entries(bioGroups).map(([g,items])=>`<div class="bio-group"><h5>${g}</h5>${items.map(item=>`<label class="bio-item"><input type="checkbox" data-bio="${item}" ${activeBioChecked().includes(item)?"checked":""}> ${item}</label>`).join("")}</div>`).join("")}</div></div><div class="card panel"><h4>Bio Memory Prompts</h4>${["Signature Projects: What projects are you most proud of?","Career Milestones: What accomplishments changed your career?","Biggest Wins: What are your top 10 accomplishments?","Memorable Quotes: What do people quote you for?","Topics You're Known For: What do people call you about?","Personal Mission: What impact do you want to make?"].map(x=>detail(x.split(":")[0],x.split(":")[1],"")).join("")}</div></div><div class="card panel" style="margin-top:18px"><h4>Bio Builder</h4><div class="bio-tabs">${["50","100","150","speaker","board","award","linkedin","website","press"].map(x=>`<button data-bio-format="${x}">${x==="speaker"?"Conference Speaker":x==="board"?"Board Nomination":x==="award"?"Award Nomination":x==="linkedin"?"LinkedIn About":x==="website"?"Website Bio":x==="press"?"Press Kit Bio":x+"-word"}</button>`).join("")}</div><div class="bio-output" id="bioOutput">Choose a bio format.</div></div>`;
}
function timelinePage(){ const assets=activeAssets(); return clientSwitcher("Active Client") + `<div class="card panel"><h4>Timeline of Influence™</h4><p class="muted">Organizes recovered and manually added assets into a career timeline for the selected client.</p>${assets.length?assets.map(a=>`<div class="timeline-item"><strong>${a.date||"Date needed"}</strong><br>${a.title}<br><small>${a.type} · ${a.source}</small></div>`).join(""):"<p class='muted'>Add assets to build the Timeline of Influence™.</p>"}</div>`; }

function generateBio(format){
  const report=currentReport(), c=activeClient(), assets=activeAssets();
  const assetText=assets.slice(0,6).map(a=>a.title).join(", ");
  const known=(report.knownFor||[]).slice(0,4).join(", ")||"leadership and professional impact";
  const name=report.personName, title=report.title||c?.title||"leader", org=report.orgName||c?.organization||"their organization";
  const drafts={"50":`${name} is a ${title} connected to ${org}. Their work centers on ${known}. Key accomplishments to consider adding include ${assetText||"awards, speaking engagements, media mentions, board service, and signature projects"}.`,"100":`${name} is a ${title} whose reputation profile centers on ${known}. Through ${org}, they have built visibility around their expertise and public-facing work. A stronger bio should include verified accomplishments such as awards, media mentions, speaking engagements, board service, publications, credentials, and signature projects.`,"150":`${name} is a ${title} connected to ${org}, with a reputation profile that should be supported by verified accomplishments, public-facing leadership, and visible proof of impact. Their bio should clearly explain what they are known for, who they serve, what they have built, and why their work matters.`,speaker:`${name} is a ${title} available for conversations on ${known}. Their speaker bio should highlight keynote topics, panels, workshops, conferences, media experience, and practical lessons audiences can apply.`,board:`${name} is a ${title} with experience that may support board, advisory, or civic leadership opportunities. A board bio should emphasize leadership judgment, industry expertise, governance experience, community impact, financial or operational oversight, and relevant credentials.`,award:`${name} is a ${title} whose accomplishments may support award and recognition opportunities. An award nomination bio should include measurable impact, leadership roles, media recognition, speaking engagements, community service, awards, and proof of influence.`,linkedin:`${name} helps audiences understand ${known}. Their LinkedIn About section should open with their current role, clearly state what they are known for, include proof such as awards, media, speaking, board service, and close with the kind of opportunities they want next.`,website:`${name} is a ${title} connected to ${org}. This website bio should position them clearly, show proof of credibility, and point audiences toward their leadership, visibility, and reputation assets.`,press:`${name} is a ${title} whose public profile includes ${known}. A press kit bio should include verified media mentions, speaking topics, awards, credentials, and official contact information.`};
  $("#bioOutput").textContent=drafts[format]||drafts["100"];
}

function addAsset(){ const c=activeClient(); if(!c){toast("Select a client first."); return;} const a={id:uid(),type:$("#assetType").value,status:$("#assetStatus").value,title:$("#assetTitle").value.trim(),source:$("#assetSource").value.trim(),date:$("#assetDate").value.trim(),role:$("#assetRole").value.trim(),url:$("#assetUrl").value.trim(),proof:$("#assetProof").value.trim(),notes:$("#assetNotes").value.trim()}; if(!a.title){toast("Add an asset title first.");return;} c.assets = c.assets || []; c.assets.unshift(a); saveAll(); render(); setPage("assets"); toast("Authority asset added to client."); }
function editAsset(id){ const c=activeClient(); const a=(c?.assets||[]).find(x=>x.id===id); if(!a)return; setPage("assets"); $("#assetType").value=a.type; $("#assetStatus").value=a.status; $("#assetTitle").value=a.title; $("#assetSource").value=a.source; $("#assetDate").value=a.date; $("#assetRole").value=a.role; $("#assetUrl").value=a.url; $("#assetProof").value=a.proof; $("#assetNotes").value=a.notes; c.assets=c.assets.filter(x=>x.id!==id); saveAll(); toast("Edit the asset and save again."); }
function deleteAsset(id){ const c=activeClient(); if(!c)return; c.assets=(c.assets||[]).filter(x=>x.id!==id); saveAll(); render(); setPage("assets"); toast("Asset deleted."); }

function filterClients(){
  const q = ($("#clientSearch")?.value || "").toLowerCase();
  const status = $("#clientStatusFilter")?.value || "";
  const list = clients.filter(c => {
    const text = `${c.name} ${c.title} ${c.organization} ${c.industry} ${c.status}`.toLowerCase();
    return (!q || text.includes(q)) && (!status || c.status === status);
  });
  const wrap = $("#clientTableWrap");
  if(wrap) wrap.innerHTML = clientTable(list);
  bindDynamic();
}

function bindDynamic(){
  $$("[data-entry]").forEach(b=>b.onclick=()=>enterMode(b.dataset.entry));
  $$("[data-page]").forEach(b=>b.onclick=()=>setPage(b.dataset.page));
  $$("[data-page-link]").forEach(b=>b.onclick=()=>setPage(b.dataset.pageLink));
  $$("[data-action='generate-report']").forEach(b=>b.onclick=runResearch);
  $$("[data-action='wipe-client']").forEach(b=>b.onclick=wipeActiveClientData);
  $$("[data-action='new-report']").forEach(b=>b.onclick=()=>setPage("dashboard"));
  $$("[data-action='export-pdf']").forEach(b=>b.onclick=()=>window.print());
  $$("[data-action='switch-entry']").forEach(b=>b.onclick=()=>{localStorage.removeItem("rr_mode"); location.reload();});
  $$("[data-action='close-drawer']").forEach(b=>b.onclick=closeDrawer);
  $$("[data-action='restore-hidden']").forEach(b=>b.onclick=()=>{hidden[activeClientId]=[]; save("rr_hidden",hidden); toast("Removed items restored.");});
  $$("[data-action='add-client']").forEach(b=>b.onclick=addClient);
  $$("[data-action='update-client']").forEach(b=>b.onclick=updateClient);
  $$("[data-action='add-asset']").forEach(b=>b.onclick=addAsset);
  $$("[data-select-client]").forEach(b=>b.onclick=()=>selectClient(b.dataset.selectClient));
  $$("[data-delete-client]").forEach(b=>b.onclick=()=>deleteClient(b.dataset.deleteClient));
  $$("[data-status]").forEach(b=>b.onclick=()=>updateStatus(b.dataset.status));
  $$("[data-metric]").forEach(b=>b.onclick=()=>openDrawer(b.dataset.metric));
  $$("[data-toast]").forEach(b=>b.onclick=()=>toast(b.dataset.toast));
  $$("[data-hide]").forEach(b=>b.onclick=()=>{hidden[activeClientId]=hidden[activeClientId]||[]; hidden[activeClientId].push(b.dataset.hide); save("rr_hidden",hidden); const item=b.closest(".detail-item"); if(item) item.remove(); render(); toast("Removed irrelevant item. Dashboard counts updated.");});
  $$("[data-manual-add]").forEach(b=>b.onclick=()=>addManualFromDrawer(b.dataset.manualAdd));
  $$("[data-edit-asset]").forEach(b=>b.onclick=()=>editAsset(b.dataset.editAsset));
  $$("[data-delete-asset]").forEach(b=>b.onclick=()=>deleteAsset(b.dataset.deleteAsset));
  $$("[data-bio]").forEach(cb=>cb.onchange=()=>{const v=cb.dataset.bio; let checked=activeBioChecked(); checked=cb.checked?[...new Set([...checked,v])]:checked.filter(x=>x!==v); setActiveBioChecked(checked); render(); setPage("bio");});
  $$("[data-bio-format]").forEach(b=>b.onclick=()=>generateBio(b.dataset.bioFormat));
  $("#activeClientSelect") && ($("#activeClientSelect").onchange=e=>setActiveClient(e.target.value, "dashboard"));
  $("#clientSearch") && ($("#clientSearch").oninput=filterClients);
  $("#clientStatusFilter") && ($("#clientStatusFilter").onchange=filterClients);
  bindGlobalClientSelectors();
}
$("#drawerBackdrop").onclick=closeDrawer;

ensureSeed();
if(mode){ enterMode(mode); } else { $("#entryScreen").style.display="grid"; $("#appShell").classList.remove("active"); }
bindDynamic();


document.addEventListener("change", function(e){
  if(e.target && e.target.id === "activeClientSelect"){
    setActiveClient(e.target.value, "dashboard");
  }
  if(e.target && e.target.classList && e.target.classList.contains("globalClientSelect")){
    setActiveClient(e.target.value, currentPage);
  }
});

document.addEventListener("click", function(e){
  const wipeBtn = e.target.closest ? e.target.closest("[data-action='wipe-client']") : null;
  if(wipeBtn){
    e.preventDefault();
    wipeActiveClientData();
  }
  const deleteBtn = e.target.closest ? e.target.closest("[data-delete-client]") : null;
  if(deleteBtn){
    e.preventDefault();
    deleteClient(deleteBtn.dataset.deleteClient);
  }
  const openBtn = e.target.closest ? e.target.closest("[data-select-client]") : null;
  if(openBtn){
    e.preventDefault();
    selectClient(openBtn.dataset.selectClient);
  }
});
