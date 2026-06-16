import { Component } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // log for debugging — swap for a reporting service later if needed
    console.error("[ErrorBoundary] Caught render error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle
                className="h-8 w-8 text-destructive"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm">
              An unexpected error occurred while rendering this page. You can
              try again or head back to the dashboard.
            </p>
            <div className="flex items-center gap-2 mt-5">
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="gap-1.5"
              >
                <RotateCcw className="h-4 w-4" /> Try again
              </Button>
              <Button asChild className="gap-1.5">
                <a href="/dashboard">
                  <Home className="h-4 w-4" /> Go to Dashboard
                </a>
              </Button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 text-left text-xs bg-muted rounded-lg p-3 max-w-lg overflow-auto text-destructive">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        )
      );
    }

    return this.props.children;
  }
}
