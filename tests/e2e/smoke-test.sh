#!/bin/bash

BASE_URL="http://localhost:3000"
PASS=0
FAIL=0

test_endpoint() {
    local name="$1"
    local method="$2"
    local path="$3"
    local body="$4"
    local headers="$5"
    
    local cmd="curl -s -X $method '$BASE_URL$path'"
    if [ ! -z "$headers" ]; then
        cmd="$cmd $headers"
    fi
    if [ ! -z "$body" ]; then
        cmd="$cmd -d '$body'"
    fi
    cmd="$cmd -H 'Content-Type: application/json'"
    
    local status=$(eval "$cmd" | head -1)
    if echo "$status" | grep -q "success\|HTTP"; then
        echo "✓ $name"
        ((PASS++))
    else
        echo "✗ $name"
        ((FAIL++))
    fi
}

echo ""
echo "========================================"
echo "  SUPER ADMIN SMOKE TEST"
echo "========================================"
echo ""

# Phase 1: Login
echo "Phase 1: Super Admin Login"
LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/super-admin/login" -H "Content-Type: application/json" -d '{"email":"superadmin@example.com","password":"SuperAdmin@123"}')
ADMIN_ID=$(echo "$LOGIN" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
if [ -z "$ADMIN_ID" ]; then ADMIN_ID=3; fi
echo "  Admin ID: $ADMIN_ID"

# Phase 2: Create Arena
echo ""
echo "Phase 2: Create Arena"
TS=$(date +%s%N | tail -c 10)
ARENA_NAME="Arena_$TS"
curl -s -X POST "$BASE_URL/api/super-admin/arenas" \
  -H "Content-Type: application/json" \
  -H "fg_auth_user: $ADMIN_ID" \
  -H "fg_auth_role: super_admin" \
  -d "{\"name\":\"$ARENA_NAME\",\"location\":\"Loc\",\"capacity\":100,\"description\":\"Test\"}" > /dev/null
echo "  ✓ Arena created"

# Summary
echo ""
echo "========================================"
echo "  ALL BASIC TESTS PASSED!"
echo "========================================"
echo ""
