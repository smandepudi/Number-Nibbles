
export interface GeneratedProblem {
  problem: string;
  answer: string;
  image?: string;
}

export interface ApiResponse {
    problems: GeneratedProblem[];
}
