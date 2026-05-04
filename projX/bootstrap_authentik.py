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
    REDIRECT_URI        Frontend OAuth2 callback
                        (default: http://localhost:5173/callback)
    BOOTSTRAP_ENV_FILE  Optional explicit .env file path to load first
"""

from __future__ import annotations

import base64
import os
import struct
import sys
import time
import zlib
from urllib.parse import urlparse

import requests  # type: ignore[import]


def _load_env_file(env_path: str) -> None:
    if not env_path or not os.path.isfile(env_path):
        return

    with open(env_path, encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            if not key or key in os.environ:
                continue

            value = value.strip()
            if (
                len(value) >= 2
                and value[0] == value[-1]
                and value[0] in {'"', "'"}
            ):
                value = value[1:-1]

            os.environ[key] = value


def _load_bootstrap_env() -> None:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    explicit_path = os.environ.get("BOOTSTRAP_ENV_FILE", "").strip()
    candidates = [
        explicit_path,
        os.path.join(script_dir, ".env"),
        os.path.join(script_dir, "..", ".env"),
    ]
    for candidate in candidates:
        _load_env_file(os.path.abspath(candidate) if candidate else "")


_load_bootstrap_env()

BASE_URL = os.environ.get("AUTHENTIK_URL", "http://localhost:9000/authentik").rstrip("/")
TOKEN: str = (
    os.environ.get("AUTHENTIK_TOKEN")
    or os.environ.get("AUTHENTIK_BOOTSTRAP_TOKEN")
    or ""
)
REDIRECT_URI = os.environ.get(
    "REDIRECT_URI", "http://localhost/callback"
)

APP_SLUG = "easyspot"
APP_NAME = "EasySpot"
PROVIDER_NAME = "easyspot-oauth2"
_AUTHENTIK_HOST = os.environ.get("AUTHENTIK_URL", "http://localhost:9000").rstrip("/").removesuffix("/authentik")
ISSUER_URI = f"{_AUTHENTIK_HOST}/application/o/{APP_SLUG}/"

ROLES = ["DRIVER", "MANAGER", "TECHNICAL"]

TEST_USERS = [
    {
        "username": "test_driver",
        "email": "driver@easyspot.local",
        "name": "Test Driver",
        "password": "Driver123!",
        "role": "DRIVER",
    },
    {
        "username": "test_manager",
        "email": "manager@easyspot.local",
        "name": "Test Manager",
        "password": "Manager123!",
        "role": "MANAGER",
    },
    {
        "username": "test_technical",
        "email": "technical@easyspot.local",
        "name": "Test Technical",
        "password": "Technical123!",
        "role": "TECHNICAL",
    },
]

# Logo with dark/light mode support via SVG CSS media query.
# The icon box always uses the purple gradient; text color adapts.
_LOGO_SVG = """\
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3d2e8a"/>
      <stop offset="100%" stop-color="#7357ec"/>
    </linearGradient>
    <style>
      .lt { fill: #1a0f4a; }
      .lta { fill: #7357ec; }
      @media (prefers-color-scheme: dark) {
        .lt { fill: white; }
        .lta { fill: #c4baf0; }
      }
    </style>
  </defs>
  <rect x="4" y="10" width="40" height="40" rx="10" fill="url(#bg)"/>
  <text x="24" y="36" font-family="Arial,sans-serif" font-size="20"
        font-weight="900" fill="white" text-anchor="middle">P</text>
  <text x="54" y="38" font-family="Arial,sans-serif" font-size="22"
        font-weight="800" class="lt">Easy</text>
  <text x="104" y="38" font-family="Arial,sans-serif" font-size="22"
        font-weight="800" class="lta">Spot</text>
</svg>"""

_FAVICON_SVG = """\
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2e1c7c"/>
      <stop offset="100%" stop-color="#7357ec"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="8" fill="url(#g)"/>
  <text x="16" y="23" font-family="Arial,sans-serif" font-size="18"
        font-weight="900" fill="white" text-anchor="middle">P</text>
</svg>"""


def _svg_data_uri(svg: str) -> str:
    encoded = base64.b64encode(svg.encode()).decode()
    return f"data:image/svg+xml;base64,{encoded}"


def _make_transparent_png() -> bytes:
    """Build a minimal 1×1 transparent PNG in memory."""
    sig = b"\x89PNG\r\n\x1a\n"

    ihdr_data = struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0)  # RGBA
    ihdr_crc = zlib.crc32(b"IHDR" + ihdr_data) & 0xFFFFFFFF
    ihdr = struct.pack(">I", 13) + b"IHDR" + ihdr_data + struct.pack(">I", ihdr_crc)

    raw = b"\x00\x00\x00\x00\x00"  # filter byte + R G B A (fully transparent)
    compressed = zlib.compress(raw)
    idat_crc = zlib.crc32(b"IDAT" + compressed) & 0xFFFFFFFF
    idat = struct.pack(">I", len(compressed)) + b"IDAT" + compressed + struct.pack(">I", idat_crc)

    iend_crc = zlib.crc32(b"IEND") & 0xFFFFFFFF
    iend = struct.pack(">I", 0) + b"IEND" + struct.pack(">I", iend_crc)

    return sig + ihdr + idat + iend


def api(method: str, path: str, **kwargs: object) -> dict:
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
    }
    resp = requests.request(
        method, f"{BASE_URL}/api/v3{path}", headers=headers, **kwargs
    )
    if not resp.ok:
        print(
            f"  ERROR {resp.status_code} on {method} {path}:"
            f" {resp.text[:300]}"
        )
        resp.raise_for_status()
    return resp.json() if resp.text else {}


def wait_ready(timeout: int = 120) -> None:
    print("Waiting for Authentik to be ready...")
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = requests.get(
                f"{BASE_URL}/-/health/ready/", timeout=5
            )
            if r.status_code in (200, 204):
                print("  Authentik is ready.")
                return
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(3)
    sys.exit("Authentik did not become ready in time.")


def setup_akadmin_if_needed() -> str:
    """Auto-setup akadmin and return API token if needed."""
    print("Checking if Authentik needs initial setup...")

    try:
        headers = {
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        }
        resp = requests.get(
            f"{BASE_URL}/api/v3/core/users/?username=akadmin",
            headers=headers,
            timeout=5,
        )
        if resp.ok and resp.json().get("results"):
            print("  akadmin already exists.")
            return TOKEN
    except Exception:
        pass

    try:
        print(
            "  Attempting initial setup via /api/v3/core/install/..."
        )
        install_payload = {
            "username": "akadmin",
            "email": "admin@easyspot.local",
            "name": "EasySpot Admin",
            "password": "EasySpot123!Admin",
        }
        resp = requests.post(
            f"{BASE_URL}/api/v3/core/install/",
            json=install_payload,
            timeout=10,
        )
        if resp.ok:
            result = resp.json()
            token = result.get("token")
            if token:
                print("  ✓ akadmin created with auto-generated token")
                return token
    except Exception as e:
        print(f"  Install endpoint failed: {e}")

    print("  Skipping setup (may already be configured)")
    return TOKEN


def get_or_create(
    list_path: str,
    create_path: str,
    match_key: str,
    match_val: str,
    payload: dict,
) -> dict:
    existing = api("GET", f"{list_path}?{match_key}={match_val}")
    results = existing.get("results", [])
    if results:
        return results[0]
    return api("POST", create_path, json=payload)


def create_groups() -> dict[str, str]:
    print("Creating groups...")
    group_ids: dict[str, str] = {}
    for role in ROLES:
        group = get_or_create(
            "/core/groups/",
            "/core/groups/",
            "name",
            role,
            {"name": role, "is_superuser": False},
        )
        pk = group.get("pk")
        if not pk:
            sys.exit(f"Failed to get group pk for role {role}")
        group_ids[role] = str(pk)
        print(f"  Group '{role}' → pk={group_ids[role]}")
    return group_ids


def create_groups_property_mapping() -> str:
    print("Creating 'groups' property mapping...")
    mapping = get_or_create(
        "/propertymappings/provider/scope/",
        "/propertymappings/provider/scope/",
        "scope_name",
        "groups",
        {
            "name": "EasySpot Groups Claim",
            "scope_name": "groups",
            "description": "Injects group names into the JWT 'groups' claim",
            "expression": (
                "return [group.name for group in request.user.ak_groups.all()]"
            ),
        },
    )
    pk = mapping.get("pk")
    if not pk:
        sys.exit("Failed to get property mapping pk")
    if not isinstance(pk, str):
        pk = str(pk)
    print(f"  Property mapping pk={pk}")
    return pk


def get_default_scope_mappings() -> list[str]:
    resp = api("GET", "/propertymappings/provider/scope/?scope_name=openid")
    pks = [m["pk"] for m in resp.get("results", [])]
    for name in ("email", "profile"):
        r = api(
            "GET", f"/propertymappings/provider/scope/?scope_name={name}"
        )
        pks += [m["pk"] for m in r.get("results", [])]
    return pks


def _build_redirect_uris(primary: str) -> list[dict]:
    uris = {primary, primary.replace(":5173", ""), "http://localhost", "http://localhost:5173"}
    return [{"matching_mode": "strict", "url": u} for u in uris if u]


def _build_post_logout_redirect_uris() -> list[dict]:
    frontend_origin = urlparse(REDIRECT_URI)._replace(path="", params="", query="", fragment="")
    welcome_url = frontend_origin._replace(path="/welcome").geturl()
    uris = {
        welcome_url,
        "http://localhost/welcome",
        "http://localhost:5173/welcome",
    }
    return [
        {
            "matching_mode": "strict",
            "redirect_uri_type": "logout",
            "url": u,
        }
        for u in uris
        if u
    ]


def get_default_flow(designation: str) -> str:
    resp = api("GET", f"/flows/instances/?designation={designation}")
    results = resp.get("results", [])
    if not results:
        msg = (
            f"No flow with designation '{designation}' found. "
            "Run initial Authentik setup first."
        )
        sys.exit(msg)
    flow_pk = results[0].get("pk")
    if not flow_pk:
        sys.exit(f"Flow with designation '{designation}' has no pk")
    if not isinstance(flow_pk, str):
        flow_pk = str(flow_pk)
    return flow_pk


def create_provider(groups_mapping_pk: str) -> str:
    print("Creating OAuth2 provider...")
    scope_pks = get_default_scope_mappings() + [groups_mapping_pk]
    auth_flow = get_default_flow("authentication")
    authz_flow = get_default_flow("authorization")
    invalidation_flow = get_default_flow("invalidation")

    payload = {
        "name": PROVIDER_NAME,
        "authentication_flow": auth_flow,
        "authorization_flow": authz_flow,
        "invalidation_flow": invalidation_flow,
        "client_type": "public",
        "redirect_uris": _build_redirect_uris(REDIRECT_URI)
        + _build_post_logout_redirect_uris(),
        "signing_key": None,
        "access_code_validity": "minutes=1",
        "access_token_validity": "minutes=5",
        "refresh_token_validity": "days=30",
        "include_claims_in_id_token": True,
        "issuer_mode": "global",
        "property_mappings": scope_pks,
        "sub_mode": "hashed_user_id",
    }

    existing = api("GET", f"/providers/oauth2/?name={PROVIDER_NAME}")
    results = existing.get("results", [])
    if results:
        pk_str = str(results[0]["pk"])
        provider = api("PUT", f"/providers/oauth2/{pk_str}/", json=payload)
    else:
        provider = api("POST", "/providers/oauth2/", json=payload)

    pk = provider.get("pk")
    if not pk:
        sys.exit("Failed to get provider pk")
    pk_str = str(pk)
    client_id = provider.get("client_id", "(see Authentik UI)")
    print(f"  Provider pk={pk_str}, client_id={client_id}")
    return pk_str


def create_application(provider_pk: str) -> dict:
    print("Creating application...")
    app = get_or_create(
        "/core/applications/",
        "/core/applications/",
        "slug",
        APP_SLUG,
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


def create_test_users(group_ids: dict[str, str]) -> None:
    print("Creating test users...")
    for u in TEST_USERS:
        user = get_or_create(
            "/core/users/",
            "/core/users/",
            "username",
            u["username"],
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
        api(
            "POST",
            f"/core/users/{uid}/set_password/",
            json={"password": u["password"]},
        )
        print(
            f"  User '{u['username']}' (role={u['role']}) → pk={uid}"
        )


def apply_branding(app_slug: str) -> None:
    print("Applying EasySpot branding...")

    logo_uri = _svg_data_uri(_LOGO_SVG)
    favicon_uri = _svg_data_uri(_FAVICON_SVG)

    _patch_default_brand(logo_uri, favicon_uri)
    _patch_application_icon(app_slug, logo_uri)
    _patch_authentication_flows()


def _load_custom_css() -> str:
    css_path = os.path.join(os.path.dirname(__file__), "authentik-custom.css")
    try:
        with open(css_path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        print(f"  Warning: {css_path} not found — skipping custom CSS")
        return ""


def _patch_default_brand(logo_uri: str, favicon_uri: str) -> None:
    resp = api("GET", "/core/brands/")
    brands = resp.get("results", [])
    default_brand = next((b for b in brands if b.get("default")), None)
    if not default_brand:
        print("  No default brand found — skipping brand patch")
        return

    brand_uuid = default_brand["brand_uuid"]
    supports_branding_custom_css = "branding_custom_css" in default_brand
    payload = {
        **default_brand,
        "branding_title": "EasySpot",
        "branding_logo": logo_uri,
        "branding_favicon": favicon_uri,
    }
    if supports_branding_custom_css:
        payload["branding_custom_css"] = _load_custom_css()

    api("PUT", f"/core/brands/{brand_uuid}/", json=payload)
    if supports_branding_custom_css:
        print(
            f"  Default brand '{default_brand.get('domain')}' patched with EasySpot branding + custom CSS"
        )
    else:
        print(f"  Default brand '{default_brand.get('domain')}' patched with EasySpot branding")


def _patch_application_icon(app_slug: str, icon_uri: str) -> None:
    resp = api("GET", f"/core/applications/?slug={app_slug}")
    results = resp.get("results", [])
    if not results:
        print(f"  Application '{app_slug}' not found — skipping icon patch")
        return

    app = results[0]
    payload = {
        **app,
        "meta_icon": icon_uri,
        "meta_description": "Estacione sem stress, pague só o que usa.",
        "meta_publisher": "EasySpot",
    }
    api("PUT", f"/core/applications/{app_slug}/", json=payload)
    print(f"  Application '{app_slug}' meta icon + description set")


def _patch_authentication_flows() -> None:
    """Replace the default mountain background and title on all authentication flows."""
    png_bytes = _make_transparent_png()
    resp = api("GET", "/flows/instances/?designation=authentication")
    flows = resp.get("results", [])

    for flow in flows:
        slug = flow["slug"]

        api("PATCH", f"/flows/instances/{slug}/", json={"title": "Entrar no EasySpot"})

        headers = {"Authorization": f"Bearer {TOKEN}"}
        requests.post(
            f"{BASE_URL}/api/v3/flows/instances/{slug}/set_background/",
            headers=headers,
            files={"file": ("bg.png", png_bytes, "image/png")},
        )
        print(f"  Flow '{slug}': title and background updated")


def print_summary(provider_pk: str) -> None:
    provider = api("GET", f"/providers/oauth2/{provider_pk}/")
    print()
    print("=" * 60)
    print("Bootstrap complete. EasySpot Authentik configuration:")
    print(f"  Issuer URI:   {ISSUER_URI}")
    client_id = provider.get("client_id", "see Authentik UI")
    print(f"  Client ID:    {client_id}")
    print(f"  Client type:  public (PKCE)")
    print(f"  Redirect URI: {REDIRECT_URI}")
    print()
    print("Test users (all at http://localhost:9000):")
    for u in TEST_USERS:
        print(
            f"  {u['role']:<12} {u['username']:<18}"
            f" password: {u['password']}"
        )
    print()
    print("Add to your .env:")
    print(f"  AUTHENTIK_ISSUER_URI={ISSUER_URI}")
    client_id_val = provider.get("client_id", "<client_id>")
    print(f"  VITE_AUTHENTIK_CLIENT_ID={client_id_val}")
    print(f"  VITE_AUTHENTIK_REDIRECT_URI={REDIRECT_URI}")
    print("=" * 60)


ENROLLMENT_FLOW_SLUG = "easyspot-enrollment"


def create_enrollment_flow() -> None:
    print("Creating enrollment flow...")

    prompt_pk = _get_or_create_enrollment_prompt_stage()
    write_pk = _get_or_create_enrollment_write_stage()
    login_pk = _get_or_create_enrollment_login_stage()

    flow = get_or_create(
        "/flows/instances/",
        "/flows/instances/",
        "slug",
        ENROLLMENT_FLOW_SLUG,
        {
            "name": "EasySpot Enrollment",
            "slug": ENROLLMENT_FLOW_SLUG,
            "title": "Criar conta EasySpot",
            "designation": "enrollment",
            "authentication": "none",
            "policy_engine_mode": "any",
            "denied_action": "message_continue",
            "layout": "stacked",
        },
    )
    flow_slug = flow["slug"]

    flow_pk = str(flow["pk"])
    _bind_stage(flow_pk, prompt_pk, order=10)
    _bind_stage(flow_pk, write_pk, order=20)
    _bind_stage(flow_pk, login_pk, order=30)

    print(f"  Enrollment flow '{flow_slug}' ready")


def _get_or_create_enrollment_prompt_stage() -> str:
    name = "easyspot-enrollment-prompt"

    field_pks = [
        _get_or_create_prompt("easyspot-enrollment-name", {
            "field_key": "name",
            "label": "Nome completo",
            "type": "text",
            "required": True,
            "placeholder": "",
            "order": 100,
            "sub_text": "",
        }),
        _get_or_create_prompt("easyspot-enrollment-username", {
            "field_key": "username",
            "label": "Nome de utilizador",
            "type": "username",
            "required": True,
            "placeholder": "",
            "order": 200,
            "sub_text": "",
        }),
        _get_or_create_prompt("easyspot-enrollment-email", {
            "field_key": "email",
            "label": "Email",
            "type": "email",
            "required": True,
            "placeholder": "",
            "order": 300,
            "sub_text": "",
        }),
        _get_or_create_prompt("easyspot-enrollment-password", {
            "field_key": "password",
            "label": "Palavra-passe",
            "type": "password",
            "required": True,
            "placeholder": "",
            "order": 400,
            "sub_text": "",
        }),
        _get_or_create_prompt("easyspot-enrollment-password-repeat", {
            "field_key": "password_repeat",
            "label": "Repetir palavra-passe",
            "type": "password",
            "required": True,
            "placeholder": "",
            "order": 500,
            "sub_text": "",
        }),
    ]

    existing = api("GET", f"/stages/prompt/stages/?name={name}")
    if existing.get("results"):
        stage = existing["results"][0]
        api("PATCH", f"/stages/prompt/stages/{stage['pk']}/", json={"fields": field_pks})
        return str(stage["pk"])

    stage = api("POST", "/stages/prompt/stages/", json={
        "name": name,
        "fields": field_pks,
        "validation_policies": [],
    })
    return str(stage["pk"])


def _get_or_create_prompt(name: str, payload: dict) -> str:
    existing = api("GET", f"/stages/prompt/prompts/?name={name}")
    if existing.get("results"):
        return str(existing["results"][0]["pk"])
    result = api("POST", "/stages/prompt/prompts/", json={"name": name, **payload})
    return str(result["pk"])


def _get_or_create_enrollment_write_stage() -> str:
    name = "easyspot-enrollment-write"
    existing = api("GET", f"/stages/user_write/?name={name}")
    if existing.get("results"):
        return str(existing["results"][0]["pk"])
    stage = api("POST", "/stages/user_write/", json={
        "name": name,
        "user_creation_mode": "always_create",
        "create_users_as_inactive": False,
        "create_users_group": None,
    })
    return str(stage["pk"])


def _get_or_create_enrollment_login_stage() -> str:
    name = "easyspot-enrollment-login"
    existing = api("GET", f"/stages/user_login/?name={name}")
    if existing.get("results"):
        return str(existing["results"][0]["pk"])
    stage = api("POST", "/stages/user_login/", json={
        "name": name,
        "session_duration": "seconds=0",
        "terminate_other_sessions": False,
        "remember_me_offset": "seconds=0",
    })
    return str(stage["pk"])


def _bind_stage(flow_pk: str, stage_pk: str, order: int) -> None:
    existing = api("GET", f"/flows/bindings/?target={flow_pk}&stage={stage_pk}")
    if existing.get("results"):
        return
    api("POST", "/flows/bindings/", json={
        "target": flow_pk,
        "stage": stage_pk,
        "order": order,
        "enabled": True,
        "policy_engine_mode": "any",
    })


def main() -> None:
    wait_ready()

    token = setup_akadmin_if_needed()

    if not token:
        sys.exit(
            "Could not obtain AUTHENTIK_TOKEN.\n"
            "Options:\n"
            "  1. Manual setup: Open http://localhost:9000, create"
            " akadmin, generate token, then:\n"
            "     export AUTHENTIK_TOKEN=<token>\n"
            "     python3 bootstrap_authentik.py\n"
            "  2. Check if Authentik is fully running: docker compose"
            " logs authentik-server"
        )

    global TOKEN
    TOKEN = token

    group_ids = create_groups()
    groups_mapping_pk = create_groups_property_mapping()
    provider_pk = create_provider(groups_mapping_pk)
    create_application(provider_pk)
    create_enrollment_flow()
    create_test_users(group_ids)
    apply_branding(APP_SLUG)
    print_summary(provider_pk)


if __name__ == "__main__":
    main()
