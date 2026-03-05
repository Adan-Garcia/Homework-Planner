# Contributing to Homework Planner

Thank you for considering contributing to the Homework Planner! This document provides guidelines and information for contributors.

## Project Vision

Homework Planner is a **privacy-first, zero-knowledge** task management application. When contributing, keep these core principles in mind:

1. **Privacy First** — Never compromise on zero-knowledge architecture
2. **Security** — All data must be encrypted client-side before transmission
3. **Simplicity** — Keep the UI intuitive and focused
4. **Performance** — Maintain fast, responsive user experience
5. **Offline-First** — Features must work without network connectivity

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Basic understanding of React 19, Web Crypto API, and Socket.io
- SQLite knowledge for backend work

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/adan-garcia/planner.git
cd planner/Homework-Planner

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

For backend development:

```bash
cd ../Backend
npm install
npm run dev    # Uses nodemon for auto-restart
```

## Code Style Guidelines

### General Principles

- **Functional components** with hooks (no class components except ErrorBoundary)
- **Composition over inheritance**
- **Small components** — aim for under 300 lines
- **JSDoc comments** on exported functions
- **Memoize** context values and expensive computations

### File Organization

```
src/
├── components/
│   ├── ui/           # Reusable design primitives (Button, Card, Modal, Input)
│   ├── features/     # Feature-specific components (auth, calendar, settings, etc.)
│   ├── layout/       # Layout wrappers (MainLayout)
│   ├── managers/     # Orchestrators (ModalManager)
│   └── modals/       # Dialog components (TaskModal, SettingsModal, ConfirmationModal)
├── context/          # React Context providers (Auth, Data, DragDrop, Notification, Planner)
├── hooks/            # Custom React hooks (useSocketSync, useRoomAuth, etc.)
├── utils/            # Pure utility functions (crypto, helpers, mergeUtils, constants)
├── test/             # Test files (unit + integration)
├── types/            # TypeScript type definitions
└── workers/          # Web Workers (ICS parsing)
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `TaskModal.jsx` |
| Hooks | camelCase with `use` prefix | `useSocketSync.js` |
| Utilities | camelCase | `helpers.js` |
| Constants | UPPER_SNAKE_CASE | `MAX_TASK_TITLE_LENGTH` |
| Context | PascalCase with `Context` suffix | `DataContext.jsx` |

### React Patterns

#### Context Values — Always Memoize

```javascript
// Good
const value = useMemo(() => ({
  events,
  addEvent,
  deleteEvent,
}), [events, addEvent, deleteEvent]);

// Bad — new object every render, causes all consumers to re-render
const value = { events, addEvent, deleteEvent };
```

#### State Updates — Use Functional Form

```javascript
// Good
setEvents(prev => prev.map(e => e.id === id ? updated : e));

// Bad — stale closure risk
setEvents(events.map(e => e.id === id ? updated : e));
```

#### Effects — Always Clean Up

```javascript
useEffect(() => {
  const controller = new AbortController();
  fetchData(controller.signal);
  return () => controller.abort();
}, []);
```

#### Callbacks — Stabilize with useCallback

```javascript
// Good — stable reference for child components
const handleSave = useCallback((event) => {
  setEvents(prev => [...prev, event]);
}, []);
```

## Security Guidelines

### Encryption Rules

1. **Never** store passwords or crypto keys in localStorage
2. **Always** generate a unique IV for each encryption operation
3. **Never** send the DATA key to the server — only the AUTH key (hashed)
4. **Validate** all input before encryption and before database insertion
5. **Use** `crypto.timingSafeEqual` for any hash comparison on the server

### Input Validation

```javascript
// Good — validate and constrain
const title = sanitizeInput(input.title);
if (title.length > MAX_TASK_TITLE_LENGTH) {
  throw new Error('Title too long');
}

// Bad — trust user input
const title = input.title;
```

### Server-Side Rules

- All SQL uses **prepared statements** (never concatenate user input into queries)
- Room IDs validated with regex: `/^[a-zA-Z0-9_-]+$/`
- Event data length capped at 100KB
- Bulk operations limited to 1000 items

## Testing Guidelines

### Test Coverage Targets

| Module | Target | Critical Paths |
|--------|--------|----------------|
| Crypto | 100% | All encrypt/decrypt/derive functions |
| Helpers | 90%+ | Validation, sanitization, normalization |
| MergeUtils | 100% | Field-level 3-way merge logic |
| Hooks | 80%+ | Auth flow, sync lifecycle, conflict resolution |
| Components | 70%+ | User interactions, form submissions |

### Writing Tests

```javascript
// Good — test behavior, not implementation
it('should add event when form is submitted', () => {
  const { getByText, getByLabelText } = render(<TaskModal />);
  fireEvent.change(getByLabelText('Title'), { target: { value: 'Test' } });
  fireEvent.click(getByText('Save'));
  expect(mockAddEvent).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Test'
  }));
});

// Bad — testing internal state
it('should set formData.title', () => {
  // Don't reach into component internals
});
```

### Running Tests

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- --coverage # Coverage report
```

## Documentation

### JSDoc Format

```javascript
/**
 * Brief one-line description.
 *
 * @param {string} roomId - The room identifier
 * @param {CryptoKey} key - AES-GCM encryption key
 * @returns {Promise<Object>} Decrypted event object
 */
```

## Bug Reports

### Before Submitting

1. Check if the issue already exists
2. Test in the latest version
3. Reproduce in a clean environment

### Template

```markdown
**Description**
Clear description of the bug.

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen.

**Environment**
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
```

## Pull Request Process

### Before Submitting

1. `npm test` — all tests pass
2. `npm run lint` — no lint errors
3. Update documentation if needed
4. Add tests for new features

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
```

## Commit Message Format

Follow conventional commits:

```
<type>(<scope>): <subject>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**

```
feat(sync): add field-level 3-way merge for conflict resolution
fix(crypto): handle empty IV in decryption edge case
docs(readme): update sync architecture section
```

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0](LICENSE) license.

---

Thank you for making Homework Planner better!
