/**
 * OpenCode Template Agent
 * 
 * This module exports the core agent classes and utilities for creating
 * both primary agents and subagents.
 */

export { Agent, AgentRequest, AgentResponse, AgentConfig, Tool } from './types';
export { PrimaryAgent } from './primaryAgent';
export {
  SubAgent,
  TestAgent,
  DocsAgent,
  ReviewAgent,
} from './subAgent';
export {
  getAllTools,
  getLimitedTools,
  fileOperationsTool,
  codeSearchTool,
  gitOperationsTool,
  bashExecutionTool,
  subagentDelegationTool,
} from './tools';

import { PrimaryAgent } from './primaryAgent';
import { TestAgent, DocsAgent, ReviewAgent } from './subAgent';
import { getAllTools, getLimitedTools } from './tools';
import { AgentConfig } from './types';

/**
 * Factory function to create a configured primary agent with subagents
 */
export function createPrimaryAgent(config: Partial<AgentConfig> = {}): PrimaryAgent {
  const fullConfig: AgentConfig = {
    type: 'primary',
    debug: false,
    maxIterations: 10,
    ...config,
  };

  const agent = new PrimaryAgent(fullConfig);

  // Register all tools
  getAllTools().forEach(tool => agent.registerTool(tool));

  // Register default subagents
  const testAgent = new TestAgent(fullConfig);
  const docsAgent = new DocsAgent(fullConfig);
  const reviewAgent = new ReviewAgent(fullConfig);

  // Give subagents their limited toolset
  getLimitedTools().forEach(tool => {
    testAgent.registerTool(tool);
    docsAgent.registerTool(tool);
    reviewAgent.registerTool(tool);
  });

  agent.registerSubagent(testAgent);
  agent.registerSubagent(docsAgent);
  agent.registerSubagent(reviewAgent);

  return agent;
}

/**
 * Factory function to create a standalone subagent
 */
export function createSubAgent(
  type: 'test' | 'docs' | 'review',
  config: Partial<AgentConfig> = {}
): TestAgent | DocsAgent | ReviewAgent {
  const fullConfig: AgentConfig = {
    type: 'subagent',
    debug: false,
    ...config,
  };

  let agent: TestAgent | DocsAgent | ReviewAgent;

  switch (type) {
    case 'test':
      agent = new TestAgent(fullConfig);
      break;
    case 'docs':
      agent = new DocsAgent(fullConfig);
      break;
    case 'review':
      agent = new ReviewAgent(fullConfig);
      break;
  }

  // Register limited tools for subagents
  getLimitedTools().forEach(tool => agent.registerTool(tool));

  return agent;
}
