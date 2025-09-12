import React, { createContext, useContext, useState } from 'react';

// Define the storage context type
interface StorageContextType {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

// Create a context
const StorageContext = createContext<StorageContextType | null>(null);

// In-memory storage
const memoryStorage: Record<string, string> = {};

// Provider component
export const StorageProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const getItem = async (key: string): Promise<string | null> => {
    return memoryStorage[key] || null;
  };

  const setItem = async (key: string, value: string): Promise<void> => {
    memoryStorage[key] = value;
  };

  const removeItem = async (key: string): Promise<void> => {
    delete memoryStorage[key];
  };

  const clear = async (): Promise<void> => {
    Object.keys(memoryStorage).forEach(key => {
      delete memoryStorage[key];
    });
  };

  return (
    <StorageContext.Provider value={{ getItem, setItem, removeItem, clear }}>
      {children}
    </StorageContext.Provider>
  );
};

// Custom hook to use the storage context
export const useStorage = (): StorageContextType => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}; 