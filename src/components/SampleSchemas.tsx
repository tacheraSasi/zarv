import React from 'react';

interface SampleSchemasProps {
  onSelectSchema: (schema: string) => void;
}

const SampleSchemas: React.FC<SampleSchemasProps> = ({ onSelectSchema }) => {
  const samples = [
    {
      name: 'Simple User',
      schema: `z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  isActive: z.boolean().optional()
})`
    },
    {
      name: 'Blog Post',
      schema: `z.object({
  id: z.number(),
  title: z.string().min(1),
  content: z.string(),
  author: z.object({
    id: z.number(),
    name: z.string()
  }),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional()
})`
    },
    {
      name: 'API Response',
      schema: `z.object({
  success: z.boolean(),
  data: z.object({
    items: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        price: z.number().positive(),
        quantity: z.number().int().min(0)
      })
    ),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1)
  }),
  meta: z.object({
    requestId: z.string(),
    timestamp: z.number()
  }).optional()
})`
    }
  ];

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Sample Schemas</h3>
      <div className="flex flex-wrap gap-2">
        {samples.map((sample, index) => (
          <button
            key={index}
            type="button"
            className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            onClick={() => onSelectSchema(sample.schema)}
          >
            {sample.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SampleSchemas;
