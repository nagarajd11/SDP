import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./admin.css";

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);

  // Active assignment state: { [requestId]: staffUsername }
  const [assigningId, setAssigningId] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [customStaff, setCustomStaff] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const username = localStorage.getItem("username") || "Admin";
  const role = localStorage.getItem("role") || "Admin";

  async function fetchAdminData() {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    try {
      // 1. Fetch All Requests
      const reqResponse = await fetch("http://127.0.0.1:8000/lead/requests", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const reqData = await reqResponse.json();
      if (reqResponse.ok) {
        setRequests(Array.isArray(reqData) ? reqData : []);
      }

      // 2. Fetch Staff Members
      const staffResponse = await fetch("http://127.0.0.1:8000/staff/members", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const staffData = await staffResponse.json();
      if (staffResponse.ok) {
        setStaffList(Array.isArray(staffData) ? staffData : []);
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Assign staff to a request
  async function handleAssignStaff(requestId) {
    const staffToAssign = selectedStaff === "CUSTOM" ? customStaff.trim() : selectedStaff;
    if (!staffToAssign) {
      alert("Please select or enter a staff username.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Session expired. Please sign in again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/lead/requests/${requestId}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          staff_username: staffToAssign
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || `Request assigned to @${staffToAssign} successfully.`);
        setAssigningId(null);
        setSelectedStaff("");
        setCustomStaff("");
        // Refresh requests list
        fetchAdminData();
      } else {
        alert(data.detail || "Failed to assign staff.");
      }
    } catch (err) {
      console.error(err);
      alert("Unable to connect to backend server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Filtered requests
  const filteredRequests = requests.filter((req) => {
    const matchesStatus = statusFilter === "ALL" || req.status === statusFilter;
    const matchesCategory = categoryFilter === "ALL" || req.category === categoryFilter;
    const matchesUnassigned = !onlyUnassigned || !req.assigned_to;
    const matchesSearch =
      req.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.assigned_to?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesCategory && matchesUnassigned && matchesSearch;
  });

  // Summary Metrics
  const totalCount = requests.length;
  const unassignedCount = requests.filter((r) => !r.assigned_to).length;
  const assignedCount = requests.filter((r) => r.status === "ASSIGNED").length;
  const inProgressCount = requests.filter((r) => r.status === "IN_PROGRESS").length;
  const resolvedCount = requests.filter((r) => r.status === "RESOLVED" || r.status === "CLOSED").length;

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
    <div className="admin-dashboard">
      {/* Admin Heading */}
      <div className="admin-heading">
        <div className="admin-heading-content">
          <h1>Admin Dispatch Console</h1>
          <p>Review incoming campus service requests and assign appropriate maintenance staff</p>
        </div>
        <div className="admin-badge">
          <span>{username}</span>
          <span className="admin-role-tag">{role}</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="admin-metrics-row">
        <div
          className="admin-metric-card"
          onClick={() => { setStatusFilter("ALL"); setOnlyUnassigned(false); }}
        >
          <div>
            <div className="admin-metric-number">{totalCount}</div>
            <div className="admin-metric-label">All Requests</div>
          </div>
          <div className="admin-metric-icon" style={{ backgroundColor: "#f1f5f9", color: "#475569" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
        </div>

        <div
          className="admin-metric-card"
          onClick={() => setOnlyUnassigned(!onlyUnassigned)}
          style={{ borderColor: onlyUnassigned ? "#dc2626" : "#e2e8f0" }}
        >
          <div>
            <div className="admin-metric-number" style={{ color: "#dc2626" }}>{unassignedCount}</div>
            <div className="admin-metric-label">Needs Staff</div>
          </div>
          <div className="admin-metric-icon" style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
        </div>

        <div
          className="admin-metric-card"
          onClick={() => { setStatusFilter("ASSIGNED"); setOnlyUnassigned(false); }}
        >
          <div>
            <div className="admin-metric-number">{assignedCount}</div>
            <div className="admin-metric-label">Assigned</div>
          </div>
          <div className="admin-metric-icon" style={{ backgroundColor: "#f5f3ff", color: "#6d28d9" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <polyline points="16 11 18 13 22 9"></polyline>
            </svg>
          </div>
        </div>

        <div
          className="admin-metric-card"
          onClick={() => { setStatusFilter("IN_PROGRESS"); setOnlyUnassigned(false); }}
        >
          <div>
            <div className="admin-metric-number">{inProgressCount}</div>
            <div className="admin-metric-label">In Progress</div>
          </div>
          <div className="admin-metric-icon" style={{ backgroundColor: "#fffbeb", color: "#d97706" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
        </div>

        <div
          className="admin-metric-card"
          onClick={() => { setStatusFilter("RESOLVED"); setOnlyUnassigned(false); }}
        >
          <div>
            <div className="admin-metric-number">{resolvedCount}</div>
            <div className="admin-metric-label">Resolved</div>
          </div>
          <div className="admin-metric-icon" style={{ backgroundColor: "#ecfdf5", color: "#059669" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="admin-control-bar">
        <div className="admin-search-wrapper">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by student, title, staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="admin-filter-group">
          <select
            className="admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            className="admin-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            <option value="Hostel">Hostel</option>
            <option value="IT Support">IT Support</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Library">Library</option>
            <option value="Academic">Academic</option>
            <option value="Transport">Transport</option>
          </select>

          <button
            className={`btn btn-sm ${onlyUnassigned ? "btn-danger" : "btn-outline-secondary"}`}
            onClick={() => setOnlyUnassigned(!onlyUnassigned)}
          >
            {onlyUnassigned ? "Showing Unassigned Only" : "Filter Unassigned"}
          </button>

          <button
            className="btn btn-sm btn-outline-primary"
            onClick={fetchAdminData}
            title="Refresh requests"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Requests Stack */}
      <div className="admin-requests-list">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>
            <p className="mt-2 text-muted" style={{ fontSize: "0.9rem" }}>Loading campus requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty-box">
            <div className="empty-box-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h3>No Matching Requests</h3>
            <p>No service requests match the currently applied filter options.</p>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div key={req._id} className="admin-request-card">
              <div className="admin-card-header">
                <div>
                  <h3 className="admin-card-title">{req.title}</h3>
                  <div className="admin-card-meta">
                    <span className="requester-pill">Student: @{req.username}</span>
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

              <div className="admin-card-description">
                {req.description}
              </div>

              <div className="admin-card-footer">
                <div className="assignment-display">
                  <span className="assignment-label">Assigned Staff:</span>
                  {req.assigned_to ? (
                    <span className="assigned-staff-badge">@{req.assigned_to}</span>
                  ) : (
                    <span className="unassigned-badge">Unassigned</span>
                  )}
                </div>

                <div>
                  {assigningId === req._id ? (
                    <button
                      className="btn-cancel-assign"
                      onClick={() => {
                        setAssigningId(null);
                        setSelectedStaff("");
                        setCustomStaff("");
                      }}
                    >
                      Close
                    </button>
                  ) : req.assigned_to ? (
                    <button
                      className="btn-reassign-action"
                      onClick={() => {
                        setAssigningId(req._id);
                        setSelectedStaff(req.assigned_to);
                      }}
                    >
                      Reassign Staff
                    </button>
                  ) : (
                    <button
                      className="btn-assign-action"
                      onClick={() => {
                        setAssigningId(req._id);
                        setSelectedStaff(staffList[0]?.username || "staff_maintenance");
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <line x1="19" y1="8" x2="19" y2="14"></line>
                        <line x1="22" y1="11" x2="16" y2="11"></line>
                      </svg>
                      Assign Staff
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Staff Assignment Box */}
              {assigningId === req._id && (
                <div className="assign-box">
                  <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
                    Select Staff:
                  </div>

                  <select
                    className="assign-select"
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                  >
                    {staffList.map((s) => (
                      <option key={s.username} value={s.username}>
                        @{s.username} ({s.full_name || s.department || s.role})
                      </option>
                    ))}
                    <option value="CUSTOM">+ Enter Custom Staff Username...</option>
                  </select>

                  {selectedStaff === "CUSTOM" && (
                    <input
                      type="text"
                      className="form-control"
                      style={{ maxWidth: "200px", fontSize: "0.88rem" }}
                      placeholder="e.g., alex_technician"
                      value={customStaff}
                      onChange={(e) => setCustomStaff(e.target.value)}
                    />
                  )}

                  <button
                    className="btn-confirm-assign"
                    onClick={() => handleAssignStaff(req._id)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Assigning..." : "Confirm Assignment"}
                  </button>

                  <button
                    className="btn-cancel-assign"
                    onClick={() => {
                      setAssigningId(null);
                      setSelectedStaff("");
                      setCustomStaff("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
