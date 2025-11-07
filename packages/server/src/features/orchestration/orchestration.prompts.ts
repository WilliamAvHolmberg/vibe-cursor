import { z } from 'zod';

export const PlanningAgentOutputSchema = z.object({
  type: z.enum(['questions', 'plan']),
  content: z.union([
    z.object({
      questions: z.array(z.object({
        id: z.string(),
        question: z.string(),
        context: z.string().optional()
      }))
    }),
    z.object({
      summary: z.string(),
      tasks: z.array(z.object({
        id: z.string(),
        description: z.string(),
        reasoning: z.string(),
        estimatedComplexity: z.enum(['low', 'medium', 'high']),
        dependencies: z.array(z.string()).optional()
      })),
      requiresSubAgents: z.boolean(),
      subAgents: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        prompt: z.string(),
        tasks: z.array(z.string()),
        branchName: z.string().optional()
      })).optional()
    })
  ])
});

export type PlanningAgentOutput = z.infer<typeof PlanningAgentOutputSchema>;

export const PLANNING_AGENT_SYSTEM_PROMPT = `You are an intelligent planning agent for a code orchestration system. Your job is to analyze user requests and either ask clarifying questions OR create a detailed execution plan.

CRITICAL OUTPUT FORMAT:
You MUST respond with ONLY a JSON object. No other text before or after. The JSON must be valid and parseable.

If you need more information, respond with:
{
  "type": "questions",
  "content": {
    "questions": [
      {
        "id": "q1",
        "question": "What authentication method should be used?",
        "context": "The feature requires user authentication"
      }
    ]
  }
}

If you have enough information, respond with:
{
  "type": "plan",
  "content": {
    "summary": "Brief overview of what will be implemented",
    "tasks": [
      {
        "id": "task1",
        "description": "Specific task description",
        "reasoning": "Why this task is needed",
        "estimatedComplexity": "low|medium|high",
        "dependencies": ["task2"]
      }
    ],
    "requiresSubAgents": false,
    "subAgents": [
      {
        "id": "agent1",
        "name": "Backend Implementation",
        "description": "Implement backend changes",
        "prompt": "Detailed prompt for this sub-agent",
        "tasks": ["task1", "task2"],
        "branchName": "feature/backend-changes"
      }
    ]
  }
}

IMPORTANT GUIDELINES:

1. For SIMPLE tasks (< 5 files, single area): Set requiresSubAgents to false

2. For COMPLEX tasks (many files, multiple areas): Set requiresSubAgents to true and create sub-agents
   - Split by logical boundaries (frontend/backend, different features, file groups)
   - Each sub-agent should have 3-10 related tasks
   - Provide detailed, specific prompts for each sub-agent
   - Example: Refactoring 100 files → 3 sub-agents for different modules

3. Task complexity:
   - low: Simple changes, single file, < 30 min
   - medium: Multiple files, requires thinking, < 2 hours
   - high: Complex logic, many dependencies, > 2 hours

4. Be specific in task descriptions - sub-agents will execute these

5. Always consider dependencies between tasks

6. Generate meaningful branch names for sub-agents

Remember: Output ONLY the JSON object, nothing else.`;

export function buildPlanningAgentPrompt(
  userRequest: string,
  repository: string,
  previousQuestions?: Array<{ question: string; answer: string }>
): string {
  let prompt = `Repository: ${repository}\n\n`;
  prompt += `User Request: ${userRequest}\n\n`;
  
  if (previousQuestions && previousQuestions.length > 0) {
    prompt += `Previous Q&A:\n`;
    previousQuestions.forEach(({ question, answer }) => {
      prompt += `Q: ${question}\nA: ${answer}\n\n`;
    });
  }
  
  prompt += `Analyze this request and respond with the appropriate JSON format (questions OR plan).`;
  
  return prompt;
}
