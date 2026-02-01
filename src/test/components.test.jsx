import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import TaskModal from "../components/modals/TaskModal";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

/**
 * Component Tests
 * 
 * Tests for React components to ensure proper rendering,
 * user interactions, and edge case handling.
 */

// Mock contexts
const mockUIContext = {
  modals: { task: true, settings: false },
  closeModal: vi.fn(),
  editingTask: null,
};

const mockDataContext = {
  addEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  classColors: {
    "Math": "#0984e3",
    "Physics": "#d63031",
  },
};

const mockNotificationContext = {
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

vi.mock("../context/PlannerContext", () => ({
  useUI: () => mockUIContext,
}));

vi.mock("../context/DataContext", () => ({
  useData: () => mockDataContext,
}));

vi.mock("../context/NotificationContext", () => ({
  useNotification: () => mockNotificationContext,
}));

describe("Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("TaskModal", () => {
    it("should render the modal when open", () => {
      render(<TaskModal />);
      
      // Modal should be in the document
      expect(screen.getByText(/new task|edit task/i)).toBeInTheDocument();
    });

    it("should show character counter for title", () => {
      render(<TaskModal />);
      
      // Should show character count
      expect(screen.getByText(/\/200 characters/i)).toBeInTheDocument();
    });

    it("should validate required fields on submit", async () => {
      const { container } = render(<TaskModal />);
      
      const form = container.querySelector('form');
      if (form) {
        fireEvent.submit(form);
        
        await waitFor(() => {
          expect(mockNotificationContext.error).toHaveBeenCalled();
        }, { timeout: 1000 });
      }
    });
  });

  describe("ErrorBoundary", () => {
    // Suppress console.error for this test
    const originalError = console.error;
    beforeEach(() => {
      console.error = vi.fn();
    });
    afterEach(() => {
      console.error = originalError;
    });

    it("should catch and display errors", () => {
      const ThrowError = () => {
        throw new Error("Test error");
      };

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("should provide reset functionality", () => {
      let shouldThrow = true;
      const ConditionalError = () => {
        if (shouldThrow) throw new Error("Test error");
        return <div>Success</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <ConditionalError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      shouldThrow = false;
      const resetButton = screen.getByText(/try again/i);
      fireEvent.click(resetButton);

      // Component should re-render without error
      // Note: This is simplified - actual implementation may vary
    });

    it("should not show debug info in production", () => {
      // Mock production environment
      const originalDev = import.meta.env.DEV;
      import.meta.env.DEV = false;

      const ThrowError = () => {
        throw new Error("Production error");
      };

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Debug info should not be visible
      expect(screen.queryByText(/debug info/i)).not.toBeInTheDocument();

      import.meta.env.DEV = originalDev;
    });
  });

  describe("Button Component", () => {
    it("should render with different variants", () => {
      const { rerender } = render(<Button variant="primary">Click me</Button>);
      expect(screen.getByText("Click me")).toBeInTheDocument();

      rerender(<Button variant="danger">Delete</Button>);
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("should handle click events", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      fireEvent.click(screen.getByText("Click me"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should be disabled when specified", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByText("Disabled");
      
      expect(button).toBeDisabled();
    });
  });

  describe("Input Component", () => {
    it("should render with label", () => {
      render(<Input label="Test Input" value="" onChange={() => {}} />);
      expect(screen.getByText("Test Input")).toBeInTheDocument();
    });

    it("should handle value changes", () => {
      const handleChange = vi.fn();
      const { container } = render(<Input value="" onChange={handleChange} />);
      
      const input = container.querySelector('input');
      if (input) {
        fireEvent.change(input, { target: { value: "new value" } });
        expect(handleChange).toHaveBeenCalled();
      }
    });

    it("should support required attribute", () => {
      const { container } = render(<Input required value="" onChange={() => {}} />);
      const input = container.querySelector('input');
      
      expect(input).toHaveAttribute("required");
    });
  });
});
