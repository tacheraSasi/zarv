import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Makes an API request to the specified endpoint
 * @param url The API endpoint URL
 * @param method The HTTP method to use
 * @param headers Optional headers to include in the request
 * @param data Optional data to send with the request (for POST, PUT, PATCH)
 * @returns Promise resolving to the API response
 */
export const makeApiRequest = async (
  url: string,
  method: string,
  headers: Record<string, string> = {},
  data?: any
): Promise<any> => {
  try {
    const config: AxiosRequestConfig = {
      url,
      method: method.toLowerCase(),
      headers,
      timeout: 10000, // 10 second timeout
    };

    // Add request body for methods that support it
    if (['post', 'put', 'patch'].includes(method.toLowerCase()) && data) {
      config.data = data;
    }

    const response: AxiosResponse = await axios(config);
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle Axios errors
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
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
