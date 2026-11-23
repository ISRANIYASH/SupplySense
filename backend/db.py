"""
backend/db.py — Shared synchronous SQLAlchemy engine + session factory
Uses psycopg2 (synchronous) for simplicity — FastAPI works fine with it.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

raw_url = os.getenv("DATABASE_URL")
if raw_url:
    # Normalize postgres URL to postgresql+psycopg2 dialect for SQLAlchemy
    if raw_url.startswith("postgres://"):
        DATABASE_URL = raw_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+"):
        DATABASE_URL = raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    else:
        DATABASE_URL = raw_url
else:
    DB_USER = os.getenv("POSTGRES_USER", "supplysense_admin")
    DB_PASS = os.getenv("POSTGRES_PASSWORD", "secure_supplysense_pwd_2026")
    DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
    DB_PORT = os.getenv("POSTGRES_PORT", "5432")
    DB_NAME = os.getenv("POSTGRES_DB", "supplysense")
    DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

connect_args = {"connect_timeout": 15}
try:
    from urllib.parse import urlparse
    parsed = urlparse(DATABASE_URL)
    host = parsed.hostname
    if host:
        # Default fallback IP for Neon pooler in ap-southeast-1 if DNS fails
        connect_args["hostaddr"] = "13.251.17.193"
        import socket
        try:
            resolved = socket.getaddrinfo(host, 5432)[0][4][0]
            connect_args["hostaddr"] = resolved
        except Exception:
            # Query Google DNS (8.8.8.8) directly over UDP
            import struct
            ID = 0x1234
            header = struct.pack('!HHHHHH', ID, 0x0100, 1, 0, 0, 0)
            parts = host.split('.')
            qname = b''.join(bytes([len(p)]) + p.encode('ascii') for p in parts) + b'\x00'
            question = qname + struct.pack('!HH', 1, 1)
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(3.0)
            sock.sendto(header + question, ('8.8.8.8', 53))
            data, _ = sock.recvfrom(1024)
            sock.close()
            offset = 12 + len(question)
            ancount = struct.unpack('!H', data[6:8])[0]
            for _ in range(ancount):
                if data[offset] & 0xC0 == 0xC0:
                    offset += 2
                else:
                    while data[offset] != 0:
                        offset += 1 + data[offset]
                    offset += 1
                rtype, rclass, ttl, rdlength = struct.unpack('!HHIH', data[offset:offset+10])
                offset += 10
                if rtype == 1 and rdlength == 4:
                    connect_args["hostaddr"] = socket.inet_ntoa(data[offset:offset+4])
                    break
                offset += rdlength
except Exception:
    pass

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=300,
    connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
