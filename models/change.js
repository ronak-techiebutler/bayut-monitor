import mongoose from "mongoose";

const changeSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  diff: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  fullCurrent: {
    type: mongoose.Schema.Types.Mixed, // holds SEO, tech, link info, etc.
    required: true,
  },
  run_id: {
    type: String,
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("change", changeSchema);
