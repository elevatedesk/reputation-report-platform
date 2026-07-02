
let mode = localStorage.getItem("rr_mode") || "";
let report = load("rr_report", {
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
  mediaMentions:[{title:"No verified news or media mentions loaded yet",source:"Research Required",date:"Last 12 months",note:"Connect search APIs to populate verified articles that mention the name and LinkedIn URL."}],
  speakingEngagements:[{title:"No verified speaking engagements loaded yet",eventType:"Research Required",role:"Unknown",date:"Last 12 months",note:"Connect search APIs or add speaking assets manually."}]
});
let assets = load("rr_assets", []);
let reports = load("rr_reports", []);
let hidden = load("rr_hidden", []);
let bioChecked = load("rr_bio_checked", []);
let researchResults = load("rr_research_results", {});

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function load(key, fallback){ try{return JSON.parse(localStorage.getItem(key)) || fallback;}catch{return fallback;} }
function save(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2600); }
function initials(name){ return (name||"RR").trim().split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase() || "RR"; }

function enterMode(newMode){
  mode = newMode;
  localStorage.setItem("rr_mode", mode);
  $("#entryScreen").style.display = "none";
  $("#appShell").classList.add("active");
  document.body.classList.toggle("admin-mode", mode === "admin");
  document.body.classList.toggle("client-mode", mode === "client");
  $("#modeLabel").textContent = mode === "admin" ? "Admin Workspace" : "Executive Dashboard";
  $("#userRole").textContent = mode === "admin" ? "EVG Admin" : report.personName;
  $("#userMode").textContent = mode === "admin" ? "Admin Workspace" : "Executive Dashboard";
  buildNav();
  setPage("dashboard");
  render();
}

function buildNav(){
  const adminNav = [
    ["dashboard","Dashboard"],["clients","Clients"],["reports","Reports"],["intake","Intake"],["rep360","Reputation 360™"],["assetRecovery","Asset Recovery™"],["assets","Manual Asset Manager"],["speaking","Speaking Intelligence"],["bio","Bio Development™"],["social","Reviews + Social"],["timeline","Timeline of Influence™"],["settings","Settings"]
  ];
  const clientNav = [
    ["dashboard","My Reputation Dashboard"],["reports","My Reports"],["rep360","Reputation 360™"],["speaking","Speaking History"],["bio","Bio Builder"],["social","Reviews + Social"],["timeline","Timeline of Influence™"],["uploads","Upload Accomplishments"]
  ];
  const nav = mode === "admin" ? adminNav : clientNav;
  $("#nav").innerHTML = nav.map(([id,label]) => `<button data-page="${id}">${label}</button>`).join("");
}

function setPage(page){
  $$(".page").forEach(p=>p.classList.remove("active"));
  const el = $("#"+page);
  if(el) el.classList.add("active");
  $$("nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  window.scrollTo({top:0,behavior:"smooth"});
  renderPages();
}

async function runResearch(){
  const name = $("#nameInput").value.trim();
  const linkedin = $("#linkedinInput").value.trim();
  const organization = $("#orgInput").value.trim();
  const website = $("#websiteInput").value.trim();

  if(!name){ toast("Enter the person's full name."); return; }
  if(!linkedin){ toast("LinkedIn URL is required to confirm the right person."); return; }

  toast("Running live research...");
  try{
    const response = await fetch("/.netlify/functions/research", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ name, linkedin, organization, website })
    });
    const data = await response.json();
    if(!response.ok || !data.ok) throw new Error(data.error || "Research failed.");

    researchResults = data;
    save("rr_research_results", data);

    const scores = data.scores || {};
    report = {
      ...report,
      personName:name,
      orgName:organization || report.orgName || "Organization not entered",
      title: organization ? `Leader connected to ${organization}` : "Executive / Thought Leader",
      reportType:"Live Reputation Report™",
      researchConfidence:data.confidence || 80,
      reputationScore:scores.reputationScore || report.reputationScore,
      orgScore:scores.orgScore || report.orgScore,
      riskScore:scores.riskScore || report.riskScore,
      opportunityScore:scores.opportunityScore || report.opportunityScore,
      assetScore:scores.assetScore || report.assetScore,
      bioScore:scores.bioScore || report.bioScore,
      authorityScore:scores.authorityScore || report.authorityScore,
      executiveSummary:data.executiveSummary,
      knownForSummary:data.knownForSummary,
      knownFor:data.knownFor,
      mediaMentions:(data.newsResults || []).map(x=>({title:x.title,source:x.source || "News",date:x.date || "Last 12 months",note:x.snippet || x.link || ""})),
      speakingEngagements:(data.speakingResults || []).map(x=>({title:x.title,eventType:"Speaking Signal",role:"Possible speaker / panelist / guest",date:x.date || "Needs verification",note:x.snippet || x.link || ""})),
      risks:[
        data.checks?.knowledgePanel ? "Google Knowledge Panel signal detected" : "No Google Knowledge Panel signal detected yet",
        data.checks?.wikipedia ? "Wikipedia profile signal detected" : "No Wikipedia profile signal detected yet",
        data.checks?.wikidata ? "Wikidata profile signal detected" : "No Wikidata profile signal detected yet",
        data.checks?.linkedin ? "LinkedIn confirmation signal detected" : "LinkedIn signal needs review",
        "Review all live results before using them in a final client report"
      ]
    };
    if(!report.mediaMentions.length){
      report.mediaMentions = [{title:"No verified news or media mentions found yet",source:"Live Research",date:"Last 12 months",note:"Try adding organization or website to improve search."}];
    }

    reports.unshift({id:crypto.randomUUID(),...report,linkedin,website,createdAt:new Date().toISOString()});
    save("rr_report",report);
    save("rr_reports",reports);
    render();
    setPage("dashboard");
    toast("Live report generated.");
  }catch(err){
    toast(err.message || "Research failed.");
  }
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
  $("#knownTags").innerHTML=(report.knownFor || []).map(x=>`<span class="tag">${x}</span>`).join("");
  $("#riskList") && ($("#riskList").innerHTML=(report.risks || []).map(x=>`<div class="risk"><span class="warn">⚠</span><div>${x}</div></div>`).join("")+`<div class="risk"><span class="ok">✓</span><div>No major negative issue detected</div></div>`);
  $("#scoreRows").innerHTML=scoreRows();
  $("#authorityChecks").innerHTML=authorityChecks();
  $("#metricCards").innerHTML=metrics();
  $("#mediaList").innerHTML=(report.mediaMentions || []).map(x=>detail(x.title,`${x.source} · ${x.date}`,x.note)).join("");
  $("#reportCount").textContent=reports.length || 1;
  $("#recommendations").innerHTML=["Update executive bio","Verify media mentions","Confirm awards and recognitions","Add recent speaking history","Review Knowledge Panel status"].map(x=>detail(x,"Recommendation","Add to next visibility plan.")).join("");
  $("#userRole").textContent = mode === "admin" ? "EVG Admin" : report.personName;
  bindDynamic();
  renderPages();
}

function getBioScore(){ return Math.round((bioChecked.length / 59) * 100) || report.bioScore || 52; }

function scoreRows(){
  const bioScore=getBioScore();
  return [["Reputation Score",report.reputationScore],["Organization Score",report.orgScore],["Risk Score",report.riskScore],["Opportunity Score",report.opportunityScore],["Asset Recovery Score",report.assetScore],["Bio Score",bioScore],["Authority Score",report.authorityScore]]
    .map(([l,v])=>`<div class="row"><span>${l}</span><div class="bar"><div class="fill" style="width:${v}%"></div></div><strong>${v}</strong></div>`).join("");
}

function authorityChecks(){
  const checks = researchResults.checks || {};
  const rows = [
    ["Google Knowledge Panel", checks.knowledgePanel],
    ["Wikipedia Page", checks.wikipedia],
    ["Wikidata Profile", checks.wikidata],
    ["LinkedIn Profile", checks.linkedin],
    ["Official Website", checks.officialWebsite],
    ["News Coverage", (researchResults.newsResults || []).length > 0],
    ["Awards & Recognition", (researchResults.awardResults || []).length > 0],
    ["Speaking History", (researchResults.speakingResults || []).length > 0]
  ];
  return rows.map(([x, yes])=>`<div class="asset"><span>${x}</span><span class="${yes?'yes':'no'}">${yes?'✓':'×'}</span><small>${yes?'Detected':'Check'}</small></div>`).join("");
}

function counts(){
  const media=assets.filter(a=>["Media Mention","Podcast / Interview","Publication / Article"].includes(a.type)).length;
  return {
    google:Math.max(10,(researchResults.webResults||[]).length,assets.length),
    news:Math.max(media,(researchResults.newsResults||[]).length),
    reach:(researchResults.newsResults||[]).length ? "Pending" : "0",
    speaking:Math.max(assets.filter(a=>a.type==="Speaking Engagement").length,(researchResults.speakingResults||[]).length),
    awards:Math.max(assets.filter(a=>a.type==="Award / Recognition").length,(researchResults.awardResults||[]).length),
    social:assets.filter(a=>a.type==="Review / Testimonial").length,
    bio:getBioScore()
  };
}

function metrics(){
  const c=counts();
  return [["google","⌕",c.google,"Google Results"],["news","▤",c.news,"News"],["reach","♚",c.reach,"Media Reach"],["speaking","♬",c.speaking,"Speaking"],["awards","♕",c.awards,"Awards"],["social","♧",c.social,"Reviews/Social"],["bio","✎",c.bio,"Bio Score"],["missing","!","9","AI Recommendations"]]
    .map(([type,icon,value,label])=>`<button class="metric" data-metric="${type}"><div class="icon">${icon}</div><div class="value">${value}</div><small>${label}</small></button>`).join("");
}

function detail(title,meta,note){ return `<div class="detail-item"><strong>${title}</strong><small>${meta||""}<br>${note||""}</small></div>`; }

function drawerItem(type,title,meta,note){
  const key=`${type}|${title}|${meta}`;
  if(hidden.includes(key)) return "";
  const adminControls = mode === "admin" ? `<br><button class="verify-btn" data-toast="Marked verified.">Mark Verified</button><button class="outline" data-toast="Marked client submitted.">Client Submitted</button><button class="outline" data-toast="Marked AI found.">AI Found</button><button class="remove-btn" data-hide="${key}">Remove irrelevant</button>` : "";
  return `<div class="detail-item" data-key="${key}"><strong>${title}</strong><small>${meta||""}<br>${note||""}</small>${adminControls}</div>`;
}

function metricData(type){
  const data = {
    google:{title:"Google Results",subtitle:"Live web results tied to name and LinkedIn.",items:[...(researchResults.webResults||[]).map(x=>drawerItem("google",x.title,x.source,x.snippet||x.link)),drawerItem("google","No additional web results loaded","Live Research","Add organization or website for better results.")]},
    news:{title:"News + Media Mentions",subtitle:"Last 12 months only. Must mention the searched person or organization.",items:[...(researchResults.newsResults||[]).map(x=>drawerItem("news",x.title,x.source,x.snippet||x.link)),...assets.filter(a=>["Media Mention","Podcast / Interview","Publication / Article"].includes(a.type)).map(a=>drawerItem("news",a.title,`${a.source} · ${a.date}`,`${a.role} · ${a.notes}`))]},
    reach:{title:"Media Reach",subtitle:"Reach and source authority for verified media.",items:[drawerItem("reach","Media reach not calculated yet","API Required","Reach needs verified media sources and authority data.")]},
    speaking:{title:"Speaking Intelligence",subtitle:"Conferences, summits, forums, keynotes, panels, workshops, breakouts, webinars, podcasts, and university lectures.",items:[...(researchResults.speakingResults||[]).map(x=>drawerItem("speaking",x.title,x.source,x.snippet||x.link)),...assets.filter(a=>a.type==="Speaking Engagement").map(a=>drawerItem("speaking",a.title,`${a.role} · ${a.source} · ${a.date}`,a.notes))]},
    awards:{title:"Awards + Recognition",subtitle:"Awards, rankings, nominations, honors, and recognition.",items:[...(researchResults.awardResults||[]).map(x=>drawerItem("awards",x.title,x.source,x.snippet||x.link)),...assets.filter(a=>a.type==="Award / Recognition").map(a=>drawerItem("awards",a.title,`${a.source} · ${a.date}`,`${a.role} · ${a.notes}`))]},
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
  $("#drawerContent").innerHTML=d.items.join("") || `<p class="muted">No items to display.</p>`;
  $("#drawerBackdrop").classList.add("active");
  $("#drawer").classList.add("active");
  bindDynamic();
}
function closeDrawer(){ $("#drawerBackdrop").classList.remove("active"); $("#drawer").classList.remove("active"); }

function renderPages(){
  $("#clients").innerHTML = `<div class="card panel"><h4>Clients</h4><p class="muted">Admin-only client management will connect to Firestore in the next phase.</p></div>`;
  $("#reports").innerHTML = `<div class="card panel"><h4>${mode==="admin"?"Report History":"My Reports"}</h4>${reports.length?reports.map(r=>detail(r.personName,r.reportType,new Date(r.createdAt).toLocaleString())).join(""):"<p class='muted'>No reports yet.</p>"}</div>`;
  $("#intake").innerHTML = intakePage();
  $("#rep360").innerHTML = basicPage("Reputation 360™","Compares the individual and organization to see whether both reputations reinforce each other.");
  $("#assetRecovery").innerHTML = basicPage("Asset Recovery™","Find and organize accomplishments clients forget to use: media, awards, speaking, board roles, podcasts, publications, and signature projects.");
  $("#assets").innerHTML = assetManagerPage();
  $("#speaking").innerHTML = speakingPage();
  $("#bio").innerHTML = bioPage();
  $("#social").innerHTML = basicPage("Reviews & Social Listening","Reports what people are saying online about the person, organization, or both. Sources include LinkedIn, Instagram, Facebook Reviews, Google Reviews, Glassdoor, Indeed, Candid, and Charity Navigator.");
  $("#timeline").innerHTML = timelinePage();
  $("#uploads").innerHTML = `<div class="card panel"><h4>Upload Accomplishments</h4><p class="muted">Client-facing area for uploading new achievements, awards, bios, headshots, speaking links, media links, and proof documents.</p><div class="detail-item"><strong>Upload feature placeholder</strong><small>Firebase Storage will be connected in the next phase.</small></div></div>`;
  $("#settings").innerHTML = basicPage("Settings","Firebase Authentication, Firestore, AI APIs, PDF storage, and monitoring can be connected in the next phase.");
  bindDynamic();
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
function basicPage(title,text){ return `<div class="card panel"><h4>${title}</h4><p class="muted">${text}</p></div>`; }

function assetManagerPage(){
  const form = mode === "admin" ? `<div class="form-grid">
    <label>Asset Type<select id="assetType">${["Speaking Engagement","Award / Recognition","Media Mention","Podcast / Interview","Board / Committee Role","Publication / Article","Book","Certification / Credential","Volunteer Work","Signature Project","Review / Testimonial","Other Authority Asset"].map(x=>`<option>${x}</option>`).join("")}</select></label>
    <label>Status<select id="assetStatus">${["Client Submitted","Verified","AI Found","Pending Verification"].map(x=>`<option>${x}</option>`).join("")}</select></label>
    <label>Title / Name<input id="assetTitle"></label><label>Organization / Source<input id="assetSource"></label>
    <label>Date / Year<input id="assetDate"></label><label>Role<input id="assetRole"></label>
    <label>URL<input id="assetUrl"></label><label>Proof / Upload Link<input id="assetProof"></label>
    <label class="full">Notes<textarea id="assetNotes"></textarea></label>
  </div><button class="primary" data-action="add-asset" style="margin-top:16px">ADD TO REPORT</button>` : "";
  return `<div class="card panel"><h4>${mode==="admin"?"Manual Asset Manager":"My Submitted Assets"}</h4><p class="muted">${mode==="admin"?"Add, edit, delete, verify, mark client submitted, mark AI found, and upload proof links.":"View assets submitted or included in your report."}</p>${form}<h4 style="margin-top:24px">Assets</h4><div id="assetList">${assetList()}</div></div>`;
}
function assetList(){
  return assets.length ? assets.map(a=>`<div class="detail-item"><strong>${a.title}</strong><small>${a.type} · ${a.source} · ${a.date}<br>${a.role} · ${a.status}<br>${a.notes||""}</small>${mode==="admin"?`<br><button class="verify-btn" data-toast="Marked verified.">Mark Verified</button><button class="outline" data-edit-asset="${a.id}">Edit</button><button class="remove-btn" data-delete-asset="${a.id}">Delete</button>`:""}</div>`).join("") : `<p class="muted">No assets added yet.</p>`;
}
function speakingPage(){ return `<div class="card panel"><h4>Speaking Intelligence</h4><p class="muted">Checks conferences, summits, forums, keynotes, panels, workshops, breakout sessions, webinars, podcasts, university lectures, and community events tied to the person or organization.</p>${(report.speakingEngagements||[]).map(x=>detail(x.title,`${x.eventType} · ${x.role} · ${x.date}`,x.note)).join("")}</div>`; }

const bioGroups={"Professional Identity":["Current title","Current organization","Former positions","Years of experience","Industry expertise"],"Leadership":["CEO","Founder","Executive","Board Member","Advisory Board","Committee Leadership","Government Appointments"],"Education":["Degrees","Universities","Executive Education","Certifications","Fellowships"],"Awards + Recognition":["Awards","Honors","Rankings","40 Under 40","Women to Watch","Hall of Fame","Industry Awards","Community Recognition"],"Speaking":["Keynotes","Panels","Workshops","Conferences","Forums","Summits","University Lectures","Podcasts","Guest Speaker"],"Media":["TV","Radio","Newspapers","Magazines","Podcasts","Articles","Quotes","Interviews","Guest Columns"],"Publications":["Books","White Papers","Research","Blog","Journal Articles"],"Leadership + Service":["Board Memberships","Volunteer Leadership","Community Organizations","Professional Associations","Civic Engagement"],"Credentials":["Licenses","Certifications","Military Service","Security Clearance"]};
function bioPage(){
  const score=getBioScore();
  return `<div class="card panel"><h4>Bio Development™</h4><p class="muted"><strong>Purpose:</strong> Help the client remember accomplishments they've forgotten and identify what is missing from their professional story.</p></div><div class="card panel" style="margin-top:18px"><h4>Bio Completeness</h4><div class="bar" style="height:14px"><div class="fill" style="width:${score}%"></div></div><p class="muted">${score}% Complete</p></div><div class="grid middle-grid" style="grid-template-columns:1.2fr 1fr;margin-top:18px"><div class="card panel"><h4>Essential Bio Elements Checklist</h4><div class="bio-checklist">${Object.entries(bioGroups).map(([g,items])=>`<div class="bio-group"><h5>${g}</h5>${items.map(item=>`<label class="bio-item"><input type="checkbox" data-bio="${item}" ${bioChecked.includes(item)?"checked":""}> ${item}</label>`).join("")}</div>`).join("")}</div></div><div class="card panel"><h4>Bio Memory Prompts</h4>${["Signature Projects: What projects are you most proud of?","Career Milestones: What accomplishments changed your career?","Biggest Wins: What are your top 10 accomplishments?","Memorable Quotes: What do people quote you for?","Topics You're Known For: What do people call you about?","Personal Mission: What impact do you want to make?"].map(x=>detail(x.split(":")[0],x.split(":")[1],"")).join("")}</div></div><div class="grid middle-grid" style="grid-template-columns:1fr 1fr;margin-top:18px"><div class="card panel"><h4>AI Bio Suggestions</h4>${["CEO or current role","Years of experience","Former leadership roles","Keynote presentations","Media mentions","Board appointments","Awards and recognition","Books or publications","Podcast guest appearances","University lectures"].map(x=>`<div class="detail-item"><strong>${x}</strong><small><button class="outline" data-toast="Added to bio draft.">Add to Bio</button><button class="remove-btn" data-toast="Marked not relevant.">Not Relevant</button></small></div>`).join("")}</div><div class="card panel"><h4>Bio Builder</h4><div class="bio-tabs">${["50","100","150","speaker","board","award","linkedin","website","press"].map(x=>`<button data-bio-format="${x}">${x==="speaker"?"Conference Speaker":x==="board"?"Board Nomination":x==="award"?"Award Nomination":x==="linkedin"?"LinkedIn About":x==="website"?"Website Bio":x==="press"?"Press Kit Bio":x+"-word"}</button>`).join("")}</div><div class="bio-output" id="bioOutput">Choose a bio format.</div></div></div>`;
}
function timelinePage(){ return `<div class="card panel"><h4>Timeline of Influence™</h4><p class="muted">Organizes recovered and manually added assets into a career timeline.</p>${assets.length?assets.map(a=>`<div class="timeline-item"><strong>${a.date||"Date needed"}</strong><br>${a.title}<br><small>${a.type} · ${a.source}</small></div>`).join(""):"<p class='muted'>Add assets to build the Timeline of Influence™.</p>"}</div>`; }

function generateBio(format){
  const assetText=assets.slice(0,6).map(a=>a.title).join(", ");
  const known=(report.knownFor||[]).slice(0,4).join(", ")||"leadership and professional impact";
  const name=report.personName, title=report.title||"leader", org=report.orgName||"their organization";
  const drafts={"50":`${name} is a ${title} connected to ${org}. Their work centers on ${known}. Key accomplishments to consider adding include ${assetText||"awards, speaking engagements, media mentions, board service, and signature projects"}.`,"100":`${name} is a ${title} whose reputation profile centers on ${known}. Through ${org}, they have built visibility around their expertise and public-facing work. A stronger bio should include verified accomplishments such as awards, media mentions, speaking engagements, board service, publications, credentials, and signature projects.`,"150":`${name} is a ${title} connected to ${org}, with a reputation profile that should be supported by verified accomplishments, public-facing leadership, and visible proof of impact. Their bio should clearly explain what they are known for, who they serve, what they have built, and why their work matters.`,speaker:`${name} is a ${title} available for conversations on ${known}. Their speaker bio should highlight keynote topics, panels, workshops, conferences, media experience, and practical lessons audiences can apply.`,board:`${name} is a ${title} with experience that may support board, advisory, or civic leadership opportunities. A board bio should emphasize leadership judgment, industry expertise, governance experience, community impact, financial or operational oversight, and relevant credentials.`,award:`${name} is a ${title} whose accomplishments may support award and recognition opportunities. An award nomination bio should include measurable impact, leadership roles, media recognition, speaking engagements, community service, awards, and proof of influence.`,linkedin:`${name} helps audiences understand ${known}. Their LinkedIn About section should open with their current role, clearly state what they are known for, include proof such as awards, media, speaking, board service, and close with the kind of opportunities they want next.`,website:`${name} is a ${title} connected to ${org}. This website bio should position them clearly, show proof of credibility, and point audiences toward their leadership, visibility, and reputation assets.`,press:`${name} is a ${title} whose public profile includes ${known}. A press kit bio should include verified media mentions, speaking topics, awards, credentials, and official contact information.`};
  $("#bioOutput").textContent=drafts[format]||drafts["100"];
}
function addAsset(){ const a={id:crypto.randomUUID(),type:$("#assetType").value,status:$("#assetStatus").value,title:$("#assetTitle").value.trim(),source:$("#assetSource").value.trim(),date:$("#assetDate").value.trim(),role:$("#assetRole").value.trim(),url:$("#assetUrl").value.trim(),proof:$("#assetProof").value.trim(),notes:$("#assetNotes").value.trim()}; if(!a.title){toast("Add an asset title first.");return;} assets.unshift(a); save("rr_assets",assets); render(); setPage("assets"); toast("Authority asset added."); }
function editAsset(id){ const a=assets.find(x=>x.id===id); if(!a)return; setPage("assets"); $("#assetType").value=a.type; $("#assetStatus").value=a.status; $("#assetTitle").value=a.title; $("#assetSource").value=a.source; $("#assetDate").value=a.date; $("#assetRole").value=a.role; $("#assetUrl").value=a.url; $("#assetProof").value=a.proof; $("#assetNotes").value=a.notes; assets=assets.filter(x=>x.id!==id); save("rr_assets",assets); toast("Edit the asset and save again."); }
function deleteAsset(id){ assets=assets.filter(x=>x.id!==id); save("rr_assets",assets); render(); setPage("assets"); toast("Asset deleted."); }
function saveIntake(){ report.reportType=$("#intakeReportType").value; report.personName=$("#intakeName").value; report.title=$("#intakeTitle").value; report.orgName=$("#intakeOrg").value; save("rr_report",report); render(); setPage("dashboard"); toast("Intake saved."); }

function bindDynamic(){
  $$("[data-entry]").forEach(b=>b.onclick=()=>enterMode(b.dataset.entry));
  $$("[data-page]").forEach(b=>b.onclick=()=>setPage(b.dataset.page));
  $$("[data-page-link]").forEach(b=>b.onclick=()=>setPage(b.dataset.pageLink));
  $$("[data-action='generate-report']").forEach(b=>b.onclick=runResearch);
  $$("[data-action='new-report']").forEach(b=>b.onclick=()=>setPage("intake"));
  $$("[data-action='export-pdf']").forEach(b=>b.onclick=()=>window.print());
  $$("[data-action='switch-entry']").forEach(b=>b.onclick=()=>{localStorage.removeItem("rr_mode"); location.reload();});
  $$("[data-action='close-drawer']").forEach(b=>b.onclick=closeDrawer);
  $$("[data-action='restore-hidden']").forEach(b=>b.onclick=()=>{hidden=[]; save("rr_hidden",hidden); toast("Removed items restored.");});
  $$("[data-action='save-intake']").forEach(b=>b.onclick=saveIntake);
  $$("[data-action='add-asset']").forEach(b=>b.onclick=addAsset);
  $$("[data-metric]").forEach(b=>b.onclick=()=>openDrawer(b.dataset.metric));
  $$("[data-toast]").forEach(b=>b.onclick=()=>toast(b.dataset.toast));
  $$("[data-hide]").forEach(b=>b.onclick=()=>{hidden.push(b.dataset.hide); save("rr_hidden",hidden); b.closest(".detail-item").remove(); toast("Removed irrelevant item.");});
  $$("[data-edit-asset]").forEach(b=>b.onclick=()=>editAsset(b.dataset.editAsset));
  $$("[data-delete-asset]").forEach(b=>b.onclick=()=>deleteAsset(b.dataset.deleteAsset));
  $$("[data-bio]").forEach(cb=>cb.onchange=()=>{const v=cb.dataset.bio; bioChecked=cb.checked?[...new Set([...bioChecked,v])]:bioChecked.filter(x=>x!==v); save("rr_bio_checked",bioChecked); render(); setPage("bio");});
  $$("[data-bio-format]").forEach(b=>b.onclick=()=>generateBio(b.dataset.bioFormat));
}
$("#drawerBackdrop").onclick=closeDrawer;

if(mode){ enterMode(mode); } else { $("#entryScreen").style.display="grid"; $("#appShell").classList.remove("active"); }
bindDynamic();
