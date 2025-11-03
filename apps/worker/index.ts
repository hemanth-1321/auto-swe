import "dotenv/config";

import { indexRepo } from "./controllers/processRepo";
import { queryRepo } from "./controllers/queryDb";

async function main() {
  await indexRepo("https://github.com/hemanth-1321/a8m");
  //   await queryRepo("add a telegram tool ", "hemanth-1321/test");
}

main();
