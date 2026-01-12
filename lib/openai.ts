import OpenAI from 'openai';

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}
