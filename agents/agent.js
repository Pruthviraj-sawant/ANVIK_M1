import { getLLMByProvider } from '../utils/llm.js';

export class Agent {
  constructor({
    name,
    description,
    systemPrompt,
    tools = [],
    subAgents = [],
    model,
    temperature = 0.7,
    memory = null,
  }) {
    this.name = name;
    this.description = description;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.subAgents = subAgents;
    this.model = model;
    this.temperature = temperature;
    this.llm = null;
    this.memory = memory;
  }

  async invoke(input, options = {}) {
    if (!this.llm) await this.initAgent();
    console.log(`--- Calling ${this.name} ---`);
    // input is expected to be { messages: [['human', '...'], ...] } or a string
    const messages = Array.isArray(input?.messages)
      ? input.messages
      : [['human', typeof input === 'string' ? input : JSON.stringify(input)]];

    // Build prompt: system + messages
    const promptMessages = [
      ['system', this.systemPrompt],
      ...messages,
    ];

    const resp = await this.llm.invoke({ messages: promptMessages }, options);
    return resp;
  }

  async initAgent() {
    this.llm = await getLLMByProvider(this.model, this.temperature);
  }
}
