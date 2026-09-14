import uuid
from typing import Optional, List, Dict
from pydantic import BaseModel, Field

class User(BaseModel):
    id: str
    username: str
    phone_number: str
    full_name: str
    role: str = "member"  # "super_admin" | "admin" | "member"
    is_active: bool = True
    created_at: str = "1403-06-24"

class LoginRequest(BaseModel):
    username_or_phone: str
    password: Optional[str] = None
    otp_code: Optional[str] = None

class RegisterRequest(BaseModel):
    full_name: str
    phone_number: str
    username: str
    password: str

class OtpRequest(BaseModel):
    phone_number: str

class OtpVerifyRequest(BaseModel):
    phone_number: str
    code: str

# In-memory user database with default Super Admin 'navid'
USERS_DB: Dict[str, User] = {
    "u-admin": User(
        id="u-admin",
        username="navid",
        phone_number="09120000000",
        full_name="نوید (مدیر ارشد)",
        role="super_admin",
        is_active=True,
        created_at="1403-06-01"
    ),
    "u-maryam": User(
        id="u-maryam",
        username="maryam",
        phone_number="09121111111",
        full_name="مریم (عضو خانواده)",
        role="member",
        is_active=True,
        created_at="1403-06-10"
    )
}

# Plain passwords for demo/in-memory purposes
PASSWORDS_DB: Dict[str, str] = {
    "navid": "123",
    "maryam": "123"
}

DEMO_OTP = "1234"

def authenticate_user(username_or_phone: str, password: Optional[str] = None, otp_code: Optional[str] = None) -> Optional[User]:
    clean_input = username_or_phone.strip()
    
    # 1. OTP login flow (Demo code 1234)
    if otp_code:
        if otp_code.strip() == DEMO_OTP:
            for user in USERS_DB.values():
                if user.phone_number == clean_input or user.username == clean_input:
                    return user
            # If user not found, create new user automatically with phone
            new_id = f"u-{uuid.uuid4().hex[:6]}"
            new_user = User(
                id=new_id,
                username=clean_input,
                phone_number=clean_input,
                full_name=f"کاربر {clean_input[-4:]}",
                role="member",
                is_active=True
            )
            USERS_DB[new_id] = new_user
            return new_user
        return None

    # 2. Username / Password flow
    for user in USERS_DB.values():
        if user.username.lower() == clean_input.lower() or user.phone_number == clean_input:
            expected_pass = PASSWORDS_DB.get(user.username)
            if expected_pass and password == expected_pass:
                return user
            
    return None

def register_user(req: RegisterRequest) -> User:
    # Check if username or phone already exists
    for u in USERS_DB.values():
        if u.username.lower() == req.username.strip().lower():
            raise ValueError("این نام کاربری قبلاً ثبت شده است.")
        if u.phone_number == req.phone_number.strip():
            raise ValueError("این شماره موبایل قبلاً ثبت شده است.")

    new_id = f"u-{uuid.uuid4().hex[:6]}"
    user = User(
        id=new_id,
        username=req.username.strip(),
        phone_number=req.phone_number.strip(),
        full_name=req.full_name.strip(),
        role="member",
        is_active=True
    )
    USERS_DB[new_id] = user
    PASSWORDS_DB[user.username] = req.password
    return user
