import { queryRepo } from "./toolNode";
import { GraphState } from "../utils/state";
import { groqModel } from "../utils/llm";

export const searchFiles = async (state: GraphState) => {
  const { prompt, repoUrl } = state;
  if (!repoUrl) throw new Error("repoUrl missing in GraphState");

  console.log(`Running queryRepo for ${repoUrl} with prompt: ${prompt}`);

  const result = await queryRepo(prompt, repoUrl, 10);
  const relevantFiles = result.results.map((r, idx) => ({
    file: r.path,
    content: r.content,
    reason: `Matched embedding similarity for "${prompt}"`,
    relevance: Math.round(((10 - idx) / 10) * 100),
  }));

  const newState = {
    ...state,
    relevantFiles,
    filePaths: relevantFiles.map((r) => r.file),
  };
  console.log("new state", newState);

  return newState;
};

export const readFiles = async (state: GraphState) => {
  const { filePaths, sandbox } = state;
  console.log("in the readiles", filePaths);

  if (!filePaths || filePaths.length === 0) {
    throw new Error("file paths are empty");
  }

  console.log(`📖 Reading ${Math.min(filePaths.length, 10)} files...`);
  const fileContents: Record<string, string> = {};

  for (const filePath of filePaths.slice(0, 10)) {
    try {
      const content = await sandbox.files.read(filePath);
      fileContents[filePath] = content;
    } catch (err) {
      console.error(`⚠️Failed to read ${filePath}:`, err);
    }
  }

  const newState = {
    ...state,
    fileContents,
  };

  return newState;
};

export const analyzeFilesAndPlan = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  const { prompt, fileContents, sandbox, repoPath } = state;

  console.log("Analyzing repository structure...");
  const repoStructure = await sandbox.commands.run(
    `cd "${repoPath}" && find . -type f -not -path "./.git/*" | head -30`
  );

  const existingFiles = repoStructure.stdout
    .split("\n")
    .filter(Boolean)
    .map((f) => f.trim());

  // --- Detect language and framework
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

  // --- Identify the stack
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

  // === CASE 1: No files provided → need to create new files ===
  if (!fileContents || Object.keys(fileContents).length === 0) {
    console.log(
      "No specific files found, asking LLM to plan new file creation..."
    );

    const promptText = `
User request: "${prompt}"

Repository context:
${JSON.stringify(repoContext, null, 2)}

RULES:
1. Match the detected language (Python → .py, Go → .go, etc.)
2. Use 'src/' if it exists
3. Create only minimal necessary files
4. Avoid unrelated tests or config files

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
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");
      const parsed = JSON.parse(cleaned);

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
      console.error("Error parsing LLM response for create plan:", error);

      // fallback: guess extension by stack
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

  // === CASE 2: Files provided → need to plan edits ===
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
1. Prefer editing existing files over creating new ones.
2. Keep language and code style consistent.
3. Make minimal changes to achieve the goal.
4. Return only JSON in this format:
[
  { "file": "src/main.ts", "reason": "...", "action": "edit", "goal": "..." }
]
`;

  console.log("Analyzing existing files to generate change plan...");

  try {
    const response = await groqModel.invoke([
      { role: "user", content: editPrompt },
    ]);
    const cleaned = response.content
      .toString()
      .trim()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "");
    const parsed = JSON.parse(cleaned);

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
    console.error("Error parsing LLM response for edit plan:", error);
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
  const { sandbox, repoPath, changePlan, fileContents, prompt } = state;

  if (!changePlan || changePlan.length === 0) {
    console.log("No change plan available");
    return { error: "No change plan" };
  }

  console.log(`Applying changes to ${changePlan.length} files...`);
  const filesToModify: Array<{ filePath: string; newContent: string }> = [];

  try {
    for (const change of changePlan) {
      console.log(`Processing: ${change.file} (${change.action})`);
      const normalizedFile = change.file.replace(/^\.\//, "");
      const targetPath = `${repoPath}/${normalizedFile}`;

      if (change.action === "create") {
        const dirPath = normalizedFile.split("/").slice(0, -1).join("/");
        if (dirPath) {
          await sandbox.commands.run(`cd "${repoPath}" && mkdir -p ${dirPath}`);
        }

        const completion = await groqModel.invoke(`
        Generate a complete, production-ready file for: ${normalizedFile}

        Goal: ${change.goal}
        User request: ${prompt}

        Requirements:
        - Write complete, working, MINIMAL code
        - Include proper imports and exports
        - Add comments only where necessary
        - Follow best practices for the file type
        - Keep it simple - don't over-engineer
        - Match the style of a ${
          normalizedFile.endsWith(".ts")
            ? "TypeScript"
            : normalizedFile.endsWith(".tsx")
              ? "React TypeScript"
              : "JavaScript"
        } project

          Return ONLY the file content, no explanation or markdown code blocks.
        `);

        const newContent = completion.content
          .toString()
          .trim()
          .replace(/```[a-z]*\n?/g, "")
          .replace(/```\n?/g, "");

        await sandbox.files.write(targetPath, newContent);
        filesToModify.push({ filePath: normalizedFile, newContent });
      } else if (change.action === "edit") {
        let existingContent =
          fileContents?.[change.file] || fileContents?.[normalizedFile] || "";

        if (!existingContent) {
          try {
            existingContent = await sandbox.files.read(targetPath);
          } catch {
            console.log(`Could not read ${normalizedFile}, skipping`);
            continue;
          }
        }

        const completion = await groqModel.invoke(`
You are editing this file: ${normalizedFile}

Current content:
\`\`\`
${existingContent}
\`\`\`

User request: ${prompt}
Change goal: ${change.goal}

Generate the COMPLETE modified file content that fulfills the user's request.
- Keep existing code that doesn't need changes
- Make the specific changes needed
- Maintain proper formatting and style
- Don't add unnecessary complexity

Return ONLY the full file content, no explanation or markdown code blocks.
        `);

        const newContent = completion.content
          .toString()
          .trim()
          .replace(/```[a-z]*\n?/g, "")
          .replace(/```\n?/g, "");

        if (newContent !== existingContent && newContent.length > 10) {
          await sandbox.files.write(targetPath, newContent);
          filesToModify.push({ filePath: normalizedFile, newContent });
        }
      } else if (change.action === "delete") {
        try {
          await sandbox.files.remove(targetPath);
        } catch {
          console.log(`Could not delete ${normalizedFile}`);
        }
      }
    }

    console.log(`Total files modified: ${filesToModify.length}`);
    return {
      applyResult: { success: true },
      filesToModify,
    };
  } catch (e: any) {
    console.error("Error applying changes:", e);
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
  } = state;

  console.log(`Validating changes (attempt ${validationAttempts + 1})...`);

  if (!filesToModify || filesToModify.length === 0) {
    console.log("No files modified, skipping validation");
    return {
      validationSuccess: true,
      validationAttempts: validationAttempts + 1,
    };
  }

  try {
    let cmd = "";
    let success = true;

    // 🟦 JavaScript / TypeScript
    if (
      stack?.includes("React") ||
      stack?.includes("TypeScript") ||
      stack === "Generic"
    ) {
      // Prefer lint if available
      const check = await sandbox.commands.run(
        `cd "${repoPath}" && test -f package.json && cat package.json | grep -q "lint" && echo "yes" || echo "no"`
      );

      if (check.stdout.trim() === "yes") {
        cmd = `cd "${repoPath}" && npm run lint || true`;
      } else {
        // fallback: type check with tsc
        cmd = `cd "${repoPath}" && npx tsc --noEmit || true`;
      }
    }

    // 🟨 Go
    else if (stack === "Go") {
      cmd = `cd "${repoPath}" && go vet ./... && go build ./... || true`;
    }

    // 🟥 Java
    else if (stack === "Java") {
      // try Maven or Gradle build check
      cmd = `cd "${repoPath}" && if [ -f pom.xml ]; then mvn -q validate; elif [ -f build.gradle ]; then gradle -q build; else javac $(find . -name "*.java"); fi || true`;
    }

    // 🟧 Rust
    else if (stack === "Rust") {
      cmd = `cd "${repoPath}" && cargo check || true`;
    }

    // 🟩 Python
    else if (stack === "Python") {
      cmd = `cd "${repoPath}" && python -m py_compile $(find . -name "*.py") || true`;
    }

    // Execute chosen validation command
    if (cmd) {
      console.log("Running validation command:", cmd);
      const result = await sandbox.commands.run(cmd, { timeoutMs: 60000 });
      success = result.exitCode === 0;
    } else {
      console.log("No suitable validator found, skipping.");
    }

    return {
      validationSuccess: success,
      validationAttempts: validationAttempts + 1,
    };
  } catch (error) {
    console.error("Validation error:", error);
    return {
      validationSuccess: false,
      validationAttempts: validationAttempts + 1,
    };
  }
};
