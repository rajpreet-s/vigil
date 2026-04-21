import "dotenv/config";
import { ChromaClient } from "chromadb";

// Singleton HTTP client — connects to the ChromaDB Docker service.
// Persistence is handled by the server (mounted volume), not the client.
// All other chroma modules import this instance; never create a second one.
const rawUrl = process.env.CHROMA_URL ?? "http://localhost:8000";
const parsed = new URL(rawUrl);

export const chroma = new ChromaClient({
    host: parsed.hostname,
    port: parseInt(parsed.port || "8000", 10),
    ssl: parsed.protocol === "https:",
});
