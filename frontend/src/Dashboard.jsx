import { useState, useEffect } from "react";
import Plot from "react-plotly.js";
import axios from "axios";

export default function Dashboard({ user }) {
  const [symbol, setSymbol] = useState("AAPL");
  const [data, setData] = useState([]);

  async function fetchData() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://127.0.0.1:8000/api/stock/${symbol}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      setData(res.data);
    } catch (error) {
      console.error("Error fetching stock data:", error);
      setData([]);
    }
  }

  useEffect(() => { fetchData(); }, [symbol]);

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

  // Debug logging
  useEffect(() => {
    if (data.length > 0) {
      console.log("Data received:", data.length, "records");
      console.log("Sample record:", data[0]);
      console.log("Trace:", trace);
    }
  }, [data, trace]);

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl mb-4">Welcome, {user.username}</h1>
      <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
        className="p-2 text-black rounded mr-2" />
      <button onClick={fetchData} className="bg-blue-600 p-2 rounded">Fetch</button>

      {trace && trace.x && trace.x.length > 0 ? (
        <Plot
          data={[trace]}
          layout={{
            title: `${symbol} Stock Chart`,
            paper_bgcolor: "#111",
            plot_bgcolor: "#111",
            font: { color: "#fff" },
            xaxis: {
              type: 'category',
              title: 'Date'
            },
            yaxis: {
              title: 'Price ($)'
            },
            height: 600,
          }}
          style={{ width: '100%' }}
        />
      ) : (
        <p>Loading chart data... ({data.length} records loaded)</p>
      )}
    </div>
  );
}
