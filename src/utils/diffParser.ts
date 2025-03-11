import { DiffFile } from '../types';

/**
 * Parses raw Git diff output into structured format
 * @param rawDiff The raw diff output from Git
 * @returns Array of DiffFile objects
 */
export function parseDiff(rawDiff: string): DiffFile[] {
  if (!rawDiff || rawDiff.trim() === '') {
    return [];
  }

  const files: DiffFile[] = [];
  let currentFile: DiffFile | null = null;
  const lines = rawDiff.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for file headers
    if (line.startsWith('diff --git')) {
      // Save previous file if exists
      if (currentFile) {
        files.push(currentFile);
      }

      // Extract filename from the diff header
      const filenameMatch = line.match(/diff --git a\/(.*) b\/(.*)/);
      const filename = filenameMatch ? filenameMatch[2] : 'unknown-file';

      // Determine file status
      let status: 'added' | 'modified' | 'deleted' = 'modified';
      
      // Look ahead to determine file status
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].startsWith('new file')) {
          status = 'added';
          break;
        } else if (lines[j].startsWith('deleted file')) {
          status = 'deleted';
          break;
        }
      }

      currentFile = {
        filename,
        status,
        changes: []
      };
    } 
    // Skip binary file messages and index lines
    else if (line.includes('Binary files') || line.startsWith('index ')) {
      continue;
    }
    // Skip file mode changes and other metadata
    else if (line.startsWith('old mode') || line.startsWith('new mode') || 
             line.startsWith('similarity index') || line.startsWith('rename from') || 
             line.startsWith('rename to') || line.startsWith('copy from') || 
             line.startsWith('copy to')) {
      continue;
    }
    // Collect changes for the current file
    else if (currentFile) {
      // Only include lines that are part of the actual diff content
      // This includes hunk headers (@@ lines), additions, deletions, and context
      if (line.startsWith('@@') || line.startsWith('+') || line.startsWith('-') || line.trim() === '' || 
          (!line.startsWith('+') && !line.startsWith('-') && !line.startsWith('diff'))) {
        currentFile.changes.push(line);
      }
    }
  }

  // Add the last file
  if (currentFile) {
    files.push(currentFile);
  }

  return files;
} 