import "dotenv/config";
import { getRunbookCollection } from "./runbooks.js";

async function main() {
    try {
        const collection = await getRunbookCollection();
        const data = await collection.get({
            include: ["metadatas", "documents"] as any
        });
        
        console.log(`\nFound ${data.ids.length} documents in collection 'vigil-runbooks':\n`);
        for (let i = 0; i < data.ids.length; i++) {
            console.log(`--------------------------------------------------------------------------------`);
            console.log(`ID       : ${data.ids[i]}`);
            const meta = data.metadatas[i] as any;
            console.log(`Title    : ${meta?.title}`);
            console.log(`Service  : ${meta?.service_name}`);
            console.log(`Snippet  :\n`);
            // Print the first 5 lines of the document
            const lines = (data.documents[i] || "").split("\n").slice(0, 5).join("\n");
            console.log(lines);
            console.log(`...\n`);
        }
    } catch (error) {
        console.error("Failed to inspect ChromaDB:", error);
    }
}

main();
