import mongoose from "mongoose";

const crawlSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  data: mongoose.Schema.Types.Mixed,
});

export default mongoose.model("crawl", crawlSchema);
