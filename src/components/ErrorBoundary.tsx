import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ProductErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Product Page boundary:', error, errorInfo)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <section
          className="section"
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="customer-restricted-card" role="alert">
            <AlertTriangle size={36} style={{ color: 'var(--vermilion, #e11d48)' }} />
            <span className="restricted-eyebrow">STUDIO QUERY NOTICE</span>
            <h3>UNABLE TO LOAD ARTWORK</h3>
            <p>
              A temporary issue occurred while communicating with the KAVORYN studio database.
              Please retry or browse our available catalogue.
            </p>
            <div className="restricted-footer-actions">
              <button
                type="button"
                className="button blue"
                onClick={this.handleRetry}
              >
                <RefreshCw size={14} />
                <span>RETRY NOW</span>
              </button>
              <Link to="/shop" className="button outline">
                <span>RETURN TO SHOP</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )
    }

    return this.props.children
  }
}
