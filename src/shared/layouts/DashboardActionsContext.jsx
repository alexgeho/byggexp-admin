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
  extraClickHandler: null,
  registerExtraButton: () => {},
  unregisterExtraButton: () => {},
  hideHeaderActions: () => {},
  showHeaderActions: () => {},
});

export function DashboardActionsProvider({ children }) {
  const [addClickHandler, setAddClickHandler] = useState(null);
  const [addBtnText, setAddBtnText] = useState('Add');
  const [bulkClickHandler, setBulkClickHandler] = useState(null);
  const [bulkBtnText, setBulkBtnText] = useState('Add in bulk');
  const [headerActionsVisible, setHeaderActionsVisible] = useState(true);

  const registerAddButton = useCallback((handler, text = 'Add') => {
    setAddClickHandler(() => handler);
    setAddBtnText(text);
  }, []);

  const unregisterAddButton = useCallback(() => {
    setAddClickHandler(null);
    setAddBtnText('Add');
  }, []);

  const registerBulkButton = useCallback((handler, text = 'Add in bulk') => {
    setBulkClickHandler(() => handler);
    setBulkBtnText(text);
  }, []);

  const unregisterBulkButton = useCallback(() => {
    setBulkClickHandler(null);
    setBulkBtnText('Add in bulk');
  }, []);

  // One more secondary action left of the bulk button (Personal: "+ Underentreprenör").
  const [extraClickHandler, setExtraClickHandler] = useState(null);
  const [extraBtnText, setExtraBtnText] = useState('');

  const registerExtraButton = useCallback((handler, text = '') => {
    setExtraClickHandler(() => handler);
    setExtraBtnText(text);
  }, []);

  const unregisterExtraButton = useCallback(() => {
    setExtraClickHandler(null);
    setExtraBtnText('');
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
    bulkBtnText,
    extraClickHandler,
    extraBtnText,
    headerActionsVisible,
    registerAddButton,
    unregisterAddButton,
    registerBulkButton,
    unregisterBulkButton,
    registerExtraButton,
    unregisterExtraButton,
    hideHeaderActions,
    showHeaderActions,
  }), [
    addBtnText,
    addClickHandler,
    bulkClickHandler,
    bulkBtnText,
    extraClickHandler,
    extraBtnText,
    registerExtraButton,
    unregisterExtraButton,
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
