import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db, firebaseReady } from "./firebase";

const localKey = "rr_phase1_reports";
const assetKey = "rr_phase1_assets";

export function readLocal(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

export function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function saveReport(report, user) {
  const payload = { ...report, ownerUid: user?.uid || "local", updatedAt: new Date().toISOString() };

  if (firebaseReady && user) {
    const ref = await addDoc(collection(db, "reports"), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: ref.id, ...payload };
  }

  const reports = readLocal(localKey);
  const saved = { id: crypto.randomUUID(), ...payload, createdAt: new Date().toISOString() };
  reports.unshift(saved);
  writeLocal(localKey, reports);
  return saved;
}

export async function listReports(user, role = "client") {
  if (firebaseReady && user) {
    const reportsRef = collection(db, "reports");
    const q = role === "admin"
      ? query(reportsRef, orderBy("updatedAt", "desc"))
      : query(reportsRef, where("ownerUid", "==", user.uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return readLocal(localKey);
}

export async function saveAsset(asset, user) {
  const payload = { ...asset, ownerUid: user?.uid || "local", updatedAt: new Date().toISOString() };
  if (firebaseReady && user) {
    const ref = await addDoc(collection(db, "assets"), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: ref.id, ...payload };
  }
  const assets = readLocal(assetKey);
  const saved = { id: crypto.randomUUID(), ...payload, createdAt: new Date().toISOString() };
  assets.unshift(saved);
  writeLocal(assetKey, assets);
  return saved;
}

export async function listAssets(user, role = "client") {
  if (firebaseReady && user) {
    const assetsRef = collection(db, "assets");
    const q = role === "admin"
      ? query(assetsRef, orderBy("updatedAt", "desc"))
      : query(assetsRef, where("ownerUid", "==", user.uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return readLocal(assetKey);
}

export function deleteLocalAsset(id) {
  const assets = readLocal(assetKey).filter(a => a.id !== id);
  writeLocal(assetKey, assets);
  return assets;
}
