import React, { useState, useMemo } from "react";
import { diffLines } from "diff";

interface DiffViewerProps {
    oldText?: string;
    newText?: string;
    title?: string;
    oldLabel?: string;
    newLabel?: string;
    filename?: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ 
    oldText = '', 
    newText = '', 
    title = 'Diff Viewer',
    oldLabel = 'Old Version',
    newLabel = 'New Version',
    filename = 'schema.js'
}) => {
    const [viewMode, setViewMode] = useState<'unified' | 'side-by-side'>('unified');

    // Memoize the diff calculation to avoid recalculating on every render
    const diffs = useMemo(() => diffLines(oldText, newText), [oldText, newText]);

    // Calculate stats for the header
    const stats = useMemo(() => {
        let additions = 0;
        let deletions = 0;

        diffs.forEach(part => {
            const lines = part.value.split('\n').filter(line => line.length > 0);
            if (part.added) additions += lines.length;
            if (part.removed) deletions += lines.length;
        });

        return { additions, deletions };
    }, [diffs]);

    // Process the diffs to add line numbers
    const processedDiffs = useMemo(() => {
        let oldLineNumber = 1;
        let newLineNumber = 1;

        return diffs.map(part => {
            const lines = part.value.split('\n');
            // Remove the last empty line that comes from splitting a string that ends with \n
            if (lines[lines.length - 1] === '') {
                lines.pop();
            }

            const processedLines = lines.map(line => {
                const result = {
                    content: line,
                    oldLineNumber: part.removed ? oldLineNumber++ : null,
                    newLineNumber: part.added ? newLineNumber++ : null
                };

                if (!part.added && !part.removed) {
                    result.oldLineNumber = oldLineNumber++;
                    result.newLineNumber = newLineNumber++;
                }

                return result;
            });

            return {
                ...part,
                lines: processedLines
            };
        });
    }, [diffs]);

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">
            {/* GitHub-style file header */}
            <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center px-3 py-2">
                    {/* File icon */}
                    <svg className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                        <path fillRule="evenodd" d="M3.75 1.5a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25V4.664a.25.25 0 00-.073-.177l-2.914-2.914a.25.25 0 00-.177-.073H3.75zM2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0112.25 16h-8.5A1.75 1.75 0 012 14.25V1.75z"></path>
                    </svg>

                    {/* Filename */}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{filename}</span>

                    {/* Stats badges */}
                    <div className="ml-auto flex items-center space-x-2">
                        {stats.additions > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                +{stats.additions}
                            </span>
                        )}
                        {stats.deletions > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                -{stats.deletions}
                            </span>
                        )}
                    </div>
                </div>

                {/* View mode selector */}
                <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-1.5 flex justify-between items-center bg-gray-50 dark:bg-gray-750">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</h3>
                    <div className="flex space-x-2">
                        <button 
                            onClick={() => setViewMode('unified')} 
                            className={`px-2 py-0.5 text-xs rounded transition-colors ${
                                viewMode === 'unified' 
                                    ? 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100' 
                                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                            }`}
                        >
                            Unified
                        </button>
                        <button 
                            onClick={() => setViewMode('side-by-side')} 
                            className={`px-2 py-0.5 text-xs rounded transition-colors ${
                                viewMode === 'side-by-side' 
                                    ? 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100' 
                                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                            }`}
                        >
                            Split
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'unified' ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-spacing-0">
                        <tbody className="font-mono">
                            {processedDiffs.flatMap((part, partIndex) => 
                                part.lines.map((line, lineIndex) => (
                                    <tr 
                                        key={`${partIndex}-${lineIndex}`}
                                        className={
                                            part.added
                                                ? 'bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20'
                                                : part.removed
                                                    ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20'
                                                    : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }
                                    >
                                        {/* Left border indicator for added/removed lines */}
                                        <td className={`w-1 p-0 ${
                                            part.added 
                                                ? 'bg-green-500 dark:bg-green-600' 
                                                : part.removed 
                                                    ? 'bg-red-500 dark:bg-red-600' 
                                                    : ''
                                        }`}></td>

                                        {/* Line numbers */}
                                        <td className="w-[40px] py-0 pr-2 pl-3 text-right text-gray-400 dark:text-gray-500 select-none text-xs border-r border-gray-200 dark:border-gray-700 align-top">
                                            {line.oldLineNumber || ' '}
                                        </td>
                                        <td className="w-[40px] py-0 px-2 text-right text-gray-400 dark:text-gray-500 select-none text-xs border-r border-gray-200 dark:border-gray-700 align-top">
                                            {line.newLineNumber || ' '}
                                        </td>

                                        {/* Content with leading character indicator */}
                                        <td className="py-0 pl-2 pr-4 whitespace-pre align-top">
                                            <div className="flex">
                                                <span className={`select-none w-4 flex-shrink-0 ${
                                                    part.added
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : part.removed
                                                            ? 'text-red-600 dark:text-red-400'
                                                            : 'text-gray-300 dark:text-gray-600'
                                                }`}>
                                                    {part.added ? '+' : part.removed ? '-' : ' '}
                                                </span>
                                                <span className={
                                                    part.added
                                                        ? 'text-green-800 dark:text-green-200'
                                                        : part.removed
                                                            ? 'text-red-800 dark:text-red-200'
                                                            : 'text-gray-800 dark:text-gray-200'
                                                }>
                                                    {line.content}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                    {/* Left side (old) */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-spacing-0">
                            <tbody className="font-mono">
                                {processedDiffs.flatMap((part, partIndex) => 
                                    part.lines.filter(line => line.oldLineNumber !== null).map((line, lineIndex) => (
                                        <tr 
                                            key={`old-${partIndex}-${lineIndex}`}
                                            className={
                                                part.removed
                                                    ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20'
                                                    : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }
                                        >
                                            {/* Left border indicator for removed lines */}
                                            <td className={`w-1 p-0 ${
                                                part.removed ? 'bg-red-500 dark:bg-red-600' : ''
                                            }`}></td>

                                            {/* Line number */}
                                            <td className="w-[40px] py-0 pr-2 pl-3 text-right text-gray-400 dark:text-gray-500 select-none text-xs border-r border-gray-200 dark:border-gray-700 align-top">
                                                {line.oldLineNumber}
                                            </td>

                                            {/* Content with leading character indicator */}
                                            <td className="py-0 pl-2 pr-4 whitespace-pre align-top">
                                                <div className="flex">
                                                    <span className={`select-none w-4 flex-shrink-0 ${
                                                        part.removed
                                                            ? 'text-red-600 dark:text-red-400'
                                                            : 'text-gray-300 dark:text-gray-600'
                                                    }`}>
                                                        {part.removed ? '-' : ' '}
                                                    </span>
                                                    <span className={
                                                        part.removed
                                                            ? 'text-red-800 dark:text-red-200'
                                                            : 'text-gray-800 dark:text-gray-200'
                                                    }>
                                                        {line.content}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Right side (new) */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-spacing-0">
                            <tbody className="font-mono">
                                {processedDiffs.flatMap((part, partIndex) => 
                                    part.lines.filter(line => line.newLineNumber !== null).map((line, lineIndex) => (
                                        <tr 
                                            key={`new-${partIndex}-${lineIndex}`}
                                            className={
                                                part.added
                                                    ? 'bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20'
                                                    : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }
                                        >
                                            {/* Left border indicator for added lines */}
                                            <td className={`w-1 p-0 ${
                                                part.added ? 'bg-green-500 dark:bg-green-600' : ''
                                            }`}></td>

                                            {/* Line number */}
                                            <td className="w-[40px] py-0 pr-2 pl-3 text-right text-gray-400 dark:text-gray-500 select-none text-xs border-r border-gray-200 dark:border-gray-700 align-top">
                                                {line.newLineNumber}
                                            </td>

                                            {/* Content with leading character indicator */}
                                            <td className="py-0 pl-2 pr-4 whitespace-pre align-top">
                                                <div className="flex">
                                                    <span className={`select-none w-4 flex-shrink-0 ${
                                                        part.added
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-gray-300 dark:text-gray-600'
                                                    }`}>
                                                        {part.added ? '+' : ' '}
                                                    </span>
                                                    <span className={
                                                        part.added
                                                            ? 'text-green-800 dark:text-green-200'
                                                            : 'text-gray-800 dark:text-gray-200'
                                                    }>
                                                        {line.content}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sample usage for testing
const sampleOldText = `Line 1\nLine 2\nLine 3`;
const sampleNewText = `Line 1\nLine 2 changed\nLine 4`;

export const SampleDiff = () => (
    <DiffViewer 
        oldText={sampleOldText} 
        newText={sampleNewText} 
        filename="example.js"
        title="Sample Diff"
        oldLabel="Previous Version"
        newLabel="Current Version"
    />
);

export default DiffViewer;
