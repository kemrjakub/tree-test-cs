
export interface CategoryNode {
  name: string;
  children?: CategoryNode[];
}

export interface TestResult {
  session_id?: string;    // pro Supabase
  user_id?: string;       // pro Supabase
  userId?: string;        // pro starší kód
  questionIndex: number;
  target_found?: string;  // pro Supabase
  targetFound?: string;   // pro starší kód
  full_history?: string[]; // pro Supabase
  fullHistory?: string[];  // pro starší kód
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
