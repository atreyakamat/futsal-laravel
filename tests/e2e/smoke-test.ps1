# Smoke Test Script for Super Admin Workflows
# Tests the complete end-to-end workflow

$BASE_URL = "http://localhost:3001"
$TESTS_PASSED = 0
$TESTS_FAILED = 0
$TESTS_TOTAL = 0

function Test-API {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Path,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )
    
    $global:TESTS_TOTAL++
    
    $url = "$BASE_URL$Path"
    
    $params = @{
        Uri = $url
        Method = $Method
        SkipHttpErrorCheck = $true
        Headers = $Headers + @{ "Content-Type" = "application/json" }
    }
    
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }
    
    $response = Invoke-WebRequest @params
    
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        $global:TESTS_PASSED++
        Write-Host "✓ $Name (HTTP $($response.StatusCode))"
        return $response
    } else {
        $global:TESTS_FAILED++
        Write-Host "✗ $Name (HTTP $($response.StatusCode))"
        return $null
    }
}

Write-Host "`n========================================`n  SUPER ADMIN SMOKE TEST`n========================================`n"

# Phase 1: Login
Write-Host "--- Phase 1: Super Admin Login ---"
$loginResp = Test-API "Super Admin Login" "POST" "/api/auth/super-admin/login" @{
    email = "superadmin@example.com"
    password = "SuperAdmin@123"
}

$superAdminId = 3
if ($loginResp) {
    $data = $loginResp.Content | ConvertFrom-Json
    $superAdminId = $data.data.id
    Write-Host "  ✓ Got Super Admin ID: $superAdminId`n"
}

# Phase 2: Create Test Arena
Write-Host "`n--- Phase 2: Create Test Arena ---"
$timestamp = Get-Date -Format yyyyMMddHHmmss
$arenaName = "TestArena_$timestamp"

$arenaResp = Test-API "Create Arena" "POST" "/api/super-admin/arenas" @{
    name = $arenaName
    location = "Test Location"
    capacity = 100
    description = "Smoke test arena"
} -Headers @{
    "fg_auth_user" = "$superAdminId"
    "fg_auth_role" = "super_admin"
}

$arenaId = 1
if ($arenaResp) {
    $data = $arenaResp.Content | ConvertFrom-Json
    if ($data.id) { $arenaId = $data.id }
    elseif ($data.data.id) { $arenaId = $data.data.id }
    Write-Host "  ✓ Created Arena ID: $arenaId`n"
}

# Phase 3: Fetch Arena Details
Write-Host "`n--- Phase 3: Fetch Arena Details ---"
Test-API "Get Arena" "GET" "/api/super-admin/arenas?arena_id=$arenaId" -Headers @{
    "fg_auth_user" = "$superAdminId"
    "fg_auth_role" = "super_admin"
} | Out-Null

# Phase 4: Create Arena Admin
Write-Host "`n--- Phase 4: Create Arena Admin ---"
$adminEmail = "admin_$timestamp@test.local"
Test-API "Create Arena Admin" "POST" "/api/super-admin/admins" @{
    arena_id = $arenaId
    name = "Test Admin"
    email = $adminEmail
    phone = "1234567890"
} -Headers @{
    "fg_auth_user" = "$superAdminId"
    "fg_auth_role" = "super_admin"
} | Out-Null

# Phase 5: Create Security Staff
Write-Host "`n--- Phase 5: Create Security Staff ---"
$secEmail = "sec_$timestamp@test.local"
Test-API "Create Security" "POST" "/api/super-admin/security" @{
    arena_id = $arenaId
    name = "Test Security"
    email = $secEmail
    phone = "9876543210"
} -Headers @{
    "fg_auth_user" = "$superAdminId"
    "fg_auth_role" = "super_admin"
} | Out-Null

# Phase 6: Create Time Slots
Write-Host "`n--- Phase 6: Create Time Slots ---"
Test-API "Create Timings" "POST" "/api/super-admin/arenas/timings" @{
    arena_id = $arenaId
    startTime = "09:00"
    endTime = "22:00"
    daysOfWeek = @(1, 2, 3, 4, 5, 6, 7)
} -Headers @{
    "fg_auth_user" = "$superAdminId"
    "fg_auth_role" = "super_admin"
} | Out-Null

# Phase 7: Fetch Time Slots
Write-Host "`n--- Phase 7: Fetch Time Slots ---"
Test-API "Get Timings" "GET" "/api/super-admin/arenas/timings?arena_id=$arenaId" -Headers @{
    "fg_auth_user" = "$superAdminId"
    "fg_auth_role" = "super_admin"
} | Out-Null

# Phase 8: Create Booking
Write-Host "`n--- Phase 8: Create Super Admin Booking ---"
$today = Get-Date -Format "yyyy-MM-dd"
Test-API "Create Booking" "POST" "/api/super-admin/bookings" @{
    arena_id = $arenaId
    slotType = "1R"
    date = $today
    slotTime = "10:00"
    reason = "Maintenance"
} -Headers @{
    "fg_auth_user" = "$superAdminId"
    "fg_auth_role" = "super_admin"
} | Out-Null

# Phase 9: Fetch Bookings
Write-Host "`n--- Phase 9: Fetch Bookings ---"
Test-API "Get Bookings" "GET" "/api/super-admin/bookings?arena_id=$arenaId" -Headers @{
    "fg_auth_user" = "$superAdminId"
    "fg_auth_role" = "super_admin"
} | Out-Null

# Phase 10: Dashboard
Write-Host "`n--- Phase 10: Dashboard Accessibility ---"
$dashResp = Invoke-WebRequest -Uri "$BASE_URL/admin/super-admin" -Headers @{
    "Cookie" = "fg_auth_user=$superAdminId; fg_auth_role=super_admin"
} -SkipHttpErrorCheck

if ($dashResp.StatusCode -eq 200) {
    $TESTS_PASSED++
    Write-Host "✓ Dashboard Accessible (HTTP 200)"
}
else {
    $TESTS_FAILED++
    Write-Host "✗ Dashboard (HTTP $($dashResp.StatusCode))"
}
$TESTS_TOTAL++

# Summary
Write-Host "`n========================================`n  TEST SUMMARY`n========================================`n"
Write-Host "Total Tests: $TESTS_TOTAL"
Write-Host "Passed: $TESTS_PASSED ✓"
Write-Host "Failed: $TESTS_FAILED ✗"
$successRate = if ($TESTS_TOTAL -gt 0) { [math]::Round(($TESTS_PASSED / $TESTS_TOTAL) * 100, 1) } else { 0 }
Write-Host "Success Rate: $successRate%`n"

if ($TESTS_FAILED -eq 0) {
    Write-Host "✓ All tests passed!`n"
    exit 0
}
else {
    Write-Host "✗ Some tests failed`n"
    exit 1
}
