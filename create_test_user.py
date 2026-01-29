#!/usr/bin/env python3
"""
Create a verified test user in Supabase to bypass email rate limits.
"""

import requests
import json
import uuid

# Supabase credentials
SUPABASE_URL = "https://zwsrurnixbpywngeubfx.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3c3J1cm5peGJweXduZ2V1YmZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA0NjMxMCwiZXhwIjoyMDg0NjIyMzEwfQ.m8JkR3cp8s6o9tbMpQzOkAM5fEHplehSTnxZ3g35omI"

def create_test_user():
    """Create a verified test user in Supabase."""
    
    print("Creating test user in Supabase...\n")
    
    # Step 1: Create user via admin API
    headers = {
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "apikey": SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
    }
    
    import time
    timestamp = int(time.time())
    test_email = f"testuser{timestamp}@example.com"
    
    user_data = {
        "email": test_email,
        "password": "Password123!",
        "email_confirm": True,  # Mark email as verified
        "user_metadata": {
            "full_name": "Test User",
        },
    }
    
    try:
        # Create user
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers=headers,
            json=user_data,
        )
        
        if response.status_code not in [200, 201]:
            print(f"❌ Error creating user: {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        user = response.json()
        user_id = user.get("id")
        print(f"✅ User created successfully!")
        print(f"   User ID: {user_id}")
        print(f"   Email: test@example.com")
        print(f"   Email verified: {user.get('email_confirmed_at') is not None}")
        
        # Step 2: Create profile for the user
        print("\nCreating user profile...\n")
        
        profile_data = {
            "id": user_id,
            "full_name": "Test User",
            "location": "Los Angeles, CA",
            "taste_profile": [
                {"name": "Technology"},
                {"name": "Food & Dining"},
                {"name": "Entertainment"},
            ],
            "created_at": "now()",
            "updated_at": "now()",
        }
        
        # Insert profile via REST API
        profile_response = requests.post(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers={
                "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
                "apikey": SERVICE_ROLE_KEY,
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json=profile_data,
        )
        
        if profile_response.status_code not in [200, 201]:
            print(f"⚠️  Warning: Could not create profile: {profile_response.status_code}")
            print(f"Response: {profile_response.text}")
            print("(This is okay - profile can be created on first login)")
        else:
            print(f"✅ Profile created successfully!")
        
        print("\n" + "="*60)
        print("TEST ACCOUNT READY!")
        print("="*60)
        print(f"Email:    {test_email}")
        print(f"Password: Password123!")
        print("="*60)
        print("\nYou can now log in to the app with these credentials!")
        print("The password toggle should also work correctly now.\n")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    create_test_user()
