import { useState } from 'react';

interface AuthorizationInputProps {
  onHeadersChange: (headers: Record<string, string>) => void;
}

const AuthorizationInput: React.FC<AuthorizationInputProps> = ({ onHeadersChange }) => {
  const [authType, setAuthType] = useState<string>('none');
  const [token, setToken] = useState<string>('');
  const [customHeaders, setCustomHeaders] = useState<{ key: string; value: string }[]>([
    { key: '', value: '' }
  ]);

  const handleAuthTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAuthType = e.target.value;
    setAuthType(newAuthType);
    updateHeaders(newAuthType, token, customHeaders);
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newToken = e.target.value;
    setToken(newToken);
    updateHeaders(authType, newToken, customHeaders);
  };

  const handleCustomHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
    const updatedHeaders = [...customHeaders];
    updatedHeaders[index][field] = value;
    setCustomHeaders(updatedHeaders);
    updateHeaders(authType, token, updatedHeaders);
  };

  const addCustomHeader = () => {
    setCustomHeaders([...customHeaders, { key: '', value: '' }]);
  };

  const removeCustomHeader = (index: number) => {
    const updatedHeaders = customHeaders.filter((_, i) => i !== index);
    setCustomHeaders(updatedHeaders);
    updateHeaders(authType, token, updatedHeaders);
  };

  const updateHeaders = (
    currentAuthType: string,
    currentToken: string,
    currentCustomHeaders: { key: string; value: string }[]
  ) => {
    const headers: Record<string, string> = {};

    // Add authorization header based on auth type
    if (currentAuthType === 'bearer' && currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    } else if (currentAuthType === 'basic' && currentToken) {
      headers['Authorization'] = `Basic ${currentToken}`;
    } else if (currentAuthType === 'apiKey' && currentToken) {
      headers['X-API-Key'] = currentToken;
    }

    // Add custom headers
    currentCustomHeaders.forEach(header => {
      if (header.key && header.value) {
        headers[header.key] = header.value;
      }
    });

    onHeadersChange(headers);
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-700 mb-2">Authorization</h3>

      <div className="mb-4">
        <label htmlFor="authType" className="block text-sm font-medium text-gray-700 mb-1">
          Authorization Type
        </label>
        <select
          id="authType"
          name="authType"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          value={authType}
          onChange={handleAuthTypeChange}
        >
          <option value="none">None</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="apiKey">API Key</option>
        </select>
      </div>

      {authType !== 'none' && (
        <div className="mb-4">
          <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
            {authType === 'bearer' ? 'Bearer Token' :
             authType === 'basic' ? 'Basic Auth Token' : 'API Key'}
          </label>
          <input
            type="text"
            id="token"
            name="token"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder={
              authType === 'bearer' ? 'Enter your bearer token' :
              authType === 'basic' ? 'Enter your base64 encoded credentials' : 'Enter your API key'
            }
            value={token}
            onChange={handleTokenChange}
          />
        </div>
      )}

      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium text-gray-700">Custom Headers</h4>
          <button
            type="button"
            onClick={addCustomHeader}
            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Header
          </button>
        </div>

        {customHeaders.map((header, index) => (
          <div key={index} className="flex space-x-2 mb-2">
            <input
              type="text"
              placeholder="Header name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={header.key}
              onChange={(e) => handleCustomHeaderChange(index, 'key', e.target.value)}
            />
            <input
              type="text"
              placeholder="Value"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={header.value}
              onChange={(e) => handleCustomHeaderChange(index, 'value', e.target.value)}
            />
            {customHeaders.length > 1 && (
              <button
                type="button"
                onClick={() => removeCustomHeader(index)}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuthorizationInput;
