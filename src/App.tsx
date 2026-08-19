import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { MainScreen } from './components/MainScreen';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <MainScreen />
    </ThemeProvider>
  );
};

export default App;
