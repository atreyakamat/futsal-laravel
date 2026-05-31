# Smoke Test Script for Super Admin Workflows

$BASE_URL = "http://localhost:3000"
$PASSED = 0
$FAILED = 0
$TOTAL = 0

Write-Host "`n========================================"
Write-Host "  SUPER ADMIN SMOKE TEST"
Write-Host "========================================`n"

# Test helper
function Test-Endpoint {
    param([string]$Name, [string]$Method, [string]$Path, [object]$Body, [hashtable]$Headers)
    
    $global:TOTAL++
    $url = "$BASE_URL$Path"
    $params = @{ Uri = $url; Method = $Method; SkipHttpErrorCheck = $true; Headers = $Headers + @{ "Content-Type" = "application/json" } }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10) }
    
    $resp = Invoke-WebRequest @params 2>&1
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) {
        $global:PASSED++
        Write-Host "✓ $Name"
        return $resp
    } else {
        $global:FAILED++
        Write-Host "✗ $Name (HTTP $($resp.StatusCode))"
        if ($resp.Content) { Write-Host "  Response: $($resp.Content.Substring(0, 100))" }
        return $null
    }
}

# Phase 1: Login
Write-Host "Phase 1: Super Admin Login"
$login = Test-Endpoint "Login" "POST" "/api/auth/super-admin/login" @{ email = "superadmin@example.com"; password = "SuperAdmin@123" } @{}
$adminId = 3
if ($login) {
    $data = $login.Content | ConvertFrom-Json
    $adminId = $data.data.id
}

# Phase 2: Create Arena
Write-Host "`nPhase 2: Create Arena"
$ts = Get-Date -Format yyyyMMddHHmmss
$arenaNm = "Arena_$ts"
$arena = Test-Endpoint "Create Arena" "POST" "/api/super-admin/arenas" @{ name = $arenaNm; location = "Loc"; capacity = 100; description = "Test" } @{ "fg_auth_user" = "$adminId"; "fg_auth_role" = "super_admin" }
$arenaId = 1
if ($arena) {
    $adata = $arena.Content | ConvertFrom-Json
    if ($adata.id) { $arenaId = $adata.id } else { if ($adata.data) { $arenaId = $adata.data.id } }
}

# Phase 3: Get Arena
Write-Host "`nPhase 3: Fetch Arena"
Test-Endpoint "Get Arena" "GET" "/api/super-admin/arenas?arena_id=$arenaId" $null @{ "fg_auth_user" = "$adminId"; "fg_auth_role" = "super_admin" } | Out-Null

# Phase 4: Create Admin
Write-Host "`nPhase 4: Create Admin"
Test-Endpoint "Create Admin" "POST" "/api/super-admin/admins" @{ arena_id = $arenaId; name = "Admin"; email = "a_$ts@t.l"; phone = "111" } @{ "fg_auth_user" = "$adminId"; "fg_auth_role" = "super_admin" } | Out-Null

# Phase 5: Create Security
Write-Host "`nPhase 5: Create Security"
Test-Endpoint "Create Security" "POST" "/api/super-admin/security" @{ arena_id = $arenaId; name = "Sec"; email = "s_$ts@t.l"; phone = "222" } @{ "fg_auth_user" = "$adminId"; "fg_auth_role" = "super_admin" } | Out-Null

# Phase 6: Create Timings
Write-Host "`nPhase 6: Create Timings"
Test-Endpoint "Create Timings" "POST" "/api/super-admin/arenas/timings" @{ arena_id = $arenaId; startTime = "09:00"; endTime = "22:00"; daysOfWeek = @(1,2,3,4,5,6,7) } @{ "fg_auth_user" = "$adminId"; "fg_auth_role" = "super_admin" } | Out-Null

# Phase 7: Get Timings
Write-Host "`nPhase 7: Fetch Timings"
Test-Endpoint "Get Timings" "GET" "/api/super-admin/arenas/timings?arena_id=$arenaId" $null @{ "fg_auth_user" = "$adminId"; "fg_auth_role" = "super_admin" } | Out-Null

# Phase 8: Create Booking
Write-Host "`nPhase 8: Create Booking"
$today = Get-Date -Format "yyyy-MM-dd"
Test-Endpoint "Create Booking" "POST" "/api/super-admin/bookings" @{ arena_id = $arenaId; slotType = "1R"; date = $today; slotTime = "10:00"; reason = "Test" } @{ "fg_auth_user" = "$adminId"; "fg_auth_role" = "super_admin" } | Out-Null

# Phase 9: Get Bookings
Write-Host "`nPhase 9: Fetch Bookings"
Test-Endpoint "Get Bookings" "GET" "/api/super-admin/bookings?arena_id=$arenaId" $null @{ "fg_auth_user" = "$adminId"; "fg_auth_role" = "super_admin" } | Out-Null

# Phase 10: Dashboard
Write-Host "`nPhase 10: Dashboard"
$dash = Invoke-WebRequest -Uri "$BASE_URL/admin/super-admin" -Headers @{ "Cookie" = "fg_auth_user=$adminId; fg_auth_role=super_admin" } -SkipHttpErrorCheck
$TOTAL++
if ($dash.StatusCode -eq 200) {
    $PASSED++
    Write-Host "✓ Dashboard"
} else {
    $FAILED++
    Write-Host "✗ Dashboard (HTTP $($dash.StatusCode))"
}

# Summary
Write-Host "`n========================================`n  TEST SUMMARY`n========================================"
Write-Host "Total: $TOTAL | Passed: $PASSED ✓ | Failed: $FAILED ✗"
$rate = if ($TOTAL -gt 0) { [math]::Round(($PASSED / $TOTAL) * 100, 1) } else { 0 }
Write-Host "Success Rate: $rate%`n"

if ($FAILED -eq 0) {
    Write-Host "✓ ALL TESTS PASSED!`n"
    exit 0
}

Write-Host "✗ SOME TESTS FAILED`n"
exit 1
