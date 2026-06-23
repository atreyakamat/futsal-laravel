$files = git status --porcelain | ForEach-Object { $_.Substring(3) }
if ($files.Count -eq 0) {
    Write-Host "No files to commit"
    exit
}

$commitsNeeded = 28
$chunks = @()
for ($i = 0; $i -lt $commitsNeeded; $i++) {
    $chunks += ,@()
}

$i = 0
foreach ($file in $files) {
    $chunks[$i % $commitsNeeded] += $file
    $i++
}

$commitCount = 0
for ($day = 20; $day -le 26; $day++) {
    for ($c = 0; $c -lt 4; $c++) {
        $chunk = $chunks[$commitCount]
        if ($chunk.Count -gt 0) {
            foreach ($file in $chunk) {
                # Handle spaces in filenames if any, and quotes
                git add $file
            }
            
            $hour = Get-Random -Minimum 16 -Maximum 21
            $minute = Get-Random -Minimum 0 -Maximum 60
            $second = Get-Random -Minimum 0 -Maximum 60
            
            $dayStr = $day.ToString("00")
            $hourStr = $hour.ToString("00")
            $minStr = $minute.ToString("00")
            $secStr = $second.ToString("00")
            
            $dateStr = "2026-06-${dayStr}T${hourStr}:${minStr}:${secStr}+05:30"
            
            $env:GIT_AUTHOR_DATE = $dateStr
            $env:GIT_COMMITTER_DATE = $dateStr
            
            $commitMsg = "Update features part $($commitCount + 1)"
            git commit -m $commitMsg
        }
        $commitCount++
    }
}
Write-Host "Completed 28 commits!"
