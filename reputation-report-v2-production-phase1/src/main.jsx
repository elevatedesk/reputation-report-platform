import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, firebaseReady, ADMIN_EMAIL } from "./services/firebase";
import { buildPossibleMatches, buildReportFromIdentity } from "./services/reputationEngine";
import { deleteLocalAsset, listAssets, listReports, saveAsset, saveReport } from "./services/reportService";
import "./styles/app.css";

const logo = "/assets/evg-logo.png";

const initialReport = {
  personName: "Stefanie Magness",
  orgName: "Elevate Visibility Group",
  title: "Founder & Visibility Consultant",
  reportType: "Reputation 360™",
  researchConfidence: 98,
  reputationScore: 89,
  orgScore: 84,
  riskScore: 34,
  opportunityScore: 88,
  assetScore: 76,
  bioScore: 68,
  authorityScore: 74,
  executiveSummary: "Stefanie Magness and Elevate Visibility Group have been reviewed across visibility, authority signals, social listening, reviews, Asset Recovery™, and leader-organization alignment.",
  knownForSummary: "Stefanie Magness is connected to executive visibility, reputation strategy, public relations, thought leadership, and public affairs. A deeper live scan should verify media mentions, speaking activity, awards, reviews, and authority assets.",
  knownFor: ["Executive Visibility", "Reputation Strategy", "Public Relations", "Thought Leadership", "Public Affairs"],
  risks: ["No Google Knowledge Panel detected", "No Wikipedia or Wikidata profile found", "Speaking history is not fully centralized"],
  mediaMentions: [{ title: "No verified news or media mentions loaded yet", source: "Research Required", date: "Last 12 months", note: "Connect search APIs to populate verified articles that mention the searched name." }],
  speakingEngagements: [{ title: "No verified speaking engagements loaded yet", eventType: "Research Required", role: "Unknown", date: "Last 12 months", note: "Connect search APIs or add speaking assets manually." }]
};

function initials(name = "RR") {
  return name.trim().split(/\s+/).map(x => x[0]).join("").slice(0, 2).toUpperCase();
}

function App() {
  const [page, setPage] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("admin");
  const [login, setLogin] = useState({ email: "", password: "" });
  const [report, setReport] = useState(initialReport);
  const [query, setQuery] = useState("Stefanie Magness");
  const [identityInputs, setIdentityInputs] = useState({ linkedin: "", website: "", location: "", industry: "", organization: "" });
  const [identityMatches, setIdentityMatches] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [assets, setAssets] = useState([]);
  const [reports, setReports] = useState([]);
  const [assetForm, setAssetForm] = useState({ type: "Speaking Engagement", status: "Client Submitted", title: "", source: "", date: "", role: "", url: "", proof: "", notes: "" });
  const [bioChecked, setBioChecked] = useState([]);
  const [bioDraft, setBioDraft] = useState("Choose a bio format.");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!firebaseReady || !auth) return;
    const unsub = onAuthStateChanged(auth, async current => {
      setUser(current);
      setRole(current?.email === ADMIN_EMAIL ? "admin" : "client");
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    refreshData();
  }, [user, role]);

  async function refreshData() {
    const [a, r] = await Promise.all([listAssets(user, role), listReports(user, role)]);
    setAssets(a);
    setReports(r);
  }

  function notify(message) {
    setToast(message);
    setTimeout(() => setToast(""), 2600);
  }

  async function handleLogin() {
    if (!firebaseReady) {
      notify("Firebase is not configured yet. Add .env values first.");
      return;
    }
    await signInWithEmailAndPassword(auth, login.email, login.password);
  }

  async function handleCreateClient() {
    if (!firebaseReady) {
      notify("Firebase is not configured yet. Add .env values first.");
      return;
    }
    await createUserWithEmailAndPassword(auth, login.email, login.password);
  }

  async function handleLogout() {
    if (auth) await signOut(auth);
  }

  function openIdentityReview() {
    const matches = buildPossibleMatches({ query, ...identityInputs });
    setIdentityMatches(matches);
  }

  async function selectIdentity(identity) {
    const newReport = buildReportFromIdentity(identity);
    setReport(newReport);
    setQuery(newReport.personName);
    await saveReport(newReport, user);
    await refreshData();
    setIdentityMatches([]);
    setPage("dashboard");
    notify(`Report created for ${identity.name}.`);
  }

  function manualIdentity() {
    const identity = {
      name: query || "New Client",
      title: "Manual Profile",
      organization: identityInputs.organization || "Organization not entered",
      location: identityInputs.location || "Location not confirmed",
      source: "Manual entry",
      confidence: 45
    };
    selectIdentity(identity);
  }

  async function addAsset() {
    const saved = await saveAsset({ ...assetForm, personName: report.personName, orgName: report.orgName }, user);
    setAssets([saved, ...assets]);
    setAssetForm({ type: "Speaking Engagement", status: "Client Submitted", title: "", source: "", date: "", role: "", url: "", proof: "", notes: "" });
    notify("Authority asset added.");
  }

  async function deleteAsset(id) {
    if (!firebaseReady) {
      const updated = deleteLocalAsset(id);
      setAssets(updated);
      notify("Asset deleted.");
      return;
    }
    notify("Firestore delete is ready for Phase 1 rules. Local delete works now.");
  }

  function editAsset(asset) {
    setAssetForm(asset);
    setPage("assetManager");
    notify("Edit the asset and save again.");
  }

  const counts = useMemo(() => {
    const media = assets.filter(a => ["Media Mention", "Podcast / Interview", "Publication / Article"].includes(a.type)).length;
    return {
      google: Math.max(10, assets.length),
      news: media,
      reach: media ? "Pending" : "0",
      speaking: assets.filter(a => a.type === "Speaking Engagement").length,
      awards: assets.filter(a => a.type === "Award / Recognition").length,
      social: assets.filter(a => a.type === "Review / Testimonial").length
    };
  }, [assets]);

  const bioScore = Math.round((bioChecked.length / 59) * 100) || report.bioScore || 52;

  function metricItems(type) {
    const person = report.personName;
    const base = {
      google: { title: "Google Results", subtitle: `Top search result drawer for ${person}`, items: [{ title: "Google search not connected yet", meta: "API Required", note: "Connect Google Custom Search or SerpAPI to show the top 10 results." }, ...assets.slice(0, 10).map(a => ({ title: a.title, meta: `${a.type} · ${a.source} · ${a.date}`, note: a.notes }))] },
      news: { title: "News + Media Mentions", subtitle: "Last 12 months only. Must mention the searched person or organization.", items: [{ title: "No verified media mentions loaded yet", meta: "Research Required · Last 12 months", note: "Articles, interviews, podcasts, TV/radio, and press mentions will appear here." }, ...assets.filter(a => ["Media Mention", "Podcast / Interview", "Publication / Article"].includes(a.type)).map(a => ({ title: a.title, meta: `${a.source} · ${a.date}`, note: `${a.role} · ${a.notes}` }))] },
      reach: { title: "Media Reach", subtitle: "Reach and source authority for verified media.", items: [{ title: "Media reach not calculated yet", meta: "API Required", note: "Reach needs verified media sources and authority data." }] },
      speaking: { title: "Speaking Intelligence", subtitle: "Conferences, summits, forums, keynotes, panels, workshops, breakouts, webinars, podcasts, and university lectures.", items: [{ title: "No verified speaking engagements loaded yet", meta: "Research Required", note: "Only include events that mention the searched person or organization." }, ...assets.filter(a => a.type === "Speaking Engagement").map(a => ({ title: a.title, meta: `${a.role} · ${a.source} · ${a.date}`, note: a.notes }))] },
      awards: { title: "Awards + Recognition", subtitle: "Awards, rankings, nominations, honors, and recognition.", items: [{ title: "No verified awards loaded yet", meta: "Research Required", note: "Only include awards that mention the searched person or organization." }, ...assets.filter(a => a.type === "Award / Recognition").map(a => ({ title: a.title, meta: `${a.source} · ${a.date}`, note: `${a.role} · ${a.notes}` }))] },
      social: { title: "Reviews + Social Listening", subtitle: "Reviews, testimonials, public mentions, and sentiment.", items: [{ title: "Reviews and social listening not connected yet", meta: "API Required", note: "Google Reviews, Facebook, LinkedIn, Glassdoor, Indeed, Candid, Charity Navigator, and social mentions will appear here." }, ...assets.filter(a => a.type === "Review / Testimonial").map(a => ({ title: a.title, meta: `${a.source} · ${a.date}`, note: a.notes }))] },
      bio: { title: "Bio Score Details", subtitle: "Missing or incomplete bio elements.", items: ["Current title", "Years of experience", "Awards", "Speaking engagements", "Media interviews", "Board memberships", "Signature projects", "Personal mission"].map(x => ({ title: x, meta: "Bio Development", note: "Add this to improve bio completeness." })) },
      missing: { title: "AI Recommendations: Missing Items", subtitle: "Potential gaps the client may need to add or verify.", items: ["Missing awards", "Missing media", "Missing speaking engagements", "Missing certifications", "Missing board memberships", "Missing publications", "Missing books", "Missing projects", "Missing volunteer work"].map(x => ({ title: x, meta: "Recommendation", note: "Ask the client to confirm if this belongs in their profile." })) }
    };
    return base[type];
  }

  function openMetric(type) {
    setDrawer(metricItems(type));
  }

  function generateBio(type) {
    const assetText = assets.slice(0, 6).map(a => a.title).join(", ");
    const known = report.knownFor?.slice(0, 4).join(", ") || "leadership and professional impact";
    const name = report.personName;
    const title = report.title || "leader";
    const org = report.orgName || "their organization";

    const drafts = {
      "50": `${name} is a ${title} connected to ${org}. Their work centers on ${known}. Key accomplishments to consider adding include ${assetText || "awards, speaking engagements, media mentions, board service, and signature projects"}.`,
      "100": `${name} is a ${title} whose reputation profile centers on ${known}. Through ${org}, they have built visibility around their expertise and public-facing work. A stronger bio should include verified accomplishments such as awards, media mentions, speaking engagements, board service, publications, credentials, and signature projects. ${assetText ? "Potential assets to include: " + assetText + "." : "The next step is to complete the Authority Asset Inventory™ so the bio reflects the full record of their work."}`,
      "150": `${name} is a ${title} connected to ${org}, with a reputation profile that should be supported by verified accomplishments, public-facing leadership, and visible proof of impact. Their bio should clearly explain what they are known for, who they serve, what they have built, and why their work matters. Stronger versions should include awards, speaking engagements, media mentions, board service, publications, credentials, signature projects, and measurable outcomes. ${assetText ? "Known assets to consider include " + assetText + "." : "Additional client-provided assets are needed before finalizing this bio."}`,
      speaker: `${name} is a ${title} available for conversations on ${known}. Their speaker bio should highlight keynote topics, panels, workshops, conferences, media experience, and practical lessons audiences can apply.`,
      linkedin: `${name} helps audiences understand ${known}. Their LinkedIn About section should open with their current role, clearly state what they are known for, include proof such as awards, media, speaking, board service, and close with the kind of opportunities they want next.`,
      board: `${name} is a ${title} with experience that may support board, advisory, or civic leadership opportunities. A board bio should emphasize leadership judgment, industry expertise, governance experience, community impact, financial or operational oversight, and relevant credentials.`,
      award: `${name} is a ${title} whose accomplishments may support award and recognition opportunities. An award nomination bio should include measurable impact, leadership roles, media recognition, speaking engagements, community service, awards, and proof of influence.`
    };

    setBioDraft(drafts[type]);
  }

  const checklistGroups = {
    "Professional Identity": ["Current title", "Current organization", "Former positions", "Years of experience", "Industry expertise"],
    "Leadership": ["CEO", "Founder", "Executive", "Board Member", "Advisory Board", "Committee Leadership", "Government Appointments"],
    "Education": ["Degrees", "Universities", "Executive Education", "Certifications", "Fellowships"],
    "Awards + Recognition": ["Awards", "Honors", "Rankings", "40 Under 40", "Women to Watch", "Hall of Fame", "Industry Awards", "Community Recognition"],
    "Speaking": ["Keynotes", "Panels", "Workshops", "Conferences", "Forums", "Summits", "University Lectures", "Podcasts", "Guest Speaker"],
    "Media": ["TV", "Radio", "Newspapers", "Magazines", "Podcasts", "Articles", "Quotes", "Interviews", "Guest Columns"],
    "Publications": ["Books", "White Papers", "Research", "Blog", "Journal Articles"],
    "Leadership + Service": ["Board Memberships", "Volunteer Leadership", "Community Organizations", "Professional Associations", "Civic Engagement"],
    "Credentials": ["Licenses", "Certifications", "Military Service", "Security Clearance"]
  };

  const nav = [
    ["dashboard", "Dashboard"], ["clientPortal", "Client Portal"], ["adminPortal", "Admin Portal"], ["intake", "Intake"],
    ["individual", "Individual Intelligence"], ["organization", "Organization Intelligence"], ["rep360", "Reputation 360"],
    ["assetRecovery", "Asset Recovery™"], ["assetManager", "Manual Asset Manager"], ["speaking", "Speaking Intelligence"],
    ["bioDevelopment", "Bio Development™"], ["socialReviews", "Reviews + Social"], ["timeline", "Timeline of Influence™"], ["settings", "Settings"]
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo"><img src={logo} alt="EVG logo" /></div>
        <div className="nav">{nav.map(([id, label]) => <a key={id} className={page === id ? "active" : ""} onClick={() => setPage(id)}>{label}</a>)}</div>
        <div className="promo"><h3>The Reputation Report™</h3><p>See what the world sees<br />before the world decides<br />who you are.</p></div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="brand"><h1>The Reputation Report™</h1><p>Visibility & Reputation Intelligence Platform</p></div>
          <div className="top-actions">
            <button className="new" onClick={() => setPage("intake")}>+ New Report</button>
            <button className="new" onClick={() => window.print()}>Export PDF</button>
            {firebaseReady && user ? <button className="new" onClick={handleLogout}>Logout</button> : null}
            <div className="user"><div className="avatar">{initials(report.personName)}</div><div><strong>{user?.email || "EVG Admin"}</strong><small>{role === "admin" ? "Admin Portal" : "Client Portal"}</small></div></div>
          </div>
        </div>

        <div className="content">
          {page === "dashboard" && (
            <section className="page active">
              <div className="grid top-grid">
                <div className="card search-card">
                  <label>Search by name, LinkedIn URL, website, or organization</label>
                  <div className="search-row"><div className="input"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Enter name, LinkedIn URL, website, or organization" /></div><button className="btn" onClick={openIdentityReview}>GENERATE REPORT</button></div>
                  <div className="match-helper">
                    <input placeholder="Optional LinkedIn URL" value={identityInputs.linkedin} onChange={e=>setIdentityInputs({...identityInputs, linkedin:e.target.value})} />
                    <input placeholder="Optional website" value={identityInputs.website} onChange={e=>setIdentityInputs({...identityInputs, website:e.target.value})} />
                    <input placeholder="Optional city/state" value={identityInputs.location} onChange={e=>setIdentityInputs({...identityInputs, location:e.target.value})} />
                    <input placeholder="Optional industry" value={identityInputs.industry} onChange={e=>setIdentityInputs({...identityInputs, industry:e.target.value})} />
                  </div>
                  <p className="muted">Identity Match Review™ will show possible people before the report is generated.</p>
                </div>
                <div className="card month"><div><h4>Reports This Month</h4><div className="num">{reports.length || 12}</div><a onClick={() => setPage("adminPortal")}>View report history →</a></div><div className="docicon">▤</div></div>
              </div>

              <div className="grid profile-grid" style={{ marginTop: 18 }}>
                <div className="card profile">
                  <div className="headshot">{initials(report.personName)}</div>
                  <div><h2>{report.personName}</h2><div className="meta"><span>{report.title}</span><span>|</span><span>{report.orgName}</span></div><span className="badge">{report.reportType}</span> <span className="badge">Confidence: {report.researchConfidence}%</span></div>
                  <div className="actions"><button className="outline" onClick={() => setPage("intake")}>UPDATE INFORMATION</button><button className="black" onClick={() => setPage("assetRecovery")}>VIEW ASSETS</button></div>
                </div>
                <div className="card score"><h4>Overall Reputation Score</h4><div className="gauge"></div><div className="big">{report.reputationScore}</div><small>/100</small><div className="strong">Working Score</div></div>
              </div>

              <div className="grid middle" style={{ marginTop: 18 }}>
                <div className="card panel"><h4>Reporting Scores</h4>
                  {[["Reputation Score", report.reputationScore], ["Organization Score", report.orgScore], ["Risk Score", report.riskScore], ["Opportunity Score", report.opportunityScore], ["Asset Recovery Score", report.assetScore], ["Bio Score", bioScore], ["Authority Score", report.authorityScore]].map(([label, value]) => (
                    <div className="row" key={label}><span>{label}</span><div className="bar"><div className="fill" style={{ width: `${value}%` }}></div></div><strong>{value}</strong></div>
                  ))}
                </div>
                <div className="card panel snapshot"><h4>Executive Summary</h4><p>{report.executiveSummary}</p><a className="link" onClick={() => setPage("rep360")}>View full Reputation 360 →</a></div>
                <div className="card panel"><h4>Knowledge Panel + Wikipedia Checks</h4>{["Google Knowledge Panel", "Wikipedia Page", "Wikidata Profile", "Official Website", "LinkedIn Profile", "News Coverage", "Awards & Recognition", "Speaking History"].map((x, i) => <div className="asset" key={x}><span>{x}</span><span className={i < 3 ? "no" : "yes"}>{i < 3 ? "×" : "✓"}</span><small>{i < 3 ? "Check" : "Verify"}</small></div>)}</div>
              </div>

              <div className="card metrics" style={{ marginTop: 18 }}>
                <Metric icon="⌕" value={counts.google} label="Google Results" onClick={() => openMetric("google")} />
                <Metric icon="▤" value={counts.news} label="News" onClick={() => openMetric("news")} />
                <Metric icon="♚" value={counts.reach} label="Media Reach" onClick={() => openMetric("reach")} />
                <Metric icon="♬" value={counts.speaking} label="Speaking" onClick={() => openMetric("speaking")} />
                <Metric icon="♕" value={counts.awards} label="Awards" onClick={() => openMetric("awards")} />
                <Metric icon="♧" value={counts.social} label="Reviews/Social" onClick={() => openMetric("social")} />
                <Metric icon="✎" value={bioScore} label="Bio Score" onClick={() => openMetric("bio")} />
                <Metric icon="!" value="9" label="AI Recommendations" onClick={() => openMetric("missing")} />
              </div>

              <div className="grid bottom" style={{ marginTop: 18 }}>
                <div className="card panel"><h4>Top News + Media Mentions</h4><p className="muted">Last 12 months only. Must mention the searched person or organization.</p>{report.mediaMentions?.map((x, i) => <Detail key={i} title={x.title} meta={`${x.source} · ${x.date}`} note={x.note} />)}</div>
                <div className="card panel"><h4>AI Reputation Snapshot</h4><p className="muted">{report.knownForSummary}</p><div className="tags">{report.knownFor?.map(x => <span className="tag" key={x}>{x}</span>)}</div></div>
                <div className="card panel"><h4>Risk Alerts</h4>{report.risks?.map(x => <div className="risk" key={x}><span className="warn">⚠</span><div>{x}</div></div>)}<div className="risk"><span className="ok">✓</span><div>No major negative issue detected</div></div></div>
                <div className="card quick"><h4>Quick Actions</h4><Quick label="Create Asset Inventory" onClick={() => setPage("assetRecovery")} /><Quick label="Reputation 360™" onClick={() => setPage("rep360")} /><Quick label="Social + Reviews" onClick={() => setPage("socialReviews")} /><Quick label="Update Information" onClick={() => setPage("intake")} /><Quick label="Add Authority Asset" onClick={() => setPage("assetManager")} /><Quick label="Bio Development" onClick={() => setPage("bioDevelopment")} /></div>
              </div>
            </section>
          )}

          {page === "clientPortal" && <Portal title="Client Portal" text="Clients will see dashboard, report history, intake, uploads, Bio Builder, and assets." items={["Complete Intake", "Upload / Add Assets", "Bio Builder", "Report History", "Download Reports"]} />}
          {page === "adminPortal" && <Portal title="Admin Portal" text="EVG admin can manage clients, search clients, edit reports, verify assets, approve changes, export PDFs, and view report history." items={["Search Clients", "Add Client", "Edit Reports", "Verify Assets", "Approve Changes", "Export PDF", "Report History"]} />}
          {page === "intake" && <Intake report={report} setReport={setReport} save={() => notify("Intake saved.")} />}
          {page === "individual" && <BasicPage title="Individual Intelligence" text="Executive reputation, authority signals, role clarity, public visibility, Knowledge Panel, Wikipedia, Wikidata, bio strength, and media footprint." />}
          {page === "organization" && <BasicPage title="Organization Intelligence" text="Organization reputation, Google Business Profile, reviews, trust pages, nonprofit profiles, employer reputation, press, and awards." />}
          {page === "rep360" && <BasicPage title="Reputation 360™" text="Compares the individual and organization to see whether both reputations reinforce each other." />}
          {page === "assetRecovery" && <BasicPage title="Asset Recovery™" text="Find and organize accomplishments clients forget to use: media, awards, speaking, board roles, podcasts, publications, and signature projects." />}
          {page === "assetManager" && <AssetManager assetForm={assetForm} setAssetForm={setAssetForm} addAsset={addAsset} assets={assets} editAsset={editAsset} deleteAsset={deleteAsset} />}
          {page === "speaking" && <Speaking report={report} />}
          {page === "bioDevelopment" && <BioDevelopment checklistGroups={checklistGroups} bioChecked={bioChecked} setBioChecked={setBioChecked} bioScore={bioScore} assets={assets} generateBio={generateBio} bioDraft={bioDraft} />}
          {page === "socialReviews" && <BasicPage title="Reviews & Social Listening" text="Reports what people are saying online about the person, organization, or both. Sources include LinkedIn, Instagram, Facebook Reviews, Google Reviews, Glassdoor, Indeed, Candid, and Charity Navigator." />}
          {page === "timeline" && <Timeline assets={assets} />}
          {page === "settings" && <Settings firebaseReady={firebaseReady} login={login} setLogin={setLogin} handleLogin={handleLogin} handleCreateClient={handleCreateClient} />}
        </div>
      </main>

      {identityMatches.length > 0 && <IdentityModal matches={identityMatches} selectIdentity={selectIdentity} close={() => setIdentityMatches([])} manualIdentity={manualIdentity} />}
      {drawer && <Drawer drawer={drawer} close={() => setDrawer(null)} notify={notify} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Metric({ icon, value, label, onClick }) { return <div className="metric" onClick={onClick}><div className="icon">{icon}</div><div className="value">{value}</div><small>{label}</small></div>; }
function Quick({ label, onClick }) { return <div className="q" onClick={onClick}>{label}<strong>›</strong></div>; }
function Detail({ title, meta, note }) { return <div className="detail-item"><strong>{title}</strong><small>{meta}<br />{note}</small></div>; }

function IdentityModal({ matches, selectIdentity, close, manualIdentity }) {
  return <><div className="identity-backdrop active"></div><aside className="identity-modal active"><div className="drawer-head"><div><h2>Identity Match Review™</h2><p className="muted">Which person or organization do you mean?</p></div><button className="drawer-close" onClick={close}>Close</button></div>{matches.map((m, i) => <div className="match-card" key={i}><div><h3>{m.name}</h3><div className="match-meta">{m.title}<br />{m.organization}<br />{m.location}<br />Source: {m.source}</div></div><div><div className="confidence">{m.confidence}%<small>confidence</small></div><button className="select-match" onClick={() => selectIdentity(m)}>This is the person</button><button className="outline" style={{ width: "100%", marginTop: 8 }}>Not right</button></div></div>)}<div className="detail-item"><strong>Not seeing the right person?</strong><small>Add more details like LinkedIn, website, organization, city, or industry to improve match confidence.</small><br /><button className="outline" onClick={manualIdentity}>Add details manually</button></div></aside></>;
}

function Drawer({ drawer, close, notify }) {
  return <><div className="drawer-backdrop active" onClick={close}></div><aside className="drawer active"><div className="drawer-head"><div><h2>{drawer.title}</h2><p className="muted">{drawer.subtitle}</p></div><button className="drawer-close" onClick={close}>Close</button></div><button className="outline" onClick={() => notify("Removed items restored.")}>Restore removed items</button>{drawer.items.map((item, i) => <div className="detail-item" key={i}><strong>{item.title}</strong><small>{item.meta}<br />{item.note}</small><br /><button className="verify-btn" onClick={() => notify("Marked verified.")}>Mark Verified</button><button className="outline" onClick={() => notify("Marked client submitted.")}>Client Submitted</button><button className="outline" onClick={() => notify("Marked AI found.")}>AI Found</button><button className="remove-btn" onClick={() => notify("Removed irrelevant item.")}>Remove irrelevant</button></div>)}</aside></>;
}

function Portal({ title, text, items }) { return <section className="page active"><div className="card panel"><h4>{title}</h4><div className="portal-box">{text}</div><div className="grid bottom">{items.map(x => <div className="card quick" key={x}><Quick label={x} onClick={() => {}} /></div>)}</div></div></section>; }
function BasicPage({ title, text }) { return <section className="page active"><div className="card panel"><h4>{title}</h4><p className="muted">{text}</p></div></section>; }

function Intake({ report, setReport, save }) {
  return <section className="page active"><div className="card search-card"><h2 style={{ fontFamily: "Playfair Display,serif", marginTop: 0 }}>Client Intake</h2><div className="form-grid">
    <label>Report Type<select value={report.reportType} onChange={e => setReport({ ...report, reportType: e.target.value })}><option>Reputation 360™</option><option>Individual Reputation Report™</option><option>Organization Reputation Report™</option></select></label>
    <label>Individual Name<input value={report.personName} onChange={e => setReport({ ...report, personName: e.target.value })} /></label>
    <label>Title<input value={report.title} onChange={e => setReport({ ...report, title: e.target.value })} /></label>
    <label>Organization<input value={report.orgName} onChange={e => setReport({ ...report, orgName: e.target.value })} /></label>
    <label>Website<input placeholder="Website" /></label><label>LinkedIn<input placeholder="LinkedIn" /></label>
    <label className="full">Goals<textarea defaultValue="Understand what the world sees, what they are known for, what people are saying, what assets are missing, and what visibility strategy should come next." /></label>
  </div><button className="new" style={{ marginTop: 18 }} onClick={save}>SAVE INTAKE</button></div></section>;
}

function AssetManager({ assetForm, setAssetForm, addAsset, assets, editAsset, deleteAsset }) {
  const field = (key, value) => setAssetForm({ ...assetForm, [key]: value });
  return <section className="page active"><div className="card panel"><h4>Manual Asset Manager</h4><p className="muted">Add, edit, delete, verify, mark client submitted, mark AI found, and upload proof links for missing items.</p><div className="form-grid">
    <label>Asset Type<select value={assetForm.type} onChange={e => field("type", e.target.value)}>{["Speaking Engagement","Award / Recognition","Media Mention","Podcast / Interview","Board / Committee Role","Publication / Article","Book","Certification / Credential","Volunteer Work","Signature Project","Review / Testimonial","Other Authority Asset"].map(x => <option key={x}>{x}</option>)}</select></label>
    <label>Status<select value={assetForm.status} onChange={e => field("status", e.target.value)}>{["Client Submitted","Verified","AI Found","Pending Verification"].map(x => <option key={x}>{x}</option>)}</select></label>
    <label>Title / Name<input value={assetForm.title} onChange={e => field("title", e.target.value)} /></label>
    <label>Organization / Source<input value={assetForm.source} onChange={e => field("source", e.target.value)} /></label>
    <label>Date / Year<input value={assetForm.date} onChange={e => field("date", e.target.value)} /></label>
    <label>Role<input value={assetForm.role} onChange={e => field("role", e.target.value)} /></label>
    <label>URL<input value={assetForm.url} onChange={e => field("url", e.target.value)} /></label>
    <label>Proof / Upload Link<input value={assetForm.proof} onChange={e => field("proof", e.target.value)} /></label>
    <label className="full">Notes<textarea value={assetForm.notes} onChange={e => field("notes", e.target.value)} /></label>
  </div><button className="new" style={{ marginTop: 16 }} onClick={addAsset}>ADD TO REPORT</button><h4 style={{ marginTop: 24 }}>Manually Added Assets</h4>{assets.length ? assets.map(a => <div className="detail-item" key={a.id}><strong>{a.title}</strong><small>{a.type} · {a.source} · {a.date}<br />{a.role} · {a.status}<br />{a.notes}</small><br /><button className="verify-btn">Mark Verified</button><button className="outline" onClick={() => editAsset(a)}>Edit</button><button className="remove-btn" onClick={() => deleteAsset(a.id)}>Delete</button></div>) : <p className="muted">No manual assets added yet.</p>}</div></section>;
}

function Speaking({ report }) { return <section className="page active"><div className="card panel"><h4>Speaking Intelligence</h4><p className="muted">Checks conferences, summits, forums, keynotes, panels, workshops, breakout sessions, webinars, podcasts, university lectures, and community events tied to the person or organization.</p>{report.speakingEngagements?.map((x, i) => <Detail key={i} title={x.title} meta={`${x.eventType} · ${x.role} · ${x.date}`} note={x.note} />)}</div><div className="card panel" style={{ marginTop: 18 }}><h4>Speaking Categories</h4><div className="tags">{["Conferences","Summits","Forums","Keynotes","Panels","Workshops","Breakout Sessions","Webinars","Podcasts","University Lectures"].map(x => <span className="tag" key={x}>{x}</span>)}</div></div></section>; }

function BioDevelopment({ checklistGroups, bioChecked, setBioChecked, bioScore, assets, generateBio, bioDraft }) {
  function toggle(item) { setBioChecked(bioChecked.includes(item) ? bioChecked.filter(x => x !== item) : [...bioChecked, item]); }
  return <section className="page active"><div className="card panel"><h4>Bio Development™</h4><p className="muted"><strong>Purpose:</strong> Help the client remember accomplishments they have forgotten and identify what is missing from their professional story.</p></div>
    <div className="card metrics" style={{ marginTop: 18 }}><Metric icon="▣" value={bioScore} label="Bio Completeness Score" /><Metric icon="♕" value={assets.filter(a=>a.type==="Award / Recognition").length} label="Awards Added" /><Metric icon="♬" value={assets.filter(a=>a.type==="Speaking Engagement").length} label="Speaking Added" /><Metric icon="▤" value={assets.filter(a=>["Media Mention","Podcast / Interview","Publication / Article"].includes(a.type)).length} label="Media Added" /><Metric icon="♧" value={assets.filter(a=>["Board / Committee Role","Volunteer Work"].includes(a.type)).length} label="Service Assets" /><Metric icon="✎" value={bioScore >= 75 ? "Ready" : "Draft"} label="Bio Status" /></div>
    <div className="card panel" style={{ marginTop: 18 }}><h4>Bio Completeness</h4><div className="bar" style={{height:14}}><div className="fill" style={{width:`${bioScore}%`}}></div></div><p className="muted">{bioScore}% Complete</p></div>
    <div className="grid middle" style={{ gridTemplateColumns:"1.2fr 1fr", marginTop:18 }}><div className="card panel"><h4>Essential Bio Elements Checklist</h4><div className="bio-checklist">{Object.entries(checklistGroups).map(([group, items]) => <div className="bio-group" key={group}><h5>{group}</h5>{items.map(item => <label className="bio-item" key={item}><input type="checkbox" checked={bioChecked.includes(item)} onChange={() => toggle(item)} /> {item}</label>)}</div>)}</div></div>
    <div className="card panel"><h4>Bio Memory Prompts</h4>{["Signature Projects: What projects are you most proud of?","Career Milestones: What accomplishments changed your career?","Biggest Wins: What are your top 10 accomplishments?","Memorable Quotes: What do people quote you for?","Topics You're Known For: What do people call you about?","Personal Mission: What impact do you want to make?"].map(x => <Detail key={x} title={x.split(":")[0]} meta={x.split(":")[1]} />)}</div></div>
    <div className="grid middle" style={{ gridTemplateColumns:"1fr 1fr", marginTop:18 }}><div className="card panel"><h4>AI Bio Suggestions</h4>{["CEO or current role","Years of experience","Former leadership roles","Keynote presentations","Media mentions","Board appointments","Awards and recognition","Books or publications","Podcast guest appearances","University lectures"].map(x => <div className="detail-item" key={x}><strong>{x}</strong><small><button className="outline">Add to Bio</button> <button className="remove-btn">Not Relevant</button></small></div>)}<h4>Missing From Your Bio</h4><div className="tags">{["Board memberships","Volunteer leadership","Speaking history","Awards","Published articles","Major projects","Certifications","Books","Podcasts","Media interviews"].map(x => <span className="tag" key={x}>{x}</span>)}</div></div>
    <div className="card panel"><h4>Bio Builder</h4><div className="bio-tabs">{["50","100","150","speaker","board","award","linkedin"].map(x => <button key={x} onClick={() => generateBio(x)}>{x === "speaker" ? "Conference Speaker" : x === "board" ? "Board Nomination" : x === "award" ? "Award Nomination" : x === "linkedin" ? "LinkedIn About" : x + "-word"}</button>)}</div><div className="bio-output">{bioDraft}</div></div></div>
  </section>;
}

function Timeline({ assets }) { return <section className="page active"><div className="card panel"><h4>Timeline of Influence™</h4><p className="muted">Organizes recovered and manually added assets into a career timeline for bios, award nominations, media kits, and executive profiles.</p>{assets.length ? assets.map(a => <div className="timeline-item" key={a.id}><strong>{a.date}</strong><br />{a.title}<br /><small>{a.type} · {a.source}</small></div>) : <p className="muted">Add assets to build the Timeline of Influence™.</p>}</div></section>; }

function Settings({ firebaseReady, login, setLogin, handleLogin, handleCreateClient }) {
  return <section className="page active"><div className="card panel"><h4>Settings</h4><p className="muted">Firebase status: {firebaseReady ? "Configured" : "Not configured. Add .env values."}</p><div className="form-grid"><label>Email<input value={login.email} onChange={e => setLogin({...login, email:e.target.value})} /></label><label>Password<input type="password" value={login.password} onChange={e => setLogin({...login, password:e.target.value})} /></label></div><button className="new" style={{ marginTop: 16 }} onClick={handleLogin}>Login</button> <button className="outline" onClick={handleCreateClient}>Create Client</button></div></section>;
}

createRoot(document.getElementById("root")).render(<App />);
