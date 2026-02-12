# OpenCode Template Agent

A comprehensive template for creating OpenCode agents that can function as both primary agents and subagents. This template provides a solid foundation for building hierarchical agent systems with clear separation of concerns.

## Overview

This template implements a flexible agent architecture where:
- **Primary Agents** coordinate complex tasks and delegate to specialized subagents
- **SubAgents** handle focused, specific tasks efficiently
- **Tools** provide capabilities that agents can use to accomplish tasks

## Features

- 🎯 **Dual-Mode Design**: Create agents that work both independently and as part of a hierarchy
- 🔧 **Extensible Tools**: Easy-to-extend tool system for adding new capabilities
- 📝 **Type-Safe**: Full TypeScript support with comprehensive type definitions
- 🧩 **Modular Architecture**: Clean separation between agent logic, tools, and configuration
- 📚 **Well-Documented**: Includes system prompts, examples, and inline documentation
- 🚀 **Production-Ready**: Structured for real-world use cases

## Architecture

```
┌─────────────────────────────────────┐
│       Primary Agent                 │
│  - Coordinates tasks                │
│  - Delegates to subagents           │
│  - Has access to all tools          │
└─────────────┬───────────────────────┘
              │
              ├──────────────┬──────────────┬──────────────┐
              │              │              │              │
         ┌────▼────┐   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
         │  Test   │   │  Docs   │   │ Review  │   │ Custom  │
         │ Agent   │   │ Agent   │   │ Agent   │   │ Agent   │
         └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

## Installation

```bash
# Clone the repository
git clone https://github.com/dmicheneau/opencode-template-agent.git
cd opencode-template-agent

# Install dependencies
npm install

# Build the project
npm run build
```

## Quick Start

### Using the Primary Agent

```typescript
import { createPrimaryAgent } from 'opencode-template-agent';

// Create a primary agent with default configuration
const agent = createPrimaryAgent({
  debug: true,
});

// Process a request
const response = await agent.process({
  message: 'Create unit tests for the authentication module',
});

console.log(response.message);
```

### Creating a Custom SubAgent

```typescript
import { SubAgent, AgentConfig, AgentRequest } from 'opencode-template-agent';

class CustomAgent extends SubAgent {
  constructor(config: AgentConfig) {
    super(
      'custom-agent',
      'Custom Agent',
      'Description of what this agent does',
      config
    );
  }

  protected async executeTask(request: AgentRequest) {
    // Implement your custom logic here
    return {
      message: 'Task completed',
      success: true,
    };
  }
}
```

## Project Structure

```
opencode-template-agent/
├── src/
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts        # Core interfaces and types
│   ├── tools/              # Tool implementations
│   │   └── index.ts        # Built-in tools
│   ├── primaryAgent.ts     # Primary agent implementation
│   ├── subAgent.ts         # SubAgent base class and examples
│   └── index.ts            # Main entry point and exports
├── prompts/                # System prompts for agents
│   ├── primary-system-prompt.md
│   └── subagent-system-prompt.md
├── examples/               # Usage examples
│   ├── basic-usage.ts
│   ├── custom-subagent.ts
│   └── advanced-usage.ts
├── agent.json              # Agent configuration metadata
├── package.json
├── tsconfig.json
└── README.md
```

## Core Concepts

### Primary Agent

The Primary Agent is the main coordinator that:
- Receives user requests
- Analyzes tasks to determine handling strategy
- Delegates specialized work to subagents
- Has access to all tools in the system
- Maintains overall context and state

### SubAgent

SubAgents are specialized workers that:
- Focus on specific task types
- Execute quickly with limited scope
- Have access to a subset of tools
- Report clear success/failure status
- Can be easily extended for custom use cases

### Tools

Tools provide concrete capabilities:
- File operations (read, write, list)
- Code search and analysis
- Git operations
- Bash execution
- Custom tools can be easily added

## API Reference

### Core Interfaces

#### Agent
```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  process(request: AgentRequest): Promise<AgentResponse>;
  getTools(): Tool[];
}
```

#### AgentRequest
```typescript
interface AgentRequest {
  message: string;
  context?: AgentContext;
  metadata?: Record<string, any>;
}
```

#### AgentResponse
```typescript
interface AgentResponse {
  message: string;
  success: boolean;
  context?: AgentContext;
  toolCalls?: ToolCall[];
  artifacts?: Artifact[];
}
```

### Factory Functions

#### createPrimaryAgent(config?)
Creates a fully configured primary agent with default subagents.

```typescript
const agent = createPrimaryAgent({
  debug: true,
  maxIterations: 20,
});
```

#### createSubAgent(type, config?)
Creates a standalone subagent of the specified type.

```typescript
const testAgent = createSubAgent('test', {
  debug: true,
});
```

## Built-in SubAgents

### Test Agent
Handles test-related tasks:
- Creating unit tests
- Running test suites
- Analyzing test coverage
- Fixing failing tests

### Documentation Agent
Manages documentation:
- Creating README files
- Updating documentation
- Generating API docs
- Adding code comments

### Code Review Agent
Provides code review capabilities:
- Reviewing code changes
- Suggesting improvements
- Identifying issues
- Checking best practices

## Examples

See the `examples/` directory for complete examples:

1. **basic-usage.ts**: Simple agent usage and delegation
2. **custom-subagent.ts**: Creating custom specialized agents
3. **advanced-usage.ts**: Context management and custom tools

## Development

```bash
# Build the project
npm run build

# Watch mode for development
npm run dev

# Run linting
npm run lint

# Format code
npm run format

# Run tests (if implemented)
npm test
```

## Configuration

### Agent Configuration

Configure agent behavior via `AgentConfig`:

```typescript
interface AgentConfig {
  type: 'primary' | 'subagent';
  systemPromptFile?: string;
  tools?: string[];
  maxIterations?: number;
  debug?: boolean;
}
```

### Agent Metadata

The `agent.json` file contains metadata about available agents and their capabilities. Customize this file to match your specific agent implementations.

## Extending the Template

### Adding a New Tool

1. Create your tool definition:
```typescript
export const myCustomTool: Tool = {
  name: 'my_tool',
  description: 'What my tool does',
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Parameter description',
      },
    },
    required: ['param1'],
  },
  async execute(params) {
    // Implementation
    return { success: true, result: 'Done' };
  },
};
```

2. Register it with your agent:
```typescript
agent.registerTool(myCustomTool);
```

### Creating a New SubAgent

1. Extend the `SubAgent` class:
```typescript
export class MyCustomAgent extends SubAgent {
  constructor(config: AgentConfig) {
    super('my-agent', 'My Agent', 'Description', config);
  }

  canHandle(request: AgentRequest): boolean {
    // Determine if this agent can handle the request
    return request.message.includes('my-keyword');
  }

  protected async executeTask(request: AgentRequest) {
    // Implement your task logic
    return {
      message: 'Task completed',
      success: true,
    };
  }
}
```

2. Register it with the primary agent:
```typescript
const myAgent = new MyCustomAgent(config);
primaryAgent.registerSubagent(myAgent);
```

## Best Practices

1. **Keep SubAgents Focused**: Each subagent should have a clear, single purpose
2. **Use Context Wisely**: Pass relevant context between requests but keep it minimal
3. **Handle Errors Gracefully**: Always return structured responses with success status
4. **Log for Debugging**: Use the debug flag during development
5. **Test Independently**: Test both primary agent and subagents in isolation
6. **Document Custom Agents**: Add clear descriptions for any custom agents or tools

## Use Cases

This template is ideal for:
- Code generation and modification agents
- Multi-step workflow automation
- Task delegation systems
- Specialized development tools
- AI-powered code assistants
- Automated code review systems

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Support

For questions or issues, please open an issue on GitHub.