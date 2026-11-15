// import { useState,useEffect } from "react";
// import { Play } from "lucide-react";
// import { useLocation } from "react-router-dom";

// import SqlEditor from "../components/workspace/SqlEditor";
// import ResultsTable from "../components/workspace/ResultsTable";

// import { queriesApi } from "../services/queriesApi";
// import { useConnection } from "../context/ConnectionContext";

// const starter = "SELECT * FROM customers LIMIT 10;";

// export default function Workspace() {
//   const { connection } = useConnection();
//   const location = useLocation();

//   const [sql, setSql] = useState(starter);
//   const [result, setResult] = useState(null);
//   const [error, setError] = useState(null);
//   const [running, setRunning] = useState(false);

//   async function handleRun() {
//     if (!connection) {
//       setError("No database connected.");
//       return;
//     }
//     if (!sql.trim() || running) return;

//     setRunning(true);
//     setError(null);
//     try {
//       const data = await queriesApi.execute(sql);
//       setResult(data);
//     } catch (err) {
//       setResult(null);
//       setError(err.message);
//     } finally {
//       setRunning(false);
//     }
//   }

//   useEffect(() => {
//     if (location.state?.sql) setSql(location.state.sql);
//   }, [location.state]);

//   return (
//     <div className="flex h-[calc(100vh-3.5rem)] flex-col">
//       <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
//         <span className="text-sm text-slate-400">
//           Press Ctrl/Cmd + Enter to run
//         </span>
//         <button
//           onClick={handleRun}
//           disabled={running}
//           className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
//         >
//           <Play size={14} /> Run
//         </button>
//       </div>

//       <div className="h-1/2 border-b border-slate-800">
//         <SqlEditor value={sql} onChange={setSql} onRun={handleRun} />
//       </div>

//       <div className="flex-1 overflow-hidden bg-slate-950">
//         <ResultsTable result={result} error={error} running={running} />
//       </div>
//     </div>
//   );
// }

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SqlEditor from "../components/workspace/SqlEditor";
import ResultsTable from "../components/workspace/ResultsTable";
import { queriesApi } from "../services/queriesApi";
import { useConnection } from "../context/ConnectionContext";
import { useQueryAnalysis } from "../context/QueryAnalysisContext";

export default function Workspace() {
  const { connection } = useConnection();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    sql,
    setSql,
    setAnalysis,
    setOptimizationAnalysis,
    setAnalyzing,
    setAnalysisError,
    setLastExecution,
  } = useQueryAnalysis();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [localAnalyzing, setLocalAnalyzing] = useState(false);
  const autoAnalyzeHandled = useRef(false);

  const handleRun = useCallback(async () => {
    if (!connection) {
      setError("No database connected.");
      return;
    }
    if (!sql.trim() || running || localAnalyzing) return;
    setRunning(true);
    setError(null);
    try {
      const data = await queriesApi.execute(sql);
      setResult(data);
      setLastExecution({ sql, databaseCallMs: data.databaseCallMs });
    } catch (err) {
      setResult(null);
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }, [connection, sql, running, localAnalyzing, setLastExecution]);

  const handleAnalyze = useCallback(
    async (query = sql) => {
      if (!connection) {
        setAnalysisError("No database connected.");
        navigate("/analysis");
        return;
      }
      if (!query.trim() || localAnalyzing) return;
      setSql(query);
      setLocalAnalyzing(true);
      setAnalyzing(true);
      navigate("/analysis");
      setAnalysis(null);
      setOptimizationAnalysis(null);
      setAnalysisError(null);
      try {
        const data = await queriesApi.analyze(query);
        setAnalysis(data);
      } catch (err) {
        setAnalysisError(err.message);
      } finally {
        setLocalAnalyzing(false);
        setAnalyzing(false);
      }
    },
    [
      connection,
      sql,
      localAnalyzing,
      navigate,
      setSql,
      setAnalysis,
      setOptimizationAnalysis,
      setAnalyzing,
      setAnalysisError,
    ],
  );

  useEffect(() => {
    if (location.state?.sql) setSql(location.state.sql);
    if (location.state?.analyzeOnLoad && !autoAnalyzeHandled.current) {
      autoAnalyzeHandled.current = true;
      handleAnalyze(location.state.sql || sql);
      navigate("/", { replace: true, state: {} });
    }
  }, [location.state, setSql, handleAnalyze, navigate, sql]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <span className="text-sm text-slate-400">
          Press Ctrl/Cmd + Enter to run
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => handleAnalyze()}
            disabled={localAnalyzing || running}
            className="flex items-center gap-2 rounded-md border border-slate-700 px-4 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            <Search size={14} />
            {localAnalyzing ? "Analyzing..." : "Analyze"}
          </button>
          <button
            onClick={handleRun}
            disabled={running || localAnalyzing}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <Play size={14} />
            {running ? "Running..." : "Run"}
          </button>
        </div>
      </div>
      <div className="h-1/2 border-b border-slate-800">
        <SqlEditor value={sql} onChange={setSql} onRun={handleRun} />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-slate-950">
        <ResultsTable result={result} error={error} running={running} />
      </div>
    </div>
  );
}
