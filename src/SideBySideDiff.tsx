import { useMemo } from 'react';

interface SideBySideDiffProps {
  changes: string[];
  showSideBySide: boolean;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'info';
  content: string;
  lineNumber?: number;
}

interface SideBySideLine {
  left: DiffLine | null;
  right: DiffLine | null;
}

export const SideBySideDiff = ({ changes, showSideBySide }: SideBySideDiffProps) => {
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
        // Parse the line numbers from the hunk header
        const match = line.match(/@@ -(\d+),\d+ \+(\d+),\d+ @@/);
        if (match) {
          leftLineNumber = parseInt(match[1], 10);
          rightLineNumber = parseInt(match[2], 10);
        }
        lines.push({
          type: 'info',
          content: line
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

  // Convert parsed lines to side-by-side format
  const sideBySideLines = useMemo(() => {
    const result: SideBySideLine[] = [];
    let i = 0;

    while (i < parsedLines.length) {
      const line = parsedLines[i];

      if (line.type === 'info') {
        result.push({ left: line, right: null });
        i++;
        continue;
      }

      if (line.type === 'unchanged') {
        result.push({ 
          left: line, 
          right: { ...line, lineNumber: line.lineNumber } 
        });
        i++;
        continue;
      }

      if (line.type === 'removed') {
        // Look ahead for an 'added' line
        const nextLine = i + 1 < parsedLines.length ? parsedLines[i + 1] : null;
        
        if (nextLine && nextLine.type === 'added') {
          // This is a modification - show side by side
          result.push({ 
            left: line, 
            right: nextLine 
          });
          i += 2;
        } else {
          // This is a deletion - show only on left
          result.push({ 
            left: line, 
            right: null 
          });
          i++;
        }
        continue;
      }

      if (line.type === 'added') {
        // This is an addition - show only on right
        result.push({ 
          left: null, 
          right: line 
        });
        i++;
      }
    }

    return result;
  }, [parsedLines]);

  // Render side-by-side view
  return (
    <div className="font-mono text-xs overflow-x-auto">
      <div className="flex">
        <div className="w-1/2 pr-4">
          <div className="flex mb-1">
            <span className="w-8 text-right pr-2 text-gray-500">Line</span>
            <span className="pl-2 text-gray-500">Old</span>
          </div>
        </div>
        <div className="w-1/2">
          <div className="flex mb-1">
            <span className="w-8 text-right pr-2 text-gray-500">Line</span>
            <span className="pl-2 text-gray-500">New</span>
          </div>
        </div>
      </div>
      
      {sideBySideLines.map((line, index) => {
        // Special case for info lines
        if (line.left?.type === 'info') {
          return (
            <div key={index} className="flex">
              <div className="w-full">
                <pre className="text-blue-600 w-full pl-2">{line.left.content}</pre>
              </div>
            </div>
          );
        }
        
        return (
          <div key={index} className="flex">
            {/* Left side */}
            <div className="w-1/2 pr-4">
              {line.left ? (
                <div className="flex">
                  <span className="w-8 text-gray-500 select-none text-right pr-2">
                    {line.left.lineNumber || ''}
                  </span>
                  <pre className={`${line.left.type === 'removed' ? 'text-red-600' : ''} w-full pl-2`}>
                    {line.left.content}
                  </pre>
                </div>
              ) : (
                <div className="h-5"></div> // Empty placeholder
              )}
            </div>
            
            {/* Right side */}
            <div className="w-1/2">
              {line.right ? (
                <div className="flex">
                  <span className="w-8 text-gray-500 select-none text-right pr-2">
                    {line.right.lineNumber || ''}
                  </span>
                  <pre className={`${line.right.type === 'added' ? 'text-green-600' : ''} w-full pl-2`}>
                    {line.right.content}
                  </pre>
                </div>
              ) : (
                <div className="h-5"></div> // Empty placeholder
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}; 