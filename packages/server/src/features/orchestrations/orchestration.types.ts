export type OrchestratorResponse =
  | {
      type: "follow_up_questions";
      questions: OrchestratorQuestion[];
    }
  | {
      type: "plan";
      plan: OrchestratorPlan;
    };

export interface OrchestratorQuestion {
  id: string;
  question: string;
  context?: string;
  required: boolean;
}

export interface OrchestratorPlan {
  primaryObjective: string;
  summary: string;
  steps: PlanStep[];
  subAgents: PlanSubAgent[];
}

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  deliverables: string[];
}

export interface PlanSubAgent {
  id: string;
  name: string;
  scope: string;
  instructions: string;
  tasks: PlanSubAgentTask[];
}

export interface PlanSubAgentTask {
  id: string;
  title: string;
  details: string;
  acceptanceCriteria: string[];
}
