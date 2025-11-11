import { useState, useEffect } from "react";
import Plot from "react-plotly.js";
import axios from "axios";

export default function Dashboard({ user, setUser }) {
  const [symbol, setSymbol] = useState("AAPL");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://127.0.0.1:8000/api/stock/${symbol}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      setData(res.data || []);
    } catch (err) {
      console.error("Error fetching stock data:", err);
      setError(err.response?.data?.detail || "Failed to load data");
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  // Removed automatic fetch on symbol change so data loads only when user clicks Fetch.
  // If you want an initial load on mount, change to: useEffect(() => { fetchData(); }, []);

  // Build candlestick trace - all arrays must have same length
  const trace = data.length > 0 ? {
    x: data.map(d => d.Date),
    close: data.map(d => d.Close ?? null),
    high: data.map(d => d.High ?? null),
    low: data.map(d => d.Low ?? null),
    open: data.map(d => d.Open ?? null),
    type: "candlestick",
    name: symbol,
    increasing: { line: { color: '#26a69a' } },
    decreasing: { line: { color: '#ef5350' } },
  } : null;

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    if (setUser) setUser(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 text-white py-10">
      <div className="max-w-5xl mx-auto p-6 bg-white/5 backdrop-blur rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Financial App</h1>
            <p className="text-sm text-gray-300">Welcome, <span className="font-semibold text-blue-200">{user?.username}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <input
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              className="px-3 py-2 rounded-lg text-black w-36"
              placeholder="Ticker"
            />
            <button onClick={fetchData} className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 rounded-lg shadow hover:brightness-110">Fetch</button>
            <button onClick={logout} className="text-sm text-gray-300 hover:text-white">Logout</button>
          </div>
        </div>

        <div className="bg-white/3 rounded-lg p-4 border border-white/5" style={{minHeight: 420}}>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="loader mb-3" />
                <p className="text-gray-300">Loading chart data... ({data.length} records loaded)</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-400 mb-2">{error}</p>
              <button onClick={fetchData} className="px-4 py-2 bg-blue-600 rounded">Retry</button>
            </div>
          ) : trace && trace.x && trace.x.length > 0 ? (
            <Plot
              data={[trace]}
              layout={{
                title: `${symbol} Stock Chart`,
                paper_bgcolor: "rgba(17,24,39,0)",
                plot_bgcolor: "rgba(17,24,39,0)",
                font: { color: "#e6eef8" },
                xaxis: { type: 'category', title: 'Date' },
                yaxis: { title: 'Price ($)' },
                height: 600,
                margin: { t: 50, b: 50, l: 60, r: 20 },
              }}
              style={{ width: '100%' }}
            />
          ) : (
            <div className="text-center py-20 text-gray-300">No data available. Try a different ticker or click Fetch.</div>
          )}
        </div>
      </div>

      <style>{`\n        .loader {\n          border: 6px solid rgba(255,255,255,0.08);\n          border-top: 6px solid rgba(99,102,241,0.9);\n          border-radius: 50%;\n          width: 48px;\n          height: 48px;\n          animation: spin 1s linear infinite;\n          margin: 0 auto;\n        }\n        @keyframes spin { to { transform: rotate(360deg); } }\n      `}</style>
    </div>
  );
}
