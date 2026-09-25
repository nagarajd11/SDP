import React, { useState } from "react";
import Login from "./login";
import Register from "./register";
import StudentDashboard from "./student";
import AdminDashboard from "./admin";
import "./App.css";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [role, setRole] = useState(() => localStorage.getItem("role") || "Student");
  const [page, setPage] = useState(() => (localStorage.getItem("token") ? "dashboard" : "login"));
  const [activePortalView, setActivePortalView] = useState("auto"); // 'auto' | 'admin' | 'student'

  const loggedIn = !!token;
  const isAdmin = role.toLowerCase() === "admin" || role.toLowerCase() === "service_lead";

  function handleLoginSuccess() {
    const freshToken = localStorage.getItem("token");
    const freshRole = localStorage.getItem("role") || "Student";
    setToken(freshToken);
    setRole(freshRole);
    setPage("dashboard");
    setActivePortalView("auto");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");

    setToken(null);
    setRole("Student");
    setPage("login");
  }

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <div>
            <span className="brand-title">College Desk</span>
            <span className="brand-subtitle">
              {isAdmin ? "Admin & Dispatch Management" : "Service & Maintenance"}
            </span>
          </div>
        </div>

        <div className="header-actions">
          {!loggedIn ? (
            <>
              <button
                className={`nav-link-btn ${page === "login" ? "active" : ""}`}
                onClick={() => setPage("login")}
              >
                Sign In
              </button>

              <button
                className={`nav-btn-primary ${page === "register" ? "active" : ""}`}
                onClick={() => setPage("register")}
              >
                Register
              </button>
            </>
          ) : (
            <>
              {isAdmin && (
                <div className="btn-group me-2" role="group">
                  <button
                    className={`btn btn-sm ${
                      (activePortalView === "admin" || (activePortalView === "auto" && isAdmin))
                        ? "btn-dark"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => setActivePortalView("admin")}
                  >
                    Admin Dispatch
                  </button>
                  <button
                    className={`btn btn-sm ${
                      activePortalView === "student"
                        ? "btn-dark"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => setActivePortalView("student")}
                  >
                    Submit Request
                  </button>
                </div>
              )}

              <button className="nav-btn-logout" onClick={handleLogout}>
                Sign Out
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Page Area */}
      <main className="main-content">
        {!loggedIn ? (
          page === "register" ? (
            <Register onLoginClick={() => setPage("login")} />
          ) : (
            <Login onLoginSuccess={handleLoginSuccess} />
          )
        ) : (isAdmin && activePortalView !== "student") ? (
          <AdminDashboard />
        ) : (
          <StudentDashboard />
        )}
      </main>
    </div>
  );
}