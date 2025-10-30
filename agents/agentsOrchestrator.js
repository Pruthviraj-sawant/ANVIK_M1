export class AgentsOrchestrator {
  constructor(mainAgent, agents = []) {
    this.mainAgent = mainAgent;
    this.agents = agents;
    this.agentMapping = new Map(agents.map(agent => [agent.name, agent]));
  }

  async invoke(message, options = {}) {
    const messages = { messages: [['human', message]] };
    const response = await this.mainAgent.invoke(messages, options);
    return response.messages?.[response.messages.length - 1]?.content || 'No response.';
  }

  async *stream(message, options = {}) {
    const messages = { messages: [['human', message]] };
    for await (const chunk of this.mainAgent.stream(messages, options)) {
      yield chunk;
    }
  }

  getAgent(name) {
    return this.agentMapping.get(name);
  }
}
