import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState } from "../utils/state";
import {
  analyzeFilesAndPlan,
  applyChanges,
  readFiles,
  searchFiles,
  validateChanges,
} from "./nodes";
const workflow = new StateGraph(GraphState);

workflow
  .addNode("searchFile", searchFiles)
  .addNode("readFiles", readFiles)
  .addNode("analyze_files", analyzeFilesAndPlan)
  .addNode("apply_changes", applyChanges)
  .addNode("validate_changes", validateChanges)
  .addEdge(START, "searchFile")
  .addEdge("searchFile", "readFiles")
  .addEdge("readFiles", "analyze_files")
  .addEdge("analyze_files", "apply_changes")
  .addEdge("apply_changes", "validate_changes")
  .addEdge("validate_changes", END);

export const codeEditorGraph = workflow.compile();
