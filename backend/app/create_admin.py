"""Production CLI utility to create an initial Root Administrator.

Safely creates an Admin user in the database without wiping any data or tables.
Usage:
    python -m app.create_admin --email admin@latrics.com --name "Aditya Paul" --password "StrongPassword123!"
Or interactively:
    python -m app.create_admin
"""

import argparse
import asyncio
import getpass
import sys
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.modules.users.model import RoleEnum, User
from app.security.auth import hash_password


async def create_admin(email: str, password: str, full_name: str, company: str, phone: str):
    email = email.strip().lower()
    if not email or "@" not in email:
        print("❌ Error: Invalid email address provided.")
        sys.exit(1)

    if len(password) < 8:
        print("❌ Error: Password must be at least 8 characters long.")
        sys.exit(1)

    async with AsyncSessionLocal() as db:
        # Check if user already exists
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            if existing.role == RoleEnum.ADMIN:
                print(f"ℹ️  Admin user '{email}' already exists. Updating password...")
                existing.hashed_password = hash_password(password)
                existing.is_active = True
                if full_name:
                    existing.full_name = full_name
                await db.commit()
                print(f"✅ Admin password updated successfully for '{email}'.")
                return
            else:
                print(f"⚠️  User '{email}' already exists with role '{existing.role}'. Elevating to ADMIN...")
                existing.role = RoleEnum.ADMIN
                existing.hashed_password = hash_password(password)
                existing.is_active = True
                await db.commit()
                print(f"✅ User '{email}' successfully elevated to Administrator.")
                return

        new_admin = User(
            email=email,
            hashed_password=hash_password(password),
            role=RoleEnum.ADMIN,
            full_name=full_name or "Administrator",
            company_name=company or "Latrics",
            phone_number=phone or None,
            is_active=True,
            invited_by=None,
            organization_id=None,
            auth_provider="local",
        )
        db.add(new_admin)
        await db.commit()
        await db.refresh(new_admin)
        print(f"🎉 Root Administrator successfully created! ID: {new_admin.id} | Email: {new_admin.email}")


def main():
    parser = argparse.ArgumentParser(description="Create or update root Administrator in Aerostake")
    parser.add_argument("--email", help="Administrator email address")
    parser.add_argument("--password", help="Administrator password (prompted securely if omitted)")
    parser.add_argument("--name", default="Administrator", help="Full name")
    parser.add_argument("--company", default="Latrics", help="Company name")
    parser.add_argument("--phone", default=None, help="Contact phone")

    args = parser.parse_args()

    email = args.email
    if not email:
        email = input("Enter Administrator Email: ").strip()

    password = args.password
    if not password:
        password = getpass.getpass("Enter Administrator Password: ")
        confirm_password = getpass.getpass("Confirm Administrator Password: ")
        if password != confirm_password:
            print("❌ Passwords do not match.")
            sys.exit(1)

    asyncio.run(create_admin(
        email=email,
        password=password,
        full_name=args.name,
        company=args.company,
        phone=args.phone,
    ))


if __name__ == "__main__":
    main()
