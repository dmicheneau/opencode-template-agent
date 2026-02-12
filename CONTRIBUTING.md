# Contributing to OpenCode Template Agent

Thank you for considering contributing to the OpenCode Template Agent! This document provides guidelines for contributing to the project.

## How to Contribute

### Reporting Issues

- Check if the issue already exists
- Use a clear and descriptive title
- Provide detailed information about the issue
- Include steps to reproduce if applicable

### Suggesting Enhancements

- Use a clear and descriptive title
- Provide a detailed description of the enhancement
- Explain why this enhancement would be useful

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Run tests to ensure everything works
5. Commit your changes with clear commit messages
6. Push to your branch
7. Open a Pull Request

### Code Style

- Follow TypeScript best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small
- Maintain existing code style

### Testing

- Add tests for new features
- Ensure all tests pass before submitting PR
- Include both positive and negative test cases

### Documentation

- Update README.md if needed
- Add JSDoc comments for new functions/classes
- Update examples if API changes

## Development Setup

```bash
# Clone the repository
git clone https://github.com/dmicheneau/opencode-template-agent.git
cd opencode-template-agent

# Install dependencies
npm install

# Build the project
npm run build

# Run examples
npx ts-node examples/basic-usage.ts
```

## Code of Conduct

- Be respectful and constructive
- Welcome newcomers
- Focus on what is best for the community
- Show empathy towards other community members

## Questions?

Feel free to open an issue for any questions or concerns.

Thank you for contributing!
