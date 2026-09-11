import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="boot-screen">
          <div className="boot-card">
            <h1>App error</h1>
            <p>{this.state.error?.message || String(this.state.error)}</p>
            <p className="muted small">Phone-la problem aana Chrome-la open pannunga, cache clear pannunga.</p>
            <button type="button" className="btn" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
