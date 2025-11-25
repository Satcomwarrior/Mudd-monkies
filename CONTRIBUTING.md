# Contributing to PDF Takeoff Tool

Thank you for your interest in contributing to the PDF Takeoff Tool! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Commit Message Conventions](#commit-message-conventions)
- [Pull Request Process](#pull-request-process)
- [Review Process](#review-process)

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/Mudd-monkies.git
   cd Mudd-monkies
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/Satcomwarrior/Mudd-monkies.git
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies for the main application and the AI tools:
   ```bash
   npm install
   npm install --prefix mcp-server
   ```

2. Build the AI tool handler:
   ```bash
   cd mcp-server
   npm run build
   cd ..
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates. When creating a bug report, include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Screenshots if applicable
- Your environment (OS, browser, Node.js version)

### Suggesting Features

Feature requests are welcome! Please include:

- A clear, descriptive title
- Detailed description of the proposed feature
- Use cases and benefits
- Any relevant mockups or examples

### Submitting Code Changes

1. Ensure your changes align with the project's goals
2. Follow the coding standards and style guide
3. Write or update tests as needed
4. Update documentation if applicable
5. Submit a pull request

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types for all variables, parameters, and return values
- Avoid using `any` type; use proper typing or `unknown` if necessary
- Use interfaces for object shapes and types for unions/intersections

### React/Next.js

- Use functional components with hooks
- Follow the Next.js App Router conventions
- Keep components small and focused
- Use proper error boundaries where appropriate

### Style Guide

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multi-line arrays and objects
- Maximum line length of 100 characters
- Use meaningful variable and function names

### Code Formatting

This project uses Prettier for code formatting. Run `npm run format` before committing to ensure consistent formatting.

### Linting

Run `npm run lint` to check for code quality issues. All lint errors must be resolved before submitting a PR.

## Testing Requirements

- Write tests for new features and bug fixes
- Ensure all existing tests pass before submitting
- Test your changes in multiple browsers if applicable
- Include both unit tests and integration tests where appropriate

### Running Tests

```bash
# Run linting
npm run lint

# Build the application
npm run build
```

## Commit Message Conventions

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring without feature changes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build, etc.)
- `ci`: CI/CD configuration changes

### Examples

```
feat(pdf-viewer): add zoom controls
fix(measurements): correct area calculation for irregular shapes
docs(readme): update installation instructions
refactor(hooks): simplify usePdfHandler state management
```

## Pull Request Process

1. **Update your branch** with the latest changes from upstream:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your changes** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request** on GitHub:
   - Use a clear, descriptive title
   - Fill out the PR template completely
   - Link related issues using keywords (e.g., "Closes #123")
   - Add appropriate labels

4. **Address review feedback**:
   - Respond to all comments
   - Make requested changes
   - Push additional commits as needed

## Review Process

### What We Look For

- Code quality and adherence to coding standards
- Proper typing and error handling
- Test coverage for new functionality
- Documentation updates
- Performance considerations
- Security best practices

### Timeline

- Initial review typically within 3-5 business days
- Please be patient; maintainers are volunteers
- Feel free to ping if no response after a week

### Approval Requirements

- At least one maintainer approval required
- All CI checks must pass
- No unresolved conversations
- Branch must be up to date with main

## Questions?

If you have questions about contributing, feel free to:

- Open a discussion on GitHub
- Ask in an existing related issue
- Reach out to the maintainers

Thank you for contributing to PDF Takeoff Tool! 🎉
