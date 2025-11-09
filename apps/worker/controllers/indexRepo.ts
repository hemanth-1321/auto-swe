import { Sandbox } from "@e2b/code-interpreter";
import { Document } from "@langchain/core/documents";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { encode } from "@byjohann/toon";
import "dotenv/config";
import { pool } from "../utils/vectordb";
import { publishUpdate } from "@repo/redis/client";

export const indexRepo = async (repourl: string, jobId: string) => {
  const baseDir = "/home/user/project";
  const repoName = repourl.split("/").pop()!.replace(".git", "");

  const cloneDir = `${baseDir}/${repoName}`;
  const repoFullName = repourl
    .replace("https://github.com/", "")
    .replace(".git", "");

  await publishUpdate(jobId, {
    stage: "init",
    message: "Preparing sandbox environment...",
  });

  const sandbox = await Sandbox.create({
    apiKey: process.env.E2B_API_KEY,
    timeoutMs: 30 * 60 * 1000,
  });

  pool.on("error", (err) => {
    console.log("Postgres pool error:", err);
  });

  try {
    await publishUpdate(jobId, {
      stage: "setup",
      message: "Setting up database tables...",
    });

    await pool.query(
      ` CREATE TABLE IF NOT EXISTS repo_index_state (
        repo_name TEXT PRIMARY KEY,
        last_commit TEXT NOT NULL,
        last_indexed_at TIMESTAMP DEFAULT NOW(),
        total_files INTEGER DEFAULT 0
    )`
    );

    const { rows } = await pool.query(
      `SELECT last_commit FROM repo_index_state WHERE repo_name = $1`,
      [repoName]
    );

    const hasIndex = rows.length > 0;
    let previousCommit = hasIndex ? rows[0].last_commit : null;

    await publishUpdate(jobId, {
      stage: "cloning",
      message: `Cloning repository ${repoFullName}...`,
    });

    await sandbox.commands.run(`rm -rf ${baseDir} && mkdir -p ${baseDir}`);
    await sandbox.commands.run(`git clone ${repourl} ${cloneDir}`);

    const latestCommitResult = await sandbox.commands.run(
      `cd ${cloneDir} && git rev-parse HEAD`
    );
    const latestCommit = latestCommitResult.stdout.trim();

    if (previousCommit && latestCommit === previousCommit) {
      await publishUpdate(jobId, {
        stage: "complete",
        message: "Repository already up to date, skipping reindex.",
      });
      console.log(" Repo already up to date, skipping reindex.");
      return;
    }

    await publishUpdate(jobId, {
      stage: "embedding",
      message: "Initializing embeddings model...",
    });

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
      await publishUpdate(jobId, {
        stage: "indexing",
        message: "No previous index found. Starting full indexing...",
      });

      console.log("no previous index, indexing");
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

      await publishUpdate(jobId, {
        stage: "indexing",
        message: `Found ${files.length} files to index...`,
      });

      let processedFiles = 0;
      for (const path of files) {
        try {
          const content = await sandbox.files.read(path);
          const docMeta = extractMeta(path, content);
          summaries.push(docMeta);
          docs.push(
            new Document({
              pageContent: JSON.stringify(docMeta),
              metadata: {
                path,
                repo: repoFullName,
              },
            })
          );
          processedFiles++;

          // Update progress every 10 files
          if (processedFiles % 10 === 0) {
            await publishUpdate(jobId, {
              stage: "indexing",
              message: `Processing files... ${processedFiles}/${files.length}`,
            });
          }
        } catch (error) {
          console.warn(` Skipping unreadable file: ${path}`);
        }
      }
    } else {
      await publishUpdate(jobId, {
        stage: "updating",
        message: `Incremental update from ${previousCommit.substring(0, 7)} → ${latestCommit.substring(0, 7)}...`,
      });

      console.log(
        `Incremental update from ${previousCommit} → ${latestCommit}`
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

      await publishUpdate(jobId, {
        stage: "updating",
        message: `Found ${changedFiles.length} changed files...`,
      });

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
        } catch (error) {
          console.warn(`Could not read changed file: ${file}`);
        }
      }
    }

    if (docs.length > 0) {
      await publishUpdate(jobId, {
        stage: "vectorizing",
        message: `Adding ${docs.length} documents to vector store...`,
      });

      await vectorstore.addDocuments(docs);
      console.log(`Indexed ${docs.length} documents`);
    }

    await publishUpdate(jobId, {
      stage: "saving",
      message: "Saving repository summary...",
    });

    const encoded = encode(summaries);
    // fs.writeFileSync(`./docs_summary_${repoName}.toon`, encoded);

    await pool.query(
      `INSERT INTO repo_index_state (repo_name, last_commit, last_indexed_at, total_files)
       VALUES ($1, $2, NOW(), $3)
       ON CONFLICT (repo_name)
       DO UPDATE SET last_commit = EXCLUDED.last_commit, last_indexed_at = NOW()`,
      [repoName, latestCommit, docs.length]
    );

    await publishUpdate(jobId, {
      stage: "complete",
      message: `Repository ${repoName} indexed successfully! (${docs.length} files)`,
    });

    console.log(` Repo ${repoName} updated to commit ${latestCommit}`);
  } catch (error) {
    console.error(" Error during indexing:", error);

    await publishUpdate(jobId, {
      stage: "error",
      message: ` Error during indexing: ${error instanceof Error ? error.message : String(error)}`,
    });

    throw error;
  } finally {
    await publishUpdate(jobId, {
      stage: "cleanup",
      message: "Cleaning up resources...",
    });

    const shutdown = async () => {
      console.log("cleaning up");
      try {
        await sandbox.kill();
        console.log("sandbox killed");
      } catch (error) {
        console.log("error killing the sandbox", error);
      }
    };

    const timeout = new Promise((resolve) =>
      setTimeout(() => {
        console.log("Cleanup timeout reached");
        resolve("timeout");
      }, 3000)
    );

    await Promise.race([shutdown(), timeout]);

    console.log(" Cleanup complete");
    // Removed process.exit(0) - let the function return normally
    // so queryRepo can continue execution
  }
};

function extractMeta(path: string, content: string) {
  const functionRegex =
    /\b(?:async\s+)?(?:function|def|func)\s+([A-Za-z_]\w*)|\b([A-Za-z_]\w*)\s*=\s*(?:async\s*)?\(.*?\)\s*=>|\b([A-Za-z_]\w*)\s*\([^)]*\)\s*(?:{|\:)/g;

  const classRegex =
    /\b(?:export\s+)?class\s+([A-Za-z_]\w*)|\btype\s+([A-Za-z_]\w*)\s+struct/g;

  const importRegex =
    /\bimport\s+(?:\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]|([A-Za-z0-9_.*]+)\s*(?:from\s+['"]([^'"]+)['"])?|['"]([^'"]+)['"]|\([^)]+\)|([A-Za-z0-9_./]+))\s*;?|\bfrom\s+([A-Za-z0-9_.]+)\s+import\s+([A-Za-z0-9_.*]+)/g;

  const functions: string[] = [];
  const classes: string[] = [];
  const imports: string[] = [];

  let match;

  while ((match = functionRegex.exec(content))) {
    const name = match[1] || match[2] || match[3];
    if (name && !functions.includes(name)) functions.push(name);
  }

  while ((match = classRegex.exec(content))) {
    const name = match[1] || match[2];
    if (name && !classes.includes(name)) classes.push(name);
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
      match[8],
    ];
    for (const c of candidates) {
      if (c && !imports.includes(c.trim())) imports.push(c.trim());
    }
  }

  return { path, functions, classes, imports };
}
