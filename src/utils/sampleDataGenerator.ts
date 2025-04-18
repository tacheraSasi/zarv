import { validateWithZod } from './validator';
import axios from 'axios';

// API configuration
const AI_API_CONFIG = {
  // Only using Groq API
  preferredApi: 'groq',
  groq: {
    model: 'llama-3.3-70b-versatile',
    apiToken: "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"
  }
};

/**
 * Interface for sample data generation options
 */
export interface SampleDataOptions {
  count?: number;
  includeNulls?: boolean;
  minArrayLength?: number;
  maxArrayLength?: number;
  minStringLength?: number;
  maxStringLength?: number;
  minNumber?: number;
  maxNumber?: number;
  seed?: string;
}

/**
 * Interface for sample data generation result
 */
export interface SampleDataResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Default options for sample data generation
 */
const DEFAULT_OPTIONS: SampleDataOptions = {
  count: 1,
  includeNulls: false,
  minArrayLength: 1,
  maxArrayLength: 5,
  minStringLength: 3,
  maxStringLength: 10,
  minNumber: 0,
  maxNumber: 100,
  seed: undefined
};

/**
 * Generates sample data based on a Zod schema definition
 * @param schemaDefinition The Zod schema definition as a string
 * @param options Options for sample data generation
 * @returns Promise resolving to a sample data result
 */
export const generateSampleData = async (
  schemaDefinition: string,
  options: SampleDataOptions = {}
): Promise<SampleDataResult> => {
  try {
    // Merge default options with provided options
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    // Extract schema type information
    const schemaInfo = extractSchemaInfo(schemaDefinition);

    // Generate sample data based on schema type
    const sampleData = generateDataFromSchemaInfo(schemaInfo, mergedOptions);

    // Validate the generated data against the schema
    const validationResult = validateWithZod(schemaDefinition, sampleData);

    if (!validationResult.isValid) {
      console.warn('Generated sample data failed validation:', validationResult.errors);
      return {
        success: false,
        error: 'Generated data failed schema validation',
        data: sampleData
      };
    }

    return {
      success: true,
      data: sampleData
    };
  } catch (error) {
    console.error('Error generating sample data:', error);
    return {
      success: false,
      error: `Error generating sample data: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * Extracts schema type information from a schema definition
 */
const extractSchemaInfo = (schemaDefinition: string): any => {
  // This is a simplified implementation
  // In a real implementation, we would parse the schema definition
  // and extract type information for each field

  // For now, we'll use a simple heuristic approach
  const schemaInfo: any = {};

  // Check for common schema patterns
  if (schemaDefinition.includes('z.object(')) {
    schemaInfo.type = 'object';
    schemaInfo.properties = extractObjectProperties(schemaDefinition);
  } else if (schemaDefinition.includes('z.array(')) {
    schemaInfo.type = 'array';
    schemaInfo.items = extractArrayItems(schemaDefinition);
  } else if (schemaDefinition.includes('z.string()')) {
    schemaInfo.type = 'string';
  } else if (schemaDefinition.includes('z.number()')) {
    schemaInfo.type = 'number';
  } else if (schemaDefinition.includes('z.boolean()')) {
    schemaInfo.type = 'boolean';
  } else if (schemaDefinition.includes('z.enum(')) {
    schemaInfo.type = 'enum';
    schemaInfo.values = extractEnumValues(schemaDefinition);
  } else {
    schemaInfo.type = 'unknown';
  }

  return schemaInfo;
};

/**
 * Extracts object properties from a schema definition
 */
const extractObjectProperties = (schemaDefinition: string): any => {
  // This is a simplified implementation
  // In a real implementation, we would parse the schema definition
  // and extract property information for each field

  const properties: any = {};

  // Simple regex to find property definitions
  const propertyRegex = /(\w+):\s*z\.(string|number|boolean|array|object|enum|date|null|undefined|any|unknown)\(/g;
  let match;

  while ((match = propertyRegex.exec(schemaDefinition)) !== null) {
    const [_, propName, propType] = match;
    properties[propName] = { type: propType };
  }

  return properties;
};

/**
 * Extracts array items type from a schema definition
 */
const extractArrayItems = (schemaDefinition: string): any => {
  // This is a simplified implementation
  // In a real implementation, we would parse the schema definition
  // and extract item type information

  if (schemaDefinition.includes('z.string()')) {
    return { type: 'string' };
  } else if (schemaDefinition.includes('z.number()')) {
    return { type: 'number' };
  } else if (schemaDefinition.includes('z.boolean()')) {
    return { type: 'boolean' };
  } else if (schemaDefinition.includes('z.object(')) {
    return {
      type: 'object',
      properties: extractObjectProperties(schemaDefinition)
    };
  } else {
    return { type: 'unknown' };
  }
};

/**
 * Extracts enum values from a schema definition
 */
const extractEnumValues = (schemaDefinition: string): string[] => {
  // This is a simplified implementation
  // In a real implementation, we would parse the schema definition
  // and extract enum values

  const enumRegex = /z\.enum\(\[(.*?)\]\)/;
  const match = enumRegex.exec(schemaDefinition);

  if (match && match[1]) {
    return match[1].split(',').map(val =>
      val.trim().replace(/['"]/g, '')
    );
  }

  return [];
};

/**
 * Generates sample data based on schema type information
 */
const generateDataFromSchemaInfo = (schemaInfo: any, options: SampleDataOptions): any => {
  const { count } = options;

  // If count > 1, return an array of items
  if (count && count > 1) {
    return Array.from({ length: count }, () =>
      generateSingleItem(schemaInfo, options)
    );
  }

  // Otherwise, return a single item
  return generateSingleItem(schemaInfo, options);
};

/**
 * Generates a single sample data item
 */
const generateSingleItem = (schemaInfo: any, options: SampleDataOptions): any => {
  const { type } = schemaInfo;

  switch (type) {
    case 'object':
      return generateObjectData(schemaInfo, options);
    case 'array':
      return generateArrayData(schemaInfo, options);
    case 'string':
      return generateStringData(options);
    case 'number':
      return generateNumberData(options);
    case 'boolean':
      return generateBooleanData();
    case 'enum':
      return generateEnumData(schemaInfo);
    case 'date':
      return generateDateData();
    default:
      return null;
  }
};

/**
 * Generates sample object data
 */
const generateObjectData = (schemaInfo: any, options: SampleDataOptions): any => {
  const { properties } = schemaInfo;
  const result: any = {};

  if (!properties) {
    return {};
  }

  for (const [propName, propInfo] of Object.entries(properties)) {
    result[propName] = generateSingleItem(propInfo, options);
  }

  return result;
};

/**
 * Generates sample array data
 */
const generateArrayData = (schemaInfo: any, options: SampleDataOptions): any[] => {
  const { items } = schemaInfo;
  const { minArrayLength, maxArrayLength } = options;

  if (!items) {
    return [];
  }

  const length = getRandomInt(minArrayLength || 1, maxArrayLength || 5);

  return Array.from({ length }, () =>
    generateSingleItem(items, options)
  );
};

/**
 * Generates sample string data
 */
const generateStringData = (options: SampleDataOptions): string => {
  const { minStringLength, maxStringLength } = options;
  const length = getRandomInt(minStringLength || 3, maxStringLength || 10);

  return generateRandomString(length);
};

/**
 * Generates sample number data
 */
const generateNumberData = (options: SampleDataOptions): number => {
  const { minNumber, maxNumber } = options;
  return getRandomInt(minNumber || 0, maxNumber || 100);
};

/**
 * Generates sample boolean data
 */
const generateBooleanData = (): boolean => {
  return Math.random() > 0.5;
};

/**
 * Generates sample enum data
 */
const generateEnumData = (schemaInfo: any): any => {
  const { values } = schemaInfo;

  if (!values || values.length === 0) {
    return null;
  }

  const randomIndex = getRandomInt(0, values.length - 1);
  return values[randomIndex];
};

/**
 * Generates sample date data
 */
const generateDateData = (): string => {
  const start = new Date(2020, 0, 1);
  const end = new Date();
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

  return randomDate.toISOString();
};

/**
 * Generates a random integer between min and max (inclusive)
 */
const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generates a random string of the specified length
 */
const generateRandomString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
};

// Removed Hugging Face and OpenAI API functions as we're only using Groq

/**
 * Calls the Groq API to generate sample data based on a schema
 */
const callGroqAPI = async (
  schemaDefinition: string,
  options: SampleDataOptions
): Promise<any> => {
  try {
    const { model, apiToken } = AI_API_CONFIG.groq;
    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

    if (!apiToken) {
      throw new Error('Groq API token is required');
    }

    // Create a prompt that explains what we want
    const prompt = `
You are a JSON data generator. Your task is to create valid sample data that conforms to the following schema:

${schemaDefinition}

The sample data should be realistic and match the schema structure.
Respond with ONLY valid JSON, no explanations or other text.
`;

    // Call the Groq API
    const response = await axios.post(
      apiUrl,
      {
        model: model,
        messages: [
          { role: 'system', content: 'You are a JSON data generator that creates valid sample data based on schemas.' },
          { role: 'user', content: prompt }
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
console.log("[response.data]", response.data)
    // Extract the generated text from the response
    if (response.data &&
        response.data.choices &&
        response.data.choices.length > 0 &&
        response.data.choices[0].message &&
        response.data.choices[0].message.content) {

      const generatedText = response.data.choices[0].message.content.trim();

      // Extract JSON from the generated text
      const jsonMatch = generatedText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (!jsonMatch) {
        console.warn('No valid JSON found in the Groq response:', generatedText);
        throw new Error('No valid JSON found in the Groq response');
      }

      // Parse the JSON
      const jsonData = JSON.parse(jsonMatch[0]);
      return jsonData;
    } else {
      throw new Error('Unexpected Groq API response format');
    }
  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw error;
  }
};

/**
 * Generates more realistic sample data using AI
 * This function calls Groq API to generate sample data
 */
export const generateAISampleData = async (
  schemaDefinition: string,
  options: SampleDataOptions = {}
): Promise<SampleDataResult> => {
  try {
    // Merge default options with provided options
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    // Try to generate data using Groq API
    let aiGeneratedData;
    let validationResult;

    try {
      console.log('Generating data using Groq API...');
      aiGeneratedData = await callGroqAPI(schemaDefinition, mergedOptions);

      console.log("[data]", aiGeneratedData);

      // Validate the AI-generated data against the schema
      validationResult = validateWithZod(schemaDefinition, aiGeneratedData);

      if (validationResult.isValid) {
        return {
          success: true,
          data: aiGeneratedData
        };
      } else {
        console.warn('Groq API generated data failed validation:', validationResult.errors);
        throw new Error('Generated data failed schema validation');
      }
    } catch (groqError) {
      console.warn('Error with Groq API data generation:', groqError);
      throw groqError;
    }

    // If Groq API fails, fall back to basic sample data generation with enhancements
    const basicResult = await generateSampleData(schemaDefinition, options);

    if (!basicResult.success) {
      return basicResult;
    }

    // Extract schema info
    const schemaInfo = extractSchemaInfo(schemaDefinition);

    // Enhance the basic data with more realistic values
    const enhancedData = enhanceWithRealisticData(basicResult.data, schemaInfo);

    // Validate the enhanced data against the schema
    validationResult = validateWithZod(schemaDefinition, enhancedData);

    if (!validationResult.isValid) {
      console.warn('Enhanced sample data failed validation:', validationResult.errors);
      // Fall back to the basic data
      return basicResult;
    }

    return {
      success: true,
      data: enhancedData
    };
  } catch (error) {
    console.error('Error generating AI sample data:', error);
    // Fall back to basic sample data generation
    return generateSampleData(schemaDefinition, options);
  }
};

/**
 * Enhances basic sample data with more realistic values
 */
const enhanceWithRealisticData = (data: any, schemaInfo: any): any => {
  // This is a simplified implementation
  // In a real implementation, this would use more sophisticated techniques
  // to generate realistic data based on field names and types

  if (Array.isArray(data)) {
    return data.map(item => enhanceWithRealisticData(item, schemaInfo));
  }

  if (typeof data === 'object' && data !== null) {
    const result: any = {};

    for (const [key, value] of Object.entries(data)) {
      result[key] = enhanceItemBasedOnFieldName(key, value);
    }

    return result;
  }

  return data;
};

/**
 * Enhances a single item based on field name
 */
const enhanceItemBasedOnFieldName = (fieldName: string, value: any): any => {
  // This is where we would apply field-specific enhancements
  // based on common field name patterns

  const fieldNameLower = fieldName.toLowerCase();

  if (typeof value === 'string') {
    if (fieldNameLower.includes('name')) {
      return getRealisticName();
    }

    if (fieldNameLower.includes('email')) {
      return getRealisticEmail();
    }

    if (fieldNameLower.includes('phone')) {
      return getRealisticPhone();
    }

    if (fieldNameLower.includes('address')) {
      return getRealisticAddress();
    }

    if (fieldNameLower.includes('city')) {
      return getRealisticCity();
    }

    if (fieldNameLower.includes('country')) {
      return getRealisticCountry();
    }

    if (fieldNameLower.includes('zip') || fieldNameLower.includes('postal')) {
      return getRealisticZipCode();
    }
  }

  return value;
};

// Helper functions for generating realistic data
const getRealisticName = (): string => {
  const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Robert', 'Jennifer'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson'];

  return `${firstNames[getRandomInt(0, firstNames.length - 1)]} ${lastNames[getRandomInt(0, lastNames.length - 1)]}`;
};

const getRealisticEmail = (): string => {
  const name = getRealisticName().replace(' ', '.').toLowerCase();
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com', 'company.com'];

  return `${name}@${domains[getRandomInt(0, domains.length - 1)]}`;
};

const getRealisticPhone = (): string => {
  return `(${getRandomInt(100, 999)}) ${getRandomInt(100, 999)}-${getRandomInt(1000, 9999)}`;
};

const getRealisticAddress = (): string => {
  const streetNumbers = getRandomInt(1, 9999);
  const streetNames = ['Main St', 'Oak Ave', 'Maple Rd', 'Washington Blvd', 'Park Lane'];

  return `${streetNumbers} ${streetNames[getRandomInt(0, streetNames.length - 1)]}`;
};

const getRealisticCity = (): string => {
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
  return cities[getRandomInt(0, cities.length - 1)];
};

const getRealisticCountry = (): string => {
  const countries = ['USA', 'Canada', 'UK', 'Australia', 'Germany', 'France', 'Japan', 'Brazil'];
  return countries[getRandomInt(0, countries.length - 1)];
};

const getRealisticZipCode = (): string => {
  return `${getRandomInt(10000, 99999)}`;
};
