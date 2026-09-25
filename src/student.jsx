import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./student.css";

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("create");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Request Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Hostel");
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [description, setDescription] = useState("");

  const username = localStorage.getItem("username") || "Student";
  const role = localStorage.getItem("role") || "Student";

  // Fetch Requests on mount and on demand
  async function fetchRequests() {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    try {
      const endpoint = role.toLowerCase() === "admin" 
        ? "http://127.0.0.1:8000/lead/requests" 
        : "http://127.0.0.1:8000/requests/my";

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setRequests(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch requests:", data);
      }
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequests();
  }, []);

  // Submit New Request
  async function handleCreateRequest(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Session expired. Please sign in again.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          category,
          department,
          description
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert("Service request submitted successfully.");
        // Reset form
        setTitle("");
        setDescription("");
        setCategory("Hostel");
        // Switch to list tab & refresh
        setActiveTab("list");
        fetchRequests();
      } else {
        let errorMsg = "Failed to submit request";
        if (typeof data.detail === "string") {
          errorMsg = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMsg = data.detail
            .map((d) => (d.msg || d.detail || JSON.stringify(d)))
            .join("\n");
        } else if (data.detail && typeof data.detail === "object") {
          errorMsg = JSON.stringify(data.detail);
        }
        alert(errorMsg);
      }
    } catch (err) {
      console.error(err);
      alert("Unable to connect to backend server");
    } finally {
      setSubmitting(false);
    }
  }

  // Filtered requests
  const filteredRequests = requests.filter((req) => {
    const matchesStatus = statusFilter === "ALL" || req.status === statusFilter;
    const matchesSearch =
      req.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Count Statistics
  const totalCount = requests.length;
  const newCount = requests.filter((r) => r.status === "NEW").length;
  const inProgressCount = requests.filter(
    (r) => r.status === "IN_PROGRESS" || r.status === "ASSIGNED"
  ).length;
  const resolvedCount = requests.filter(
    (r) => r.status === "RESOLVED" || r.status === "CLOSED"
  ).length;

  const formatDate = (dateStr) => {
    if (!dateStr) return "Just now";
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="student-dashboard">
      {/* Heading */}
      <div className="dashboard-heading">
        <div className="heading-content">
          <h1>Service Request Desk</h1>
          <p>Create assistance requests and track their status in real time</p>
        </div>
        <div className="user-pill">
          <span>{username}</span>
          <span className="user-role-badge">{role}</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-row">
        <div
          className="metric-box"
          onClick={() => { setActiveTab("list"); setStatusFilter("ALL"); }}
          style={{ cursor: "pointer" }}
        >
          <div>
            <div className="metric-number">{totalCount}</div>
            <div className="metric-label">Total Requests</div>
          </div>
          <div className="metric-indicator indicator-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
        </div>

        <div
          className="metric-box"
          onClick={() => { setActiveTab("list"); setStatusFilter("NEW"); }}
          style={{ cursor: "pointer" }}
        >
          <div>
            <div className="metric-number">{newCount}</div>
            <div className="metric-label">New / Pending</div>
          </div>
          <div className="metric-indicator indicator-pending">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
        </div>

        <div
          className="metric-box"
          onClick={() => { setActiveTab("list"); setStatusFilter("IN_PROGRESS"); }}
          style={{ cursor: "pointer" }}
        >
          <div>
            <div className="metric-number">{inProgressCount}</div>
            <div className="metric-label">In Progress</div>
          </div>
          <div className="metric-indicator indicator-progress">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
        </div>

        <div
          className="metric-box"
          onClick={() => { setActiveTab("list"); setStatusFilter("RESOLVED"); }}
          style={{ cursor: "pointer" }}
        >
          <div>
            <div className="metric-number">{resolvedCount}</div>
            <div className="metric-label">Resolved</div>
          </div>
          <div className="metric-indicator indicator-resolved">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="control-bar">
        <div className="segmented-control">
          <button
            className={`segment-btn ${activeTab === "create" ? "active" : ""}`}
            onClick={() => setActiveTab("create")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Request
          </button>
          <button
            className={`segment-btn ${activeTab === "list" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("list");
              fetchRequests();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            Requests ({requests.length})
          </button>
        </div>

        {activeTab === "list" && (
          <div className="filter-bar">
            <div className="search-field-wrapper">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search title, category..."
                className="search-field"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="select-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            <button
              className="refresh-action-btn"
              onClick={fetchRequests}
              title="Refresh request list"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === "create" ? (
        /* Create Request Form */
        <div className="form-card">
          <h2 className="form-card-title">Submit a Request</h2>
          <p className="form-card-desc">Complete the form below to file a maintenance or assistance request.</p>

          <form onSubmit={handleCreateRequest}>
            <div className="field-group">
              <label>Request Subject</label>
              <input
                type="text"
                placeholder="Brief summary of the issue (e.g. Lab PC fan noise, hostel plumbing)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="field-row">
              <div className="field-group">
                <label>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="Hostel">Hostel & Accommodation</option>
                  <option value="IT Support">IT & Lab Infrastructure</option>
                  <option value="Maintenance">Campus Maintenance</option>
                  <option value="Library">Library Services</option>
                  <option value="Academic">Academic & Departmental</option>
                  <option value="Transport">Campus Transport</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="field-group">
                <label>Department / Location</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                >
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Hostel Block A">Hostel Block A</option>
                  <option value="Hostel Block B">Hostel Block B</option>
                  <option value="Campus Central Library">Campus Central Library</option>
                  <option value="Administration / General">Administration / General</option>
                </select>
              </div>
            </div>

            <div className="field-group">
              <label>Description</label>
              <textarea
                rows={4}
                placeholder="Provide specific details such as room number, equipment ID, or urgency..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="form-button-row">
              <button
                type="button"
                className="btn-default-outline"
                onClick={() => {
                  setTitle("");
                  setDescription("");
                }}
              >
                Clear Form
              </button>
              <button
                type="submit"
                className="btn-submit-action"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Requests Stack View */
        <div className="requests-stack">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>
              <p className="mt-2 text-muted" style={{ fontSize: "0.9rem" }}>Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="empty-box">
              <div className="empty-box-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <h3>No Requests Found</h3>
              <p>
                {searchQuery || statusFilter !== "ALL"
                  ? "No requests match the active filter criteria."
                  : "You have not submitted any service requests yet."}
              </p>
              <button
                className="btn-submit-action mx-auto"
                onClick={() => setActiveTab("create")}
              >
                Create Request
              </button>
            </div>
          ) : (
            filteredRequests.map((req) => (
              <div key={req._id} className="ticket-card">
                <div className="ticket-card-header">
                  <div>
                    <h3 className="ticket-title">{req.title}</h3>
                    <div className="ticket-badges">
                      <span className="tag-pill">{req.category}</span>
                      <span className="tag-dept">{req.department}</span>
                      <span className="timestamp-text">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        {formatDate(req.created_at)}
                      </span>
                    </div>
                  </div>
                  <span className={`status-chip status-${(req.status || "new").toLowerCase()}`}>
                    {req.status || "NEW"}
                  </span>
                </div>

                <div className="ticket-body">
                  {req.description}
                </div>

                <div className="ticket-footer">
                  <div>
                    <span>Staff Assignment: </span>
                    <strong style={{ color: "#334155" }}>
                      {req.assigned_to ? `@${req.assigned_to}` : "Unassigned"}
                    </strong>
                  </div>
                  <div>
                    <span>Ref: {req._id.slice(-6)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}