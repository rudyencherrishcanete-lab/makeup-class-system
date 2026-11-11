const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  faculty: String, subject: String, campus: { type: String, index: true }, dept: { type: String, index: true },
  program: String, regular: String, when: String, room: String, reason: String, details: { type: String, default: "" },
  status: { type: String, enum: ["submitted", "recommended", "endorsed", "approved", "rejected", "conducted"], default: "submitted" },
  proofs: [{ _id: false, file: mongoose.Schema.Types.ObjectId, name: String, mime: String, size: Number }], evidenceFiles: [{ _id: false, file: mongoose.Schema.Types.ObjectId, name: String, mime: String, size: Number }], rejectedAt: Number, informed: { type: Boolean, default: false }, evidence: String,
  history: [new mongoose.Schema({ at: { type: Date, default: Date.now }, text: String }, { _id: false })]
}, { timestamps: { createdAt: "created", updatedAt: "updated" } });
schema.set("toJSON", { transform: (doc, o) => { o.id = o._id.toString(); o.owner = o.owner.toString(); delete o._id; delete o.__v; } });
module.exports = mongoose.model("Request", schema);