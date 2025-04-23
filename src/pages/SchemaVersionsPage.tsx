import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Schema, SchemaVersion, User, projectOperations, projectUserOperations, schemaOperations, userOperations } from '../utils/db';
import SchemaEditor from '../components/SchemaEditor';
import DiffViewer from '../components/diff';

const SchemaVersionsPage: React.FC = () => {
  const { projectId, schemaId } = useParams<{ projectId: string; schemaId: string }>();
  const [schema, setSchema] = useState<Schema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [schemaVersions, setSchemaVersions] = useState<SchemaVersion[]>([]);
  const [versionUsers, setVersionUsers] = useState<Record<number, User>>({});
  const [selectedVersion, setSelectedVersion] = useState<SchemaVersion | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Load schema and versions on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!projectId || !schemaId || !currentUser?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Verify that the user has access to the project
        const hasAccess = await projectUserOperations.isUserInProject(parseInt(projectId), currentUser.id);
        if (!hasAccess) {
          setError('You do not have permission to access this project');
          setIsLoading(false);
          return;
        }

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

        // Load schema versions
        const versionsData = await schemaOperations.getVersions(parseInt(schemaId));
        setSchemaVersions(versionsData);

        // Set the latest version as the default selected version
        if (versionsData.length > 0) {
          setSelectedVersion(versionsData[0]);
        }

        // Load user information for each version
        const users: Record<number, User> = {};
        for (const version of versionsData) {
          if (version.userId && !users[version.userId]) {
            try {
              const userData = await userOperations.getById(version.userId);
              if (userData) {
                users[version.userId] = userData;
              }
            } catch (error) {
              console.error(`Error loading user data for version ${version.id}:`, error);
            }
          }
        }
        setVersionUsers(users);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId, schemaId, currentUser]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">Loading schema versions...</p>
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
            to={`/projects/${projectId}/schemas/${schemaId}`}
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Back to Schema
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
            to={`/projects/${projectId}/schemas/${schemaId}`}
            className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Schema
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {schema && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden mb-8">
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {schema.name} - Version History
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left side: Versions list */}
                <div className="md:col-span-1">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 h-full">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                      Schema Versions
                    </h3>
                    <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                      {schemaVersions.map((version, index) => (
                        <div
                          key={version.id}
                          className={`p-3 rounded-md cursor-pointer transition-colors ${
                            selectedVersion?.id === version.id 
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800' 
                              : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700'
                          }`}
                          onClick={() => {
                            setSelectedVersion(version);
                            setShowDiff(false);
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {version.changeDescription || (index === schemaVersions.length - 1 ? 'Initial version' : 'Updated schema')}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {new Date(version.timestamp).toLocaleString()}
                                {version.userId && (
                                  version.userId === currentUser?.id
                                    ? " by me"
                                    : versionUsers[version.userId]
                                      ? ` by ${versionUsers[version.userId].name}`
                                      : ""
                                )}
                              </p>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {index === 0 ? 'Latest' : `v${schemaVersions.length - index}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right side: Selected version details */}
                <div className="md:col-span-2">
                  {selectedVersion ? (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                          Schema Snapshot
                        </h4>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {schemaVersions.findIndex(v => v.id === selectedVersion.id) === 0 ? 'Latest Version' : 
                            `Version ${schemaVersions.length - schemaVersions.findIndex(v => v.id === selectedVersion.id)}`}
                        </div>
                      </div>
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Name: {selectedVersion.name}</p>
                        {selectedVersion.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Description: {selectedVersion.description}
                          </p>
                        )}
                        {selectedVersion.endpointUrl && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Endpoint URL: {selectedVersion.endpointUrl}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Updated: {new Date(selectedVersion.timestamp).toLocaleString()}
                          {selectedVersion.userId && (
                            selectedVersion.userId === currentUser?.id
                              ? " by me"
                              : versionUsers[selectedVersion.userId]
                                ? ` by ${versionUsers[selectedVersion.userId].name}`
                                : ""
                          )}
                        </p>
                      </div>

                      {/* Only show compare button if not viewing the latest version */}
                      {schemaVersions.findIndex(v => v.id === selectedVersion.id) !== 0 && (
                        <div className="mb-4">
                          {!showDiff ? (
                            <button
                              onClick={() => setShowDiff(true)}
                              className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              Compare with Current Version
                            </button>
                          ) : (
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Schema Comparison</h4>
                                <button
                                  onClick={() => setShowDiff(false)}
                                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                  Hide Comparison
                                </button>
                              </div>
                              <DiffViewer 
                                oldText={selectedVersion.schemaDefinition}
                                newText={schema?.schemaDefinition || ''}
                                title="Schema Comparison"
                                oldLabel={`Version ${schemaVersions.length - schemaVersions.findIndex(v => v.id === selectedVersion.id)}`}
                                newLabel="Current Version"
                                filename={`${schema?.name || 'schema'}.js`}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Schema Definition:</p>
                        <SchemaEditor
                          value={selectedVersion.schemaDefinition}
                          readOnly={true}
                          height="400px"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-700 rounded-lg p-8">
                      <p className="text-gray-500 dark:text-gray-400">
                        Select a version from the list to view details
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SchemaVersionsPage;
