import OpenAI from 'openai';

const nim = new OpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_NIM_API_KEY!,
});

const MODEL = process.env.NIM_MODEL || 'meta/llama-3.1-8b-instruct';

// ─────────────────────────────────────────────
// Intelligent WhatsApp reply
// ─────────────────────────────────────────────
export async function generateWhatsAppReply(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  supplierContext: Record<string, any> | null
): Promise<string> {
  try {
    const systemPrompt = `You are Pramanik's helpful WhatsApp assistant for Indian product suppliers.
You help suppliers list products, submit stage updates, and understand their orders.

Supplier context: ${JSON.stringify(supplierContext || {})}

Rules:
- Reply in the same language the supplier used (Hindi or English)
- Keep replies short — max 3-4 lines for WhatsApp
- Use emojis sparingly but naturally
- Be warm and encouraging — these are small business owners
- Never make up product or price information
- If asked something outside your scope, say: "Please visit pramanik.app or reply HELP for commands"
- For payment questions, always mention both INR and USDC amounts
- Available commands: NEW, STATUS, HELP, RESUBMIT, EARNINGS`;

    const response = await nim.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content || getHelpFallback();
  } catch (error) {
    console.error('NIM API error:', error);
    return getHelpFallback();
  }
}

// ─────────────────────────────────────────────
// Improve product description
// ─────────────────────────────────────────────
export async function improveProductDescription(
  rawDescription: string,
  category: string
): Promise<string> {
  try {
    const response = await nim.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: `Improve this product description for an Indian marketplace.
Category: ${category}
Raw description: ${rawDescription}

Write a better 2-3 sentence description. Be specific, mention quality indicators,
appeal to both Indian and international buyers.
Return only the improved description, nothing else.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 150,
    });

    return response.choices[0]?.message?.content || rawDescription;
  } catch (error) {
    console.error('NIM description improvement error:', error);
    return rawDescription;
  }
}

// ─────────────────────────────────────────────
// Fraud detection on product listing
// ─────────────────────────────────────────────
export async function analyzeProductForFraud(productData: {
  title: string;
  description?: string;
  priceInr: number;
  category: string;
}): Promise<{ riskScore: number; flags: string[]; recommendation: 'approve' | 'review' | 'reject' }> {
  try {
    const response = await nim.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: `Analyze this product listing for potential fraud indicators.
Product: ${JSON.stringify(productData)}

Return JSON only — no extra text:
{ "riskScore": 0-100, "flags": ["flag1"], "recommendation": "approve|review|reject" }`,
        },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const text = response.choices[0]?.message?.content || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (error) {
    return { riskScore: 50, flags: [], recommendation: 'review' };
  }
}

function getHelpFallback(): string {
  return 'Pramanik Commands:\n\nNEW — List a product\nSTATUS — Your listings\nHELP — Show menu\n\nOr visit pramanik.app';
}
