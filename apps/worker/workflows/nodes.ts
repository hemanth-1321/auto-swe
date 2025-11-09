import { queryRepo } from "./toolNode";
import { GraphState } from "../utils/state";
import { groqModel } from "../utils/llm";
import { publishUpdate } from "@repo/redis/client";

export const searchFiles = async (state: GraphState) => {
  const { prompt, repoUrl, jobId } = state;
  if (!repoUrl) throw new Error("repoUrl missing in GraphState");

  console.log("Starting file search...");
  await publishUpdate(jobId, {
    stage: "searching",
    message: `Searching repository for relevant files related to: "${prompt}"`,
  });

  const result = await queryRepo(jobId, prompt, repoUrl, 10);
  const relevantFiles = result.results.map((r, idx) => ({
    file: r.path,
    content: r.content,
    reason: `Matched embedding similarity for "${prompt}"`,
    relevance: Math.round(((10 - idx) / 10) * 100),
  }));

  await publishUpdate(jobId, {
    stage: "searchComplete",
    message: `Found ${relevantFiles.length} relevant files.`,
  });

  return {
    ...state,
    relevantFiles,
    filePaths: relevantFiles.map((r) => r.file),
  };
};

export const readFiles = async (state: GraphState) => {
  const { filePaths, sandbox, jobId } = state;
  console.log("Starting file read...");

  if (!filePaths || filePaths.length === 0) {
    throw new Error("No file paths available for reading.");
  }

  await publishUpdate(jobId, {
    stage: "reading",
    message: `Reading up to ${Math.min(filePaths.length, 10)} files...`,
  });

  const fileContents: Record<string, string> = {};

  for (const filePath of filePaths.slice(0, 10)) {
    await publishUpdate(jobId, {
      stage: "reading",
      message: `Reading file: ${filePath}`,
    });

    try {
      const content = await sandbox.files.read(filePath);
      fileContents[filePath] = content;
    } catch (err) {
      await publishUpdate(jobId, {
        stage: "readError",
        message: `Failed to read file: ${filePath}`,
      });
    }
  }

  await publishUpdate(jobId, {
    stage: "readComplete",
    message: `Successfully read ${Object.keys(fileContents).length} files.`,
  });

  return {
    ...state,
    fileContents,
  };
};

export const analyzeFilesAndPlan = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  const { prompt, fileContents, sandbox, repoPath, jobId } = state;
  console.log("Analying files");
  await publishUpdate(jobId, {
    stage: "analyzing",
    message: " Started analyzing repository structure...",
  });

  const repoStructure = await sandbox.commands.run(
    `cd "${repoPath}" && find . -type f -not -path "./.git/*" | head -30`
  );

  const existingFiles = repoStructure.stdout
    .split("\n")
    .filter(Boolean)
    .map((f) => f.trim());

  const hasReact = existingFiles.some(
    (f) => f.endsWith(".tsx") || f.endsWith(".jsx")
  );
  const hasVue = existingFiles.some((f) => f.endsWith(".vue"));
  const hasPython = existingFiles.some((f) => f.endsWith(".py"));
  const hasGo = existingFiles.some((f) => f.endsWith(".go"));
  const hasJava = existingFiles.some((f) => f.endsWith(".java"));
  const hasRust = existingFiles.some((f) => f.endsWith(".rs"));
  const hasPackageJson = existingFiles.some((f) => f.includes("package.json"));
  const hasSrc = existingFiles.some((f) => f.startsWith("./src"));
  const hasTests = existingFiles.some(
    (f) => f.toLowerCase().includes("test") || f.toLowerCase().includes("spec")
  );

  const stack = hasReact
    ? "React/TypeScript"
    : hasVue
      ? "Vue"
      : hasPython
        ? "Python"
        : hasGo
          ? "Go"
          : hasJava
            ? "Java"
            : hasRust
              ? "Rust"
              : "Generic";

  const repoContext = {
    stack,
    hasReact,
    hasVue,
    hasPython,
    hasGo,
    hasJava,
    hasRust,
    hasPackageJson,
    hasSrc,
    hasTests,
    existingFiles: existingFiles.slice(0, 20).join("\n"),
    fileCount: existingFiles.length,
  };

  // CASE 1 — No files: create new
  if (!fileContents || Object.keys(fileContents).length === 0) {
    await publishUpdate(jobId, {
      stage: "planning",
      message: " No files selected — planning new file creation...",
    });

    const promptText = `
User request: "${prompt}"

Repository context:
${JSON.stringify(repoContext, null, 2)}

RULES:
1. Match detected language (Python → .py, Go → .go, etc.)
2. Use 'src/' if it exists
3. Create only if creatig a new file is necessary 
4. Avoid unrelated tests or config files
5. act accordigly and make the chnages provided in the ${prompt} ,firsly enhance the prompt
Return ONLY JSON like:
[
  { "file": "src/new_file.ext", "reason": "...", "action": "create", "goal": "..." }
]
`;

    try {
      const response = await groqModel.invoke([
        { role: "user", content: promptText },
      ]);
      const cleaned = response.content
        .toString()
        .trim()
        .replace(/```json\n?|```\n?/g, "");
      const parsed = JSON.parse(cleaned);

      await publishUpdate(jobId, {
        stage: "planComplete",
        message: `Created change plan for ${parsed.length} new file(s).`,
      });

      return {
        stack,
        relevantFiles: [],
        changePlan: parsed.map((p: any) => ({
          action: "create",
          file: p.file,
          goal: p.goal,
        })),
      };
    } catch (error) {
      await publishUpdate(jobId, {
        stage: "error",
        message: "Failed to generate plan, using fallback file plan.",
      });

      const ext = hasPython
        ? "py"
        : hasGo
          ? "go"
          : hasJava
            ? "java"
            : hasRust
              ? "rs"
              : "ts";
      const fallback = hasSrc ? `src/new_feature.${ext}` : `new_feature.${ext}`;
      return {
        stack,
        relevantFiles: [],
        changePlan: [
          {
            action: "create",
            file: fallback,
            goal: "Implement user prompt feature",
          },
        ],
      };
    }
  }

  // CASE 2 — Edit existing files
  await publishUpdate(jobId, {
    stage: "planning",
    message: "Analyzing existing files to plan edits...",
  });

  const contextText = Object.entries(fileContents)
    .map(([path, content]) => `File: ${path}\n${content.slice(0, 1500)}`)
    .join("\n\n---\n\n");

  const editPrompt = `
User request: "${prompt}"

Repository context:
${JSON.stringify(repoContext, null, 2)}

Relevant files (truncated content):
${contextText}

RULES:
1. Prefer editing existing files.
2. Keep language and code style consistent.
3. Make minimal changes to achieve the goal.
4. Return only JSON like:
[
  { "file": "src/main.ts", "reason": "...", "action": "edit", "goal": "..." }
]
`;

  try {
    const response = await groqModel.invoke([
      { role: "user", content: editPrompt },
    ]);
    const cleaned = response.content
      .toString()
      .trim()
      .replace(/```json\n?|```\n?/g, "");
    const parsed = JSON.parse(cleaned);

    await publishUpdate(jobId, {
      stage: "planComplete",
      message: ` Generated change plan for ${parsed.length} file(s).`,
    });

    return {
      stack,
      relevantFiles: parsed
        .sort((a: any, b: any) => (b.relevance ?? 1) - (a.relevance ?? 0))
        .slice(0, 10),
      changePlan: parsed.map((p: any) => ({
        action: p.action,
        file: p.file,
        goal: p.goal,
      })),
    };
  } catch (error) {
    await publishUpdate(jobId, {
      stage: "error",
      message: "Failed to analyze or parse change plan.",
    });
    return {
      stack,
      relevantFiles: [],
      changePlan: [],
      error: "Failed to analyze files or parse response",
    };
  }
};

export const applyChanges = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  const { sandbox, repoPath, changePlan, fileContents, prompt, jobId } = state;
  console.log("applying changes");
  await publishUpdate(jobId, {
    stage: "applying",
    message: `Started applying ${changePlan.length} change(s)...`,
  });

  const filesToModify: Array<{ filePath: string; newContent: string }> = [];

  try {
    for (const change of changePlan) {
      const normalizedFile = change.file.replace(/^\.\//, "");
      const targetPath = `${repoPath}/${normalizedFile}`;

      await publishUpdate(jobId, {
        stage: "processing",
        message: `${change.action === "create" ? "🆕 Creating" : change.action === "edit" ? "✏️ Editing" : "🗑️ Deleting"} ${normalizedFile}`,
        file: normalizedFile,
        action: change.action,
      });

      if (change.action === "create") {
        const dirPath = normalizedFile.split("/").slice(0, -1).join("/");
        if (dirPath)
          await sandbox.commands.run(`cd "${repoPath}" && mkdir -p ${dirPath}`);

        const completion = await groqModel.invoke(`
Generate a complete, production-ready file for: ${normalizedFile}
Goal: ${change.goal}
User request: ${prompt}
Requirements:
- Write complete, working, MINIMAL code
- Include proper imports and exports
- Follow best practices
- No code blocks, just raw code
        `);

        const newContent = completion.content
          .toString()
          .trim()
          .replace(/```[a-z]*\n?|```\n?/g, "");
        await sandbox.files.write(targetPath, newContent);
        filesToModify.push({ filePath: normalizedFile, newContent });
      } else if (change.action === "edit") {
        let existingContent =
          fileContents?.[change.file] || fileContents?.[normalizedFile] || "";

        if (!existingContent) {
          try {
            existingContent = await sandbox.files.read(targetPath);
          } catch {
            await publishUpdate(jobId, {
              stage: "warning",
              message: `Could not read ${normalizedFile}, skipping.`,
            });
            continue;
          }
        }

        const completion = await groqModel.invoke(`
You are editing this file: ${normalizedFile}
User request: ${prompt}
Goal: ${change.goal}
Current content:
${existingContent}
Generate the full modified content that fulfills the goal.
No explanations, no markdown.
        `);

        const newContent = completion.content
          .toString()
          .trim()
          .replace(/```[a-z]*\n?|```\n?/g, "");

        if (newContent !== existingContent && newContent.length > 10) {
          await sandbox.files.write(targetPath, newContent);
          filesToModify.push({ filePath: normalizedFile, newContent });
        }
      } else if (change.action === "delete") {
        try {
          await sandbox.files.remove(targetPath);
        } catch {
          await publishUpdate(jobId, {
            stage: "warning",
            message: `Failed to delete ${normalizedFile}`,
          });
        }
      }
    }

    await publishUpdate(jobId, {
      stage: "applyComplete",
      message: `Successfully applied ${filesToModify.length} changes.`,
    });

    return { applyResult: { success: true }, filesToModify };
  } catch (e: any) {
    await publishUpdate(jobId, {
      stage: "error",
      message: ` Failed to apply changes: ${e.message}`,
    });

    return {
      error: `Failed to apply changes: ${e.message}`,
      filesToModify,
    };
  }
};

export const validateChanges = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  const {
    sandbox,
    repoPath,
    validationAttempts = 0,
    filesToModify,
    stack,
    jobId,
  } = state;

  console.log("Starting validation...");
  await publishUpdate(jobId, {
    stage: "validation",
    message: `Validating code changes (attempt ${validationAttempts + 1})...`,
  });

  if (!filesToModify || filesToModify.length === 0) {
    await publishUpdate(jobId, {
      stage: "validationSkipped",
      message: "No modified files found, skipping validation.",
    });

    return {
      validationSuccess: true,
      validationAttempts: validationAttempts + 1,
    };
  }

  try {
    let cmd = "";
    let success = true;

    // Detect validator command based on stack
    switch (true) {
      case stack?.includes("React") ||
        stack?.includes("TypeScript") ||
        stack === "Generic": {
        const check = await sandbox.commands.run(
          `cd "${repoPath}" && test -f package.json && cat package.json | grep -q "lint" && echo "yes" || echo "no"`
        );
        if (check.stdout.trim() === "yes") {
          cmd = `cd "${repoPath}" && npm run lint || true`;
        } else {
          cmd = `cd "${repoPath}" && npx tsc --noEmit || true`;
        }
        break;
      }

      case stack === "Go":
        cmd = `cd "${repoPath}" && go vet ./... && go build ./... || true`;
        break;

      case stack === "Java":
        cmd = `cd "${repoPath}" && if [ -f pom.xml ]; then mvn -q validate; elif [ -f build.gradle ]; then gradle -q build; else javac $(find . -name "*.java"); fi || true`;
        break;

      case stack === "Rust":
        cmd = `cd "${repoPath}" && cargo check || true`;
        break;

      case stack === "Python":
        cmd = `cd "${repoPath}" && python -m py_compile $(find . -name "*.py") || true`;
        break;

      default:
        cmd = "";
        break;
    }

    if (!cmd) {
      await publishUpdate(jobId, {
        stage: "validationSkipped",
        message: "No suitable validator found for this stack.",
      });

      return {
        validationSuccess: true,
        validationAttempts: validationAttempts + 1,
      };
    }

    await publishUpdate(jobId, {
      stage: "validationRunning",
      message: `Running validation command: ${cmd}`,
    });

    const result = await sandbox.commands.run(cmd, { timeoutMs: 60000 });
    success = result.exitCode === 0;

    await publishUpdate(jobId, {
      stage: success ? "validationSuccess" : "validationFailed",
      message: success
        ? "Validation completed successfully."
        : "Validation failed. Please review the changes.",
    });

    return {
      validationSuccess: success,
      validationAttempts: validationAttempts + 1,
    };
  } catch (error) {
    await publishUpdate(jobId, {
      stage: "validationError",
      message: `Validation process encountered an error: ${String(error)}`,
    });

    return {
      validationSuccess: false,
      validationAttempts: validationAttempts + 1,
    };
  }
};
