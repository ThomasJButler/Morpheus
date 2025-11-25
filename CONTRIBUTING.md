# Contributing to Morpheus

Thank you for your interest in contributing to Morpheus! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [your.email@example.com].

## Getting Started

### Prerequisites

- **Backend**: Python 3.11+, pip, virtualenv
- **Frontend**: Node.js 18+, npm
- **Services**: Anthropic API key, OpenAI API key, Pinecone account
- **Tools**: Git, Docker (optional)

### Setting Up Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/morpheus.git
   cd morpheus
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   pip install -r requirements-dev.txt  # Development dependencies
   cp .env.example .env  # Configure your API keys
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local  # Configure API URL
   ```

4. **Run Tests**
   ```bash
   # Backend
   cd backend
   pytest tests/ -v

   # Frontend
   cd frontend
   npm run test
   ```

5. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   uvicorn app.main:app --reload

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

Visit `http://localhost:3000` to see your changes!

## Development Workflow

### Branching Strategy

- `main` - Production-ready code (protected)
- `develop` - Integration branch for features
- `feature/*` - New features (e.g., `feature/multi-modal-support`)
- `fix/*` - Bug fixes (e.g., `fix/streaming-error-handling`)
- `docs/*` - Documentation updates (e.g., `docs/update-deployment-guide`)

### Branch Naming Convention

```bash
feature/short-description-of-feature
fix/short-description-of-bug
docs/short-description-of-change
refactor/short-description
test/short-description
```

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(rag): add GraphRAG multi-hop reasoning support

Implement multi-hop reasoning using GraphRAG approach for complex queries
that require information from multiple related documents.

Closes #42
```

```
fix(streaming): handle connection errors gracefully

Add retry logic and error boundaries to prevent UI breaks when SSE
connection fails mid-stream.

Fixes #58
```

## Pull Request Process

### Before Submitting

1. ✅ **Update from main**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-feature-branch
   git rebase main
   ```

2. ✅ **Run linting**
   ```bash
   # Backend
   black app tests
   ruff check app tests
   mypy app

   # Frontend
   npm run lint
   npx tsc --noEmit
   ```

3. ✅ **Run tests**
   ```bash
   # Backend
   pytest tests/ -v --cov=app

   # Frontend
   npm run test:ci
   npm run test:e2e
   ```

4. ✅ **Update documentation** if needed

5. ✅ **Add tests** for new features

### Submitting Pull Request

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR on GitHub**
   - Use the PR template (auto-populated)
   - Link related issues (e.g., "Closes #42")
   - Add screenshots/videos for UI changes
   - Request review from maintainers

3. **PR Title Format**
   ```
   feat(scope): Brief description of changes
   ```

4. **PR Description Should Include:**
   - What: What changes were made
   - Why: Why these changes were needed
   - How: How the changes were implemented
   - Testing: How to test the changes
   - Screenshots: For UI changes

### Review Process

1. ✅ **Automated Checks Must Pass**
   - Backend tests (Python 3.11, 3.12)
   - Frontend tests (Node 18, 20)
   - Linting and type checking
   - Build verification
   - Security scanning (CodeQL)

2. 👁️ **Code Review**
   - At least one maintainer approval required
   - Address all review comments
   - Keep discussions respectful and constructive

3. ✅ **Final Checks**
   - Rebase on latest main if needed
   - Squash commits if requested
   - Update changelog if significant change

4. 🎉 **Merge**
   - Maintainer will merge once approved
   - Delete branch after merge

## Coding Standards

### Python (Backend)

**Style Guide:** [PEP 8](https://pep8.org/) + [Black](https://black.readthedocs.io/)

```python
# Use type hints
async def process_query(
    query: str,
    mode: RAGMode = RAGMode.HYBRID,
    user_id: Optional[str] = None
) -> ChatResponse:
    """
    Process user query through selected RAG pipeline.

    Args:
        query: User input text
        mode: RAG processing mode
        user_id: Optional user identifier

    Returns:
        ChatResponse with answer and metadata
    """
    # Implementation here
    pass

# Use descriptive variable names
retrieval_results = await search_engine.query(embedding)

# Use constants for magic numbers
MAX_CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
```

**Import Order:**
```python
# 1. Standard library
import asyncio
from typing import List, Optional

# 2. Third-party
from fastapi import APIRouter
from pydantic import BaseModel

# 3. Local
from app.core.config import settings
from app.rag.cascading import cascading_retrieval
```

### TypeScript (Frontend)

**Style Guide:** [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

```typescript
// Use TypeScript interfaces
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

// Functional components with proper typing
export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading
}) => {
  // Use hooks properly
  const [input, setInput] = useState<string>('')

  // Memoize expensive computations
  const sortedMessages = useMemo(
    () => messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    [messages]
  )

  // Handle events
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    onSendMessage(input)
    setInput('')
  }, [input, onSendMessage])

  return (
    // JSX here
  )
}
```

**File Structure:**
```typescript
// imports
// types/interfaces
// component definition
// styled components (if any)
// exports
```

### General Principles

- **DRY (Don't Repeat Yourself)**: Extract reusable logic
- **SOLID Principles**: Single responsibility, open/closed, etc.
- **Error Handling**: Always handle potential errors
- **Logging**: Use appropriate log levels (DEBUG, INFO, WARNING, ERROR)
- **Comments**: Explain WHY, not WHAT (code should be self-documenting)
- **Security**: Validate inputs, sanitize outputs, follow OWASP guidelines

## Testing Requirements

### Backend (pytest)

**Required:**
- ✅ Unit tests for all new functions/classes
- ✅ Integration tests for API endpoints
- ✅ Minimum 80% code coverage
- ✅ Test both success and error cases

**Example:**
```python
import pytest
from app.rag.cascading import cascading_retrieval

@pytest.mark.asyncio
async def test_cascading_retrieval_success():
    """Test cascading retrieval with valid query."""
    result = await cascading_retrieval("What is machine learning?")

    assert result.answer is not None
    assert len(result.sources) > 0
    assert result.confidence > 0.7

@pytest.mark.asyncio
async def test_cascading_retrieval_empty_query():
    """Test cascading retrieval with empty query."""
    with pytest.raises(ValueError, match="Query cannot be empty"):
        await cascading_retrieval("")
```

### Frontend (Jest + Testing Library)

**Required:**
- ✅ Unit tests for components
- ✅ Integration tests for user flows
- ✅ E2E tests for critical paths (Playwright)
- ✅ Accessibility tests

**Example:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInterface } from './ChatInterface'

describe('ChatInterface', () => {
  it('sends message on submit', async () => {
    const onSendMessage = jest.fn()
    render(<ChatInterface onSendMessage={onSendMessage} messages={[]} />)

    const input = screen.getByPlaceholderText(/ask morpheus/i)
    const button = screen.getByText(/send/i)

    fireEvent.change(input, { target: { value: 'Test message' } })
    fireEvent.click(button)

    expect(onSendMessage).toHaveBeenCalledWith('Test message')
  })
})
```

### Test Coverage

Run coverage reports:

```bash
# Backend
pytest tests/ --cov=app --cov-report=html
open htmlcov/index.html

# Frontend
npm run test:coverage
open coverage/lcov-report/index.html
```

## Documentation

### Code Documentation

**Python (Docstrings):**
```python
def calculate_bm25_score(query: str, document: str) -> float:
    """
    Calculate BM25 relevance score between query and document.

    BM25 (Best Matching 25) is a ranking function used for keyword-based
    retrieval. It considers term frequency, document frequency, and
    document length normalization.

    Args:
        query: Search query string
        document: Document text to score

    Returns:
        BM25 score (higher is more relevant)

    Raises:
        ValueError: If query or document is empty

    Example:
        >>> score = calculate_bm25_score("machine learning", "ML is a subset...")
        >>> print(f"Relevance: {score:.2f}")
        Relevance: 3.45
    """
```

**TypeScript (JSDoc):**
```typescript
/**
 * Formats a chat message for display with proper styling and citations.
 *
 * @param message - The chat message to format
 * @param options - Formatting options
 * @returns Formatted message component
 *
 * @example
 * ```tsx
 * const formatted = formatMessage(message, { showCitations: true })
 * ```
 */
export function formatMessage(
  message: ChatMessage,
  options: FormatOptions
): React.ReactNode {
  // Implementation
}
```

### README and Guides

When updating documentation:
- Keep language clear and concise
- Include code examples
- Add screenshots for UI features
- Update table of contents
- Test all command examples

## Community

### Getting Help

- 💬 **GitHub Discussions**: Ask questions, share ideas
- 🐛 **GitHub Issues**: Report bugs, request features
- 📧 **Email**: [your.email@example.com] for private matters

### Reporting Bugs

**Use the Bug Report template** and include:
1. Environment (OS, Python/Node version, browser)
2. Steps to reproduce
3. Expected vs actual behavior
4. Error messages/logs
5. Screenshots if applicable

### Feature Requests

**Use the Feature Request template** and include:
1. Problem/use case
2. Proposed solution
3. Alternatives considered
4. Implementation ideas (optional)

### Security Vulnerabilities

**DO NOT** open public issues for security vulnerabilities.

Email [security@example.com] with:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work with you on responsible disclosure.

## Recognition

Contributors are recognized in:
- `README.md` contributors section
- Release notes for significant contributions
- GitHub contributors page

Thank you for contributing to Morpheus! 🎉

---

**Questions?** Open a [discussion](https://github.com/yourusername/morpheus/discussions) or reach out to maintainers.
