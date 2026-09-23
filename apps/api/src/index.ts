import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const PORT = Number.parseInt(env.PORT, 10);

async function checkDB() {
  try {
    await prisma.$connect();
    console.log("✅ Database Connected Successfully");
  } catch (error) {
    console.error("❌ Database Connection Failed");
    console.error(error);
    process.exit(1);
  }
}

async function startServer() {
  await checkDB();

  app.listen(PORT, () => {
    console.log(`🚀 AI Career Agent API is running on port ${PORT}...`);
  });
}

startServer();