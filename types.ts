
export interface GeneratedProblem {
  problem: string;
  answer: string;
}

export interface ApiResponse {
    problems: GeneratedProblem[];
}
