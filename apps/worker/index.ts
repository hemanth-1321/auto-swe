import "dotenv/config";

import { indexRepo } from "./controllers/processRepo";
import { queryRepo } from "./controllers/queryDb";

async function main() {
  await indexRepo("https://github.com/hemanth-1321/test");
  //   await queryRepo("change sum function to addtion ", "hemanth-1321/test");
}

main();
