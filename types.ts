
export interface CategoryNode {
  name: string;
  children?: CategoryNode[];
}

export interface TestResult {
  userId: string;
  questionIndex: number;
  path: string[]; // Final chosen path
  fullHistory: string[]; // Every node name visited (including backtracking)
  targetFound: string;
  timestamp: number;
}

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  isActive: boolean;
  isCompleted: boolean;
  results: TestResult[];
}

export interface Question {
  text: string;
  target: string;
}

export enum AppMode {
  STUDENT = 'student',
  ADMIN = 'admin'
}
