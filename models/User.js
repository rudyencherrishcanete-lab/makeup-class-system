const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  pw: { type: String, required: true },
  role: { type: String, enum: ["admin", "faculty", "head", "incharge", "dean"], default: "faculty" },
  campus: { type: String, default: "" },
  dept: { type: String, default: "" }
});
schema.set("toJSON", { transform: (doc, o) => { o.id = o._id.toString(); delete o._id; delete o.__v; delete o.pw; } });
module.exports = mongoose.model("User", schema);
