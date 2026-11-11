const mongoose = require("mongoose");
// Proof files (photos/PDF) are stored inside MongoDB as binary data.
module.exports = mongoose.model("Attachment", new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: "Request", index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: String, mime: String, size: Number, data: Buffer
}, { timestamps: true }));
