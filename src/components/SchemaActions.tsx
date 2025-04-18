import React, { useState } from 'react';

interface SchemaActionsProps {
  schemaDefinition: string;
  schemaName: string;
  onDuplicate?: () => void;
  onRunSchema?: () => void;
  readOnly?: boolean;
}

const SchemaActions: React.FC<SchemaActionsProps> = ({
  schemaDefinition,
  schemaName,
  onDuplicate,
  onRunSchema,
  readOnly = false
}) => {
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(schemaDefinition);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mt-2">
        <button
          onClick={handleCopyToClipboard}
          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm"
          title="Copy schema to clipboard"
        >
          {copySuccess ? 'Copied!' : 'Copy Schema'}
        </button>

        {onRunSchema && (
          <button
            onClick={onRunSchema}
            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-sm"
            title="Run this schema"
          >
            Run Schema
          </button>
        )}


        {!readOnly && onDuplicate && (
          <button
            onClick={onDuplicate}
            className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 text-sm"
            title="Create a duplicate of this schema"
          >
            Duplicate Schema
          </button>
        )}
      </div>
    </div>
  );
};

export default SchemaActions;
