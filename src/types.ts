export interface DiffFile {
  filename: string;
  status: 'added' | 'modified' | 'deleted';
  changes: string[];
}

export interface Commit {
  hash: string;
  message: string;
  date: string;
  author: string;
} 