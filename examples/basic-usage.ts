/**
 * Example: Basic Usage of Primary Agent
 */

import { createPrimaryAgent } from '../src';

async function main() {
  // Create a primary agent with default configuration
  const agent = createPrimaryAgent({
    debug: true, // Enable debug logging
  });

  console.log('=== Primary Agent Example ===\n');

  // Example 1: Simple request handled directly
  console.log('Example 1: Direct handling');
  const response1 = await agent.process({
    message: 'List all TypeScript files in the src directory',
  });
  console.log('Response:', response1.message);
  console.log('Success:', response1.success);
  console.log();

  // Example 2: Request delegated to test subagent
  console.log('Example 2: Delegation to Test Agent');
  const response2 = await agent.process({
    message: 'Create unit tests for the primary agent class',
  });
  console.log('Response:', response2.message);
  console.log('Success:', response2.success);
  console.log();

  // Example 3: Request delegated to docs subagent
  console.log('Example 3: Delegation to Documentation Agent');
  const response3 = await agent.process({
    message: 'Update the README with usage examples',
  });
  console.log('Response:', response3.message);
  console.log('Success:', response3.success);
  console.log();

  // Example 4: Request delegated to review subagent
  console.log('Example 4: Delegation to Code Review Agent');
  const response4 = await agent.process({
    message: 'Review the recent code changes and provide feedback',
  });
  console.log('Response:', response4.message);
  console.log('Success:', response4.success);
}

main().catch(console.error);
