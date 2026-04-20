import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const configureDnsServers = () => {
  const configuredServers = process.env.MONGO_DNS_SERVERS;

  if (configuredServers) {
    const servers = configuredServers
      .split(",")
      .map((server) => server.trim())
      .filter(Boolean);

    if (servers.length > 0) {
      dns.setServers(servers);
      return;
    }
  }

  const currentServers = dns.getServers();
  if (currentServers.length === 1 && currentServers[0] === "127.0.0.1") {
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
  }
};

configureDnsServers();

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined. Check mood-backend/.env.");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (error) {
    if (error?.code === "ECONNREFUSED" && error?.syscall?.startsWith("query")) {
      console.error(
        "MongoDB DNS lookup failed. mongodb+srv requires SRV/TXT DNS access, so check your network, VPN, firewall, or Atlas host resolution."
      );
    }

    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;