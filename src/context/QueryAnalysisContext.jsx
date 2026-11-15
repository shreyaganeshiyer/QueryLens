import { createContext, useContext, useState } from "react";

const QueryAnalysisContext = createContext(null);

export function QueryAnalysisProvider({ children }) {
  const [sql, setSql] = useState("SELECT * FROM customers LIMIT 10;");
  const [analysis, setAnalysis] = useState(null);
  const [optimizationAnalysis, setOptimizationAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [lastExecution, setLastExecution] = useState(null);

  return (
    <QueryAnalysisContext.Provider
      value={{
        sql,
        setSql,
        analysis,
        setAnalysis,
        optimizationAnalysis,
        setOptimizationAnalysis,
        analyzing,
        setAnalyzing,
        analysisError,
        setAnalysisError,
        lastExecution,
        setLastExecution,
      }}
    >
      {children}
    </QueryAnalysisContext.Provider>
  );
}

export function useQueryAnalysis() {
  const context = useContext(QueryAnalysisContext);
  if (!context) {
    throw new Error(
      "useQueryAnalysis must be used inside QueryAnalysisProvider",
    );
  }
  return context;
}
