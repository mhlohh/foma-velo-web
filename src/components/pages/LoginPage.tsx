import React from 'react';
import { LoginScreen } from '../LoginScreen';

/**
 * Wrapper so the pages folder owns routing-level composition while
 * the actual login form stays in a shared component.
 */
export const LoginPage: React.FC = () => {
  return <LoginScreen />;
};
