import{processRepo} from "./apps/worker/controllers/processRepo"

async function main(  repoUrl: string,
  userPrompt: string,
  installationId: number,
  jobId: string){
await processRepo(repoUrl,userPrompt,installationId,jobId)

}

main("https://github.com/hemanth-1321/test.git","add a calculator feature",97268952,"1")