import { useState } from 'react';
import SchemaInput from './components/SchemaInput';
import ApiEndpointInput from './components/ApiEndpointInput';
import AuthorizationInput from './components/AuthorizationInput';
import ResponseDisplay from './components/ResponseDisplay';
import { makeApiRequest } from './utils/apiClient';
import { validateWithZod } from './utils/validator';

function AppContent() {
  const [schema, setSchema] = useState<string>('');
  const [zodVersion, setZodVersion] = useState<string>('3.24.2'); // Default to latest version
  const [endpoint, setEndpoint] = useState<string>('');
  const [method, setMethod] = useState<string>('GET');
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [requestBody, setRequestBody] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<any>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Array<{ path: string[]; message: string }>>([]);

  const handleSchemaChange = (newSchema: string) => {
    setSchema(newSchema);
  };

  const handleZodVersionChange = (newVersion: string) => {
    setZodVersion(newVersion);
  };

  const handleEndpointChange = (newEndpoint: string) => {
    setEndpoint(newEndpoint);
  };

  const handleMethodChange = (newMethod: string) => {
    setMethod(newMethod);
  };

  const handleHeadersChange = (newHeaders: Record<string, string>) => {
    setHeaders(newHeaders);
  };

  const handleRequestBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRequestBody(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!endpoint) {
      alert('Please enter an API endpoint');
      return;
    }

    setLoading(true);
    setResponse(null);
    setIsValid(null);
    setErrors([]);

    try {
      // Parse request body if provided and method supports it
      let parsedBody = undefined;
      if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody) {
        try {
          parsedBody = JSON.parse(requestBody);
        } catch (error) {
          alert('Invalid JSON in request body');
          setLoading(false);
          return;
        }
      }

      // Make the API request
      const apiResponse = await makeApiRequest(endpoint, method, headers, parsedBody);
      setResponse(apiResponse);

      // Validate the response if schema is provided
      if (schema && apiResponse.data) {
        const validationResult = validateWithZod(schema, apiResponse.data, zodVersion);
        setIsValid(validationResult.isValid);
        setErrors(validationResult.errors);
      }
    } catch (error) {
      console.error('Error making API request:', error);
      setResponse({
        error: true,
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Zod API Response Validator</h1>
          <p className="mt-2 text-gray-600">
            Validate API responses against Zod schemas
          </p>
        </header>

        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <SchemaInput
                  onSchemaChange={handleSchemaChange}
                  onZodVersionChange={handleZodVersionChange}
                />

                {['POST', 'PUT', 'PATCH'].includes(method) && (
                  <div className="mb-6">
                    <label htmlFor="requestBody" className="block text-sm font-medium text-gray-700 mb-2">
                      Request Body (JSON)
                    </label>
                    <textarea
                      id="requestBody"
                      name="requestBody"
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder={'{ "key": "value" }'}
                      value={requestBody}
                      onChange={handleRequestBodyChange}
                    />
                  </div>
                )}
              </div>

              <div>
                <ApiEndpointInput
                  onEndpointChange={handleEndpointChange}
                  onMethodChange={handleMethodChange}
                />
                <AuthorizationInput onHeadersChange={handleHeadersChange} />

                <div className="mt-6">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={loading}
                  >
                    {loading ? 'Validating...' : 'Validate API Response'}
                  </button>
                </div>
              </div>
            </div>
          </form>

          <ResponseDisplay
            loading={loading}
            response={response}
            isValid={isValid}
            errors={errors}
            zodVersion={zodVersion}
          />
        </div>

        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>Zod API Response Validator (ZARV) - A tool for backend developers by <a className="text-blue-500" href="https://github.com/Bonny-kato">Kato Ui</a> + <a className="text-blue-500" href="https://www.jetbrains.com/junie/">Junie</a></p>
        </footer>
      </div>
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;
