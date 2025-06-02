import config from "./config.js";
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("DB connected successfully");
    });

    mongoose.connection.on("error", (err) => {
      console.error("DB connection error:", err);
      process.exit(1);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("DB disconnected");
    });

    await mongoose.connect(config.MONGODB_CONNECTION_URL);
  } catch (error) {
    console.error("Failed to connect to database", error);
    process.exit(1);
  }
};

export default connectDB;
