import app from "./app.js";
import { prisma } from "./lib/prisma.js";

const PORT = 5000;

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