import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { apiHeaderOperations } from './db';

/**
 * Retrieves applicable headers for a request
 * @param projectId Optional project ID to get project-specific headers
 * @returns Promise resolving to a record of header names and values
 */
export const getApplicableHeaders = async (projectId?: number): Promise<Record<string, string>> => {
  try {
    // Get global headers
    const globalHeaders = await apiHeaderOperations.getGlobalHeaders();

    // Get project-specific headers if projectId is provided
    const projectHeaders = projectId 
      ? await apiHeaderOperations.getProjectHeaders(projectId)
      : [];

    // Combine headers, filtering out disabled ones
    const allHeaders = [...globalHeaders, ...projectHeaders].filter(header => header.enabled);

    // Convert to a record of header names and values
    const headerRecord: Record<string, string> = {};
    allHeaders.forEach(header => {
      headerRecord[header.name] = header.value;
    });

    return headerRecord;
  } catch (error) {
    console.error('Error retrieving headers:', error);
    return {}; // Return empty object on error to allow requests to proceed
  }
};

/**
 * Makes an API request to the specified endpoint
 * @param url The API endpoint URL
 * @param method The HTTP method to use
 * @param headers Optional headers to include in the request
 * @param data Optional data to send with the request (for POST, PUT, PATCH)
 * @param projectId Optional project ID to get project-specific headers
 * @returns Promise resolving to the API response
 */
export const makeApiRequest = async (
  url: string,
  method: string,
  headers: Record<string, string> = {},
  data?: any,
  projectId?: number
): Promise<any> => {
  try {
    // Get applicable headers from the database
    const storedHeaders = await getApplicableHeaders(projectId);

    // Merge headers, with request-specific headers taking precedence
    const mergedHeaders = { ...storedHeaders, ...headers };

    const config: AxiosRequestConfig = {
      url,
      method: method.toLowerCase(),
      headers: mergedHeaders,
      timeout: 10000, // 10 second timeout
    };

    // Add a request body for methods that support it
    if (['post', 'put', 'patch'].includes(method.toLowerCase()) && data) {
      config.data = data;
    }

    console.log("[config]", config)

    const response: AxiosResponse = await axios(config);
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return {
          error: true,
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        };
      } else if (error.request) {
        // The request was made but no response was received
        return {
          error: true,
          message: 'No response received from server',
          request: error.request,
        };
      } else {
        // Something happened in setting up the request
        return {
          error: true,
          message: error.message,
        };
      }
    }

    // Handle non-Axios errors
    return {
      error: true,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};
