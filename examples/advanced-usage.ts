/**
 * Example: Advanced Usage with Context and Custom Tools
 */

import { PrimaryAgent, AgentConfig, Tool, AgentRequest } from '../src';
import { getLimitedTools } from '../src/tools';

// Create a custom tool
const customAnalysisTool: Tool = {
  name: 'custom_analysis',
  description: 'Perform custom code analysis',
  parameters: {
    type: 'object',
    properties: {
      analysisType: {
        type: 'string',
        description: 'Type of analysis to perform',
        enum: ['complexity', 'coverage', 'duplication'],
      },
      path: {
        type: 'string',
        description: 'Path to analyze',
      },
    },
    required: ['analysisType', 'path'],
  },
  async execute(params: Record<string, any>): Promise<any> {
    // Custom implementation
    return {
      success: true,
      results: {
        type: params.analysisType,
        path: params.path,
        score: 85,
        issues: 3,
      },
    };
  },
};

async function main() {
  console.log('=== Advanced Usage Example ===\n');

  // Create primary agent with custom configuration
  const config: AgentConfig = {
    type: 'primary',
    debug: true,
    maxIterations: 20,
  };

  const agent = new PrimaryAgent(config);

  // Register custom tool
  agent.registerTool(customAnalysisTool);

  // Also register standard tools
  getLimitedTools().forEach((tool) => agent.registerTool(tool));

  // Example 1: Using context across requests
  console.log('Example 1: Context preservation');
  
  const context = {
    workingDirectory: '/src',
    sessionData: {
      projectName: 'my-project',
      lastAnalysisTime: new Date().toISOString(),
    },
  };

  const request1: AgentRequest = {
    message: 'Analyze code complexity in the current project',
    context,
  };

  const response1 = await agent.process(request1);
  console.log('Response 1:', response1.message);
  console.log('Context preserved:', response1.context !== undefined);
  console.log();

  // Example 2: Request with metadata
  console.log('Example 2: Request with metadata');
  
  const request2: AgentRequest = {
    message: 'Review security practices',
    context: response1.context,
    metadata: {
      priority: 'high',
      requestedBy: 'user@example.com',
      deadline: '2026-02-15',
    },
  };

  const response2 = await agent.process(request2);
  console.log('Response 2:', response2.message);
  console.log();

  // Example 3: Handling tool calls
  console.log('Example 3: Tracking tool usage');
  
  const request3: AgentRequest = {
    message: 'Check test coverage and create missing tests',
    context: response2.context,
  };

  const response3 = await agent.process(request3);
  console.log('Response 3:', response3.message);
  console.log('Tool calls made:', response3.toolCalls?.length || 0);
}

main().catch(console.error);
