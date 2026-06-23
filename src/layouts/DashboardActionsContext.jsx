'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const DashboardActionsContext = createContext({
  addClickHandler: null,
  addBtnText: 'Add',
  headerActionsVisible: true,
  registerAddButton: () => {},
  unregisterAddButton: () => {},
  hideHeaderActions: () => {},
  showHeaderActions: () => {},
});

export function DashboardActionsProvider({ children }) {
  const [addClickHandler, setAddClickHandler] = useState(null);
  const [addBtnText, setAddBtnText] = useState('Add');
  const [headerActionsVisible, setHeaderActionsVisible] = useState(true);

  const registerAddButton = useCallback((handler, text = 'Add') => {
    setAddClickHandler(() => handler);
    setAddBtnText(text);
  }, []);

  const unregisterAddButton = useCallback(() => {
    setAddClickHandler(null);
    setAddBtnText('Add');
  }, []);

  const hideHeaderActions = useCallback(() => {
    setHeaderActionsVisible(false);
  }, []);

  const showHeaderActions = useCallback(() => {
    setHeaderActionsVisible(true);
  }, []);

  const value = useMemo(() => ({
    addClickHandler,
    addBtnText,
    headerActionsVisible,
    registerAddButton,
    unregisterAddButton,
    hideHeaderActions,
    showHeaderActions,
  }), [
    addBtnText,
    addClickHandler,
    headerActionsVisible,
    hideHeaderActions,
    registerAddButton,
    showHeaderActions,
    unregisterAddButton,
  ]);

  return (
    <DashboardActionsContext.Provider value={value}>
      {children}
    </DashboardActionsContext.Provider>
  );
}

export function useDashboardActions() {
  return useContext(DashboardActionsContext);
}
