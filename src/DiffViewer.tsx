import { useMemo } from 'react';
import { DiffFile } from './types';
import { SideBySideDiff } from './SideBySideDiff';

interface DiffViewerProps {
  files: DiffFile[];
}

export const DiffViewer = ({ files }: DiffViewerProps) => {
  // Calculate statistics for each file
  const fileStats = useMemo(() => {
    return files.map(file => {
      const additions = file.changes.filter(line => line.startsWith('+')).length;
      const deletions = file.changes.filter(line => line.startsWith('-')).length;
      return { 
        filename: file.filename, 
        additions, 
        deletions 
      };
    });
  }, [files]);

  // Calculate total statistics
  const totalStats = useMemo(() => {
    return fileStats.reduce((acc, stat) => {
      return {
        additions: acc.additions + stat.additions,
        deletions: acc.deletions + stat.deletions
      };
    }, { additions: 0, deletions: 0 });
  }, [fileStats]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-800">Changed Files ({files.length})</h3>
        <div className="flex gap-3 text-sm">
          <span className="text-green-600 font-medium">+{totalStats.additions}</span>
          <span className="text-red-600 font-medium">-{totalStats.deletions}</span>
        </div>
      </div>
      
      {files.map((file, fileIndex) => (
        <div key={file.filename} className="border-t pt-3">
          <div className="font-mono text-sm mb-2 text-gray-800">
            {file.filename}
          </div>
          
          <div className="font-mono text-xs">
            <SideBySideDiff 
              changes={file.changes} 
              showSideBySide={true} 
            />
          </div>
        </div>
      ))}
    </div>
  );
}; 