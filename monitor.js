import { runMonitor } from "./services/monitorCore";
import { parseSitemap } from "./services/parseSitemap";

const urls = parseSitemap();
await runMonitor(urls);
