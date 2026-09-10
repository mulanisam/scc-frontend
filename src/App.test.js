import { render, screen } from '@testing-library/react';
import App from './App';

// Replaces the Create React App boilerplate test, which looked for a
// "learn react" link that has never existed in this application.

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('shows the login screen when there is no session', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('shows the login screen when the stored token is not a valid JWT', () => {
    localStorage.setItem('token', 'not-a-real-token');
    localStorage.setItem('role', 'ADMIN');

    render(<App />);

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    // A malformed token must not leave stale credentials behind.
    expect(localStorage.getItem('token')).toBeNull();
  });
});
