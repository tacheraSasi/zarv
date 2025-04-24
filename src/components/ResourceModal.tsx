import React, {useEffect, useState} from 'react';
import {Resource, resourceOperations} from '../utils/db';

interface ResourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: number;
    onSuccess?: (resourceId: number, resourceName: string) => void;
    existingResources?: string[];
    resource?: Resource; // Add resource prop for editing
}

const ResourceModal: React.FC<ResourceModalProps> = ({
                                                         isOpen,
                                                         onClose,
                                                         projectId,
                                                         onSuccess,
                                                         existingResources = [],
                                                         resource
                                                     }) => {
    const [resourceName, setResourceName] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEditMode = !!resource;

    // Reset form when modal opens/closes or resource changes
    useEffect(() => {
        if (isOpen) {
            setResourceName(resource ? resource.name : '');
            setError('');
            setIsSubmitting(false);
        }
    }, [isOpen, resource]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate input
        if (!resourceName.trim()) {
            setError('Resource name is required');
            return;
        }

        // Check for duplicate names (case insensitive) only when creating or renaming
        if (!isEditMode || (resource && resource.name.toLowerCase() !== resourceName.trim().toLowerCase())) {
            const nameExists = existingResources.some(
                name => name.toLowerCase() === resourceName.trim().toLowerCase()
            );

            if (nameExists) {
                setError('A resource with this name already exists');
                return;
            }
        }

        setIsSubmitting(true);
        setError('');

        try {
            let resourceId: number;

            if (isEditMode && resource && resource.id) {
                // Update the resource
                await resourceOperations.update(resource.id, {name: resourceName.trim()});
                resourceId = resource.id;
            } else {
                // Create the resource
                resourceId = await resourceOperations.create(projectId, resourceName.trim());
            }

            // Call success callback if provided
            if (onSuccess) {
                onSuccess(resourceId, resourceName.trim());
            }

            // Close the modal
            onClose();
        } catch (err) {
            console.error(`Error ${isEditMode ? 'updating' : 'creating'} resource:`, err);
            setError(`Failed to ${isEditMode ? 'update' : 'create'} resource: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                            {isEditMode ? 'Edit Resource' : 'Add New Resource'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Close"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24"
                                 stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    {error && (
                        <div
                            className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 animate-shake">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                          clipRule="evenodd"/>
                                </svg>
                                {error}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label htmlFor="resourceName"
                                   className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Resource Name
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24"
                                         stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                                    </svg>
                                </div>
                                <input
                                    id="resourceName"
                                    type="text"
                                    value={resourceName}
                                    onChange={(e) => setResourceName(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white transition-all"
                                    placeholder="Enter resource name"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-8">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                             xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                                    strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor"
                                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {isEditMode ? 'Updating...' : 'Creating...'}
                                    </span>
                                ) : (
                                    isEditMode ? 'Update Resource' : 'Create Resource'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResourceModal;
