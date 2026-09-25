require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    credentials: true
}));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'my-secret-key-change-this-later';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/CollegeServiceDB';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB (CollegeServiceDB)'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    full_name: { type: String, default: "" },
    email: { type: String, default: "" },
    role: { type: String, required: true },
    department: { type: String, default: "" }
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

const requestSchema = new mongoose.Schema({
    username: { type: String, required: true },
    category: { type: String, required: true },
    title: { type: String, default: "Service Request" },
    description: { type: String, required: true },
    department: { type: String, default: "General" },
    status: { type: String, default: 'NEW' }, // NEW, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED
    assigned_to: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, { collection: 'service_requests' });

const ServiceRequest = mongoose.model('ServiceRequest', requestSchema);

const updateSchema = new mongoose.Schema({
    request_id: { type: String, required: true },
    username: { type: String, required: true },
    message: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
}, { collection: 'request_updates' });

const RequestUpdate = mongoose.model('RequestUpdate', updateSchema);

// Auth middleware
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ detail: "Authorization token required" });
    const token = authHeader.split(' ')[1] || authHeader;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ detail: "Invalid or expired token" });
    }
}

// Role middleware
function requireRole(allowedRoles) {
    return (req, res, next) => {
        const role = (req.user?.role || "").toLowerCase();
        const allowed = allowedRoles.map(r => r.toLowerCase());
        if (!allowed.includes(role)) {
            return res.status(403).json({ detail: "Access denied" });
        }
        next();
    };
}

// ---------------- Register ----------------
app.post('/register', async (req, res) => {
    try {
        const { username, password, full_name, email, role, department } = req.body;
        
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ detail: "Username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            password: hashedPassword,
            full_name: full_name || "",
            email: email || "",
            role: role || "Student",
            department: department || ""
        });
        await newUser.save();
        
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ detail: "Registration failed", error: error.message });
    }
});

// ---------------- Login ----------------
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ detail: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ detail: "Invalid password" });
        }

        const userRole = user.role || 'Student';
        const token = jwt.sign(
            { sub: user.username, username: user.username, role: userRole },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        res.status(200).json({
            access_token: token,
            token_type: "bearer",
            username: user.username,
            role: userRole
        });
    } catch (error) {
        res.status(500).json({ detail: "Login failed", error: error.message });
    }
});

// ---------------- Service Requests ----------------
// Create Request
app.post('/requests', verifyToken, async (req, res) => {
    try {
        const { category, title, description, department } = req.body;
        const newRequest = new ServiceRequest({
            username: req.user.username || req.user.sub,
            category,
            title: title || "Service Request",
            description,
            department: department || "General",
            status: "NEW",
            assigned_to: null,
            created_at: new Date(),
            updated_at: new Date()
        });
        
        const saved = await newRequest.save();
        res.status(201).json({
            message: "Service request created successfully",
            request_id: saved._id
        });
    } catch (error) {
        res.status(500).json({ detail: "Failed to create request", error: error.message });
    }
});

// Student Requests
app.get('/requests/my', verifyToken, async (req, res) => {
    try {
        const username = req.user.username || req.user.sub;
        const requests = await ServiceRequest.find({ username }).sort({ created_at: -1 });
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ detail: "Failed to fetch requests", error: error.message });
    }
});

// Admin / Lead View All Requests
app.get('/lead/requests', verifyToken, requireRole(['admin', 'service_lead']), async (req, res) => {
    try {
        const requests = await ServiceRequest.find().sort({ created_at: -1 });
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ detail: "Failed to fetch lead requests", error: error.message });
    }
});

// Staff List for Assignment
app.get('/staff/members', verifyToken, async (req, res) => {
    try {
        const staffUsers = await User.find(
            { role: { $regex: /^(service_staff|staff|admin|technician)$/i } },
            { password: 0 }
        );

        const defaultStaff = [
            { username: "staff_it", role: "service_staff", full_name: "IT Lab Technician", department: "IT Support" },
            { username: "staff_maintenance", role: "service_staff", full_name: "Campus Maintenance Staff", department: "Maintenance" },
            { username: "staff_hostel", role: "service_staff", full_name: "Hostel Caretaker", department: "Hostel" },
            { username: "staff_electrician", role: "service_staff", full_name: "Senior Electrician", department: "Maintenance" },
        ];

        const existingUsernames = new Set(staffUsers.map(u => u.username));
        const combined = [...staffUsers];
        for (const ds of defaultStaff) {
            if (!existingUsernames.has(ds.username)) {
                combined.push(ds);
            }
        }
        res.status(200).json(combined);
    } catch (error) {
        res.status(500).json({ detail: "Failed to fetch staff members", error: error.message });
    }
});

// Admin Assign Request to Staff
app.put('/lead/requests/:request_id/assign', verifyToken, requireRole(['admin', 'service_lead']), async (req, res) => {
    try {
        const { request_id } = req.params;
        const { staff_username } = req.body;

        if (!staff_username || !staff_username.trim()) {
            return res.status(400).json({ detail: "Staff username cannot be empty" });
        }

        const trimmedStaff = staff_username.trim();
        const request = await ServiceRequest.findById(request_id);
        if (!request) {
            return res.status(404).json({ detail: "Service request not found" });
        }

        request.assigned_to = trimmedStaff;
        request.status = "ASSIGNED";
        request.updated_at = new Date();
        await request.save();

        const adminUsername = req.user.username || req.user.sub || "Admin";
        const updateLog = new RequestUpdate({
            request_id: String(request_id),
            username: adminUsername,
            message: `Request assigned to staff @${trimmedStaff} by ${adminUsername}`,
            created_at: new Date()
        });
        await updateLog.save();

        res.status(200).json({
            message: `Request assigned successfully to @${trimmedStaff}`,
            request_id: request._id,
            assigned_to: trimmedStaff,
            status: "ASSIGNED"
        });
    } catch (error) {
        res.status(500).json({ detail: "Failed to assign staff", error: error.message });
    }
});

// Staff Assigned Requests
app.get('/staff/requests', verifyToken, requireRole(['service_staff', 'admin']), async (req, res) => {
    try {
        const username = req.user.username || req.user.sub;
        const requests = await ServiceRequest.find({ assigned_to: username }).sort({ created_at: -1 });
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ detail: "Failed to fetch assigned requests", error: error.message });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
});
