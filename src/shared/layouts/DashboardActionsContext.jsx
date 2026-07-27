'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const DashboardActionsContext = createContext({
  addClickHandler: null,
  addBtnText: 'Add',
  bulkClickHandler: null,
  headerActionsVisible: true,
  registerAddButton: () => {},
  unregisterAddButton: () => {},
  registerBulkButton: () => {},
  unregisterBulkButton: () => {},
  hideHeaderActions: () => {},
  showHeaderActions: () => {},
});

export function DashboardActionsProvider({ children }) {
  const [addClickHandler, setAddClickHandler] = useState(null);
  const [addBtnText, setAddBtnText] = useState('Add');
  const [bulkClickHandler, setBulkClickHandler] = useState(null);
  const [headerActionsVisible, setHeaderActionsVisible] = useState(true);

  const registerAddButton = useCallback((handler, text = 'Add') => {
    setAddClickHandler(() => handler);
    setAddBtnText(text);
  }, []);

  const unregisterAddButton = useCallback(() => {
    setAddClickHandler(null);
    setAddBtnText('Add');
  }, []);

  const registerBulkButton = useCallback((handler) => {
    setBulkClickHandler(() => handler);
  }, []);

  const unregisterBulkButton = useCallback(() => {
    setBulkClickHandler(null);
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
    bulkClickHandler,
    headerActionsVisible,
    registerAddButton,
    unregisterAddButton,
    registerBulkButton,
    unregisterBulkButton,
    hideHeaderActions,
    showHeaderActions,
  }), [
    addBtnText,
    addClickHandler,
    bulkClickHandler,
    headerActionsVisible,
    hideHeaderActions,
    registerAddButton,
    registerBulkButton,
    showHeaderActions,
    unregisterAddButton,
    unregisterBulkButton,
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
