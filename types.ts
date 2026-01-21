export interface CategoryNode {
  name: string;
  children?: CategoryNode[];
}

export interface TestResult {
  session_id?: string;
  user_id?: string;
  userId?: string;
  questionIndex: number;
  target_found?: string;
  targetFound?: string;
  full_history?: string[];
  fullHistory?: string[];
  timestamp?: number;
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