import { useState } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";

export default function App() {
  const [user, setUser] = useState(null);
  return user ? <Dashboard user={user} setUser={setUser} /> : <Login setUser={setUser} />;
}
