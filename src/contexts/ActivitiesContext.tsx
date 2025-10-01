import React, { createContext, ReactNode, useMemo } from "react";
import { useActivities, UseActivitiesOptions } from "../hooks/useActivities";

type ActivitiesContextType = ReturnType<typeof useActivities> | null;

export const ActivitiesContext = createContext<ActivitiesContextType>(null);

interface ActivitiesProviderProps {
  children: ReactNode;
  options?: UseActivitiesOptions;
}

export function ActivitiesProvider({
  children,
  options = { includeArchived: false },
}: ActivitiesProviderProps) {
  // Simplificar para evitar re-renders infinitos
  const activitiesData = useActivities(options);

  return (
    <ActivitiesContext.Provider value={activitiesData}>
      {children}
    </ActivitiesContext.Provider>
  );
}
