from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pymongo import MongoClient
from pydantic import BaseModel
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
from typing import Optional
from bson import ObjectId
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# MongoDB
# =========================

MONGO_URL = "mongodb://localhost:27017"

client = MongoClient(MONGO_URL)

db = client["CollegeServiceDB"]

user_collection = db["users"]
request_collection = db["service_requests"]
request_update_collection = db["request_updates"]
category_collection = db["service_categories"]
comment_collection = db["comments"]
attachment_collection = db["attachments"]
audit_collection = db["audit_logs"]


# =========================
# Password Hashing
# =========================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


# =========================
# JWT
# =========================

SECRET_KEY = "my-secret-key-change-this-later"

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="login"
)


# =========================
# Models
# =========================

class User(BaseModel):
    username: str
    password: str
    full_name: str = ""
    email: str = ""
    role: str
    department: str = ""

class RequestUpdate(BaseModel):
    message: str


class LoginRequest(BaseModel):
    username: str
    password: str


class ServiceRequestCreate(BaseModel):
    category: str
    title: str
    description: str
    department: str

class AssignRequest(BaseModel):
    staff_username: str


# =========================
# Home
# =========================

@app.get("/")
def home():

    return {
        "message": "College Service Request System"
    }


# =========================
# Test MongoDB
# =========================

@app.get("/test-db")
def test_db():

    try:

        client.admin.command("ping")

        return {
            "message": "MongoDB connected successfully"
        }

    except Exception as e:

        return {
            "message": "MongoDB connection failed",
            "error": str(e)
        }


# =========================
# Register
# =========================

@app.post("/register")
def register_user(user: User):

    existing_user = user_collection.find_one({
        "username": user.username
    })

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    hashed_password = pwd_context.hash(
        user.password
    )

    user_collection.insert_one({

        "username": user.username,

        "password": hashed_password,

        "full_name": user.full_name,

        "email": user.email,

        "role": user.role,

        "department": user.department
    })

    return {
        "message": "User registered successfully"
    }


# =========================
# Login
# =========================

@app.post("/login")
async def login(request: Request):
    content_type = request.headers.get("content-type", "")
    username = None
    password = None

    if "application/json" in content_type:
        try:
            body = await request.json()
            username = body.get("username")
            password = body.get("password")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON body")
    else:
        form = await request.form()
        username = form.get("username")
        password = form.get("password")

    if not username or not password:
        raise HTTPException(
            status_code=400,
            detail="Username and password are required"
        )

    existing_user = user_collection.find_one({
        "username": username
    })

    if existing_user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if not pwd_context.verify(
        password,
        existing_user["password"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid password"
        )

    user_role = existing_user.get("role", "Student")

    pay_load = {
        "sub": username,
        "role": user_role,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }

    token = jwt.encode(
        pay_load,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "username": username,
        "role": user_role
    }


# =========================
# Verify JWT
# =========================

def verify_token(
    token: str = Depends(oauth2_scheme)
):

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        username = payload.get("sub")

        role = payload.get("role")

        if username is None:

            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )

        return {
            "username": username,
            "role": role
        }

    except Exception:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )


# =========================
# Role Authorization
# =========================

def require_role(allowed_roles: list):

    def role_checker(
        user=Depends(verify_token)
    ):
        user_role = str(user.get("role", "")).lower()
        allowed = [r.lower() for r in allowed_roles]

        if user_role not in allowed:

            raise HTTPException(
                status_code=403,
                detail="Access denied"
            )

        return user

    return role_checker


# =========================
# Student Area
# =========================

@app.get("/student-area")
def student_area(
    user=Depends(
        require_role(["student"])
    )
):

    return {

        "message": "Welcome to the student area",

        "username": user["username"],

        "role": user["role"]
    }


# =========================
# Admin Area
# =========================

@app.get("/admin-area")
def admin_area(
    user=Depends(
        require_role(["admin"])
    )
):

    return {

        "message": "Welcome to the admin area",

        "username": user["username"],

        "role": user["role"]
    }


# =========================
# Create Service Request
# =========================

@app.post("/requests", status_code=201)
def create_request(
    request: ServiceRequestCreate,
    user=Depends(
        require_role(["student", "faculty", "admin", "service_lead", "service_staff"])
    )
):

    new_request = {

        "username": user["username"],

        "category": request.category,

        "title": request.title,

        "description": request.description,

        "department": request.department,

        "status": "NEW",

        "assigned_to": None,

        "created_at": datetime.utcnow(),

        "updated_at": datetime.utcnow()
    }

    result = request_collection.insert_one(
        new_request
    )

    return {

        "message": "Service request created successfully",

        "request_id": str(result.inserted_id)
    }


# =========================
# Get My Requests
# =========================

@app.get("/requests/my")
def get_my_requests(
    user=Depends(
        require_role(["student", "faculty", "admin", "service_lead", "service_staff"])
    )
):

    requests = list(
        request_collection.find(
            {
                "username": user["username"]
            }
        )
    )

    for request in requests:

        request["_id"] = str(
            request["_id"]
        )

    return requests

# =========================
# Service Lead - View All Requests
# =========================

@app.get("/lead/requests")
def get_all_requests(
    user=Depends(
        require_role(["service_lead", "admin"])
    )
):

    requests = list(
        request_collection.find({})
    )

    for request in requests:
        request["_id"] = str(request["_id"])

    return requests


# =========================
# Service Lead - Assign Request
# =========================

@app.get("/staff/members")
def get_staff_members(
    user=Depends(
        require_role(["service_lead", "admin", "student", "faculty"])
    )
):
    # Query staff or admin users
    staff_users = list(
        user_collection.find(
            {"role": {"$regex": "^(service_staff|staff|admin|technician)$", "$options": "i"}},
            {"_id": 0, "username": 1, "role": 1, "full_name": 1, "department": 1}
        )
    )
    # Default fallbacks if no staff users registered yet
    default_staff = [
        {"username": "staff_it", "role": "service_staff", "full_name": "IT Lab Technician", "department": "IT Support"},
        {"username": "staff_maintenance", "role": "service_staff", "full_name": "Campus Maintenance Staff", "department": "Maintenance"},
        {"username": "staff_hostel", "role": "service_staff", "full_name": "Hostel Caretaker", "department": "Hostel"},
        {"username": "staff_electrician", "role": "service_staff", "full_name": "Senior Electrician", "department": "Maintenance"},
    ]
    existing_usernames = {u["username"] for u in staff_users}
    for ds in default_staff:
        if ds["username"] not in existing_usernames:
            staff_users.append(ds)
    return staff_users


@app.put("/lead/requests/{request_id}/assign")
def assign_request(
    request_id: str,
    data: AssignRequest,
    user=Depends(
        require_role(["service_lead", "admin"])
    )
):
    # Check whether request exists
    existing_request = request_collection.find_one({
        "_id": ObjectId(request_id)
    })

    if existing_request is None:
        raise HTTPException(
            status_code=404,
            detail="Service request not found"
        )

    staff_name = data.staff_username.strip()
    if not staff_name:
        raise HTTPException(
            status_code=400,
            detail="Staff username cannot be empty"
        )

    # Assign request
    request_collection.update_one(
        {
            "_id": ObjectId(request_id)
        },
        {
            "$set": {
                "assigned_to": staff_name,
                "status": "ASSIGNED",
                "updated_at": datetime.utcnow()
            }
        }
    )

    # Record update in history
    request_update_collection.insert_one({
        "request_id": request_id,
        "username": user["username"],
        "message": f"Request assigned to staff @{staff_name} by {user['username']}",
        "created_at": datetime.utcnow()
    })

    return {
        "message": f"Request assigned successfully to @{staff_name}",
        "request_id": request_id,
        "assigned_to": staff_name,
        "status": "ASSIGNED"
    }

# =========================
# Service Staff - View Assigned Requests
# =========================

@app.get("/staff/requests")
def get_staff_requests(
    user=Depends(
        require_role(["service_staff", "admin"])
    )
):

    requests = list(
        request_collection.find({
            "assigned_to": user["username"]
        })
    )

    for request in requests:
        request["_id"] = str(request["_id"])

    return requests


# =========================
# Service Staff - Start Request
# =========================

@app.put("/staff/requests/{request_id}/start")
def start_request(
    request_id: str,
    user=Depends(
        require_role(["service_staff", "admin"])
    )
):

    existing_request = request_collection.find_one({
        "_id": ObjectId(request_id)
    })

    if existing_request is None:
        raise HTTPException(
            status_code=404,
            detail="Service request not found"
        )

    # Make sure this staff member is assigned
    if existing_request.get("assigned_to") != user["username"]:

        raise HTTPException(
            status_code=403,
            detail="This request is not assigned to you"
        )

    # Make sure request is currently ASSIGNED
    if existing_request.get("status") != "ASSIGNED":

        raise HTTPException(
            status_code=400,
            detail="Request must be ASSIGNED before starting"
        )

    request_collection.update_one(
        {
            "_id": ObjectId(request_id)
        },
        {
            "$set": {
                "status": "IN_PROGRESS",
                "updated_at": datetime.utcnow()
            }
        }
    )

    return {
        "message": "Request started successfully",
        "request_id": request_id,
        "status": "IN_PROGRESS"
    }

# =========================
# Service Staff - Resolve Request
# =========================

@app.put("/staff/requests/{request_id}/resolve")
def resolve_request(
    request_id: str,
    user=Depends(
        require_role(["service_staff", "admin"])
    )
):

    existing_request = request_collection.find_one({
        "_id": ObjectId(request_id)
    })

    if existing_request is None:
        raise HTTPException(
            status_code=404,
            detail="Service request not found"
        )

    if existing_request.get("assigned_to") != user["username"]:

        raise HTTPException(
            status_code=403,
            detail="This request is not assigned to you"
        )

    if existing_request.get("status") != "IN_PROGRESS":

        raise HTTPException(
            status_code=400,
            detail="Request must be IN_PROGRESS before resolving"
        )

    request_collection.update_one(
        {
            "_id": ObjectId(request_id)
        },
        {
            "$set": {
                "status": "RESOLVED",
                "updated_at": datetime.utcnow()
            }
        }
    )

    return {
        "message": "Request resolved successfully",
        "request_id": request_id,
        "status": "RESOLVED"
    }

# =========================
# Staff - Add Request Update
# =========================

@app.post("/staff/requests/{request_id}/updates")
def add_request_update(
    request_id: str,
    update: RequestUpdate,
    user=Depends(
        require_role(["service_staff", "admin"])
    )
):

    # Find the request
    existing_request = request_collection.find_one({
        "_id": ObjectId(request_id)
    })

    if existing_request is None:
        raise HTTPException(
            status_code=404,
            detail="Service request not found"
        )

    # Check that this staff member is assigned to the request
    if existing_request.get("assigned_to") != user["username"]:
        raise HTTPException(
            status_code=403,
            detail="This request is not assigned to you"
        )

    # Only allow updates while the request is in progress
    if existing_request.get("status") != "IN_PROGRESS":
        raise HTTPException(
            status_code=400,
            detail="Request must be IN_PROGRESS to add an update"
        )

    # Create the update
    update_data = {
        "request_id": request_id,
        "username": user["username"],
        "message": update.message,
        "created_at": datetime.utcnow()
    }

    request_update_collection.insert_one(update_data)

    return {
        "message": "Request update added successfully",
        "request_id": request_id,
        "update": update.message
    }

# =========================
# Student - View One Request
# =========================

@app.get("/requests/{request_id}")
def get_my_request(
    request_id: str,
    user=Depends(
        require_role(["student", "faculty"])
    )
):

    existing_request = request_collection.find_one({
        "_id": ObjectId(request_id)
    })

    if existing_request is None:
        raise HTTPException(
            status_code=404,
            detail="Service request not found"
        )

    # Student can only view their own request
    if existing_request.get("username") != user["username"]:

        raise HTTPException(
            status_code=403,
            detail="You can only view your own requests"
        )

    existing_request["_id"] = str(
        existing_request["_id"]
    )

    return existing_request

@app.get("/requests/{request_id}/updates")
def get_request_updates(
    request_id: str,
    user=Depends(
        require_role(["student", "service_staff", "service_lead", "admin"])
    )
):
    # Find the request
    existing_request = request_collection.find_one({
        "_id": ObjectId(request_id)
    })

    if existing_request is None:
        raise HTTPException(
            status_code=404,
            detail="Service request not found"
        )

    # Student can only view updates for their own request
    if user["role"] == "student":
        if existing_request.get("username") != user["username"]:
            raise HTTPException(
                status_code=403,
                detail="You can only view updates for your own requests"
            )

    # Get all updates for this request
    updates = list(
        request_update_collection.find(
            {"request_id": request_id},
            {"_id": 0}
        )
    )

    return updates
