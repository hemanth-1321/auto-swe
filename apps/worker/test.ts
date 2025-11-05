// testSearch.ts
import { searchFiles } from "./workflows/nodes";
import { GraphState } from "./utils/state";
import { queryRepo } from "./workflows/toolNode";
import { indexRepo } from "./controllers/indexRepo";
import { Pool } from "pg";
import { processRepo } from "./controllers/processRepo";

// (async () => {
//   const result = await searchFiles({
//     prompt: "change the sum function to subtraction",
//     repoUrl: "https://github.com/hemanth-1321/test",
//   } as unknown as GraphState);

//   console.log("\n🎯 Done! Results returned to testSearch:");
//   console.dir(result, { depth: null });
// })();

// (async () => {})();

async function main() {
  // const pool = new Pool({ connectionString: process.env.PG_URL });
  // try {
  //   const output = await queryRepo(
  //     "change the sum function to subtraction in ts",
  //     "https://github.com/hemanth-1321/test"
  //   );
  //   console.log(" Final output:", JSON.stringify(output, null, 2));
  // } catch (err) {
  //   console.error("Error:", err);
  // } finally {
  //   await pool.end();
  //   process.exit(0);
  // }

  await processRepo(
    "https://github.com/hemanth-1321/test",
    "add a calculator feature",
    92894229
  );
}
main();
