import mongoose from "mongoose";

const crawlSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    index: true, // helps in querying latest crawl per URL
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // holds SEO, tech, link info, etc.
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

export default mongoose.model("crawl", crawlSchema);
