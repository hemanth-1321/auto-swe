import { groqModel } from "./llm";

export async function generateCommitMessage(userPrompt: string) {
  const prompt = `
Create a concise, conventional-style Git commit message based on this instruction:
"${userPrompt}"

Examples:
- fix: correct math calculation in utils
- feat: add input validation to user form
- refactor: simplify loop logic
- docs: update README with setup steps
  `;
  const { content } = await groqModel.invoke(prompt);
  return `AI: ${content.toString().trim().split("\n")[0]}`;
}
