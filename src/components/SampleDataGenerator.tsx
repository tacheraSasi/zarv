import React, { useState, useEffect } from 'react';
import { generateAISampleData, SampleDataOptions, SampleDataResult } from '../utils/sampleDataGenerator';

interface SampleDataGeneratorProps {
  schemaDefinition: string;
  schemaName: string;
  autoGenerate?: boolean;
}

const SampleDataGenerator: React.FC<SampleDataGeneratorProps> = ({
  schemaDefinition,
  schemaName,
  autoGenerate = false
}) => {
  const [sampleData, setSampleData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number>(1);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [options, setOptions] = useState<SampleDataOptions>({
    count: 1,
    includeNulls: false,
    minArrayLength: 1,
    maxArrayLength: 5,
    minStringLength: 3,
    maxStringLength: 10,
    minNumber: 0,
    maxNumber: 100
  });

  // Auto-generate sample data when component mounts if autoGenerate is true
  useEffect(() => {
    if (autoGenerate && schemaDefinition) {
      handleGenerateSampleData(false); // Use cache when auto-generating
    }
  }, [autoGenerate, schemaDefinition]);

  const handleGenerateSampleData = async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const result: SampleDataResult = await generateAISampleData(schemaDefinition, {
        ...options,
        count
      }, forceRefresh);

      if (result.success) {
        setSampleData(result.data);
        setIsFromCache(result.fromCache || false);
      } else {
        setError(result.error || 'Failed to generate sample data');
        // If there's data despite the error, still show it
        if (result.data) {
          setSampleData(result.data);
          setIsFromCache(result.fromCache || false);
        }
      }
    } catch (err) {
      console.error('Error generating sample data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySampleData = async () => {
    if (!sampleData) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(sampleData, null, 2));
      // Could add a toast notification here
      console.log('Sample data copied to clipboard');
    } catch (err) {
      console.error('Failed to copy sample data:', err);
    }
  };

  const handleDownload = () => {
    if (!sampleData) return;

    // Create a JSON blob and download it
    const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schemaName.replace(/\s+/g, '_').toLowerCase()}_sample_data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOptionChange = (key: keyof SampleDataOptions, value: any) => {
    setOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6">

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sample Data Generator
        </h3>


      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Sample data is generated using Groq AI, which creates realistic values based on field names.
      </p>

      <div className="mb-4">
        <label htmlFor="count" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Number of items to generate
        </label>
        <div className="flex items-center">
          <input
            id="count"
            type="number"
            min="1"
            max="100"
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="ml-4 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            {showOptions ? 'Hide advanced options' : 'Show advanced options'}
          </button>
        </div>
      </div>

      {showOptions && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Advanced Options
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="minArrayLength" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Array Length
              </label>
              <input
                id="minArrayLength"
                type="number"
                min="0"
                max={options.maxArrayLength}
                value={options.minArrayLength}
                onChange={(e) => handleOptionChange('minArrayLength', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="maxArrayLength" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Array Length
              </label>
              <input
                id="maxArrayLength"
                type="number"
                min={options.minArrayLength || 1}
                max="20"
                value={options.maxArrayLength}
                onChange={(e) => handleOptionChange('maxArrayLength', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="minStringLength" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min String Length
              </label>
              <input
                id="minStringLength"
                type="number"
                min="0"
                max={options.maxStringLength}
                value={options.minStringLength}
                onChange={(e) => handleOptionChange('minStringLength', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="maxStringLength" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max String Length
              </label>
              <input
                id="maxStringLength"
                type="number"
                min={options.minStringLength || 1}
                max="100"
                value={options.maxStringLength}
                onChange={(e) => handleOptionChange('maxStringLength', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="minNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Number Value
              </label>
              <input
                id="minNumber"
                type="number"
                max={options.maxNumber}
                value={options.minNumber}
                onChange={(e) => handleOptionChange('minNumber', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="maxNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Number Value
              </label>
              <input
                id="maxNumber"
                type="number"
                min={options.minNumber || 0}
                value={options.maxNumber}
                onChange={(e) => handleOptionChange('maxNumber', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center">
                <input
                  id="includeNulls"
                  type="checkbox"
                  checked={options.includeNulls}
                  onChange={(e) => handleOptionChange('includeNulls', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="includeNulls" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Include null values (for optional fields)
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-2 flex-wrap">

          <button
              onClick={() => handleGenerateSampleData(true)}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 mb-2"
          >
            {isLoading ? 'Generating...' : 'Generate Sample Data'}
          </button>





        {sampleData && (
          <>
            <button
              onClick={handleCopySampleData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-2"
            >
              Copy JSON
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 mb-2"
            >
              Download JSON
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {sampleData && (
        <div className="mt-4">
          <div className={"flex justify-between items-center pb-2"}><h4
              className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Generated Sample Data
          </h4>

            {sampleData && !isLoading && (
                <div className={`text-xs px-2 py-1 rounded-md ${isFromCache
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                  {isFromCache ? 'From cache' : 'Fresh'}
                </div>
            )}
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4 overflow-auto max-h-96">
            <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {JSON.stringify(sampleData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default SampleDataGenerator;
