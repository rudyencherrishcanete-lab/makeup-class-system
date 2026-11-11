require("dotenv").config();
const express = require("express"), mongoose = require("mongoose"), bcrypt = require("bcryptjs"), jwt = require("jsonwebtoken");
const User = require("./models/User"), Request = require("./models/Request"), Attachment = require("./models/Attachment"), Notification = require("./models/Notification");
const { MONGODB_URI, JWT_SECRET = "dev-secret", PORT = 3000 } = process.env;
const config = require("./config");
const DEPTS = config.colleges.flatMap(c => c.departments.map(d => `${c.code} - ${d}`));
const app = express(); app.use(express.json({ limit: "20mb" })); app.use(express.static("public"));
const wrap = fn => (req, res, next) => fn(req, res, next).catch(e => { console.error(e); res.status(500).json({ error: "Server error" }); });

// ---- auth ----
const auth = wrap(async (req, res, next) => {
  try {
    const { id } = jwt.verify((req.headers.authorization || "").replace("Bearer ", ""), JWT_SECRET);
    req.user = await User.findById(id); if (!req.user) throw 0; next();
  } catch (e) { res.status(401).json({ error: "Please log in" }); }
});
const admin = (req, res, next) => req.user.role === "admin" ? next() : res.status(403).json({ error: "Admins only" });
// Which requests may this user see? (campus/dept scope)
const scope = u => {
  if (u.role === "admin") return {};
  const f = {}; if (u.campus) f.campus = u.campus; if (u.role !== "dean" && u.dept) f.dept = u.dept; return f;
};
const inScope = (u, r) => Object.entries(scope(u)).every(([k, v]) => r[k] === v);

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const notify = (user, request, text) => Notification.create({ user, request, text });
const parseFiles = list => {
  const files = Array.isArray(list) ? list : [];
  if (!files.length) return { error: "Attach at least one file (photo or PDF)" };
  if (files.length > 5) return { error: "Maximum 5 files" };
  const bufs = [];
  for (const p of files) {
    const buf = Buffer.from(String(p.data || ""), "base64");
    if (!ALLOWED.includes(p.mime)) return { error: "Only JPG, PNG, WEBP or PDF files are allowed" };
    if (!buf.length || buf.length > 3 * 1024 * 1024) return { error: "Each file must be 3 MB or smaller" };
    bufs.push({ name: String(p.name || "evidence").slice(0, 120), mime: p.mime, buf });
  }
  return { bufs };
};

app.get("/api/config", (req, res) => res.json(config));

app.post("/api/login", wrap(async (req, res) => {
  const u = await User.findOne({ username: req.body.username });
  if (!u || !(await bcrypt.compare(req.body.password || "", u.pw))) return res.status(401).json({ error: "Wrong username or password" });
  res.json({ token: jwt.sign({ id: u.id }, JWT_SECRET, { expiresIn: "8h" }), user: u });
}));
app.get("/api/me", auth, (req, res) => res.json(req.user));

// ---- requests ----
app.get("/api/requests", auth, wrap(async (req, res) => {
  const u = req.user, mine = req.query.mine === "1" || u.role === "faculty";
  res.json(await Request.find(mine ? { owner: u._id } : scope(u)).sort({ created: -1 }));
}));
app.post("/api/requests", auth, wrap(async (req, res) => {
  const b = req.body, f = ["faculty", "subject", "campus", "dept", "program", "regular", "when", "room", "reason"];
  if (f.some(k => !b[k])) return res.status(400).json({ error: "Complete all required fields" });
  if (!config.campuses.includes(b.campus) || !DEPTS.includes(b.dept)) return res.status(400).json({ error: "Choose a valid campus and department" });
  if (!b.available) return res.status(400).json({ error: "Confirm student availability first" });
  const files = Array.isArray(b.proofs) ? b.proofs : [];
  if (!files.length) return res.status(400).json({ error: "Attach proof that the students agreed (photo or PDF)" });
  if (files.length > 5) return res.status(400).json({ error: "Maximum 5 files" });
  const bufs = [];
  for (const p of files) {
    const buf = Buffer.from(String(p.data || ""), "base64");
    if (!ALLOWED.includes(p.mime)) return res.status(400).json({ error: "Only JPG, PNG, WEBP or PDF files are allowed" });
    if (!buf.length || buf.length > 3 * 1024 * 1024) return res.status(400).json({ error: "Each file must be 3 MB or smaller" });
    bufs.push({ name: String(p.name || "proof").slice(0, 120), mime: p.mime, buf });
  }
  const doc = { owner: req.user._id, details: String(b.details || "").slice(0, 500), history: [{ text: "Signed and submitted to Dept Head/Unit Coordinator" }] };
  f.forEach(k => doc[k] = String(b[k]).slice(0, 300));
  const r = new Request(doc);
  for (const x of bufs) {
    const a = await Attachment.create({ request: r._id, owner: req.user._id, name: x.name, mime: x.mime, size: x.buf.length, data: x.buf });
    r.proofs.push({ file: a._id, name: x.name, mime: x.mime, size: x.buf.length });
  }
  res.json(await r.save());
}));
const RULES = {
  recommend: { role: "head", from: "submitted", to: "recommended", text: "Dept Head checked details and recommended approval" },
  endorse: { role: "incharge", from: "recommended", to: "endorsed", text: "In-charge reviewed and endorsed to Dean" },
  approve: { role: "dean", from: "endorsed", to: "approved", text: "Dean/Campus Director approved the application" }
};
const REJECT = { submitted: "head", recommended: "incharge", endorsed: "dean" };
app.post("/api/requests/:id/:action", auth, wrap(async (req, res) => {
  const r = await Request.findById(req.params.id).catch(() => null), u = req.user, a = req.params.action;
  if (!r) return res.status(404).json({ error: "Not found" });
  const rm = req.body.remarks ? ": " + req.body.remarks : "", no = () => res.status(403).json({ error: "Not allowed" });
  const allow = role => u.role === "admin" || (u.role === role && inScope(u, r));
  const log = t => r.history.push({ text: t + rm });
  if (RULES[a]) { const x = RULES[a];
    if (r.status !== x.from || !allow(x.role)) return no();
    r.status = x.to; log(x.text);
  } else if (a === "reject") {
    const role = REJECT[r.status]; if (!role || !allow(role)) return no();
    r.rejectedAt = Object.keys(REJECT).indexOf(r.status); r.status = "rejected"; log("Returned/rejected by " + role);
  } else if (a === "informed") {
    if (r.status !== "approved" || !allow("dean")) return no();
    r.informed = true; log("Staff informed faculty of approval");
  } else if (a === "conduct") {
    if (r.status !== "approved" || !r.owner.equals(u._id)) return res.status(403).json({ error: "Only the requesting faculty can do this" });
    const pf = parseFiles(req.body.files); if (pf.error) return res.status(400).json({ error: pf.error });
    for (const x of pf.bufs) {
      const at = await Attachment.create({ request: r._id, owner: u._id, name: x.name, mime: x.mime, size: x.buf.length, data: x.buf });
      r.evidenceFiles.push({ file: at._id, name: x.name, mime: x.mime, size: x.buf.length });
    }
    r.status = "conducted"; r.evidence = `${pf.bufs.length} file(s) attached`; log("Make-up class conducted; evidence files uploaded");
  } else return res.status(400).json({ error: "Unknown action" });
  const saved = await r.save(), label = `${r.subject} (${r.program})`;
  const msg = {
    recommend: `Your make-up class for ${label} was recommended for approval by the Dept Head.`,
    endorse: `Your make-up class for ${label} was endorsed by the In-charge and is now with the Dean.`,
    approve: `✅ Your make-up class for ${label} has been APPROVED. Please inform your students and conduct it as scheduled.`,
    reject: `Your make-up class request for ${label} was returned/rejected${rm}.`,
    informed: `🔔 Reminder: your make-up class for ${label} is APPROVED. Please inform your students and conduct it as scheduled.`
  }[a];
  if (msg) await notify(r.owner, r._id, msg);
  res.json(saved);
}));

// ---- proof files ----
app.get("/api/files/:id", auth, wrap(async (req, res) => {
  const a = await Attachment.findById(req.params.id).catch(() => null);
  if (!a) return res.status(404).json({ error: "Not found" });
  const r = await Request.findById(a.request);
  const ok = a.owner.equals(req.user._id) || (req.user.role !== "faculty" && r && inScope(req.user, r));
  if (!ok) return res.status(403).json({ error: "Not allowed" });
  res.set({ "Content-Type": a.mime, "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff" }).send(a.data);
}));

// ---- notifications ----
app.get("/api/notifications", auth, wrap(async (req, res) => res.json(await Notification.find({ user: req.user._id }).sort({ created: -1 }).limit(30))));
app.post("/api/notifications/read", auth, wrap(async (req, res) => { await Notification.updateMany({ user: req.user._id, read: false }, { read: true }); res.json({ ok: 1 }); }));

// ---- user management (admin) ----
app.get("/api/users", auth, admin, wrap(async (req, res) => res.json(await User.find().sort({ name: 1 }))));
app.post("/api/users", auth, admin, wrap(async (req, res) => {
  const b = req.body; if (!b.username || !b.password || !b.name) return res.status(400).json({ error: "Name, username, password required" });
  if ((b.campus && !config.campuses.includes(b.campus)) || (b.dept && !DEPTS.includes(b.dept))) return res.status(400).json({ error: "Invalid campus or department" });
  if (await User.exists({ username: b.username })) return res.status(400).json({ error: "Username taken" });
  await User.create({ username: b.username, name: b.name, role: b.role || "faculty", campus: b.campus || "", dept: b.dept || "", pw: await bcrypt.hash(b.password, 10) });
  res.json({ ok: 1 });
}));
app.delete("/api/users/:id", auth, admin, wrap(async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: "Can't delete yourself" });
  await User.findByIdAndDelete(req.params.id); res.json({ ok: 1 });
}));

// ---- start ----
(async () => {
  if (!MONGODB_URI) { console.error("Missing MONGODB_URI. Copy .env.example to .env first."); process.exit(1); }
  await mongoose.connect(MONGODB_URI); console.log("MongoDB connected");
  if (!(await User.countDocuments())) { // DEMO ACCOUNTS - change/delete after first login
    const mk = async (username, name, pw, role, campus = "", dept = "") => ({ username, name, role, campus, dept, pw: await bcrypt.hash(pw, 10) });
    await User.insertMany([await mk("admin", "Administrator", "admin123", "admin"), await mk("faculty1", "Juan Dela Cruz", "pass123", "faculty", "Cagayan de Oro", "CITC - Department of Information Technology"),
      await mk("head1", "Dept Head IT", "pass123", "head", "Cagayan de Oro", "CITC - Department of Information Technology"), await mk("incharge1", "In-charge IT", "pass123", "incharge", "Cagayan de Oro", "CITC - Department of Information Technology"),
      await mk("dean1", "Dean", "pass123", "dean", "Cagayan de Oro")]);
    console.log("Seeded demo users");
  }
  app.listen(PORT, () => console.log(`Open http://localhost:${PORT}`));
})().catch(e => { console.error("Startup failed:", e.message); process.exit(1); });