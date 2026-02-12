import {
  Agent,
  AgentRequest,
  AgentResponse,
  AgentConfig,
  Tool,
} from './types';

/**
 * SubAgent - Specialized agent for focused tasks
 * 
 * This agent is designed to be called by a primary agent and focuses on:
 * - Specific, well-defined tasks
 * - Limited scope operations
 * - Quick, efficient processing
 * - Clear success/failure responses
 */
export class SubAgent implements Agent {
  id: string;
  name: string;
  description: string;
  private config: AgentConfig;
  private tools: Tool[];

  constructor(id: string, name: string, description: string, config: AgentConfig) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.config = config;
    this.tools = [];
  }

  /**
   * Register a tool that this subagent can use
   */
  registerTool(tool: Tool): void {
    this.tools.push(tool);
    if (this.config.debug) {
      console.log(`[${this.name}] Registered tool: ${tool.name}`);
    }
  }

  /**
   * Get all available tools
   */
  getTools(): Tool[] {
    return this.tools;
  }

  /**
   * Process a delegated request
   */
  async process(request: AgentRequest): Promise<AgentResponse> {
    if (this.config.debug) {
      console.log(`[${this.name}] Processing request: ${request.message}`);
    }

    try {
      // Subagent focuses on specific task execution
      const result = await this.executeTask(request);
      
      return {
        message: result.message,
        success: result.success,
        context: request.context,
        toolCalls: result.toolCalls,
        artifacts: result.artifacts,
      };
    } catch (error) {
      return {
        message: `[${this.name}] Error: ${error instanceof Error ? error.message : String(error)}`,
        success: false,
      };
    }
  }

  /**
   * Execute the specific task this subagent is designed for
   * Override this method in concrete subagent implementations
   */
  protected async executeTask(request: AgentRequest): Promise<{
    message: string;
    success: boolean;
    toolCalls?: any[];
    artifacts?: any[];
  }> {
    // Template implementation
    // Override this in specific subagent implementations
    
    return {
      message: `[${this.name}] Completed task: ${request.message}\n\nThis is a template response. Override executeTask() in your subagent implementation.`,
      success: true,
    };
  }

  /**
   * Validate if this subagent can handle the given request
   */
  canHandle(request: AgentRequest): boolean {
    // Override in specific implementations to check if request is suitable
    return true;
  }
}

/**
 * Example specialized subagent implementations
 */

/**
 * Test Agent - Handles test-related tasks
 */
export class TestAgent extends SubAgent {
  constructor(config: AgentConfig) {
    super(
      'test-agent',
      'Test Agent',
      'Specialized agent for writing and running tests',
      config
    );
  }

  canHandle(request: AgentRequest): boolean {
    const message = request.message.toLowerCase();
    return message.includes('test') || message.includes('testing');
  }

  protected async executeTask(request: AgentRequest): Promise<{
    message: string;
    success: boolean;
  }> {
    // Implement test-specific logic here
    return {
      message: `Test Agent executed: Created/ran tests for the requested functionality.`,
      success: true,
    };
  }
}

/**
 * Documentation Agent - Handles documentation tasks
 */
export class DocsAgent extends SubAgent {
  constructor(config: AgentConfig) {
    super(
      'docs-agent',
      'Documentation Agent',
      'Specialized agent for creating and updating documentation',
      config
    );
  }

  canHandle(request: AgentRequest): boolean {
    const message = request.message.toLowerCase();
    return message.includes('document') || message.includes('readme') || message.includes('docs');
  }

  protected async executeTask(request: AgentRequest): Promise<{
    message: string;
    success: boolean;
  }> {
    // Implement documentation-specific logic here
    return {
      message: `Documentation Agent executed: Updated documentation as requested.`,
      success: true,
    };
  }
}

/**
 * Code Review Agent - Handles code review tasks
 */
export class ReviewAgent extends SubAgent {
  constructor(config: AgentConfig) {
    super(
      'review-agent',
      'Code Review Agent',
      'Specialized agent for reviewing code changes',
      config
    );
  }

  canHandle(request: AgentRequest): boolean {
    const message = request.message.toLowerCase();
    return message.includes('review') || message.includes('code review');
  }

  protected async executeTask(request: AgentRequest): Promise<{
    message: string;
    success: boolean;
  }> {
    // Implement code review logic here
    return {
      message: `Code Review Agent executed: Reviewed code and provided feedback.`,
      success: true,
    };
  }
}
