# Testing Patterns

**Analysis Date:** 2026-01-22

## Test Framework

**Runner:**
- Vitest ^2.1.8
- Config: `C:/Users/keato/repos/faux-toe-shop/frontend/vitest.config.ts`

**Assertion Library:**
- Vitest built-in assertions + @testing-library/jest-dom matchers
- Extended with jest-dom matchers in setupTests.ts

**Run Commands:**
```bash
npm run test              # Run all tests once
npm run test:watch       # Watch mode - reruns on file changes
npm run test:coverage    # Generate coverage reports
```

## Test File Organization

**Location:**
- Test files co-located with source (same directory as implementation)
- OR in `__tests__` subdirectory within component/module directory
- Test files at root of directories: `Canvas.test.tsx` alongside `Canvas.jsx`
- Test files in subdirectories: `__tests__/Canvas.test.tsx` in `components/__tests__/`

**Naming:**
- Format: `[FileName].test.ts`, `[FileName].test.tsx`, or `[FileName].spec.ts`
- Examples: `Canvas.test.tsx`, `HistoryManager.test.ts`, `PhotoshopEditor.test.tsx`

**Structure:**
```
src/
├── components/
│   ├── Canvas.jsx
│   ├── Canvas.test.tsx          # Adjacent to component
│   ├── __tests__/
│   │   ├── HistoryPanel.test.tsx
│   │   ├── LayersPanel.test.tsx
│   │   └── Toolbar.test.tsx
├── engine/
│   ├── state/
│   │   ├── HistoryManager.ts
│   │   └── BinaryStateManager.ts
│   ├── __tests__/
│   │   ├── HistoryManager.test.ts
│   │   ├── BinaryStateManager.test.ts
│   │   └── WasmFilterEngine.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
describe('Canvas Component', () => {
  let mockCanvasInstance: any;
  const defaultProps = {
    activeTool: 'select' as const,
    brushSize: 10,
    // ... other props
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup for each test
  });

  afterEach(() => {
    vi.clearAllTimers();
    // Cleanup after each test
  });

  describe('Rendering', () => {
    it('should render canvas container', () => {
      // Test implementation
    });
  });

  describe('Tool Selection', () => {
    it('should switch to brush tool', () => {
      // Test implementation
    });
  });
});
```

**Patterns:**
- Nested `describe()` blocks for logical grouping
- `beforeEach()` for test setup
- `afterEach()` for cleanup
- `it()` for individual test cases
- `.todo()` suffix for pending tests (e.g., `it.todo('should...')`)

## Mocking

**Framework:** Vitest `vi` object (imported from 'vitest')

**Patterns:**

### Module Mocking:
```typescript
vi.mock('fabric', () => {
  const mockCanvas = {
    on: vi.fn(),
    off: vi.fn(),
    dispose: vi.fn(),
    // ... other mocked methods
  };
  return {
    Canvas: vi.fn(() => mockCanvas),
    Circle: vi.fn((options) => ({ type: 'circle', ...options })),
    // ... other exports
  };
});
```

### Function Mocking:
```typescript
const onHistoryAdd = vi.fn();
const onLayersUpdate = vi.fn();

// Use in test
render(<Canvas {...defaultProps} onHistoryAdd={onHistoryAdd} />);
expect(onHistoryAdd).toHaveBeenCalledWith('Brush Stroke');
```

### Spy and Mock:
```typescript
const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
// ... test code
expect(createElementSpy).toHaveBeenCalled();
```

**What to Mock:**
- External libraries (fabric, Fabric.js, @erase2d/fabric)
- Browser APIs (canvas context, FileReader, URL.createObjectURL, ResizeObserver, IntersectionObserver)
- WASM modules (@/engine - WasmFilterEngine)
- Custom modules for isolation

**What NOT to Mock:**
- Testing Library utilities (render, screen, etc.)
- Component dependencies that are part of the same module
- Custom hook implementations (test them directly)

## Fixtures and Factories

**Test Data:**
```typescript
// Component test fixture
const defaultProps = {
  activeTool: 'select' as const,
  brushSize: 10,
  brushOpacity: 100,
  pressureSensitivity: false,
  color: '#000000',
  zoom: 100,
  backgroundColor: '#ffffff',
  layers: [{
    id: 'layer-1',
    name: 'Layer 1',
    visible: true,
    opacity: 100,
    locked: false
  }],
  activeLayerId: 'layer-1',
  onHistoryAdd: vi.fn(),
  onLayersUpdate: vi.fn(),
};

// Use in tests
render(<Canvas {...defaultProps} />);
// or
const { rerender } = render(<Canvas {...defaultProps} zoom={150} />);
```

**Location:**
- Fixtures defined at top of test file (after imports, before describe block)
- Mock instances created in `beforeEach()` hooks
- Factories as helper functions within test files

## Coverage

**Requirements:** Not enforced (no coverage threshold in config)

**View Coverage:**
```bash
npm run test:coverage  # Generates HTML report
```

**Config in vitest.config.ts:**
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: [
    'node_modules/',
    'src/setupTests.ts',
    '**/*.d.ts',
    '**/*.config.*',
    '**/types/*',
  ],
}
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, classes, and components in isolation
- Approach: Mock all external dependencies
- Examples: `HistoryManager.test.ts` (tests undo/redo logic), `BinaryStateManager.test.ts`
- Typical size: 20-100 assertions per suite

**Integration Tests:**
- Scope: Component + child components, manager + state manager
- Approach: Minimal mocking, test real interactions
- Examples: Canvas component tests mocking Fabric.js but testing layer integration
- Example: HistoryManager integration tests combining multiple operations

**E2E Tests:**
- Framework: Not used (no Cypress, Playwright, or similar configured)
- Approach: Not applicable - focus is unit/integration testing

## Common Patterns

**Async Testing:**
```typescript
it('should initialize WASM filter engine', async () => {
  const { WasmFilterEngine } = await import('@/engine');

  render(<Canvas {...defaultProps} />);

  await waitFor(() => {
    expect(WasmFilterEngine).toHaveBeenCalled();
  });
});

// Or with act for state updates
await act(async () => {
  await ref.current?.undo();
});
```

**Error Testing:**
```typescript
it('should return null when nothing to undo', () => {
  expect(historyManager.undo()).toBeNull();
});

// Exception testing
expect(() => {
  deserializeProject('invalid');
}).toThrow('Invalid FTS file: Unable to parse JSON');
```

**Prop Changes:**
```typescript
it('should update brush size', () => {
  const { rerender } = render(<Canvas {...defaultProps} activeTool="brush" brushSize={10} />);

  rerender(<Canvas {...defaultProps} activeTool="brush" brushSize={25} />);

  expect(PencilBrush).toHaveBeenCalled();
});
```

**Event Triggering:**
```typescript
const modifiedCallback = mockCanvasInstance.on.mock.calls.find(
  (call: any) => call[0] === 'object:modified'
)?.[1];

act(() => {
  modifiedCallback?.();
});

await waitFor(() => {
  expect(onHistoryAdd).toHaveBeenCalledWith('Object Modified');
});
```

## Setup Files

**File:** `C:/Users/keato/repos/faux-toe-shop/frontend/src/setupTests.ts`

**Contents:**
- Imports testing-library/jest-dom for extended matchers
- Extends Vitest's expect with jest-dom matchers
- Registers cleanup hook to run after each test
- Mocks HTMLCanvasElement.getContext() for 2D and WebGL contexts
- Mocks window.URL.createObjectURL and revokeObjectURL
- Mocks ResizeObserver
- Mocks IntersectionObserver

**Mock Canvas Contexts:**
- 2D context: Full implementation of CanvasRenderingContext2D methods
- WebGL/WebGL2: Full implementation of WebGLRenderingContext methods
- Mock objects return appropriate types (functions return mocked functions, etc.)

## Test Statistics

- Total source files: ~85 (includes .js, .jsx, .ts, .tsx)
- Test files: ~10
- Test coverage: Selective (core logic like HistoryManager has comprehensive tests, some components have limited coverage)

## Testing Best Practices Observed

1. **Descriptive test names**: "should initialize Fabric canvas with correct config"
2. **Single responsibility**: Each test verifies one behavior
3. **Meaningful assertions**: Tests check specific outcomes, not just "no errors"
4. **DRY with fixtures**: Common props/data centralized in defaultProps
5. **Cleanup**: afterEach hooks clean up timers and mocks
6. **Mock assertion**: Tests verify mocks were called correctly, not just return values
7. **Async handling**: Proper use of waitFor() and act() for async operations

---

*Testing analysis: 2026-01-22*
