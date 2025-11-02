import { Sandbox } from "@e2b/code-interpreter";
import { Document } from "@langchain/core/documents";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import pkg from "pg";
import { encode } from "@byjohann/toon";
import fs from "fs";
import "dotenv/config";

const { Pool } = pkg;

export const indexRepo = async (repourl: string) => {
  console.log("E2b", process.env.E2B_API_KEY);

  const baseDir = "/home/user/project";
  const repoName = repourl.split("/").pop()!.replace(".git", "");
  const cloneDir = `${baseDir}/${repoName}`;
  const repoFullName = repourl
    .replace("https://github.com/", "")
    .replace(".git", "");

  const sandbox = await Sandbox.create({
    apiKey: process.env.E2B_API_KEY,
    timeoutMs: 30 * 60 * 1000,
  });

  const pool = new Pool({
    connectionString: process.env.PG_URL,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on("error", (err) => {
    console.error("💥 Postgres pool error:", err);
  });

  try {
    console.log("🧠 Testing PG connection...");
    const test = await pool.query("SELECT NOW()");
    console.log("✅ DB connected at", test.rows[0].now);

    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS repo_index_state (
        repo_name TEXT PRIMARY KEY,
        last_commit TEXT NOT NULL,
        last_indexed_at TIMESTAMP DEFAULT NOW(),
        total_files INTEGER DEFAULT 0
      )
    `);

    // Fetch previous commit
    const { rows } = await pool.query(
      "SELECT last_commit FROM repo_index_state WHERE repo_name = $1",
      [repoName]
    );
    const hasIndex = rows.length > 0;
    let previousCommit = hasIndex ? rows[0].last_commit : null;

    // Fresh clone
    await sandbox.commands.run(`rm -rf ${baseDir} && mkdir -p ${baseDir}`);
    await sandbox.commands.run(`git clone ${repourl} ${cloneDir}`);

    const latestCommitResult = await sandbox.commands.run(
      `cd ${cloneDir} && git rev-parse HEAD`
    );
    const latestCommit = latestCommitResult.stdout.trim();

    if (previousCommit && latestCommit === previousCommit) {
      console.log("✅ Repo already up to date, skipping reindex.");
      return;
    }

    const embeddings = new HuggingFaceInferenceEmbeddings({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      apiKey: process.env.HF_TOKEN,
    });

    const vectorstore = await PGVectorStore.initialize(embeddings, {
      pool,
      tableName: "repo_vector",
    });

    const docs: Document[] = [];
    const summaries: any[] = [];

    if (!hasIndex) {
      console.log("🚀 No previous index → full indexing...");
      const filesOutput = await sandbox.commands.run(
        `find ${cloneDir} -type f`
      );
      const files = filesOutput.stdout
        .split("\n")
        .filter(
          (f) =>
            f &&
            [".py", ".ts", ".js", ".go", ".java"].some((ext) => f.endsWith(ext))
        );

      for (const path of files) {
        try {
          const content = await sandbox.files.read(path);
          const docMeta = extractMeta(path, content);
          summaries.push(docMeta);
          docs.push(
            new Document({
              pageContent: JSON.stringify(docMeta),
              metadata: { path, repo: repoFullName },
            })
          );
        } catch {
          console.warn(`⚠️ Skipping unreadable file: ${path}`);
        }
      }
    } else {
      console.log(
        `🔄 Incremental update from ${previousCommit} → ${latestCommit}`
      );
      const diffResult = await sandbox.commands.run(
        `cd ${cloneDir} && git diff --name-status ${previousCommit} ${latestCommit}`
      );
      const changedFiles = diffResult.stdout
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [status, file] = line.split("\t");
          return { status, file };
        })
        .filter(({ file }) =>
          [".py", ".ts", ".js", ".go", ".java"].some((ext) =>
            file?.endsWith(ext)
          )
        );

      for (const { status, file } of changedFiles) {
        if (status === "D") {
          await pool.query(
            `DELETE FROM repo_vector WHERE metadata->>'path' = $1 AND metadata->>'repo' = $2`,
            [`${cloneDir}/${file}`, repoFullName]
          );
          continue;
        }
        try {
          const content = await sandbox.files.read(`${cloneDir}/${file}`);
          const docMeta = extractMeta(file!, content);
          summaries.push(docMeta);
          docs.push(
            new Document({
              pageContent: JSON.stringify(docMeta),
              metadata: { path: file, repo: repoFullName },
            })
          );
        } catch {
          console.warn(`⚠️ Could not read changed file: ${file}`);
        }
      }
    }

    if (docs.length > 0) {
      await vectorstore.addDocuments(docs);
      console.log(`📚 Indexed ${docs.length} documents`);
    }

    const encoded = encode(summaries);
    fs.writeFileSync(`./docs_summary_${repoName}.toon`, encoded);

    await pool.query(
      `INSERT INTO repo_index_state (repo_name, last_commit, last_indexed_at, total_files)
       VALUES ($1, $2, NOW(), $3)
       ON CONFLICT (repo_name)
       DO UPDATE SET last_commit = EXCLUDED.last_commit, last_indexed_at = NOW()`,
      [repoName, latestCommit, docs.length]
    );

    console.log(`✅ Repo ${repoName} updated to commit ${latestCommit}`);
  } catch (err) {
    console.error("💥 Error during indexing:", err);
  } finally {
    try {
      console.log("🧹 Cleaning up...");
      await pool.end();
      await sandbox.kill();
      console.log("✅ Clean shutdown complete.");
    } catch (err) {
      console.error("💥 Error during cleanup:", err);
    }
  }
};

function extractMeta(path: string, content: string) {
  const functionRegex =
    /\b(?:function|def)\s+([A-Za-z_]\w*)|([A-Za-z_]\w*)\s*=\s*\(.*?\)\s*=>/g;
  const classRegex = /\bclass\s+([A-Za-z_]\w*)/g;
  const importRegex =
    /\bimport\s+(?:\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]|([A-Za-z0-9_.*]+)\s*(?:from\s+['"]([^'"]+)['"])?|['"]([^'"]+)['"])\s*;?|\bfrom\s+([A-Za-z0-9_.]+)\s+import\s+([A-Za-z0-9_.*]+)/g;

  const functions: string[] = [];
  const classes: string[] = [];
  const imports: string[] = [];

  let match;
  while ((match = functionRegex.exec(content))) {
    const name = match[1] || match[2];
    if (name && !functions.includes(name)) functions.push(name);
  }
  while ((match = classRegex.exec(content))) {
    if (match[1] && !classes.includes(match[1])) classes.push(match[1]);
  }
  while ((match = importRegex.exec(content))) {
    const candidates = [
      match[1],
      match[2],
      match[3],
      match[4],
      match[5],
      match[6],
      match[7],
    ];
    for (const c of candidates) {
      if (c && !imports.includes(c.trim())) imports.push(c.trim());
    }
  }
  return { path, functions, classes, imports };
}
