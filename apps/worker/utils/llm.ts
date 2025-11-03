// ./utils/llm.ts
import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";

export const groqModel = new ChatGroq({
  model: "openai/gpt-oss-20b",
  apiKey: process.env.GROQ_API_KEY!,
});

export const openaiModel = new ChatOpenAI({
  model: "gpt-5-mini",
  apiKey: process.env.OPENAI_API_KEY!,
});
