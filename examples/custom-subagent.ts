/**
 * Example: Custom SubAgent Implementation
 */

import { SubAgent, AgentConfig, AgentRequest } from '../src';

/**
 * Custom Security Agent - Checks for security issues in code
 */
class SecurityAgent extends SubAgent {
  constructor(config: AgentConfig) {
    super(
      'security-agent',
      'Security Agent',
      'Specialized agent for security analysis and vulnerability detection',
      config
    );
  }

  canHandle(request: AgentRequest): boolean {
    const message = request.message.toLowerCase();
    return (
      message.includes('security') ||
      message.includes('vulnerability') ||
      message.includes('cve') ||
      message.includes('audit')
    );
  }

  protected async executeTask(request: AgentRequest): Promise<{
    message: string;
    success: boolean;
    artifacts?: any[];
  }> {
    console.log(`[Security Agent] Analyzing for security issues...`);

    // Simulate security analysis
    const findings = [
      {
        severity: 'high',
        type: 'Dependency Vulnerability',
        description: 'Outdated package with known CVE',
        recommendation: 'Update to latest version',
      },
      {
        severity: 'medium',
        type: 'Code Pattern',
        description: 'Potential SQL injection vector',
        recommendation: 'Use parameterized queries',
      },
    ];

    const report = findings
      .map(
        (f) =>
          `- [${f.severity.toUpperCase()}] ${f.type}: ${f.description}\n  → ${f.recommendation}`
      )
      .join('\n');

    return {
      message: `Security analysis complete. Found ${findings.length} issues:\n\n${report}`,
      success: true,
      artifacts: [
        {
          type: 'report',
          name: 'security-report.json',
          content: JSON.stringify(findings, null, 2),
        },
      ],
    };
  }
}

/**
 * Custom Performance Agent - Analyzes code performance
 */
class PerformanceAgent extends SubAgent {
  constructor(config: AgentConfig) {
    super(
      'performance-agent',
      'Performance Agent',
      'Specialized agent for performance analysis and optimization',
      config
    );
  }

  canHandle(request: AgentRequest): boolean {
    const message = request.message.toLowerCase();
    return (
      message.includes('performance') ||
      message.includes('optimize') ||
      message.includes('slow') ||
      message.includes('bottleneck')
    );
  }

  protected async executeTask(request: AgentRequest): Promise<{
    message: string;
    success: boolean;
  }> {
    console.log(`[Performance Agent] Analyzing performance...`);

    // Simulate performance analysis
    const issues = [
      'N+1 query detected in user fetching loop',
      'Large bundle size: Consider code splitting',
      'Unnecessary re-renders in React component',
    ];

    const report = issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n');

    return {
      message: `Performance analysis complete:\n\n${report}`,
      success: true,
    };
  }
}

// Usage example
async function main() {
  const config: AgentConfig = {
    type: 'subagent',
    debug: true,
  };

  console.log('=== Custom SubAgent Examples ===\n');

  // Security Agent Example
  const securityAgent = new SecurityAgent(config);
  console.log('1. Security Agent:');
  const secResponse = await securityAgent.process({
    message: 'Run a security audit on the codebase',
  });
  console.log(secResponse.message);
  console.log();

  // Performance Agent Example
  const perfAgent = new PerformanceAgent(config);
  console.log('2. Performance Agent:');
  const perfResponse = await perfAgent.process({
    message: 'Analyze performance bottlenecks',
  });
  console.log(perfResponse.message);
}

main().catch(console.error);
