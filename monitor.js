import { runMonitor } from "./services/monitorCore.js";
import { parseSitemap } from "./services/parseSitemap.js";

const urls = parseSitemap();
await runMonitor(urls);
