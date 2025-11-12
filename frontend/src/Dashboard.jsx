import { useState, useEffect } from "react";
import Plot from "react-plotly.js";
import axios from "axios";

export default function Dashboard({ user, setUser }) {
  const [symbol, setSymbol] = useState("AAPL");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chartError, setChartError] = useState("");
  const [period, setPeriod] = useState("6mo");
  const [interval, setInterval] = useState("1d");
  // Investment simulator state
  const [investAmount, setInvestAmount] = useState(1000);
  const [investDate, setInvestDate] = useState("");
  const [investLoading, setInvestLoading] = useState(false);
  const [investResult, setInvestResult] = useState(null);

  async function fetchData() {
  setLoading(true);
  setChartError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://127.0.0.1:8000/api/stock/${symbol}`, {
        params: { period, interval },
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      setData(res.data || []);
    } catch (err) {
      console.error("Error fetching stock data:", err);
      setChartError(err.response?.data?.detail || "Failed to load data");
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  const [investError, setInvestError] = useState("");

  async function calculateInvestment() {
    setInvestLoading(true);
    setInvestResult(null);
    setInvestError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://127.0.0.1:8000/api/investment`, {
        params: { symbol, amount: investAmount, date: investDate },
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setInvestResult(res.data);
    } catch (err) {
      console.error("Investment calc error:", err);
      setInvestError(err.response?.data?.detail || "Investment calculation failed");
    } finally {
      setInvestLoading(false);
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

            <select value={period} onChange={e => setPeriod(e.target.value)} className="px-3 py-2 rounded-lg bg-white/90 text-black">
              <option value="1mo">1M</option>
              <option value="3mo">3M</option>
              <option value="6mo">6M</option>
              <option value="1y">1Y</option>
              <option value="max">Max</option>
            </select>

            <select value={interval} onChange={e => setInterval(e.target.value)} className="px-3 py-2 rounded-lg bg-white/90 text-black">
              <option value="1d">Daily</option>
              <option value="1wk">Weekly</option>
            </select>

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
          ) : chartError ? (
            <div className="text-center py-20">
              <p className="text-red-400 mb-2">{chartError}</p>
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

        {/* Investment simulator */}
        <div className="mt-6 bg-white/5 rounded-lg p-4 border border-white/10">
          <h2 className="text-lg font-semibold mb-3">Investment Simulator</h2>
          <div className="flex items-center gap-3 mb-3">
            <input type="number" value={investAmount} onChange={e => setInvestAmount(Number(e.target.value))} className="px-3 py-2 rounded-lg text-black w-36" />
            <input type="date" value={investDate} onChange={e => setInvestDate(e.target.value)} className="px-3 py-2 rounded-lg bg-white/90 text-black" />
            <button onClick={calculateInvestment} disabled={investLoading || !investDate} className="px-4 py-2 bg-green-600 rounded-lg">{investLoading ? 'Calculating...' : 'Calculate'}</button>
          </div>

          {investResult ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-white/3 rounded">
                <div className="text-sm text-gray-300">Purchased</div>
                <div className="text-xl font-semibold">${investResult.purchase_price}</div>
                <div className="text-xs text-gray-400">on {investResult.purchase_date}</div>
              </div>
              <div className="p-3 bg-white/3 rounded">
                <div className="text-sm text-gray-300">Shares</div>
                <div className="text-xl font-semibold">{investResult.shares}</div>
              </div>
              <div className="p-3 bg-white/3 rounded">
                <div className="text-sm text-gray-300">Current Value</div>
                <div className="text-xl font-semibold">${investResult.value_now}</div>
                <div className={`text-sm ${investResult.gain_pct >= 0 ? 'text-green-300' : 'text-red-300'}`}>{investResult.gain_pct}%</div>
              </div>

              <div className="md:col-span-3 mt-4">
                <Plot
                  data={[{ x: investResult.series.map(s => s.Date), y: investResult.series.map(s => s.Value), type: 'scatter', mode: 'lines', fill: 'tozeroy', name: 'Portfolio Value' }]}
                  layout={{
                    title: `Value of $${investResult.amount} invested in ${investResult.symbol}`,
                    paper_bgcolor: "rgba(17,24,39,0)",
                    plot_bgcolor: "rgba(17,24,39,0)",
                    font: { color: "#e6eef8" },
                    height: 320,
                    margin: { t: 50, b: 40 }
                  }}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          ) : investError ? (
            <div className="text-center py-6">
              <p className="text-red-400 mb-2">{investError}</p>
              <button onClick={calculateInvestment} className="px-4 py-2 bg-blue-600 rounded">Retry</button>
            </div>
          ) : (
            <div className="text-sm text-gray-400">Enter an amount and purchase date to see how an investment would have grown.</div>
          )}
        </div>
      </div>

      <style>{`\n        .loader {\n          border: 6px solid rgba(255,255,255,0.08);\n          border-top: 6px solid rgba(99,102,241,0.9);\n          border-radius: 50%;\n          width: 48px;\n          height: 48px;\n          animation: spin 1s linear infinite;\n          margin: 0 auto;\n        }\n        @keyframes spin { to { transform: rotate(360deg); } }\n      `}</style>
    </div>
  );
}
