import dotenv from "dotenv";
dotenv.config();

const config = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  ALLOW_ORIGIN: process.env.ALLOW_ORIGIN,
  MONGODB_CONNECTION_URL: process.env.MONGODB_CONNECTION_URL,
};

export default config;
