import React from 'react';

interface ValidationError {
  path: string[];
  message: string;
}

interface ResponseDisplayProps {
  loading: boolean;
  response: any;
  isValid: boolean | null;
  errors: ValidationError[];
  zodVersion?: string;
}

const ResponseDisplay: React.FC<ResponseDisplayProps> = ({
  loading,
  response,
  isValid,
  errors,
  zodVersion = 'Latest'
}) => {
  const formatJson = (json: any): string => {
    try {
      return JSON.stringify(json, null, 2);
    } catch (error) {
      return String(json);
    }
  };

  // Configure Monaco editor for JSON
  const handleEditorBeforeMount = (monaco: typeof import('monaco-editor')) => {
    // Define a custom theme for JSON
    monaco.editor.defineTheme('jsonTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'string', foreground: '#ce9178' },
        { token: 'number', foreground: '#b5cea8' },
        { token: 'delimiter', foreground: '#d4d4d4' },
        { token: 'boolean', foreground: '#569cd6' },
        { token: 'keyword', foreground: '#569cd6' },
        { token: 'key', foreground: '#9cdcfe' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editorCursor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#2d2d2d',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
      }
    });
  };

  const renderValidationStatus = () => {
    if (isValid === null) return null;

    if (isValid) {
      return (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Validation Successful!</span>
          </div>
          <p className="mt-1 text-sm">The API response matches the provided Zod schema (Version: {zodVersion}).</p>
        </div>
      );
    }

    return (
      <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Validation Failed (Zod Version: {zodVersion})</span>
        </div>
        <div className="mt-2">
          <h4 className="text-sm font-medium mb-1">Validation Errors:</h4>
          <ul className="list-disc pl-5 text-sm">
            {errors.map((error, index) => (
              <li key={index}>
                <span className="font-mono">{error.path.join('.')}</span>: {error.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium text-gray-700 mb-2">Response</h3>

      {loading ? (
        <div className="flex justify-center items-center h-40 bg-gray-50 rounded border border-gray-300">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : response ? (
        <>
          {renderValidationStatus()}

          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Response Data:</h4>
            <pre className="bg-gray-800 text-gray-100 p-4 rounded overflow-auto max-h-96">
              <code>{formatJson(response)}</code>
            </pre>
          </div>
        </>
      ) : (
        <div className="bg-gray-50 p-4 rounded border border-gray-300 text-gray-500 text-center">
          No response yet. Submit a request to see results.
        </div>
      )}
    </div>
  );
};

export default ResponseDisplay;
