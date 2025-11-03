// testSearch.ts
import { searchFiles } from "./workflows/nodes";
import { GraphState } from "./utils/state";
import { queryRepo } from "./workflows/toolNode";
import { indexRepo } from "./controllers/indexRepo";
(async () => {
  const result = await searchFiles({
    prompt: "add a telegram tool ",
    repoUrl: "https://github.com/hemanth-1321/a8m",
  } as unknown as GraphState);

  console.log("✅ Final Output:", result);
})();

// async function main() {
//   //   await indexRepo("https://github.com/hemanth-1321/test");
//   await queryRepo(
//     "change the sum fucntion to substraction in ts",
//     "https://github.com/hemanth-1321/test"
//   );
// }

// main();
