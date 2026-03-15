export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface Question {
  id: number;
  text: string;
  options: string[];
  order: number;
  explanation?: string;
  correct_option_index?: number; // only present in results
}

export interface Quiz {
  id: number;
  title: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  num_questions: number;
  questions?: Question[];
  question_count?: number;
  attempt_count?: number;
  created_at: string;
}

export interface Answer {
  id: number;
  question_id: number;
  question_text: string;
  question_options: string[];
  selected_option_index: number | null;
  correct_option_index: number;
  explanation: string;
  is_correct: boolean;
  question_order: number;
}

export interface QuizAttempt {
  id: number;
  quiz: number;
  quiz_title: string;
  quiz_topic: string;
  quiz_difficulty: string;
  status: 'in_progress' | 'completed';
  score: number | null;
  total_questions: number;
  score_percentage: number;
  answers?: Answer[];
  started_at: string;
  completed_at: string | null;
}
