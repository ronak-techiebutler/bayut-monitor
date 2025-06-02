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
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("change", changeSchema);
