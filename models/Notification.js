const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  request: { type: mongoose.Schema.Types.ObjectId, ref: "Request" },
  text: String, read: { type: Boolean, default: false }
}, { timestamps: { createdAt: "created", updatedAt: false } });
schema.set("toJSON", { transform: (doc, o) => { o.id = o._id.toString(); delete o._id; delete o.__v; delete o.user; delete o.request; } });
module.exports = mongoose.model("Notification", schema);
