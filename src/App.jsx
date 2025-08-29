import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const STATES = ["OK", "WARN", "ERROR"];
const EVENTS = ["ping_ok", "latency_high", "packet_loss_high", "ping_timeout", "suspicious_traffic"];

const FSA_RULES = {
  OK: { latency_high: "WARN", packet_loss_high: "WARN", suspicious_traffic: "ERROR", ping_ok: "OK" },
  WARN: { ping_ok: "OK", latency_high: "WARN", packet_loss_high: "WARN", suspicious_traffic: "ERROR", ping_timeout: "ERROR" },
  ERROR: { ping_ok: "WARN", latency_high: "ERROR", packet_loss_high: "ERROR", suspicious_traffic: "ERROR", ping_timeout: "ERROR" }
};

function App() {
  const [nodes, setNodes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [intervalMs, setIntervalMs] = useState(1000);
  const [numNodes, setNumNodes] = useState(10);

  const [globalAnomalies, setGlobalAnomalies] = useState(0);   // ✅ new
  const [totalEvents, setTotalEvents] = useState(0);           // ✅ new
  const [anomalyTrend, setAnomalyTrend] = useState([]);        // ✅ always moves

  const intervalRef = useRef(null);

  useEffect(() => {
    resetNodes(numNodes);
  }, [numNodes]);

  const resetNodes = (count) => {
    const newNodes = Array.from({ length: count }, (_, i) => ({
      id: `node-${i + 1}`,
      state: "OK",
      lastEvent: null,
      anomalies: [],
      health: 100
    }));
    setNodes(newNodes);
    setLogs([]);
    setGlobalAnomalies(0);   // reset
    setTotalEvents(0);       // reset
    setAnomalyTrend([]);     // reset
  };

  const randomEvent = (state) => {
  const distributions = {
    OK: {
      ping_ok: 0.83,
      latency_high: 0.1,
      packet_loss_high: 0.05,
      suspicious_traffic: 0.05,
    },
    WARN: {
      ping_ok: 0.7,
      latency_high: 0.2,
      packet_loss_high: 0.2,
      ping_timeout: 0.1,
      suspicious_traffic: 0.0, // optional, you can include if needed
    },
    ERROR: {
      ping_timeout: 0.4,
      packet_loss_high: 0.2,
      suspicious_traffic: 0.1,
      latency_high: 0.1,
    },
  };

  const probs = distributions[state] || distributions.OK;
  const r = Math.random();
  let acc = 0;

  for (const [event, p] of Object.entries(probs)) {
    acc += p;
    if (r <= acc) return event;
  }

  // fallback in case of rounding errors
  return Object.keys(probs)[0];
};

  const detectAnomalies = (node, newState, event) => {
    let anomalies = [];

    if (!FSA_RULES[node.state][event]) {
      anomalies.push("Forbidden transition");
    }
    if (event === "ping_timeout") {
      anomalies.push("Excessive timeouts");
    }
    if (event === "packet_loss_high") {
      anomalies.push("Packet loss storm");
    }
    if (event === "suspicious_traffic") {
      anomalies.push("DDoS suspicion");
    }
    if (node.state === "ERROR" && newState === "ERROR") {
      anomalies.push("Isolation risk");
    }

    return anomalies;
  };

  const simulateStep = () => {
    let anomaliesThisTick = 0;

    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        const event = randomEvent(node.state);
        const newState = FSA_RULES[node.state][event] || node.state;
        const anomalies = detectAnomalies(node, newState, event);
        const newHealth = Math.max(0, node.health - (anomalies.length > 0 ? 2 : 0));

        if (anomalies.length > 0) {
          anomaliesThisTick += anomalies.length;
          setGlobalAnomalies((prev) => prev + anomalies.length); // ✅ increment global anomalies
        }

        setLogs((prev) => [
          `[${new Date().toLocaleTimeString()}] ${node.id}: ${event} (${node.state} → ${newState}) ${anomalies.length ? "⚠️" : ""}`,
          ...prev,
        ].slice(0, 100));

        return { ...node, state: newState, lastEvent: event, anomalies, health: newHealth };
      })
    );

    setTotalEvents((prev) => prev + 1); // ✅ increment events

    // ✅ Update chart every tick (even if no anomalies)
    setAnomalyTrend((prev) => [
      ...prev,
      { t: new Date(), count: anomaliesThisTick }
    ].slice(-30));
  };

  const startSimulation = () => {
    if (running) return;
    setRunning(true);
    intervalRef.current = setInterval(simulateStep, intervalMs);
  };

  const stopSimulation = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
  };

  return (
    <div className="app">
      <h1>FSA Anomaly Lab <span className="subtitle">client-only demo</span></h1>

      <div className="controls">
        <button className="btn" onClick={running ? stopSimulation : startSimulation}>
          {running ? "Stop" : "Start"}
        </button>
        <label>
          Nodes: 
          <input
            type="number"
            className="input"
            value={numNodes}
            onChange={(e) => setNumNodes(parseInt(e.target.value) || 1)}
            min="1"
          />
        </label>
        <label>
          Speed: 
          <select className="input" onChange={(e) => setIntervalMs(1000 / parseInt(e.target.value))}>
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="4">4x</option>
          </select>
        </label>
      </div>

      {/* ✅ Stats cards fixed */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Nodes</h3>
          <p>{nodes.length}</p>
        </div>
        <div className="stat-card">
          <h3>Global anomalies</h3>
          <p>{globalAnomalies}</p>
        </div>
        <div className="stat-card">
          <h3>Total events</h3>
          <p>{totalEvents}</p>
        </div>
      </div>

      <div className="dashboard">
        <div className="card">
          <h2>Nodes</h2>
          <table className="nodes-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>State</th>
                <th>Last Event</th>
                <th>Badges</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((n) => (
                <tr key={n.id} className={n.state.toLowerCase()}>
                  <td>{n.id}</td>
                  <td>{n.state}</td>
                  <td>{n.lastEvent}</td>
                  <td>{n.anomalies.map((a, i) => <span key={i} className="anomaly">{a}</span>)}</td>
                  <td>
                    <div className="health-bar">
                      <div className="health-fill" style={{ width: `${n.health}%` }}></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Event stream</h2>
          <ul className="event-stream">
            {logs.map((log, i) => (
              <li key={i}>{log}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="dashboard">
        <div className="card chart-card wide">
  <h2>Error rate</h2>
  <svg className="chart" viewBox="0 0 800 300">
    {(() => {
      const maxPoints = 40;
      const data = anomalyTrend.slice(-maxPoints);
      const maxVal = Math.max(1, ...data.map((d) => d.count));
      const stepX = 800 / (maxPoints - 1);
      const scaleY = (val) => 260 - (val / maxVal) * 240; // 20px padding top/bottom

      // polyline path
      const line = data.map((p, i) => `${i * stepX},${scaleY(p.count)}`).join(" ");

      return (
        <>
          {/* grid lines */}
          {Array.from({ length: 5 }, (_, i) => {
            const y = (i / 4) * 260;
            return (
              <line
                key={i}
                x1="0"
                x2="800"
                y1={y}
                y2={y}
                stroke="var(--fg-muted)"
                strokeWidth="0.5"
              />
            );
          })}

          {/* polyline */}
          <polyline
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            points={line}
          />

          {/* circles */}
          {data.map((p, i) => (
            <circle
              key={i}
              cx={i * stepX}
              cy={scaleY(p.count)}
              r="3"
              fill="var(--accent)"
            />
          ))}

          {/* X-axis labels */}
          {data.map((p, i) =>
            i % 5 === 0 ? (
              <text
                key={i}
                x={i * stepX}
                y="280"
                fill="var(--fg-muted)"
                fontSize="10"
                textAnchor="middle"
              >
                {new Date(p.ts).toLocaleTimeString().split(" ")[0]}
              </text>
            ) : null
          )}

          {/* Y-axis labels */}
          {Array.from({ length: 5 }, (_, i) => {
            const val = Math.round((1 - i / 4) * maxVal);
            return (
              <text
                key={i}
                x="0"
                y={(i / 4) * 260 + 5}
                fill="var(--fg-muted)"
                fontSize="10"
              >
                {val}
              </text>
            );
          })}
        </>
      );
    })()}
  </svg>
</div>
      </div>
    </div>
  );
}

export default App;
