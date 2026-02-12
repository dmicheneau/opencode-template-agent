import {
  Agent,
  AgentRequest,
  AgentResponse,
  AgentConfig,
  Tool,
} from './types';

/**
 * Primary Agent - Main coordinator that can delegate tasks to subagents
 * 
 * This agent serves as the entry point for user requests and can:
 * - Handle complex multi-step tasks
 * - Delegate specialized work to subagents
 * - Coordinate between multiple subagents
 * - Maintain overall task context
 */
export class PrimaryAgent implements Agent {
  id: string;
  name: string;
  description: string;
  private config: AgentConfig;
  private tools: Tool[];
  private subagents: Map<string, Agent>;

  constructor(config: AgentConfig) {
    this.id = 'primary-agent';
    this.name = 'Primary Agent';
    this.description = 'Main agent that coordinates tasks and delegates to subagents';
    this.config = config;
    this.tools = [];
    this.subagents = new Map();
  }

  /**
   * Register a subagent that this primary agent can delegate to
   */
  registerSubagent(agent: Agent): void {
    this.subagents.set(agent.id, agent);
    if (this.config.debug) {
      console.log(`Registered subagent: ${agent.name} (${agent.id})`);
    }
  }

  /**
   * Register a tool that this agent can use
   */
  registerTool(tool: Tool): void {
    this.tools.push(tool);
    if (this.config.debug) {
      console.log(`Registered tool: ${tool.name}`);
    }
  }

  /**
   * Get all available tools
   */
  getTools(): Tool[] {
    return this.tools;
  }

  /**
   * Process a user request
   */
  async process(request: AgentRequest): Promise<AgentResponse> {
    if (this.config.debug) {
      console.log(`Primary Agent processing request: ${request.message}`);
    }

    try {
      // Step 1: Analyze the request
      const analysis = await this.analyzeRequest(request);

      // Step 2: Determine if delegation is needed
      if (analysis.requiresSubagent) {
        return await this.delegateToSubagent(request, analysis.suggestedSubagent);
      }

      // Step 3: Handle directly with available tools
      return await this.handleDirectly(request);
    } catch (error) {
      return {
        message: `Error processing request: ${error instanceof Error ? error.message : String(error)}`,
        success: false,
      };
    }
  }

  /**
   * Analyze the request to determine how to handle it
   */
  private async analyzeRequest(request: AgentRequest): Promise<{
    requiresSubagent: boolean;
    suggestedSubagent?: string;
  }> {
    // Simple heuristics for demonstration
    // In a real implementation, this would use LLM reasoning
    const message = request.message.toLowerCase();

    // Check if request mentions specialized tasks
    if (message.includes('test') || message.includes('testing')) {
      return { requiresSubagent: true, suggestedSubagent: 'test-agent' };
    }

    if (message.includes('document') || message.includes('readme')) {
      return { requiresSubagent: true, suggestedSubagent: 'docs-agent' };
    }

    if (message.includes('review') || message.includes('code review')) {
      return { requiresSubagent: true, suggestedSubagent: 'review-agent' };
    }

    return { requiresSubagent: false };
  }

  /**
   * Delegate request to a specific subagent
   */
  private async delegateToSubagent(
    request: AgentRequest,
    subagentId?: string
  ): Promise<AgentResponse> {
    if (!subagentId || !this.subagents.has(subagentId)) {
      // No suitable subagent, handle directly
      return await this.handleDirectly(request);
    }

    const subagent = this.subagents.get(subagentId)!;
    
    if (this.config.debug) {
      console.log(`Delegating to subagent: ${subagent.name}`);
    }

    try {
      const response = await subagent.process(request);
      return {
        ...response,
        message: `[Delegated to ${subagent.name}]\n\n${response.message}`,
      };
    } catch (error) {
      return {
        message: `Subagent error: ${error instanceof Error ? error.message : String(error)}`,
        success: false,
      };
    }
  }

  /**
   * Handle the request directly using available tools
   */
  private async handleDirectly(request: AgentRequest): Promise<AgentResponse> {
    // This is a template implementation
    // In a real agent, this would:
    // 1. Use LLM to understand the request
    // 2. Plan tool usage
    // 3. Execute tools
    // 4. Format response

    return {
      message: `Primary agent processed: ${request.message}\n\nThis is a template response. Implement your custom logic here.`,
      success: true,
      context: request.context,
    };
  }
}
