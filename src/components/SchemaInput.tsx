import { useState, useEffect, useRef } from 'react';
import SampleSchemas from './SampleSchemas';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { getDeclarationTypes } from '../utils/zodTypes';

interface SchemaInputProps {
  onSchemaChange: (schema: string) => void;
  onZodVersionChange?: (version: string) => void;
}

// Define Zod versions
const ZOD_VERSIONS = [
  { label: 'Latest (3.24.2)', value: '3.24.2' },
  { label: '3.22.0', value: '3.22.0' },
  { label: '3.20.0', value: '3.20.0' },
  { label: '3.18.0', value: '3.18.0' },
];

// Zod method suggestions for auto-completion
const ZOD_SUGGESTIONS = [
  { label: 'z.string()', insertText: 'z.string()', detail: 'Creates a string schema' },
  { label: 'z.number()', insertText: 'z.number()', detail: 'Creates a number schema' },
  { label: 'z.boolean()', insertText: 'z.boolean()', detail: 'Creates a boolean schema' },
  { label: 'z.array()', insertText: 'z.array($1)', detail: 'Creates an array schema' },
  { label: 'z.object()', insertText: 'z.object({\n\t$1\n})', detail: 'Creates an object schema' },
  { label: 'z.enum()', insertText: 'z.enum([$1])', detail: 'Creates an enum schema' },
  { label: 'z.literal()', insertText: 'z.literal($1)', detail: 'Creates a literal schema' },
  { label: 'z.union()', insertText: 'z.union([$1])', detail: 'Creates a union schema' },
  { label: 'z.intersection()', insertText: 'z.intersection($1)', detail: 'Creates an intersection schema' },
  { label: 'z.tuple()', insertText: 'z.tuple([$1])', detail: 'Creates a tuple schema' },
  { label: 'z.record()', insertText: 'z.record($1)', detail: 'Creates a record schema' },
  { label: 'z.map()', insertText: 'z.map($1)', detail: 'Creates a map schema' },
  { label: 'z.set()', insertText: 'z.set($1)', detail: 'Creates a set schema' },
  { label: 'z.date()', insertText: 'z.date()', detail: 'Creates a date schema' },
  { label: 'z.null()', insertText: 'z.null()', detail: 'Creates a null schema' },
  { label: 'z.undefined()', insertText: 'z.undefined()', detail: 'Creates an undefined schema' },
  { label: 'z.any()', insertText: 'z.any()', detail: 'Creates an any schema' },
  { label: 'z.unknown()', insertText: 'z.unknown()', detail: 'Creates an unknown schema' },
  { label: 'z.void()', insertText: 'z.void()', detail: 'Creates a void schema' },
  { label: 'z.never()', insertText: 'z.never()', detail: 'Creates a never schema' },
  { label: 'z.optional()', insertText: '.optional()', detail: 'Makes a schema optional' },
  { label: 'z.nullable()', insertText: '.nullable()', detail: 'Makes a schema nullable' },
  { label: 'z.default()', insertText: '.default($1)', detail: 'Sets a default value' },
  { label: 'z.min()', insertText: '.min($1)', detail: 'Sets a minimum value/length' },
  { label: 'z.max()', insertText: '.max($1)', detail: 'Sets a maximum value/length' },
  { label: 'z.regex()', insertText: '.regex($1)', detail: 'Validates against a regex pattern' },
  { label: 'z.email()', insertText: '.email()', detail: 'Validates as an email' },
  { label: 'z.url()', insertText: '.url()', detail: 'Validates as a URL' },
  { label: 'z.uuid()', insertText: '.uuid()', detail: 'Validates as a UUID' },
  { label: 'z.refine()', insertText: '.refine($1)', detail: 'Custom validation' },
  { label: 'z.transform()', insertText: '.transform($1)', detail: 'Transform the value' },
];

const SchemaInput: React.FC<SchemaInputProps> = ({ onSchemaChange, onZodVersionChange }) => {
  const [schema, setSchema] = useState<string>('');
  const [zodVersion, setZodVersion] = useState<string>(ZOD_VERSIONS[0].value);
  const [typeDefinitions, setTypeDefinitions] = useState<string>('');
  const [syntaxErrors, setSyntaxErrors] = useState<monaco.editor.IMarkerData[]>([]);
  const [hasErrors, setHasErrors] = useState<boolean>(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);

  // Call onZodVersionChange with initial version on mount
  useEffect(() => {
    if (onZodVersionChange) {
      onZodVersionChange(zodVersion);
    }
  }, []);

  // Fetch Zod type definitions when component mounts or zodVersion changes
  useEffect(() => {
    const fetchTypeDefinitions = async () => {
      try {
        const types = await getDeclarationTypes(zodVersion);
        setTypeDefinitions(types);

        // Update Monaco editor with new type definitions if available
        if (monacoRef.current && types) {
          const monaco = monacoRef.current;

          // Add type definitions to Monaco
          monaco.languages.typescript.javascriptDefaults.addExtraLib(
            types,
            `file:///node_modules/@types/zod/index.d.ts`
          );

          // Force a re-validation of the current model
          if (editorRef.current) {
            const model = editorRef.current.getModel();
            if (model) {
              monaco.editor.setModelMarkers(model, 'zod', []);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch Zod type definitions:', error);
      }
    };

    fetchTypeDefinitions();
  }, [zodVersion]);

  const handleEditorChange = (value: string | undefined) => {
    const newSchema = value || '';
    setSchema(newSchema);
    onSchemaChange(newSchema);

    // Check for syntax errors
    validateSchema(newSchema);
  };

  // Validate schema and set syntax errors
  const validateSchema = (schemaCode: string) => {
    if (!editorRef.current || !monacoRef.current) return;

    const monaco = monacoRef.current;
    const model = editorRef.current.getModel();
    if (!model) return;

    try {
      // Clear existing markers
      monaco.editor.setModelMarkers(model, 'zod', []);

      // Simple syntax validation (check for balanced brackets, parentheses, etc.)
      const errors: monaco.editor.IMarkerData[] = [];

      // Check for common Zod-specific issues
      const zodIssues = checkZodSpecificIssues(schemaCode);
      errors.push(...zodIssues);

      // Check for JavaScript syntax errors
      if (errors.length === 0) {
        try {
          // Use Function constructor to check for syntax errors without executing the code
          new Function(`return ${schemaCode}`);
        } catch (error) {
          if (error instanceof Error) {
            // Parse the error message to get line and column information
            const errorMessage = error.message;
            const lineMatch = errorMessage.match(/line (\d+)/);
            const columnMatch = errorMessage.match(/column (\d+)/);

            const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;
            const column = columnMatch ? parseInt(columnMatch[1], 10) : 1;

            errors.push({
              severity: monaco.MarkerSeverity.Error,
              message: `Syntax error: ${errorMessage}`,
              startLineNumber: line,
              startColumn: column,
              endLineNumber: line,
              endColumn: column + 1
            });
          } else {
            // Generic error without position information
            errors.push({
              severity: monaco.MarkerSeverity.Error,
              message: `Syntax error in schema`,
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: 1,
              endColumn: 2
            });
          }
        }
      }

      // Set markers for the errors
      monaco.editor.setModelMarkers(model, 'zod', errors);
      setSyntaxErrors(errors);
      setHasErrors(errors.length > 0);
    } catch (error) {
      console.error('Error validating schema:', error);
    }
  };

  // Check for common Zod-specific issues
  const checkZodSpecificIssues = (schemaCode: string): monaco.editor.IMarkerData[] => {
    if (!monacoRef.current) return [];

    const monaco = monacoRef.current;
    const errors: monaco.editor.IMarkerData[] = [];
    const lines = schemaCode.split('\n');

    // Check for missing 'z' prefix - only match standalone method calls, not ones that are part of a property
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for method calls without 'z' prefix - exclude when they're part of an object property
      const methodWithoutZRegex = /(?<!\w[:.])\b(string|number|boolean|array|object|enum|literal|union|intersection|tuple|record|map|set|date|null|undefined|any|unknown|void|never)\(\)/g;
      let match;

      while ((match = methodWithoutZRegex.exec(line)) !== null) {
        errors.push({
          severity: monaco.MarkerSeverity.Error,
          message: `Missing 'z' prefix: Use 'z.${match[1]}()' instead of '${match[0]}'`,
          startLineNumber: i + 1,
          startColumn: match.index + 1,
          endLineNumber: i + 1,
          endColumn: match.index + match[0].length + 1
        });
      }
    }

    // Check for unbalanced brackets and parentheses across the entire schema
    const openBrackets = (schemaCode.match(/\{/g) || []).length;
    const closeBrackets = (schemaCode.match(/\}/g) || []).length;
    const openParens = (schemaCode.match(/\(/g) || []).length;
    const closeParens = (schemaCode.match(/\)/g) || []).length;
    const openSquare = (schemaCode.match(/\[/g) || []).length;
    const closeSquare = (schemaCode.match(/\]/g) || []).length;

    // Only report unbalanced brackets if there's an actual imbalance
    if (openBrackets > closeBrackets) {
      // Find the last line with an opening bracket
      let lastOpenBracketLine = 0;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes('{')) {
          lastOpenBracketLine = i;
          break;
        }
      }

      errors.push({
        severity: monaco.MarkerSeverity.Warning,
        message: `Missing closing curly bracket '}'`,
        startLineNumber: lastOpenBracketLine + 1,
        startColumn: lines[lastOpenBracketLine].lastIndexOf('{') + 2,
        endLineNumber: lastOpenBracketLine + 1,
        endColumn: lines[lastOpenBracketLine].lastIndexOf('{') + 3
      });
    }

    if (openParens > closeParens) {
      // Find the last line with an opening parenthesis
      let lastOpenParenLine = 0;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes('(')) {
          lastOpenParenLine = i;
          break;
        }
      }

      errors.push({
        severity: monaco.MarkerSeverity.Warning,
        message: `Missing closing parenthesis ')'`,
        startLineNumber: lastOpenParenLine + 1,
        startColumn: lines[lastOpenParenLine].lastIndexOf('(') + 2,
        endLineNumber: lastOpenParenLine + 1,
        endColumn: lines[lastOpenParenLine].lastIndexOf('(') + 3
      });
    }

    if (openSquare > closeSquare) {
      // Find the last line with an opening square bracket
      let lastOpenSquareLine = 0;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes('[')) {
          lastOpenSquareLine = i;
          break;
        }
      }

      errors.push({
        severity: monaco.MarkerSeverity.Warning,
        message: `Missing closing square bracket ']'`,
        startLineNumber: lastOpenSquareLine + 1,
        startColumn: lines[lastOpenSquareLine].lastIndexOf('[') + 2,
        endLineNumber: lastOpenSquareLine + 1,
        endColumn: lines[lastOpenSquareLine].lastIndexOf('[') + 3
      });
    }

    return errors;
  };

  const handleSelectSample = (sampleSchema: string) => {
    setSchema(sampleSchema);
    onSchemaChange(sampleSchema);

    // Validate the selected sample schema
    setTimeout(() => {
      validateSchema(sampleSchema);
    }, 0);
  };

  const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVersion = e.target.value;
    setZodVersion(newVersion);
    if (onZodVersionChange) {
      onZodVersionChange(newVersion);
    }

    // Re-validate the schema with the new Zod version
    if (schema) {
      setTimeout(() => {
        validateSchema(schema);
      }, 0);
    }
  };

  // Configure Monaco editor with Zod auto-completion
  const handleEditorBeforeMount = (monaco: typeof import('monaco-editor')) => {
    // Store monaco reference
    monacoRef.current = monaco;

    // Register a new language
    monaco.languages.register({ id: 'zod' });

    // Define a light theme for Zod
    monaco.editor.defineTheme('zodLightTheme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'zod-prefix', foreground: '#0000ff', fontStyle: 'bold' },
        { token: 'zod-method', foreground: '#267f99', fontStyle: 'bold' },
        { token: 'string', foreground: '#a31515' },
        { token: 'number', foreground: '#098658' },
        { token: 'delimiter', foreground: '#000000' },
        { token: 'boolean', foreground: '#0000ff' },
        { token: 'keyword', foreground: '#af00db' },
        { token: 'comment', foreground: '#008000', fontStyle: 'italic' },
        { token: 'variable', foreground: '#001080' },
        { token: 'function', foreground: '#795e26' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#000000',
        'editorCursor.foreground': '#000000',
        'editor.lineHighlightBackground': '#f5f5f5',
        'editorLineNumber.foreground': '#237893',
        'editor.selectionBackground': '#add6ff',
        'editor.inactiveSelectionBackground': '#e5ebf1',
      }
    });

    // Define a dark theme for Zod
    monaco.editor.defineTheme('zodDarkTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'zod-prefix', foreground: '#569cd6', fontStyle: 'bold' },
        { token: 'zod-method', foreground: '#4ec9b0', fontStyle: 'bold' },
        { token: 'string', foreground: '#ce9178' },
        { token: 'number', foreground: '#b5cea8' },
        { token: 'delimiter', foreground: '#d4d4d4' },
        { token: 'boolean', foreground: '#569cd6' },
        { token: 'keyword', foreground: '#c586c0' },
        { token: 'comment', foreground: '#6a9955', fontStyle: 'italic' },
        { token: 'variable', foreground: '#9cdcfe' },
        { token: 'function', foreground: '#dcdcaa' },
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

    // Register a tokens provider for the language
    monaco.languages.setMonarchTokensProvider('zod', {
      tokenizer: {
        root: [
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          [/z\./, 'zod-prefix'],
          [/\.[a-zA-Z]+/, 'zod-method'],
          [/"(?:\\.|[^"\\])*"/, 'string'],
          [/'(?:\\.|[^'\\])*'/, 'string'],
          [/\d+(\.\d+)?([eE][\-+]?\d+)?/, 'number'],
          [/\{|\}|\(|\)|\[|\]|,|;/, 'delimiter'],
          [/true|false/, 'boolean'],
          [/const|let|var|function|return|if|else|for|while|switch|case|break|continue|new|this|typeof|instanceof/, 'keyword'],
          [/[a-zA-Z_]\w*(?=\s*\()/, 'function'],
          [/[a-zA-Z_]\w*/, 'variable'],
        ],
        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],
      },
    });

    // Register a completion item provider for the language
    monaco.languages.registerCompletionItemProvider('zod', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        return {
          suggestions: ZOD_SUGGESTIONS.map(suggestion => ({
            label: suggestion.label,
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: suggestion.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: suggestion.detail,
          })),
        };
      },
    });
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <label htmlFor="schema" className="block text-sm font-medium text-gray-700">
          Zod Schema
        </label>
        <div className="flex items-center">
          <label htmlFor="zodVersion" className="block text-sm font-medium text-gray-700 mr-2">
            Zod Version:
          </label>
          <select
            id="zodVersion"
            name="zodVersion"
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            value={zodVersion}
            onChange={handleVersionChange}
          >
            {ZOD_VERSIONS.map((version) => (
              <option key={version.value} value={version.value}>
                {version.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <SampleSchemas onSelectSchema={handleSelectSample} />
      <div className="border border-gray-300 rounded-md overflow-hidden">
        <Editor
          height="300px"
          language="zod"
          value={schema}
          onChange={handleEditorChange}
          beforeMount={handleEditorBeforeMount}
          theme="zodLightTheme"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            suggestOnTriggerCharacters: true,
          }}
          onMount={(editor) => {
            editorRef.current = editor;
            // Validate initial schema if any
            if (schema) {
              validateSchema(schema);
            }
          }}
        />
      </div>
      {hasErrors && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400 dark:text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Syntax errors detected in your schema</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <ul className="list-disc pl-5 space-y-1">
                  {syntaxErrors.slice(0, 3).map((error, index) => (
                    <li key={index}>
                      <button
                        className="text-left hover:underline focus:outline-none focus:ring-1 focus:ring-red-500 rounded"
                        onClick={() => {
                          if (editorRef.current) {
                            editorRef.current.revealLineInCenter(error.startLineNumber);
                            editorRef.current.setPosition({
                              lineNumber: error.startLineNumber,
                              column: error.startColumn
                            });
                            editorRef.current.focus();
                          }
                        }}
                      >
                        <span className="font-medium">Line {error.startLineNumber}:</span> {error.message}
                      </button>
                    </li>
                  ))}
                  {syntaxErrors.length > 3 && (
                    <li>And {syntaxErrors.length - 3} more error(s)...</li>
                  )}
                </ul>
              </div>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                Fix these errors to ensure your schema works correctly.
              </p>
            </div>
          </div>
        </div>
      )}
      <p className="mt-2 text-sm text-gray-500">
        Write your Zod schema to validate API responses against, or select a sample schema above.
        Use auto-completion for Zod methods by typing 'z.' or pressing Ctrl+Space.
      </p>
    </div>
  );
};

export default SchemaInput;
