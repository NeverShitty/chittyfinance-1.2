import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateFinancialAdvice = async (
  userContext: string,
  financialData: any
): Promise<string> => {
  try {
    const prompt = `You are an expert CFO and financial advisor. Based on the following financial data and context, provide specific, actionable financial advice:

User Context: ${userContext}

Financial Data: ${JSON.stringify(financialData, null, 2)}

Please provide:
1. Key insights about their financial position
2. Specific recommendations for improvement
3. Potential risks to watch out for
4. Next steps they should take

Keep the response concise but comprehensive, around 3-4 paragraphs.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are ChittyFinance AI, an expert CFO assistant that provides clear, actionable financial advice for small businesses and individuals. Your advice should be practical, specific, and focused on improving financial health.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || 'Unable to generate advice at this time.';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate financial advice');
  }
};

export const analyzeTransaction = async (description: string, amount: number): Promise<{
  category: string;
  confidence: number;
  reasoning: string;
}> => {
  try {
    const prompt = `Analyze this financial transaction and categorize it:

Transaction: ${description}
Amount: $${amount}

Please categorize this transaction and provide your reasoning. Choose from these categories:
- Office Supplies
- Software/SaaS
- Marketing/Advertising
- Travel/Transportation
- Meals/Entertainment
- Equipment/Hardware
- Professional Services
- Utilities
- Insurance
- Rent/Facilities
- Other Expenses
- Revenue/Income

Respond with JSON format:
{
  "category": "category_name",
  "confidence": 0.95,
  "reasoning": "brief explanation"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a financial transaction categorization expert. Analyze transactions and categorize them accurately.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(response);
  } catch (error) {
    console.error('Transaction analysis error:', error);
    return {
      category: 'Other Expenses',
      confidence: 0.5,
      reasoning: 'Unable to analyze transaction automatically',
    };
  }
};

export default openai;