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
          <div
              className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 rounded-lg shadow-sm overflow-hidden transition-all hover:shadow-md">
              <div
                  className="flex items-center bg-green-100/50 dark:bg-green-800/30 px-4 py-2 border-b border-green-200 dark:border-green-800">
                  <svg className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" fill="currentColor"
                       viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
                  <span className="font-bold">Validation Successful!</span>
              </div>
              <div className="p-4">
                  <div className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor"
                               viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                      </div>
                      <p className="text-sm">The API response matches the provided Zod schema.</p>
                  </div>
                  <div className="mt-2 flex items-center">
              <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200">
                Zod {zodVersion}
              </span>
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">Schema validation completed successfully</span>
                  </div>
              </div>
        </div>
      );
    }

    return (
        <div
            className="mb-6 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div
                className="flex items-center bg-red-100/50 dark:bg-red-800/30 px-4 py-2 border-b border-red-200 dark:border-red-800">
                <svg className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
                <span className="font-bold">Validation Failed</span>
        </div>
            <div className="p-4">
                <div className="flex items-center mb-2">
            <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 mr-2">
              Zod {zodVersion}
            </span>
                    <span
                        className="text-xs text-red-600 dark:text-red-400">Schema validation found {errors.length} {errors.length === 1 ? 'error' : 'errors'}</span>
                </div>

                <div
                    className="mt-3 bg-white dark:bg-gray-800 rounded-md border border-red-200 dark:border-red-800/50 overflow-hidden">
                    <div
                        className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800/50 text-xs font-medium text-red-800 dark:text-red-200">
                        Validation Errors
                    </div>
                    <ul className="divide-y divide-red-100 dark:divide-red-900/20">
                        {errors.map((error, index) => (
                            <li key={index}
                                className="px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                                <div className="flex items-start">
                                    <svg className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none"
                                         stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <div>
                                        <span
                                            className="font-mono text-xs bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded text-red-800 dark:text-red-300">{error.path.join('.') || 'root'}</span>
                                        <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error.message}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-8">
        <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 mb-4">Response</h3>

      {loading ? (
          <div
              className="flex flex-col justify-center items-center h-48 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 shadow-inner">
              <div
                  className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-800 dark:border-t-indigo-400 mb-3"></div>
              <p className="text-gray-500 dark:text-gray-400 animate-pulse">Processing request...</p>
        </div>
      ) : response ? (
        <>
          {renderValidationStatus()}

            <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Response Data:</h4>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span>JSON Response</span>
                    </div>
                </div>
                <div
                    className="bg-gray-900 dark:bg-black rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl">
                    <div
                        className="flex items-center justify-between bg-gray-800 dark:bg-gray-900 px-4 py-2 border-b border-gray-700">
                        <div className="flex space-x-1">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <span className="text-xs text-gray-400">response.json</span>
                    </div>
                    <pre
                        className="bg-gray-900 dark:bg-black text-gray-100 p-5 overflow-auto max-h-96 font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                <code className="language-json">{formatJson(response)}</code>
              </pre>
                </div>
          </div>
        </>
      ) : (
          <div
              className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-center shadow-inner">
              <svg className="h-12 w-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p>No response yet. Submit a request to see results.</p>
        </div>
      )}
    </div>
  );
};

export default ResponseDisplay;
