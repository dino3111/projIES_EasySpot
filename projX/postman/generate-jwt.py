#!/usr/bin/env python3
"""
Generates RS256-signed JWTs for the postman test profile.

Usage:
  python generate-jwt.py <private-key-file> <role>

  role: DRIVER | MANAGER | TECHNICAL

Outputs the JWT to stdout.
"""
import sys
import time

import jwt


def generate(private_key_path: str, role: str) -> str:
    with open(private_key_path) as f:
        private_key = f.read()

    payload = {
        "sub": f"auth-sub-postman-{role.lower()}",
        "groups": [role],
        "iss": "postman-test",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    return jwt.encode(payload, private_key, algorithm="RS256")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <private-key-file> <role>", file=sys.stderr)
        sys.exit(1)

    print(generate(sys.argv[1], sys.argv[2]))

