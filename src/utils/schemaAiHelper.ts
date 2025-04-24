import axios from 'axios';

// API configuration - reusing the same config from sampleDataGenerator
const AI_API_CONFIG = {
    preferredApi: 'groq',
    groq: {
        model: 'llama-3.3-70b-versatile',
        apiToken: "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"
    }
};

/**
 * Interface for AI suggestion result
 */
export interface AiSuggestionResult {
    success: boolean;
    suggestions?: string;
    error?: string;
}

/**
 * Generates AI suggestions for schema validation errors
 * @param schemaDefinition The Zod schema definition as a string
 * @param validationErrors The validation errors from the schema validation
 * @param data The data that failed validation
 * @returns Promise resolving to an AI suggestion result
 */
export const generateAiSuggestions = async (
    schemaDefinition: string,
    validationErrors: Array<{ path: string[]; message: string }>,
    data: any
): Promise<AiSuggestionResult> => {
    try {
        const {model, apiToken} = AI_API_CONFIG.groq;
        const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

        if (!apiToken) {
            throw new Error('Groq API token is required');
        }

        // Format the validation errors for the prompt
        const formattedErrors = validationErrors.map(error =>
            `Path: ${error.path.length > 0 ? error.path.join('.') : 'root'}, Error: ${error.message}`
        ).join('\n');

        // Create a prompt that explains what we want
        const prompt = `
You are a schema validation expert. I have a Zod schema and some data that failed validation against this schema.
Please analyze the errors and provide suggestions on how to fix the data to make it valid according to the schema.

Schema definition:
${schemaDefinition}

Data that failed validation:
${JSON.stringify(data, null, 2)}

Validation errors:
${formattedErrors}

Please provide a clear explanation of what's wrong with the data and how to fix it to match the schema requirements.
Focus on explaining which portions of the data are not aligned with the schema and suggest specific changes to make the data valid.
`;

        // Call the Groq API
        const response = await axios.post(
            apiUrl,
            {
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful schema validation expert that provides clear explanations and suggestions.'
                    },
                    {role: 'user', content: prompt}
                ],
                temperature: 0.7,
                max_tokens: 2000
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiToken}`
                },
                timeout: 30000 // 30 seconds timeout
            }
        );

        // Extract the generated text from the response
        if (response.data &&
            response.data.choices &&
            response.data.choices.length > 0 &&
            response.data.choices[0].message &&
            response.data.choices[0].message.content) {

            const suggestions = response.data.choices[0].message.content.trim();

            return {
                success: true,
                suggestions
            };
        } else {
            throw new Error('Unexpected Groq API response format');
        }
    } catch (error) {
        console.error('Error generating AI suggestions:', error);
        return {
            success: false,
            error: `Error generating AI suggestions: ${error instanceof Error ? error.message : String(error)}`
        };
    }
};
