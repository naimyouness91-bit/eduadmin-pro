import { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import i18n from '../../i18n';
import { Button } from './UI';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('UI error boundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-danger-500/10 flex items-center justify-center">
            <FontAwesomeIcon icon={faTriangleExclamation} className="w-7 h-7 text-danger-500" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">
              {i18n.t('errorBoundary.title')}
            </h2>
            <p className="text-sm text-surface-500 mt-2 max-w-md">
              {i18n.t('errorBoundary.message')}
            </p>
          </div>
          <Button type="button" onClick={this.handleReset}>
            {i18n.t('errorBoundary.backToDashboard')}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
