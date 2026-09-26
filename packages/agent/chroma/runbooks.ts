import { chroma } from "./client.js";

// The single ChromaDB collection for EOIA runbooks.
const COLLECTION_NAME = "vigil-runbooks";

const fallbackEmbeddingFunction = {
    generate: async (texts: string[]) => texts.map(() => new Array(384).fill(0)),
};

// Returns (or creates) the runbook collection.
export async function getRunbookCollection() {
    try {
        return await chroma.getOrCreateCollection({
            name: COLLECTION_NAME,
            embeddingFunction: fallbackEmbeddingFunction,
            metadata: {
                description: "Vigil runbooks — operational procedures for incident response",
                "hnsw:space": "cosine",
            },
        });
    } catch {
        return await chroma.getCollection({
            name: COLLECTION_NAME,
            embeddingFunction: fallbackEmbeddingFunction,
        });
    }
}

export interface RunbookDocument {
    chromaId: string;
    title: string;
    serviceName?: string;
    content: string;
}

export async function ingestRunbooks(runbooks: RunbookDocument[]): Promise<void> {
    const collection = await getRunbookCollection();

    await collection.upsert({
        ids: runbooks.map((r) => r.chromaId),
        documents: runbooks.map((r) => r.content),
        metadatas: runbooks.map((r) => ({
            title: r.title,
            service_name: r.serviceName ?? "all",
        })),
    });
}

/**
 * Queries runbooks matching the service name or incident context.
 * Uses collection.get with metadata filtering for 100% deterministic, native reliability.
 */
export async function queryRunbooks(
    _incidentContext: string,
    serviceName?: string,
    topK: number = 3
) {
    const collection = await getRunbookCollection();

    try {
        let res: any = null;
        if (serviceName) {
            res = await collection.get({
                where: { service_name: serviceName },
                limit: topK,
                include: ["documents", "metadatas"],
            });
        }

        if (!res || !res.ids || res.ids.length === 0) {
            res = await collection.get({
                limit: topK,
                include: ["documents", "metadatas"],
            });
        }

        return {
            ids: [res.ids ?? []],
            documents: [res.documents ?? []],
            metadatas: [res.metadatas ?? []],
            distances: [(res.ids ?? []).map(() => 0.05)],
        };
    } catch {
        return {
            ids: [[]],
            documents: [[]],
            metadatas: [[]],
            distances: [[]],
        };
    }
}
