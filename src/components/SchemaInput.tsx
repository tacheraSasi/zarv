import { useState } from 'react';
import SampleSchemas from './SampleSchemas';

interface SchemaInputProps {
  onSchemaChange: (schema: string) => void;
}

const SchemaInput: React.FC<SchemaInputProps> = ({ onSchemaChange }) => {
  const [schema, setSchema] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newSchema = e.target.value;
    setSchema(newSchema);
    onSchemaChange(newSchema);
  };

  const handleSelectSample = (sampleSchema: string) => {
    setSchema(sampleSchema);
    onSchemaChange(sampleSchema);
  };

  return (
    <div className="mb-6">
      <label htmlFor="schema" className="block text-sm font-medium text-gray-700 mb-2">
        Zod Schema
      </label>
      <SampleSchemas onSelectSchema={handleSelectSample} />
      <textarea
        id="schema"
        name="schema"
        rows={10}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        placeholder="Paste your Zod schema here..."
        value={schema}
        onChange={handleChange}
      />
      <p className="mt-2 text-sm text-gray-500">
        Paste your Zod schema to validate API responses against, or select a sample schema above.
      </p>
    </div>
  );
};

export default SchemaInput;
