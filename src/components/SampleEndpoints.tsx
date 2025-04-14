import React from 'react';

interface SampleEndpointsProps {
  onSelectEndpoint: (endpoint: string) => void;
  onSelectMethod: (method: string) => void;
  onSelectSample?: (endpoint: string, method: string) => void;
}

const SampleEndpoints: React.FC<SampleEndpointsProps> = ({
  onSelectEndpoint,
  onSelectMethod,
  onSelectSample
}) => {
  const samples = [
    {
      name: 'Users List',
      endpoint: 'https://jsonplaceholder.typicode.com/users',
      method: 'GET'
    },
    {
      name: 'Single Post',
      endpoint: 'https://jsonplaceholder.typicode.com/posts/1',
      method: 'GET'
    },
    {
      name: 'Comments',
      endpoint: 'https://jsonplaceholder.typicode.com/comments?postId=1',
      method: 'GET'
    },
    {
      name: 'Random User',
      endpoint: 'https://randomuser.me/api/',
      method: 'GET'
    }
  ];

  const handleSelect = (endpoint: string, method: string) => {
    if (onSelectSample) {
      // Use the combined callback if provided
      onSelectSample(endpoint, method);
    } else {
      // Otherwise, use the separate callbacks
      onSelectEndpoint(endpoint);
      onSelectMethod(method);
    }
  };

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Sample Endpoints</h3>
      <div className="flex flex-wrap gap-2">
        {samples.map((sample, index) => (
          <button
            key={index}
            type="button"
            className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            onClick={() => handleSelect(sample.endpoint, sample.method)}
          >
            {sample.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SampleEndpoints;
