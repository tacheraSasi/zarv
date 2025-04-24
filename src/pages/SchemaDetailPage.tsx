import React, {useEffect, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import Layout from '../components/Layout';
import {useAuth} from '../contexts/AuthContext';
import {
  Project,
  projectOperations,
  projectUserOperations,
  Schema,
  schemaOperations,
  SchemaVersion,
  User
} from '../utils/db';
import SchemaEditor from '../components/SchemaEditor';
import SchemaActions from '../components/SchemaActions';
import SampleDataGenerator from '../components/SampleDataGenerator';
import {SchemaTestResult, testSchema} from '../utils/schemaTestService';
import {AiSuggestionResult, generateAiSuggestions} from '../utils/schemaAiHelper';
import ReactMarkdown from 'react-markdown';

const SchemaDetailPage: React.FC = () => {
  const { projectId, schemaId } = useParams<{ projectId: string; schemaId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [schema, setSchema] = useState<Schema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState<SchemaTestResult | null>(null);
  const [isTestingSchema, setIsTestingSchema] = useState(false);
  const [creator, setCreator] = useState<User | null>(null);
  const [schemaVersions, setSchemaVersions] = useState<SchemaVersion[]>([]);
  const [requestBody, setRequestBody] = useState<string>('');
    const [aiSuggestion, setAiSuggestion] = useState<AiSuggestionResult | null>(null);
    const [isGeneratingAiSuggestion, setIsGeneratingAiSuggestion] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Load project and schema on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!projectId || !schemaId || !currentUser?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Load project
        const projectData = await projectOperations.getById(parseInt(projectId));

        if (!projectData) {
          setError('Project not found');
          setIsLoading(false);
          return;
        }

        // Verify that the user has access to the project
        const hasAccess = await projectUserOperations.isUserInProject(parseInt(projectId), currentUser.id);
        if (!hasAccess) {
          setError('You do not have permission to access this project');
          setIsLoading(false);
          return;
        }

        setProject(projectData);

        // Load schema
        const schemaData = await schemaOperations.getById(parseInt(schemaId));

        if (!schemaData) {
          setError('Schema not found');
          setIsLoading(false);
          return;
        }

        // Verify that the schema belongs to the current project
        if (schemaData.projectId !== parseInt(projectId)) {
          setError('Schema does not belong to this project');
          setIsLoading(false);
          return;
        }

        setSchema(schemaData);

        // Set request body from schema if it exists
        if (schemaData.lastRequestBody) {
          setRequestBody(schemaData.lastRequestBody);
        }

        // Load schema creator
        const creatorData = await schemaOperations.getCreator(parseInt(schemaId));
        setCreator(creatorData || null);

        // Load schema versions
        const versionsData = await schemaOperations.getVersions(parseInt(schemaId));
        setSchemaVersions(versionsData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId, schemaId, currentUser]);

  const handleDeleteSchema = async () => {
    if (!schema?.id) {
      setError('Schema not found');
      return;
    }

    if (!currentUser?.id) {
      setError('You must be logged in to delete a schema');
      return;
    }

    if (!confirm('Are you sure you want to delete this schema? This action cannot be undone.')) {
      return;
    }

    try {
      // Pass the current user ID to record the deletion in version history
      await schemaOperations.delete(schema.id, currentUser.id);
      // Navigate back to project details
      navigate(`/projects/${projectId}`);
    } catch (err) {
      console.error('Error deleting schema:', err);
      setError('Failed to delete schema');
    }
  };

  const handleDuplicateSchema = async () => {
    if (!schema || !projectId) {
      setError('Schema not found');
      return;
    }

    if (!currentUser?.id) {
      setError('You must be logged in to duplicate a schema');
      return;
    }

    try {
      // Create a new schema with the same definition but a different name
      const duplicateName = `${schema.name} (Copy)`;
      const newSchemaId = await schemaOperations.create(
        parseInt(projectId),
        duplicateName,
        schema.schemaDefinition,
        schema.description,
        schema.endpointUrl,
        currentUser.id // Pass the current user ID as the creator
      );

      // Navigate to the new schema
      navigate(`/projects/${projectId}/schemas/${newSchemaId}`);
    } catch (err) {
      console.error('Error duplicating schema:', err);
      setError('Failed to duplicate schema');
    }
  };

    const handleGenerateAiSuggestions = async () => {
        if (!schema || !testResult || !testResult.validationResult || !testResult.data) {
            return;
        }

        setIsGeneratingAiSuggestion(true);
        setAiSuggestion(null);

        try {
            const result = await generateAiSuggestions(
                schema.schemaDefinition,
                testResult.validationResult.errors,
                testResult.data
            );

            setAiSuggestion(result);
        } catch (err) {
            console.error('Error generating AI suggestions:', err);
            setAiSuggestion({
                success: false,
                error: `Failed to generate AI suggestions: ${err instanceof Error ? err.message : String(err)}`
            });
        } finally {
            setIsGeneratingAiSuggestion(false);
        }
    };

  const handleTestSchema = async () => {
    if (!schema?.endpointUrl) {
      setTestResult({
        success: false,
        message: 'No endpoint URL specified for this schema'
      });
      return;
    }

    setIsTestingSchema(true);
    setTestResult(null);

    try {
      // Parse request body for methods that support it
      let parsedBody;
      if (schema.httpMethod && ['POST', 'PUT', 'PATCH'].includes(schema.httpMethod) && requestBody.trim()) {
        try {
          parsedBody = JSON.parse(requestBody);
        } catch (parseError) {
          setTestResult({
            success: false,
            message: `Invalid JSON in request body: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          });
          setIsTestingSchema(false);
          return;
        }
      }

      // Use the schema testing service to test the schema
      const result = await testSchema(
        schema.schemaDefinition,
        schema.endpointUrl,
        schema.httpMethod || 'GET', // Use schema's HTTP method
        {}, // No headers by default
        parsedBody, // Use parsed request body if available
        '3.24.2', // Use the latest Zod version
        schema.projectId // Pass the project ID for project-specific headers
      );

      setTestResult(result);

      // Save the request body to the schema if it's not empty and the schema supports it
        if (schema.id && currentUser?.id && schema.httpMethod &&
            ['POST', 'PUT', 'PATCH'].includes(schema.httpMethod) &&
          requestBody.trim()) {
        try {
          await schemaOperations.update(schema.id, {
            lastRequestBody: requestBody
          }, currentUser.id);

          // Update the local schema state
          setSchema({
            ...schema,
            lastRequestBody: requestBody
          });
        } catch (updateError) {
          console.error('Error saving request body:', updateError);
          // Don't show an error to the user, just log it
        }
      }
    } catch (err) {
      console.error('Error testing schema:', err);
      setTestResult({
        success: false,
        message: `Error testing schema: ${err instanceof Error ? err.message : String(err)}`
      });
    } finally {
      setIsTestingSchema(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">Loading schema details...</p>
        </div>
      </Layout>
    );
  }

  if (error && !schema) {
    return (
      <Layout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <div className="mt-4">
          <Link
            to={`/projects/${projectId}`}
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Back to Project
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div className="mb-6">
          <Link
              to={schema?.resource ? `/projects/${projectId}/resources/${encodeURIComponent(schema.resource)}` : `/projects/${projectId}`}
            className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {schema?.resource ? `Back to ${schema.resource} Resource` : 'Back to Project'}
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {schema && (
          <>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden mb-8">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center mb-2">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mr-2">
                        {schema.name}
                      </h1>
                      {schema.httpMethod && (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          schema.httpMethod === 'GET' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          schema.httpMethod === 'POST' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          schema.httpMethod === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          schema.httpMethod === 'PATCH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          schema.httpMethod === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {schema.httpMethod}
                        </span>
                      )}
                    </div>
                    {schema.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {schema.description}
                      </p>
                    )}
                    <div className="text-sm text-gray-500 dark:text-gray-500">
                      <p>Created: {formatDate(schema.createdAt)}{creator && ` by ${creator.name}`}</p>
                      <p>Last updated: {formatDate(schema.updatedAt)}</p>
                      {schemaVersions.length > 0 && (
                        <Link
                          to={`/projects/${projectId}/schemas/${schemaId}/versions`}
                          className="mt-2 text-indigo-600 dark:text-indigo-400 hover:underline flex items-center text-sm"
                        >
                          View Version History ({schemaVersions.length})
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Link
                        to={`/projects/${projectId}/schemas/${schemaId}/edit${schema.resource ? `?resource=${encodeURIComponent(schema.resource)}` : ''}`}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={handleDeleteSchema}
                      className="px-3 py-1 border border-red-300 dark:border-red-600 rounded-md text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {schema.endpointUrl && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Endpoint URL
                    </h3>
                    <p className="text-gray-900 dark:text-white font-mono break-all">
                      {schema.endpointUrl}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Schema Definition
                    </h3>
                    <SchemaEditor
                      value={schema.schemaDefinition}
                      readOnly={true}
                      height="350px"
                    />
                    <div className="mt-2">
                      {schema.endpointUrl && (
                        <div className="mb-4">
                          <div className="flex flex-col space-y-2">
                            {schema.httpMethod && ['POST', 'PUT', 'PATCH'].includes(schema.httpMethod) && (
                              <div>
                                <label htmlFor="requestBody" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Request Body (JSON)
                                </label>
                                <textarea
                                  id="requestBody"
                                  value={requestBody}
                                  onChange={(e) => setRequestBody(e.target.value)}
                                  rows={5}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                                  placeholder='{\n  "key": "value"\n}'
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <SchemaActions
                        schemaDefinition={schema.schemaDefinition}
                        schemaName={schema.name}
                        onDuplicate={handleDuplicateSchema}
                        onRunSchema={schema.endpointUrl ? handleTestSchema : undefined}
                        readOnly={true}
                      />
                      {!schema.endpointUrl && (
                        <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                          Add an endpoint URL to enable schema testing
                        </p>
                      )}
                      {isTestingSchema && (
                        <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                          Testing schema...
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <SampleDataGenerator
                      schemaDefinition={schema.schemaDefinition}
                      schemaName={schema.name}
                      autoGenerate={true}
                    />
                  </div>
                </div>

                {testResult && (
                    <div
                        className={`mt-4 p-4 rounded-md ${testResult.success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'}`}>
                    <div className="flex items-center mb-2">
                      {testResult.success ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className="font-medium">{testResult.message}</span>
                    </div>

                    {testResult.responseStatus && (
                      <div className="text-sm mt-2">
                        <p><span className="font-semibold">Status:</span> {testResult.responseStatus} {testResult.responseStatusText}</p>
                      </div>
                    )}

                    {testResult.validationResult && !testResult.validationResult.isValid && testResult.validationResult.errors.length > 0 && (
                      <div className="mt-3">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-lg">Validation Errors</h4>
                              <button
                                  onClick={handleGenerateAiSuggestions}
                                  disabled={isGeneratingAiSuggestion}
                                  className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 flex items-center"
                              >
                                {isGeneratingAiSuggestion ? (
                                    <>
                                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                           xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                                strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor"
                                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Generating...
                                    </>
                                ) : (
                                    <>
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor"
                                           viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                              d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                      </svg>
                                      Explain with AI
                                    </>
                                )}
                              </button>
                          </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-1">
                            <div
                                className="bg-red-50/70 dark:bg-red-900/10 border border-red-100 dark:border-red-800/50 rounded-md p-4">
                              <div className="max-h-60 overflow-y-auto pr-2">
                                <ul className="list-disc pl-5 space-y-2 text-sm">
                                  {testResult.validationResult.errors.map((error, index) => (
                                      <li key={index}
                                          className="pb-2 border-b border-red-50 dark:border-red-800/30 last:border-0">
                                        <span className="font-medium text-red-600/80 dark:text-red-300/90">
                                          {error.path.length > 0 ? error.path.join('.') : 'root'}:
                                        </span>
                                        <span className="text-red-500/90 dark:text-red-400/80">{error.message}</span>
                                      </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>

                          {aiSuggestion ? (
                              <div className="md:col-span-1">
                                <div
                                    className={`p-4 rounded-md ${aiSuggestion.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                                  <h4 className="font-semibold mb-2 flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" fill="none"
                                         stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                                    </svg>
                                    AI Suggestions
                                  </h4>
                                  {aiSuggestion.success ? (
                                      <div
                                          className="text-sm prose dark:prose-invert max-w-none max-h-80 overflow-y-auto bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                                        <ReactMarkdown>
                                          {aiSuggestion.suggestions}
                                        </ReactMarkdown>
                                      </div>
                                  ) : (
                                      <div
                                          className="text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/10 rounded">
                                        <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        {aiSuggestion.error}
                                      </div>
                                  )}
                                </div>
                              </div>
                          ) : isGeneratingAiSuggestion && (
                              <div className="md:col-span-1">
                                <div
                                    className="p-4 rounded-md bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                                  <div className="flex items-center justify-center h-40">
                                    <div className="text-center">
                                      <svg
                                          className="animate-spin h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2"
                                          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                                strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor"
                                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      <p className="text-purple-600 dark:text-purple-400">Generating AI
                                        suggestions...</p>
                                      <p className="text-xs text-purple-500 dark:text-purple-300 mt-1">This may take a
                                        few seconds</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                          )}
                        </div>
                      </div>
                    )}

                    {testResult.data && (
                      <div className="mt-3">
                        <details className="text-sm">
                          <summary className="font-semibold cursor-pointer">Response Data</summary>
                          <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded overflow-auto text-xs max-h-40">
                            {JSON.stringify(testResult.data, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default SchemaDetailPage;
