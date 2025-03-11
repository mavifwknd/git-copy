import { useMemo } from 'react';

interface SideBySideDiffProps {
  changes: string[];
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'info';
  content: string;
  lineNumber?: number;
}

export const SideBySideDiff = ({ changes }: SideBySideDiffProps) => {
  // Parse the diff lines into a structured format
  const parsedLines = useMemo(() => {
    const lines: DiffLine[] = [];
    let leftLineNumber = 1;
    let rightLineNumber = 1;

    changes.forEach(line => {
      if (line.startsWith('+')) {
        lines.push({
          type: 'added',
          content: line.substring(1),
          lineNumber: rightLineNumber++
        });
      } else if (line.startsWith('-')) {
        lines.push({
          type: 'removed',
          content: line.substring(1),
          lineNumber: leftLineNumber++
        });
      } else if (line.startsWith('@@ ')) {
        const match = line.match(/@@ -(\d+),\d+ \+(\d+),\d+ @@/);
        if (match) {
          leftLineNumber = parseInt(match[1], 10);
          rightLineNumber = parseInt(match[2], 10);
        }
        // We're creating an info line just to update line numbers, but we won't display it
        lines.push({
          type: 'info',
          content: '' // Empty content since we won't display it
        });
      } else {
        lines.push({
          type: 'unchanged',
          content: line,
          lineNumber: leftLineNumber++
        });
        rightLineNumber++;
      }
    });

    return lines;
  }, [changes]);

  // Filter out info lines and prepare for unified view
  const unifiedLines = useMemo(() => {
    return parsedLines.filter(line => line.type !== 'info');
  }, [parsedLines]);

  // Render unified view
  return (
    <div className="font-mono text-xs">
      {/* Content with horizontal scrolling */}
      <div className="overflow-x-auto">
        {unifiedLines.map((line, index) => (
          <div key={index} className="flex">
            <span className="w-12 text-gray-500 select-none text-right pr-2 flex-shrink-0 inline-block">
              {line.lineNumber || ''}
            </span>
            <pre 
              className={`
                w-full pl-2 whitespace-pre-wrap break-words
                ${line.type === 'added' ? 'bg-green-50 text-green-600' : ''}
                ${line.type === 'removed' ? 'bg-red-50 text-red-600' : ''}
              `}
            >
              {line.content}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}; 