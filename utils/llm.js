import OpenAI from 'openai';
// Minimal adapter to provide an LLM-like interface used by agent init
export async function getLLMByProvider(model, temperature = 0.7) {
  if (!model) model = process.env.DEFAULT_LLM_MODEL || 'openai/gpt-4o-mini';
  if (model.startsWith('openai/')) {
    const modelName = model.split('/')[1] || model.replace('openai/','');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // Return an object with invoke and stream used by createReactAgent in this project.
    return {
      invoke: async ({ messages }) => {
        // convert messages to OpenAI chat format
        const converted = messages.map(([role, content]) => {
          return { role: role === 'human' ? 'user' : role, content: content };
        });
        const res = await client.chat.completions.create({
          model: modelName,
          messages: converted,
          temperature,
        });
        return { messages: [{ role: 'ai', content: res.choices[0].message.content }] };
      },
      // simple stream stub (not implemented)
      stream: async function* (args) {
        const r = await this.invoke(args);
        yield r;
      }
    };
  }

  throw new Error('Unsupported provider: ' + model);
}
