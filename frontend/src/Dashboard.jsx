import { useState, useEffect } from "react";
import Plot from "react-plotly.js";
import axios from "axios";

export default function Dashboard({ user, setUser }) {
  const [view, setView] = useState("hub"); // 'hub' | 'chart' | 'invest'
  const [symbol, setSymbol] = useState("AAPL");
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
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
      // Backend may return either an array (old) or an object with {series, stats}
      if (res.data && res.data.series) {
        setData(res.data.series || []);
        setStats(res.data.stats || null);
      } else {
        setData(res.data || []);
        setStats(null);
      }
    } catch (err) {
      console.error("Error fetching stock data:", err);
      setChartError(err.response?.data?.detail || "Failed to load data");
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  const [investError, setInvestError] = useState("");
  const [selectedStat, setSelectedStat] = useState(null);

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

  function formatLargeNumber(n) {
    if (n == null) return "—";
    const abs = Math.abs(n);
    if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return n.toString();
  }

  function formatPct(v) {
    if (v == null) return '—';
    return (v * 100).toFixed(2) + '%';
  }

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
            {/* Show symbol / period / interval / Fetch only when inside a tool view */}
            {(view === 'chart' || view === 'invest') && (
              <>
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
              </>
            )}

            <button onClick={logout} className="text-sm text-gray-300 hover:text-white">Logout</button>
          </div>
        </div>

        {/* Intermediary Tool Hub (simple) */}
        {view === 'hub' && (
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-12">
            <button onClick={() => setView('chart')} className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold shadow-lg">Open Chart</button>
            <button onClick={() => setView('invest')} className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg text-lg font-semibold shadow-lg">Open Simulator</button>
          </div>
        )}

        {/* Chart view */}
        {view === 'chart' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Chart: {symbol}</h2>
              <div className="flex items-center gap-3">
                <button onClick={() => setView('hub')} className="px-3 py-1 bg-white/10 rounded">Back to Tools</button>
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

            {stats && (
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-200">
                          {/* Each stat is clickable; clicking sets selectedStat which shows an explanation below */}
                          <div role="button" tabIndex={0} onClick={() => setSelectedStat('marketCap')} onKeyDown={(e)=>{if(e.key==='Enter')setSelectedStat('marketCap')}} className="p-3 bg-white/3 rounded cursor-pointer hover:bg-white/5">
                            <div className="text-sm text-gray-300">Market cap</div>
                            <div className="text-lg font-semibold">{formatLargeNumber(stats.marketCap)}</div>
                          </div>

                          <div role="button" tabIndex={0} onClick={() => setSelectedStat('peRatio')} onKeyDown={(e)=>{if(e.key==='Enter')setSelectedStat('peRatio')}} className="p-3 bg-white/3 rounded cursor-pointer hover:bg-white/5">
                            <div className="text-sm text-gray-300">Price-Earnings ratio</div>
                            <div className="text-lg font-semibold">{stats.peRatio ?? '—'}</div>
                          </div>

                          <div role="button" tabIndex={0} onClick={() => setSelectedStat('dividendYield')} onKeyDown={(e)=>{if(e.key==='Enter')setSelectedStat('dividendYield')}} className="p-3 bg-white/3 rounded cursor-pointer hover:bg-white/5">
                            <div className="text-sm text-gray-300">Dividend yield</div>
                            <div className="text-lg font-semibold">{stats.dividendYield != null ? (stats.dividendYield * 100).toFixed(2) + '%' : '—'}</div>
                          </div>

                          <div role="button" tabIndex={0} onClick={() => setSelectedStat('averageVolume')} onKeyDown={(e)=>{if(e.key==='Enter')setSelectedStat('averageVolume')}} className="p-3 bg-white/3 rounded cursor-pointer hover:bg-white/5">
                            <div className="text-sm text-gray-300">Average volume</div>
                            <div className="text-lg font-semibold">{formatLargeNumber(stats.averageVolume)}</div>
                          </div>

                          <div role="button" tabIndex={0} onClick={() => setSelectedStat('dayHigh')} onKeyDown={(e)=>{if(e.key==='Enter')setSelectedStat('dayHigh')}} className="p-3 bg-white/3 rounded cursor-pointer hover:bg-white/5">
                            <div className="text-sm text-gray-300">High today</div>
                            <div className="text-lg font-semibold">${stats.dayHigh ?? '—'}</div>
                          </div>

                          <div role="button" tabIndex={0} onClick={() => setSelectedStat('dayLow')} onKeyDown={(e)=>{if(e.key==='Enter')setSelectedStat('dayLow')}} className="p-3 bg-white/3 rounded cursor-pointer hover:bg-white/5">
                            <div className="text-sm text-gray-300">Low today</div>
                            <div className="text-lg font-semibold">${stats.dayLow ?? '—'}</div>
                          </div>

                          <div role="button" tabIndex={0} onClick={() => setSelectedStat('open')} onKeyDown={(e)=>{if(e.key==='Enter')setSelectedStat('open')}} className="p-3 bg-white/3 rounded cursor-pointer hover:bg-white/5">
                            <div className="text-sm text-gray-300">Open price</div>
                            <div className="text-lg font-semibold">${stats.open ?? '—'}</div>
                          </div>

                          <div role="button" tabIndex={0} onClick={() => setSelectedStat('volume')} onKeyDown={(e)=>{if(e.key==='Enter')setSelectedStat('volume')}} className="p-3 bg-white/3 rounded cursor-pointer hover:bg-white/5">
                            <div className="text-sm text-gray-300">Volume</div>
                            <div className="text-lg font-semibold">{formatLargeNumber(stats.volume)}</div>
                          </div>

                          <div role="button" tabIndex={0} onClick={() => setSelectedStat('52High')} onKeyDown={(e)=>{if(e.key==='Enter')setSelectedStat('52High')}} className="p-3 bg-white/3 rounded cursor-pointer hover:bg-white/5">
                            <div className="text-sm text-gray-300">52 Week high</div>
                            <div className="text-lg font-semibold">${stats['52WeekHigh'] ?? stats.fiftyTwoWeekHigh ?? '—'}</div>
                          </div>

                          <div role="button" tabIndex={0} onClick={() => setSelectedStat('52Low')} onKeyDown={(e)=>{if(e.key==='Enter')setSelectedStat('52Low')}} className="p-3 bg-white/3 rounded cursor-pointer hover:bg-white/5">
                            <div className="text-sm text-gray-300">52 Week low</div>
                            <div className="text-lg font-semibold">${stats['52WeekLow'] ?? stats.fiftyTwoWeekLow ?? '—'}</div>
                          </div>
                        </div>
                      )}

                      {/* Explanation panel shown when a stat is selected */}
                      {selectedStat && (
                        <div className="mt-4 p-4 bg-white/4 rounded border border-white/6 text-gray-100">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold mb-1">{(() => {
                                switch(selectedStat) {
                                  case 'marketCap': return 'Market cap';
                                  case 'peRatio': return 'Price-Earnings ratio';
                                  case 'dividendYield': return 'Dividend yield';
                                  case 'averageVolume': return 'Average volume';
                                  case 'dayHigh': return 'High today';
                                  case 'dayLow': return 'Low today';
                                  case 'open': return 'Open price';
                                  case 'volume': return 'Volume';
                                  case '52High': return '52 Week high';
                                  case '52Low': return '52 Week low';
                                  default: return '';
                                }
                              })()}</h3>
                              <p className="text-sm text-gray-200">
                                {(() => {
                                  switch(selectedStat) {
                                    case 'marketCap': return 'Market capitalization is the total market value of a company\'s outstanding shares. It\'s calculated as share price × number of outstanding shares and gives a sense of company size.';
                                    case 'peRatio': return 'Price-to-Earnings (P/E) ratio compares a company\'s current share price to its per-share earnings. A higher P/E can indicate expectations of higher growth.';
                                    case 'dividendYield': return 'Dividend yield shows the annual dividend payment as a percentage of the current share price. Useful for income-focused investors.';
                                    case 'averageVolume': return 'Average volume is the average number of shares traded per day over a period. Higher volume implies more liquidity.';
                                    case 'dayHigh': return 'High today is the highest price at which the stock has traded during the current trading day.';
                                    case 'dayLow': return 'Low today is the lowest price at which the stock has traded during the current trading day.';
                                    case 'open': return 'Open price is the price at which the stock first traded when the market opened for the day.';
                                    case 'volume': return 'Volume is the number of shares traded during the selected period (typically the current day). It\'s a measure of trading activity.';
                                    case '52High': return '52-week high is the highest price at which the stock has traded over the last 52 weeks.';
                                    case '52Low': return '52-week low is the lowest price at which the stock has traded over the last 52 weeks.';
                                    default: return '';
                                  }
                                })()}
                              </p>
                            </div>
                            <div>
                              <button onClick={() => setSelectedStat(null)} className="ml-4 text-sm text-blue-300 hover:text-blue-200">Close</button>
                            </div>
                          </div>
                        </div>
                      )}
          </div>
        )}

        {/* Investment view */}
        {view === 'invest' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Investment Simulator</h2>
              <div className="flex items-center gap-3">
                <button onClick={() => setView('hub')} className="px-3 py-1 bg-white/10 rounded">Back to Tools</button>
              </div>
            </div>

            <div className="mt-2 bg-white/5 rounded-lg p-4 border border-white/10">
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
        )}
      </div>

      <style>{`\n        .loader {\n          border: 6px solid rgba(255,255,255,0.08);\n          border-top: 6px solid rgba(99,102,241,0.9);\n          border-radius: 50%;\n          width: 48px;\n          height: 48px;\n          animation: spin 1s linear infinite;\n          margin: 0 auto;\n        }\n        @keyframes spin { to { transform: rotate(360deg); } }\n      `}</style>
    </div>
  );
}
