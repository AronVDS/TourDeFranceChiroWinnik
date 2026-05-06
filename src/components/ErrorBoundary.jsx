import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center px-5">
          <div className="card rounded-2xl p-8 max-w-md w-full text-center border border-red-500/30">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="font-bebas text-4xl text-white mb-2">Iets ging mis</h2>
            <p className="text-muted font-barlow text-sm mb-1">
              {this.state.error?.message ?? 'Onbekende fout'}
            </p>
            <p className="text-muted/50 font-barlow-condensed text-xs mb-6">
              Open de browser console (F12) voor meer details
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="btn-primary px-8 py-3 rounded-xl font-bebas text-xl tracking-widest"
            >
              Opnieuw proberen
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
