import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import pkg from "pg";

const { Pool } = pkg;

export const queryRepo = async (prompt: string, repoName: string, topK = 5) => {
  console.log(`🔍 Querying repository "${repoName}" for:`, prompt);

  if (!process.env.HF_TOKEN) {
    throw new Error("Missing HuggingFace token (HF_TOKEN)");
  }
  if (!process.env.PG_URL) {
    throw new Error("Missing Postgres connection (PG_URL)");
  }

  const pool = new Pool({ connectionString: process.env.PG_URL });

  try {
    const embeddings = new HuggingFaceInferenceEmbeddings({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      apiKey: process.env.HF_TOKEN,
    });

    const vectorstore = await PGVectorStore.initialize(embeddings, {
      pool,
      tableName: "repo_vector",
    });

    console.time("⏱️ Search time");
    const results = await vectorstore.similaritySearch(prompt, 30);
    console.timeEnd("⏱️ Search time");

    // Filter only the current repo’s docs
    const filtered = results
      .filter((doc) => doc.metadata.repo === repoName)
      .slice(0, topK);

    console.log(`✅ Found ${filtered.length} results for repo: ${repoName}`);
    for (const [i, doc] of filtered.entries()) {
      console.log(`\n📄 Result #${i + 1}`);
      console.log("Path:", doc.metadata.path);
      console.log("Repo:", doc.metadata.repo);
      console.log("Meta:", doc.pageContent);
    }

    return filtered;
  } catch (err) {
    console.error("❌ Error during query:", err);
  } finally {
    await pool.end();
  }
};

// Example usage:
await queryRepo("change sum function to addition", "hemanth-1321/test");
