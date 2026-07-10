export type Domain = 'ai' | 'cloud' | 'cybersecurity' | 'devops' | 'data_science'

export type CorrectAnswer = 'A' | 'B' | 'C' | 'D'

// Shape stored in Supabase (includes correct_answer — server only)
export interface Question {
  id: string
  domain: Domain
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: CorrectAnswer
  created_at: string
}

// Shape sent to the client (correct_answer stripped out)
export interface ClientQuestion {
  id: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
}

export interface TestResult {
  id: string
  user_id: string
  user_email: string
  domain: Domain
  score: number
  time_taken_seconds: number
  completed_at: string
}

export interface SubmitResultPayload {
  domain: Domain
  attempt_id: string
  answers: Record<string, CorrectAnswer> // question_id -> chosen answer
  // Client-computed elapsed test time in seconds, already reduced by any
  // paused (interstitial-open) duration. Server clamps into a wall-clock
  // sanity window before recording it.
  time_taken_seconds?: number
}
