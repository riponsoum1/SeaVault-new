import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the types for the creatures and the context
type Creature = {
  id: string;
  name: string;
  imageUri: string | null;
};

type DiveLogContextType = {
  selectedCreatures: Creature[];
  setSelectedCreatures: (creatures: Creature[]) => void;
};

// Create the context
export const DiveLogContext = createContext<DiveLogContextType | undefined>(undefined);

// DiveLogProvider to provide the context to components
export const DiveLogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedCreatures, setSelectedCreatures] = useState<Creature[]>([]);

  return (
    <DiveLogContext.Provider value={{ selectedCreatures, setSelectedCreatures }}>
      {children}
    </DiveLogContext.Provider>
  );
};

// Custom hook to use the DiveLogContext
export const useDiveLog = () => {
  const context = useContext(DiveLogContext);
  if (!context) {
    throw new Error('useDiveLog must be used within a DiveLogProvider');
  }
  return context;
};