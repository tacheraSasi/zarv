import { useState } from 'react';
import SampleEndpoints from './SampleEndpoints';

interface ApiEndpointInputProps {
  onEndpointChange: (endpoint: string) => void;
  onMethodChange: (method: string) => void;
}

const ApiEndpointInput: React.FC<ApiEndpointInputProps> = ({
  onEndpointChange,
  onMethodChange
}) => {
  const [endpoint, setEndpoint] = useState<string>('');
  const [method, setMethod] = useState<string>('GET');

  const handleEndpointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndpoint = e.target.value;
    setEndpoint(newEndpoint);
    onEndpointChange(newEndpoint);
  };

  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMethod = e.target.value;
    setMethod(newMethod);
    onMethodChange(newMethod);
  };

  const handleSelectSample = (sampleEndpoint: string, sampleMethod: string) => {
    setEndpoint(sampleEndpoint);
    setMethod(sampleMethod);
    onEndpointChange(sampleEndpoint);
    onMethodChange(sampleMethod);
  };

  return (
    <div className="mb-6">
      <label htmlFor="endpoint" className="block text-sm font-medium text-gray-700 mb-2">
        API Endpoint
      </label>
      <SampleEndpoints
        onSelectEndpoint={(newEndpoint) => handleSelectSample(newEndpoint, method)}
        onSelectMethod={(newMethod) => handleSelectSample(endpoint, newMethod)}
        onSelectSample={handleSelectSample}
      />
      <div className="flex space-x-2">
        <select
          id="method"
          name="method"
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          value={method}
          onChange={handleMethodChange}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
        <input
          type="text"
          id="endpoint"
          name="endpoint"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="https://api.example.com/data"
          value={endpoint}
          onChange={handleEndpointChange}
        />
      </div>
      <p className="mt-2 text-sm text-gray-500">
        Enter the API endpoint URL you want to test, or select a sample endpoint above.
      </p>
    </div>
  );
};

export default ApiEndpointInput;
