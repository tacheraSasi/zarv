import { makeApiRequest } from './apiClient';
import { validateWithZod } from './validator';

export interface SchemaTestResult {
  success: boolean;
  message: string;
  data?: any;
  validationResult?: {
    isValid: boolean;
    errors: Array<{ path: string[]; message: string }>;
  };
  responseStatus?: number;
  responseStatusText?: string;
  responseHeaders?: Record<string, string>;
  error?: any;
}

/**
 * Tests a schema against an API endpoint
 * @param schemaDefinition The Zod schema definition as a string
 * @param endpointUrl The API endpoint URL to test against
 * @param method The HTTP method to use (default: GET)
 * @param headers Optional headers to include in the request
 * @param requestBody Optional request body for POST, PUT, PATCH requests
 * @param zodVersion The version of Zod to use for validation
 * @returns Promise resolving to a test result object
 */
export const testSchema = async (
  schemaDefinition: string,
  endpointUrl: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  requestBody?: any,
  zodVersion: string = '3.24.2'
): Promise<SchemaTestResult> => {
  try {
    // Make the API request
    const apiResponse = await makeApiRequest(endpointUrl, method, headers, requestBody);

    // Check if the request failed
    if (apiResponse.error) {
      return {
        success: false,
        message: `API request failed: ${apiResponse.message || apiResponse.statusText || 'Unknown error'}`,
        responseStatus: apiResponse.status,
        responseStatusText: apiResponse.statusText,
        error: apiResponse,
      };
    }

    // Validate the response against the schema
    const validationResult = validateWithZod(schemaDefinition, apiResponse.data, zodVersion);

    if (validationResult.isValid) {
      return {
        success: true,
        message: 'Schema validation successful',
        data: apiResponse.data,
        validationResult,
        responseStatus: apiResponse.status,
        responseStatusText: apiResponse.statusText,
        responseHeaders: apiResponse.headers,
      };
    } else {
      return {
        success: false,
        message: 'Schema validation failed',
        data: apiResponse.data,
        validationResult,
        responseStatus: apiResponse.status,
        responseStatusText: apiResponse.statusText,
        responseHeaders: apiResponse.headers,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error testing schema: ${error instanceof Error ? error.message : String(error)}`,
      error,
    };
  }
};

/**
 * Tests multiple schemas against their respective endpoints
 * @param schemas Array of schema objects with id, name, schemaDefinition, and endpointUrl
 * @param zodVersion The version of Zod to use for validation
 * @returns Promise resolving to an array of test results with schema IDs
 */
export const testSchemas = async (
  schemas: Array<{
    id?: number;
    name: string;
    schemaDefinition: string;
    endpointUrl?: string;
  }>,
  zodVersion: string = '3.24.2'
): Promise<Array<{ schemaId?: number; schemaName: string; result: SchemaTestResult }>> => {
  const results = [];

  for (const schema of schemas) {
    if (!schema.endpointUrl) {
      results.push({
        schemaId: schema.id,
        schemaName: schema.name,
        result: {
          success: false,
          message: 'No endpoint URL specified for this schema',
        },
      });
      continue;
    }

    try {
      const result = await testSchema(
        schema.schemaDefinition,
        schema.endpointUrl,
        'GET',
        {},
        undefined,
        zodVersion
      );

      results.push({
        schemaId: schema.id,
        schemaName: schema.name,
        result,
      });
    } catch (error) {
      results.push({
        schemaId: schema.id,
        schemaName: schema.name,
        result: {
          success: false,
          message: `Error testing schema: ${error instanceof Error ? error.message : String(error)}`,
          error,
        },
      });
    }
  }

  return results;
};
