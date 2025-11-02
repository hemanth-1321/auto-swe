import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
export interface LLMResponse {
  content: string;
}

export class openAI {
  private client: ChatOpenAI;

  constructor() {
    this.client = new ChatOpenAI({
      model: "gpt-5-mini",
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  async invoke(prompt: string): Promise<LLMResponse> {
    const res = await this.client.invoke(prompt);
    return { content: res.content.toString() };
  }
}

export class groqllm {
  private client: ChatGroq;
  constructor() {
    this.client = new ChatGroq({
      model: "openai/gpt-oss-20b",
      apiKey: process.env.GROK_API_KEY!,
    });
  }
  async invoke(prompt: string): Promise<LLMResponse> {
    const res = await this.client.invoke(prompt);
    return { content: res.content.toString() };
  }
}

export const chatgroq = new groqllm();

chatgroq.invoke("what is ai");

export const openai = new openAI();
