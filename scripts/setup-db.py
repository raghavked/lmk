#!/usr/bin/env python3
"""
Supabase Database Setup Script
This script initializes the LMK database with all necessary tables, functions, and triggers.
"""

import os
import sys
from pathlib import Path
import psycopg2
from psycopg2 import sql

def setup_database():
    """Initialize the Supabase database with required schema."""
    
    # Get credentials from environment
    supabase_url = os.getenv('SUPABASE_URL')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not service_role_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        sys.exit(1)
    
    # Extract database connection string from Supabase URL
    # Format: https://PROJECT_ID.supabase.co
    project_id = supabase_url.split("//")[1].split(".")[0]
    
    # Construct PostgreSQL connection string
    db_connection_string = f"postgresql://postgres:{service_role_key}@db.{project_id}.supabase.co:5432/postgres"
    
    print(f"🔗 Connecting to Supabase PostgreSQL...")
    
    try:
        conn = psycopg2.connect(db_connection_string)
        cursor = conn.cursor()
        print("✅ Connected to Supabase PostgreSQL")
    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        sys.exit(1)
    
    # Read the SQL migration file
    sql_file = Path(__file__).parent / "init-supabase.sql"
    
    if not sql_file.exists():
        print(f"❌ Error: SQL file not found at {sql_file}")
        sys.exit(1)
    
    with open(sql_file, 'r') as f:
        sql_content = f.read()
    
    print(f"📄 Loaded SQL migration from {sql_file}")
    
    # Split SQL into individual statements
    statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
    
    print(f"📋 Found {len(statements)} SQL statements to execute")
    
    # Execute each statement
    executed = 0
    failed = 0
    
    for i, statement in enumerate(statements, 1):
        try:
            cursor.execute(statement)
            conn.commit()
            print(f"✅ [{i}/{len(statements)}] Executed successfully")
            executed += 1
        except psycopg2.Error as e:
            # Some statements might fail if they already exist, which is okay
            error_msg = str(e).lower()
            if "already exists" in error_msg or "duplicate" in error_msg or "relation" in error_msg:
                print(f"⚠️  [{i}/{len(statements)}] Already exists or skipped")
                conn.rollback()
                executed += 1
            else:
                print(f"❌ [{i}/{len(statements)}] Failed: {e}")
                conn.rollback()
                failed += 1
        except Exception as e:
            print(f"❌ [{i}/{len(statements)}] Unexpected error: {e}")
            conn.rollback()
            failed += 1
    
    cursor.close()
    conn.close()
    
    print("\n" + "="*50)
    print(f"✅ Database setup complete!")
    print(f"   Executed: {executed}/{len(statements)}")
    if failed > 0:
        print(f"   Failed: {failed}")
    print("="*50)
    
    return failed == 0

if __name__ == "__main__":
    success = setup_database()
    sys.exit(0 if success else 1)
