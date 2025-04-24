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
        <div className="fixed inset-0 bg-black/50  flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {isEditMode ? 'Edit Resource' : 'Add New Resource'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
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
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label htmlFor="resourceName"
                                   className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Resource Name
                            </label>
                            <input
                                id="resourceName"
                                type="text"
                                value={resourceName}
                                onChange={(e) => setResourceName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Enter resource name"
                                autoFocus
                            />
                        </div>

                        <div className="flex justify-end space-x-2 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {isSubmitting
                                    ? (isEditMode ? 'Updating...' : 'Creating...')
                                    : (isEditMode ? 'Update Resource' : 'Create Resource')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResourceModal;
