# Apple Docs MCP Tests

This directory contains comprehensive tests for the Apple Docs MCP server.

## Test Structure

```
tests/
├── helpers/test-helpers.ts      # Shared test data, and a client connected to the server
├── regression/                  # Pages passed through without double wrapping
├── tools/                       # One file per tool, wwdc/ for the WWDC tools and extractors
├── utils/                       # HTTP client, URL conversion, name folding, the WWDC data and its loader
├── index.test.ts                # The server: tool list, arguments passed through
├── response-format.test.ts      # Every tool's answer is one text item
└── setup.ts                     # Vitest setup
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test tests/tools/search-framework-symbols.test.ts

# Run tests with coverage
pnpm test -- --coverage

# Run tests in watch mode
pnpm test -- --watch

# Run tests with verbose output
pnpm test -- --verbose
```

## Test Coverage Areas

### 1. Unit Tests
- **Tool Functions**: Each tool has comprehensive unit tests covering:
  - Normal operation
  - Error handling
  - Edge cases
  - Input validation
  - Cache behavior

### 2. Integration Tests
- **MCP Server**: Tests the server lifecycle and request handling
- **Tool Integration**: Tests tools working together

### 3. End-to-End Tests
- **Full Workflows**: Tests complete user scenarios
- **Error Recovery**: Tests error handling and recovery
- **Performance**: Tests concurrent request handling

## Key Test Patterns

### Mocking
- HTTP requests are mocked to avoid external dependencies
- Cache is mocked to control test data
- File system operations are avoided in tests

### Test Data
- Consistent test data is defined in `helpers/test-helpers.ts`
- Mock responses match actual API response structure

### Assertions
- Tests verify both success and error paths
- Response format is validated
- Edge cases are thoroughly tested

## Adding New Tests

When adding new features:
1. Add unit tests for the core functionality
2. Update integration tests if the feature affects the MCP interface
3. Consider adding E2E tests for user-facing features
4. Ensure all tests pass before committing

## Debugging Tests

To debug failing tests:
1. Run the specific test file with `--verbose`
2. Add `console.log` statements in the test
3. Use `--detectOpenHandles` to find async issues
4. Check mock implementations match actual behavior