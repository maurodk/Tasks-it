import { useContext } from "react";
import { ActivitiesContext } from "../contexts/ActivitiesContext";

export function useActivitiesContext() {
  const context = useContext(ActivitiesContext);
  if (!context) {
    throw new Error(
      "useActivitiesContext must be used within an ActivitiesProvider"
    );
  }
  return context;
}
