import { useMemo, useState } from 'react';
import { DiffFile } from './types';
import { SideBySideDiff } from './SideBySideDiff';

interface DiffViewerProps {
  files: DiffFile[];
}

export const DiffViewer = ({ files }: DiffViewerProps) => {
  // State to track which files are expanded
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>(() => {
    // Initialize with all files expanded
    const initialState: Record<string, boolean> = {};
    files.forEach(file => {
      initialState[file.filename] = true;
    });
    return initialState;
  });

  // State to track if all files are currently expanded
  const [areAllExpanded, setAreAllExpanded] = useState(true);

  // Toggle file expansion
  const toggleFileExpansion = (filename: string) => {
    setExpandedFiles(prev => {
      const newState = {
        ...prev,
        [filename]: !prev[filename]
      };

      // Update areAllExpanded state based on the new state
      const allExpanded = Object.values(newState).every(value => value === true);
      setAreAllExpanded(allExpanded);

      return newState;
    });
  };

  // Toggle all files expansion
  const toggleAllFiles = () => {
    const newExpandedState = !areAllExpanded;
    const newState: Record<string, boolean> = {};

    files.forEach(file => {
      newState[file.filename] = newExpandedState;
    });

    setExpandedFiles(newState);
    setAreAllExpanded(newExpandedState);
  };

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
    <div className="flex flex-col gap-4 py-2">
      <div
        className="flex justify-between items-center px-2 cursor-pointer"
        onClick={toggleAllFiles}
      >
        <span className="flex-1 font-medium text-gray-800">Changed Files ({files.length})</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-green-600 font-medium">+{totalStats.additions}</span>
          <span className="text-red-600 font-medium">-{totalStats.deletions}</span>
          <button className="text-gray-500 hover:text-gray-700">
            {areAllExpanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            )}
          </button>
        </div>
      </div>

      {files.map((file) => {
        // Find stats for this file
        const stats = fileStats.find(stat => stat.filename === file.filename) || { additions: 0, deletions: 0 };

        return (
          <div key={file.filename} className="border rounded overflow-hidden">
            {/* File header with toggle button */}
            <div
              className="flex justify-between items-center w-full p-2 bg-gray-100 cursor-pointer"
              onClick={() => toggleFileExpansion(file.filename)}
            >
              <div className="font-mono text-sm text-gray-800 flex items-center gap-2">
                <span>{file.filename}</span>
                <div className="flex gap-2 text-xs">
                  <span className="text-green-600">+{stats.additions}</span>
                  <span className="text-red-600">-{stats.deletions}</span>
                </div>
              </div>
              <button className="text-gray-500 hover:text-gray-700">
                {expandedFiles[file.filename] ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                )}
              </button>
            </div>

            {/* Collapsible diff content */}
            {expandedFiles[file.filename] && (
              <div className="p-2 border-t">
                <div className="font-mono text-xs">
                  <SideBySideDiff
                    changes={file.changes}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}; 