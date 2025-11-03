// testSearch.ts
import { searchFiles } from "./workflows/nodes";
import { GraphState } from "./utils/state";
import { queryRepo } from "./workflows/toolNode";
import { indexRepo } from "./controllers/indexRepo";
(async () => {
  const result = await searchFiles({
    prompt: "change the sum function to subtraction",
    repoUrl: "https://github.com/hemanth-1321/test",
  } as unknown as GraphState);

  console.log("\n🎯 Done! Results returned to testSearch:");
  console.dir(result, { depth: null });
})();

// async function main() {
//   //   await indexRepo("https://github.com/hemanth-1321/test");
//   await queryRepo(
//     "change the sum fucntion to substraction in ts",
//     "https://github.com/hemanth-1321/test"
//   );
// }

// main();
