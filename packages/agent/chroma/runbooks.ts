import { chroma } from "./client";
import { Runbook } from "../../shared/types";

// The single ChromaDB collection for EOIA runbooks.
// One collection is enough for MVP — metadata filtering handles per-service queries.
const COLLECTION_NAME = "vigil-runbooks";

// Returns (or creates) the runbook collection.
// Call this at agent startup and cache the result — don't call per-request.
export async function getRunbookCollection() {
    return chroma.getOrCreateCollection({
        name: COLLECTION_NAME,
        metadata: {
            description: "Vigil runbooks — operational procedures for incident response",
            "hnsw:space": "cosine", // cosine similarity is standard for text retrieval
        },
    });
}

// RunbookDocument is the shape of every document we store.
// The 'document' field is the raw Markdown text that gets embedded.
// The 'metadata' fields are queryable without vector search.
export interface RunbookDocument {
    chromaId: string;     // stable ID — also stored in PostgreSQL runbooks.chroma_id
    title: string;
    serviceName?: string; // undefined = applies to all services
    content: string;      // full Markdown text to embed
}

// Ingests one or more runbooks into ChromaDB.
// Call this from the runbook ingestion pipeline (Phase 3).
// The chromaId ties back to the PostgreSQL runbooks table for the management UI.
export async function ingestRunbooks(runbooks: RunbookDocument[]): Promise<void> {
    const collection = await getRunbookCollection();

    await collection.upsert({
        ids: runbooks.map((r) => r.chromaId),
        documents: runbooks.map((r) => r.content),
        metadatas: runbooks.map((r) => ({
            title: r.title,
            // ChromaDB metadata values must be string | number | boolean — not undefined
            service_name: r.serviceName ?? "all",
        })),
    });
}

// Queries the runbook collection for the most relevant documents
// given a natural-language description of the incident context.
// Returns raw ChromaDB results — the rag_node maps these to RunbookMatch objects.
export async function queryRunbooks(
    incidentContext: string,
    serviceName?: string,
    topK: number = 3
) {
    const collection = await getRunbookCollection();

    // Build a where filter if a specific service is requested.
    // "$or" lets us return both service-specific runbooks and catch-all ones.
    const where =
        serviceName
            ? { $or: [{ service_name: serviceName }, { service_name: "all" }] }
            : undefined;

    return collection.query({
        queryTexts: [incidentContext],
        nResults: topK,
        where,
        include: ["documents", "metadatas", "distances"],
    });
}
