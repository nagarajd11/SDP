import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Login.css";

export default function Login({ onLoginSuccess }) {

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("Student");

    async function loginUser(e) {
        e.preventDefault();

        try {
            const response = await fetch("http://127.0.0.1:8000/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    role: role
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert("Login successful");

                // Store JWT token
                localStorage.setItem("token", data.access_token);
                // Store username
                localStorage.setItem("username", username);
                // Store role
                localStorage.setItem("role", data.role || role);

                // Inform App.jsx that login was successful
                onLoginSuccess();
            } else {
                let errorMsg = "Login failed";
                if (typeof data.detail === "string") {
                    errorMsg = data.detail;
                } else if (Array.isArray(data.detail)) {
                    errorMsg = data.detail
                        .map((d) => {
                            if (typeof d === "string") return d;
                            const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : "";
                            const msg = d.msg || d.detail || JSON.stringify(d);
                            return field ? `${field}: ${msg}` : msg;
                        })
                        .join("\n");
                } else if (data.detail && typeof data.detail === "object") {
                    errorMsg = JSON.stringify(data.detail);
                } else if (data.message) {
                    errorMsg = data.message;
                } else if (data.error) {
                    errorMsg = typeof data.error === "object" ? JSON.stringify(data.error) : data.error;
                }
                alert(errorMsg);
            }

        } catch (error) {

            console.log(error);

            alert(
                "Unable to connect to backend server"
            );
        }
    }

    return (

        <div className="login-page">

            <div className="login-card">

                <h2>Login</h2>

                <form onSubmit={loginUser}>

                    <label className="form-label">
                        Username
                    </label>

                    <input
                        type="text"
                        className="form-control mb-3"
                        value={username}
                        onChange={(e) =>
                            setUsername(e.target.value)
                        }
                        required
                    />


                    <label className="form-label">
                        Password
                    </label>

                    <input
                        type="password"
                        className="form-control mb-3"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                        required
                    />


                    <label className="form-label">
                        Role
                    </label>

                    <select
                        className="form-select mb-4"
                        value={role}
                        onChange={(e) =>
                            setRole(e.target.value)
                        }
                    >

                        <option value="Student">
                            Student
                        </option>

                        <option value="Admin">
                            Admin
                        </option>

                    </select>


                    <button
                        type="submit"
                        className="btn btn-primary w-100"
                    >
                        Login
                    </button>

                </form>

            </div>

        </div>
    );
}