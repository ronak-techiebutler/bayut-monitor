import { IncomingWebhook } from "@slack/webhook";
import dotenv from "dotenv";
dotenv.config();

const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);

export const sendDigest = async (digest) => {
  await webhook.send({
    text: `*Bayut Monitoring Digest:*\n${digest}`,
  });
};
