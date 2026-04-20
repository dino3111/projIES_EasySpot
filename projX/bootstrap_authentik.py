#!/usr/bin/env python3
"""
Authentik bootstrap script for EasySpot.

Configures the Authentik IDP via REST API:
  - Groups: DRIVER, MANAGER, TECHNICAL
  - Property mapping: injects 'groups' claim into JWT
  - OAuth2 provider + application (easyspot)
  - Test users: one per role

Usage (Automatic - no manual setup needed):
    1. Start the stack: docker compose up -d
    2. Run: python3 bootstrap_authentik.py
       - Automatically creates akadmin if needed
       - Sets up groups, OAuth2 provider, test users
       - Prints summary with credentials

Usage (Manual - if automatic setup fails):
    1. Open http://localhost:9000 and finish the initial Authentik setup
    2. Create an API token in Admin UI → Directory → Tokens → Create
    3. Run: AUTHENTIK_TOKEN=<token> python3 bootstrap_authentik.py

Optional env vars:
    AUTHENTIK_URL       Base URL of Authentik (default: http://localhost:9000)
    AUTHENTIK_TOKEN     API token (optional if auto-setup works)
    REDIRECT_URI        Frontend OAuth2 callback (default: http://localhost:5173/callback)
"""

import os
import sys
import time
import requests

BASE_URL = os.environ.get("AUTHENTIK_URL", "http://localhost:9000").rstrip("/")
TOKEN = os.environ.get("AUTHENTIK_TOKEN") or os.environ.get("AUTHENTIK_BOOTSTRAP_TOKEN", "")
REDIRECT_URI = os.environ.get("REDIRECT_URI", "http://localhost:5173/callback")

APP_SLUG = "easyspot"
APP_NAME = "EasySpot"
PROVIDER_NAME = "easyspot-oauth2"
ISSUER_URI = f"{BASE_URL}/application/o/{APP_SLUG}/"

ROLES = ["DRIVER", "MANAGER", "TECHNICAL"]

TEST_USERS = [
    {"username": "test_driver",    "email": "driver@easyspot.local",    "name": "Test Driver",    "password": "Driver123!", "role": "DRIVER"},
    {"username": "test_manager",   "email": "manager@easyspot.local",   "name": "Test Manager",   "password": "Manager123!", "role": "MANAGER"},
    {"username": "test_technical", "email": "technical@easyspot.local", "name": "Test Technical", "password": "Technical123!", "role": "TECHNICAL"},
]


def api(method: str, path: str, **kwargs):
    headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
    resp = requests.request(method, f"{BASE_URL}/api/v3{path}", headers=headers, **kwargs)
    if not resp.ok:
        print(f"  ERROR {resp.status_code} on {method} {path}: {resp.text[:300]}")
        resp.raise_for_status()
    return resp.json() if resp.text else {}


def wait_ready(timeout: int = 120):
    print("Waiting for Authentik to be ready...")
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = requests.get(f"{BASE_URL}/authentik/-/health/ready/", timeout=5)
            if r.status_code == 204:
                print("  Authentik is ready.")
                return
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(3)
    sys.exit("Authentik did not become ready in time.")


def setup_akadmin_if_needed() -> str:
    """Auto-setup akadmin and return API token if needed"""
    print("Checking if Authentik needs initial setup...")
    
    # Check if akadmin already exists
    try:
        headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
        resp = requests.get(f"{BASE_URL}/api/v3/core/users/?username=akadmin", headers=headers, timeout=5)
        if resp.ok and resp.json().get("results"):
            print("  akadmin already exists.")
            return TOKEN
    except:
        pass
    
    # Try install endpoint (for fresh Authentik instances)
    try:
        print("  Attempting initial setup via /api/v3/core/install/...")
        install_payload = {
            "username": "akadmin",
            "email": "admin@easyspot.local",
            "name": "EasySpot Admin",
            "password": "EasySpot123!Admin",
        }
        resp = requests.post(f"{BASE_URL}/api/v3/core/install/", json=install_payload, timeout=10)
        if resp.ok:
            result = resp.json()
            token = result.get("token")
            if token:
                print(f"  ✓ akadmin created with auto-generated token")
                return token
    except Exception as e:
        print(f"  Install endpoint failed: {e}")
    
    print("  Skipping setup (may already be configured)")
    return TOKEN


def get_or_create(list_path: str, create_path: str, match_key: str, match_val: str, payload: dict) -> dict:
    existing = api("GET", f"{list_path}?{match_key}={match_val}")
    results = existing.get("results", [])
    if results:
        return results[0]
    return api("POST", create_path, json=payload)


def create_groups() -> dict[str, int]:
    print("Creating groups...")
    group_ids: dict[str, int] = {}
    for role in ROLES:
        group = get_or_create(
            "/core/groups/", "/core/groups/",
            "name", role,
            {"name": role, "is_superuser": False},
        )
        group_ids[role] = group["pk"]
        print(f"  Group '{role}' → pk={group['pk']}")
    return group_ids


def create_groups_property_mapping() -> str:
    print("Creating 'groups' property mapping...")
    mapping = get_or_create(
        "/propertymappings/scope/", "/propertymappings/scope/",
        "scope_name", "groups",
        {
            "name": "EasySpot Groups Claim",
            "scope_name": "groups",
            "description": "Injects group names into the JWT 'groups' claim",
            "expression": (
                "return [group.name for group in request.user.ak_groups.all()]"
            ),
        },
    )
    pk = mapping["pk"]
    print(f"  Property mapping pk={pk}")
    return pk


def get_default_scope_mappings() -> list[str]:
    resp = api("GET", "/propertymappings/scope/?scope_name=openid")
    pks = [m["pk"] for m in resp.get("results", [])]
    for name in ("email", "profile"):
        r = api("GET", f"/propertymappings/scope/?scope_name={name}")
        pks += [m["pk"] for m in r.get("results", [])]
    return pks


def get_default_flow(designation: str) -> str:
    resp = api("GET", f"/flows/instances/?designation={designation}")
    results = resp.get("results", [])
    if not results:
        sys.exit(f"No flow with designation '{designation}' found. Run initial Authentik setup first.")
    return results[0]["pk"]


def create_provider(groups_mapping_pk: str) -> int:
    print("Creating OAuth2 provider...")
    scope_pks = get_default_scope_mappings() + [groups_mapping_pk]
    auth_flow = get_default_flow("authentication")
    authz_flow = get_default_flow("authorization")

    provider = get_or_create(
        "/providers/oauth2/", "/providers/oauth2/",
        "name", PROVIDER_NAME,
        {
            "name": PROVIDER_NAME,
            "authentication_flow": auth_flow,
            "authorization_flow": authz_flow,
            "client_type": "public",
            "redirect_uris": [
                {"matching_mode": "strict", "url": REDIRECT_URI},
                {"matching_mode": "strict", "url": "http://localhost:5173"},
            ],
            "signing_key": None,
            "access_code_validity": "minutes=1",
            "access_token_validity": "minutes=5",
            "refresh_token_validity": "days=30",
            "include_claims_in_id_token": True,
            "issuer_mode": "global",
            "property_mappings": scope_pks,
            "sub_mode": "hashed_user_id",
        },
    )
    pk = provider["pk"]
    print(f"  Provider pk={pk}, client_id={provider.get('client_id', '(see Authentik UI)')}")
    return pk


def create_application(provider_pk: int):
    print("Creating application...")
    app = get_or_create(
        "/core/applications/", "/core/applications/",
        "slug", APP_SLUG,
        {
            "name": APP_NAME,
            "slug": APP_SLUG,
            "provider": provider_pk,
            "meta_launch_url": "http://localhost:5173",
            "policy_engine_mode": "any",
        },
    )
    print(f"  Application slug='{app['slug']}'")
    return app


def create_test_users(group_ids: dict[str, int]):
    print("Creating test users...")
    for u in TEST_USERS:
        user = get_or_create(
            "/core/users/", "/core/users/",
            "username", u["username"],
            {
                "username": u["username"],
                "email": u["email"],
                "name": u["name"],
                "is_active": True,
                "groups": [group_ids[u["role"]]],
                "type": "internal",
            },
        )
        uid = user["pk"]
        api("POST", f"/core/users/{uid}/set_password/", json={"password": u["password"]})
        print(f"  User '{u['username']}' (role={u['role']}) → pk={uid}")


def print_summary(provider_pk: int):
    provider = api("GET", f"/providers/oauth2/{provider_pk}/")
    print()
    print("=" * 60)
    print("Bootstrap complete. EasySpot Authentik configuration:")
    print(f"  Issuer URI:   {ISSUER_URI}")
    print(f"  Client ID:    {provider.get('client_id', 'see Authentik UI')}")
    print(f"  Client type:  public (PKCE)")
    print(f"  Redirect URI: {REDIRECT_URI}")
    print()
    print("Test users (all at http://localhost:9000):")
    for u in TEST_USERS:
        print(f"  {u['role']:<12} {u['username']:<18} password: {u['password']}")
    print()
    print("Add to your .env:")
    print(f"  AUTHENTIK_ISSUER_URI={ISSUER_URI}")
    print(f"  VITE_AUTHENTIK_CLIENT_ID={provider.get('client_id', '<client_id>')}")
    print(f"  VITE_AUTHENTIK_REDIRECT_URI={REDIRECT_URI}")
    print("=" * 60)


def main():
    wait_ready()
    
    # Try to auto-setup akadmin if Authentik is fresh
    token = setup_akadmin_if_needed()
    
    if not token:
        sys.exit(
            "Could not obtain AUTHENTIK_TOKEN.\n"
            "Options:\n"
            "  1. Manual setup: Open http://localhost:9000, create akadmin, generate token, then:\n"
            "     export AUTHENTIK_TOKEN=<token>\n"
            "     python3 bootstrap_authentik.py\n"
            "  2. Check if Authentik is fully running: docker compose logs authentik-server"
        )

    # Set token globally for api() calls
    global TOKEN
    TOKEN = token

    group_ids = create_groups()
    groups_mapping_pk = create_groups_property_mapping()
    provider_pk = create_provider(groups_mapping_pk)
    create_application(provider_pk)
    create_test_users(group_ids)
    print_summary(provider_pk)


if __name__ == "__main__":
    main()
