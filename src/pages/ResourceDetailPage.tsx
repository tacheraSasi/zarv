import React, {useEffect, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import Layout from '../components/Layout';
import {useAuth} from '../contexts/AuthContext';
import {
    Project,
    projectOperations,
    projectUserOperations,
    Resource,
    resourceOperations,
    Schema,
    schemaOperations
} from '../utils/db';
import ResourceModal from '../components/ResourceModal';
import Button from '../components/Button';

const ResourceDetailPage: React.FC = () => {
    const {projectId, resourceName} = useParams<{ projectId: string; resourceName: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [resource, setResource] = useState<Resource | null>(null);
    const [schemas, setSchemas] = useState<Schema[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [existingResources, setExistingResources] = useState<string[]>([]);
    const {currentUser} = useAuth();
    const navigate = useNavigate();

    // Load project and schemas for this resource on component mount
    useEffect(() => {
        const loadData = async () => {
            if (!projectId || !resourceName || !currentUser?.id) {
                setIsLoading(false);
                return;
            }

            try {
                // Decode the resource name from the URL
                const decodedResourceName = decodeURIComponent(resourceName);

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

                // First try to find the resource by name to get its ID
                let resourceSchemas: Schema[] = [];

                if (decodedResourceName === 'Uncategorized') {
                    // For "Uncategorized", get all schemas without a resource
                    const projectSchemas = await schemaOperations.getByProjectId(parseInt(projectId));
                    resourceSchemas = projectSchemas.filter(schema => !schema.resource && !schema.resourceId);
                } else {
                    // Get all resources for this project
                    const resources = await resourceOperations.getByProjectId(parseInt(projectId));

                    // Set existing resources for the edit modal
                    setExistingResources(resources.map(r => r.name));

                    // Find the resource with the matching name
                    const foundResource = resources.find(r => r.name === decodedResourceName);

                    // Set the resource in state
                    setResource(foundResource || null);

                    if (foundResource && foundResource.id) {
                        // If resource found, get schemas by resourceId
                        resourceSchemas = await schemaOperations.getByResourceId(foundResource.id);
                    } else {
                        // Fallback to legacy method - filter by resource name
                        const projectSchemas = await schemaOperations.getByProjectId(parseInt(projectId));
                        resourceSchemas = projectSchemas.filter(schema => {
                            const schemaResource = schema.resource || '';
                            return schemaResource === decodedResourceName;
                        });
                    }
                }

                setSchemas(resourceSchemas);
            } catch (err) {
                console.error('Error loading resource details:', err);
                setError('Failed to load resource details');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [projectId, resourceName, currentUser]);

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString();
    };

    const handleDeleteSchema = async (schemaId: number) => {
        if (!confirm('Are you sure you want to delete this schema? This action cannot be undone.')) {
            return;
        }

        try {
            await schemaOperations.delete(schemaId);
            // Remove the deleted schema from the state
            setSchemas(schemas.filter(schema => schema.id !== schemaId));
        } catch (err) {
            console.error('Error deleting schema:', err);
            setError('Failed to delete schema');
        }
    };

    const handleEditResource = () => {
        setIsEditModalOpen(true);
    };

    const handleResourceUpdate = (resourceId: number, resourceName: string) => {
        // Refresh the page to show the updated resource
        navigate(`/projects/${projectId}/resources/${encodeURIComponent(resourceName)}`);
    };

    const handleDeleteResource = async () => {
        if (!resource || !resource.id) {
            setError('Resource not found');
            return;
        }

        if (schemas.length > 0) {
            setError('Cannot delete resource because it has associated schemas. Please delete all schemas first.');
            return;
        }

        if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
            return;
        }

        try {
            await resourceOperations.delete(resource.id);
            // Navigate back to the project page
            navigate(`/projects/${projectId}`);
        } catch (err) {
            console.error('Error deleting resource:', err);
            setError(`Failed to delete resource: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400">Loading resource details...</p>
                </div>
            </Layout>
        );
    }

    if (error && !project) {
        return (
            <Layout>
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
                <div className="mt-4">
                    <Link
                        to="/projects"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        Back to Projects
                    </Link>
                </div>
            </Layout>
        );
    }

    const decodedResourceName = resourceName ? decodeURIComponent(resourceName) : '';

    return (
        <Layout>
            <div>
                <div className="mb-6">
                    <Link
                        to={`/projects/${projectId}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"
                             stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                        </svg>
                        Back to Project
                    </Link>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {/* Resource Edit Modal */}
                {resource && (
                    <ResourceModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        projectId={parseInt(projectId || '0')}
                        resource={resource}
                        existingResources={existingResources.filter(name => name !== resource.name)}
                        onSuccess={handleResourceUpdate}
                    />
                )}

                {project && (
                    <div className="mb-8">
                        <div className="flex justify-between items-start mb-2">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {decodedResourceName} - {project.name}
                            </h1>
                            <div className="flex space-x-2">
                                {decodedResourceName !== 'Uncategorized' && (
                                    <>
                                        <Button
                                            onClick={handleEditResource}
                                            variant="secondary"
                                            className="py-1 px-3 text-sm"
                                        >
                                            Edit Resource
                                        </Button>
                                        <Button
                                            onClick={handleDeleteResource}
                                            variant="danger"
                                            className="py-1 px-3 text-sm"
                                        >
                                            Delete Resource
                                        </Button>
                                    </>
                                )}
                                <Link
                                    to={`/projects/${projectId}/schemas/new?resource=${encodeURIComponent(decodedResourceName)}`}
                                    className="inline-block"
                                >
                                    <Button variant="primary">
                                        Add Schema
                                    </Button>
                                </Link>
                            </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Showing all schemas for the {decodedResourceName} resource
                        </p>
                    </div>
                )}

                {/* Schemas Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {schemas.map((schema) => (
                        <div key={schema.id} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center mb-2">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mr-2">
                                        {schema.name}
                                    </h3>
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
                                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                                        {schema.description}
                                    </p>
                                )}
                                {schema.endpointUrl && (
                                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">
                                        Endpoint: {schema.endpointUrl}
                                    </p>
                                )}
                                <p className="text-sm text-gray-500 dark:text-gray-500">
                                    Last updated: {formatDate(schema.updatedAt)}
                                </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex justify-between">
                                <Link
                                    to={`/projects/${projectId}/schemas/${schema.id}`}
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                                >
                                    View Details
                                </Link>
                                <Button
                                    onClick={() => schema.id && handleDeleteSchema(schema.id)}
                                    variant="danger"
                                    className="py-1 px-2 text-sm"
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {schemas.length === 0 && (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
                        <p className="text-gray-600 dark:text-gray-400 mb-4">No schemas found for this resource.</p>
                        <Link
                            to={`/projects/${projectId}/schemas/new?resource=${encodeURIComponent(decodedResourceName)}`}
                            className="inline-block"
                        >
                            <Button variant="primary">
                                Create New Schema
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ResourceDetailPage;
