# Contributing to Homework Planner

Thank you for considering contributing to the Homework Planner! This document provides guidelines and information for contributors.

## 🎯 Project Vision

Homework Planner is designed to be a **privacy-first, zero-knowledge** task management application. When contributing, please keep these core principles in mind:

1. **Privacy First**: Never compromise on zero-knowledge architecture
2. **Security**: All data must be encrypted client-side
3. **Simplicity**: Keep the UI intuitive and focused
4. **Performance**: Maintain fast, responsive user experience
5. **Accessibility**: Ensure all users can access features

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Basic understanding of React and Web Crypto API
- Familiarity with Socket.io for real-time features

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/adan-garcia/planner.git
cd planner

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## 📋 Code Style Guidelines

### General Principles
- **Use functional components** with hooks (no class components except ErrorBoundary)
- **Prefer composition** over inheritance
- **Keep components small** (under 300 lines)
- **Use PropTypes** for all component props
- **Add JSDoc comments** to all exported functions

### File Organization
```
src/
├── components/     # UI components
│   ├── ui/        # Reusable UI primitives
│   ├── features/  # Feature-specific components
│   ├── layout/    # Layout wrappers
│   └── modals/    # Modal dialogs
├── context/       # React Context providers
├── hooks/         # Custom React hooks
├── utils/         # Pure utility functions
├── test/          # Test files
└── workers/       # Web Workers
```

### Naming Conventions
- **Components**: PascalCase (e.g., `TaskModal.jsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useSocketSync.js`)
- **Utilities**: camelCase (e.g., `helpers.js`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_TASK_TITLE_LENGTH`)
- **Context**: PascalCase with 'Context' suffix (e.g., `DataContext.jsx`)

### React Patterns

#### Context Usage
```javascript
// ✅ Good: Memoize context value
const value = useMemo(() => ({
  data,
  updateData,
}), [data, updateData]);

// ❌ Bad: New object on every render
const value = { data, updateData };
```

#### State Updates
```javascript
// ✅ Good: Functional updates for derived state
setEvents(prev => prev.map(e => e.id === id ? updated : e));

// ❌ Bad: Direct state reference
setEvents(events.map(e => e.id === id ? updated : e));
```

#### Effect Cleanup
```javascript
// ✅ Good: Always cleanup side effects
useEffect(() => {
  const controller = new AbortController();
  
  fetchData(controller.signal);
  
  return () => controller.abort();
}, []);
```

## 🔐 Security Guidelines

### Encryption Rules
1. **Never** store passwords in localStorage
2. **Always** validate input before encryption
3. **Generate unique IVs** for each encryption operation
4. **Use constant-time operations** where possible

### Input Validation
```javascript
// ✅ Good: Validate and sanitize
const title = sanitizeInput(input.title);
if (title.length > MAX_TASK_TITLE_LENGTH) {
  throw new Error('Title too long');
}

// ❌ Bad: Trust user input
const title = input.title;
```

## 🧪 Testing Guidelines

### Test Coverage Requirements
- **Utilities**: 90%+ coverage
- **Crypto functions**: 100% coverage
- **Components**: Focus on user interactions
- **Hooks**: Test state transitions

### Writing Tests
```javascript
// ✅ Good: Test behavior, not implementation
it('should add event when form is submitted', () => {
  const { getByText, getByLabelText } = render(<TaskModal />);
  fireEvent.change(getByLabelText('Title'), { target: { value: 'Test' } });
  fireEvent.click(getByText('Save'));
  expect(mockAddEvent).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Test'
  }));
});

// ❌ Bad: Testing internal state
it('should set formData.title', () => {
  const { getByLabelText } = render(<TaskModal />);
  fireEvent.change(getByLabelText('Title'), { target: { value: 'Test' } });
  expect(component.state.formData.title).toBe('Test');
});
```

## 📝 Documentation

### JSDoc Format
```javascript
/**
 * Brief one-line description.
 * 
 * Detailed explanation of what the function does,
 * any important behaviors, or edge cases.
 * 
 * @param {Type} paramName - Parameter description
 * @returns {Type} Return value description
 * 
 * @example
 * const result = functionName(arg);
 * // Returns: expected output
 */
```

### Component Documentation
Include at the top of each component:
- Purpose of the component
- Key features or behaviors
- Props description (via PropTypes)
- Usage examples if complex

## 🐛 Bug Reports

### Before Submitting
1. Check if the issue already exists
2. Test in latest version
3. Reproduce in clean environment

### Bug Report Template
```markdown
**Description**
Clear description of the bug.

**To Reproduce**
1. Go to '...'
2. Click on '....'
3. See error

**Expected Behavior**
What should happen.

**Screenshots**
If applicable.

**Environment**
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- Version: [e.g., 1.0.0]
```

## 🎨 Pull Request Process

### Before Submitting
1. **Run tests**: `npm test`
2. **Check linting**: `npm run lint`
3. **Update docs** if needed
4. **Add tests** for new features
5. **Update CHANGELOG.md**

### PR Template
```markdown
## Description
What does this PR do?

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Tests pass
- [ ] Linting passes
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
```

### Review Process
1. Automated tests must pass
2. At least one maintainer approval required
3. All review comments addressed
4. No merge conflicts

## 🏷️ Commit Message Format

Follow conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(sync): add reconnection backoff strategy

Implements exponential backoff for socket reconnections
to prevent thundering herd on server restart.

Closes #123
```

## ❓ Questions?

- Check the [README.md](README.md) for basic usage
- Review existing code for patterns
- Open a discussion issue for architecture questions

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for making Homework Planner better! 🎉
