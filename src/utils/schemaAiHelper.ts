import axios, {AxiosError} from 'axios';

// API configuration - reusing the same config from sampleDataGenerator
const AI_API_CONFIG = {
    preferredApi: 'groq',
    groq: {
        model: 'llama-3.3-70b-versatile',
        apiToken: "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"
    }
};

// Retry configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    initialDelayMs: 1000, // 1 second
    maxDelayMs: 10000, // 10 seconds
};

/**
 * Helper function to implement exponential backoff retry logic
 * @param operation Function to retry
 * @param isRetryable Function to determine if error is retryable
 * @param options Retry options
 * @returns Promise with the operation result
 */
async function withRetry<T>(
    operation: () => Promise<T>,
    isRetryable: (error: any) => boolean = () => true,
    options: {
        maxRetries?: number;
        initialDelayMs?: number;
        maxDelayMs?: number;
        onRetry?: (error: any, retryCount: number, delayMs: number) => void;
    } = {}
): Promise<T> {
    const maxRetries = options.maxRetries ?? RETRY_CONFIG.maxRetries;
    const initialDelayMs = options.initialDelayMs ?? RETRY_CONFIG.initialDelayMs;
    const maxDelayMs = options.maxDelayMs ?? RETRY_CONFIG.maxDelayMs;

    let lastError: any;

    for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            // If we've used all retries or the error isn't retryable, throw
            if (retryCount >= maxRetries || !isRetryable(error)) {
                throw error;
            }

            // Calculate delay with exponential backoff (2^retryCount * initialDelayMs)
            // Add some jitter to avoid all clients retrying at the same time
            const jitter = Math.random() * 0.3 + 0.85; // Random between 0.85 and 1.15
            const delayMs = Math.min(
                Math.pow(2, retryCount) * initialDelayMs * jitter,
                maxDelayMs
            );

            // Call onRetry callback if provided
            if (options.onRetry) {
                options.onRetry(error, retryCount + 1, delayMs);
            }

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    // This should never happen due to the throw in the loop, but TypeScript needs it
    throw lastError;
}

/**
 * Interface for AI suggestion result
 */
export interface AiSuggestionResult {
    success: boolean;
    suggestions?: string;
    error?: string;
    isStreaming?: boolean;
    retryCount?: number;
}

/**
 * Determines if an error is retryable
 * @param error The error to check
 * @returns True if the error is retryable, false otherwise
 */
function isRetryableError(error: any): boolean {
    // Rate limiting errors (429) are retryable
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 429) {
            return true;
        }

        // Network errors are retryable
        if (!axiosError.response && axiosError.code === 'ECONNABORTED') {
            return true;
        }

        // Server errors (5xx) might be temporary and retryable
        if (axiosError.response?.status && axiosError.response.status >= 500 && axiosError.response.status < 600) {
            return true;
        }
    }

    // Other errors are not retryable by default
    return false;
}

/**
 * Type for streaming callback function
 */
export type StreamingCallback = (partialResponse: string) => void;

/**
 * Generates AI suggestions for schema validation errors
 * @param schemaDefinition The Zod schema definition as a string
 * @param validationErrors The validation errors from the schema validation
 * @param data The data that failed validation
 * @param onStream Optional callback function for streaming responses
 * @returns Promise resolving to an AI suggestion result
 */
export const generateAiSuggestions = async (
    schemaDefinition: string,
    validationErrors: Array<{ path: string[]; message: string }>,
    data: any,
    onStream?: StreamingCallback
): Promise<AiSuggestionResult> => {
    // Format the validation errors for the prompt
    const formattedErrors = validationErrors.map(error =>
        `Path: ${error.path.length > 0 ? error.path.join('.') : 'root'}, Error: ${error.message}`
    ).join('\n');

    // Create a prompt that explains what we want
    const prompt = `
You are a schema validation expert. I have a Zod schema and some data that failed validation against this schema.
Please analyze the errors and provide detailed, user-friendly explanations on how to fix the data to make it valid according to the schema.

Schema definition:
${schemaDefinition}

Data that failed validation:
${JSON.stringify(data, null, 2)}

Validation errors:
${formattedErrors}

Please provide:
1. A clear, concise summary of what's wrong with the data
2. Detailed explanations for each validation error, using simple language that non-technical users can understand
3. Specific examples of how to fix each issue, showing both the incorrect data and the corrected version
4. If applicable, explain any patterns or common mistakes that might be causing multiple errors
5. Format your response using markdown for better readability (use headings, lists, code blocks, etc.)

Focus on being helpful and educational, explaining not just what to fix but why the schema requires certain formats or values.
`;

    let retryCount = 0;

    try {
        const {model, apiToken} = AI_API_CONFIG.groq;
        const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

        if (!apiToken) {
            throw new Error('Groq API token is required');
        }

        // Check if streaming is requested
        if (onStream) {
            // Create a function to handle streaming with retries
            const makeStreamingRequest = async (): Promise<AiSuggestionResult> => {
                // Use streaming API with retry logic
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
                        max_tokens: 2000,
                        stream: true
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiToken}`
                        },
                        timeout: 60000, // 60 seconds timeout for streaming
                        responseType: 'text'
                    }
                );

                return new Promise((resolve, reject) => {
                    let fullResponse = '';

                    try {
                        // For browser environments, we need to use a different approach
                        // Process the text response as a stream of SSE events
                        const processChunk = (text: string) => {
                            const lines = text.split('\n').filter(line => line.trim() !== '');

                            for (const line of lines) {
                                if (line.includes('[DONE]')) continue;
                                if (line.startsWith('data:')) {
                                    try {
                                        const data = JSON.parse(line.substring(5));
                                        if (data.choices && data.choices.length > 0) {
                                            const content = data.choices[0].delta?.content || '';
                                            if (content) {
                                                fullResponse += content;
                                                onStream(fullResponse);
                                            }
                                        }
                                    } catch (e) {
                                        console.error('Error parsing streaming response:', e);
                                        // Continue processing despite the error
                                    }
                                }
                            }
                        };

                        // Process the entire response as a single chunk
                        processChunk(response.data);

                        resolve({
                            success: true,
                            suggestions: fullResponse,
                            isStreaming: true,
                            retryCount
                        });
                    } catch (err) {
                        console.error('Error processing streaming response:', err);
                        reject(err);
                    }
                });
            };

            // Use withRetry to handle retries for streaming
            return await withRetry(
                makeStreamingRequest,
                isRetryableError,
                {
                    onRetry: (error, retry, delayMs) => {
                        retryCount = retry;
                        console.log(`Retrying streaming request after ${delayMs}ms (attempt ${retry}/${RETRY_CONFIG.maxRetries})`);
                        // Inform the user about the retry
                        if (onStream) {
                            onStream(`\n\n_Encountered a rate limit. Retrying in ${Math.round(delayMs / 1000)} seconds... (attempt ${retry}/${RETRY_CONFIG.maxRetries})_\n\n`);
                        }
                    }
                }
            );
        } else {
            // Create a function to handle non-streaming with retries
            const makeNonStreamingRequest = async (): Promise<AiSuggestionResult> => {
                // Use non-streaming API
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
                        suggestions,
                        retryCount
                    };
                } else {
                    throw new Error('Unexpected Groq API response format');
                }
            };

            // Use withRetry to handle retries for non-streaming
            return await withRetry(
                makeNonStreamingRequest,
                isRetryableError,
                {
                    onRetry: (error, retry, delayMs) => {
                        retryCount = retry;
                        console.log(`Retrying non-streaming request after ${delayMs}ms (attempt ${retry}/${RETRY_CONFIG.maxRetries})`);
                    }
                }
            );
        }
    } catch (error) {
        console.error('Error generating AI suggestions:', error);

        // Provide more specific error messages for common errors
        let errorMessage = `Error generating AI suggestions: ${error instanceof Error ? error.message : String(error)}`;

        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            if (axiosError.response?.status === 429) {
                errorMessage = "Rate limit exceeded. The AI service is currently busy. Please try again in a few moments.";
            } else if (axiosError.code === 'ECONNABORTED') {
                errorMessage = "Request timed out. The AI service is taking too long to respond. Please try again.";
            } else if (axiosError.response?.status && axiosError.response.status >= 500) {
                errorMessage = "The AI service is experiencing issues. Please try again later.";
            }
        }

        return {
            success: false,
            error: errorMessage,
            retryCount
        };
    }
};
