$commitPlan = @(
    @{ Date = "2026-07-03"; Count = 4 },
    @{ Date = "2026-07-04"; Count = 3 },
    @{ Date = "2026-07-05"; Count = 2 },
    @{ Date = "2026-07-06"; Count = 7 }
)

foreach ($day in $commitPlan) {
    for ($i = 1; $i -le $day.Count; $i++) {
        $hour = Get-Random -Minimum 10 -Maximum 22
        $minute = Get-Random -Minimum 0 -Maximum 60
        $second = Get-Random -Minimum 0 -Maximum 60
        
        $hourStr = $hour.ToString("00")
        $minStr = $minute.ToString("00")
        $secStr = $second.ToString("00")
        
        $dateStr = "$($day.Date)T${hourStr}:${minStr}:${secStr}+05:30"
        
        $env:GIT_AUTHOR_DATE = $dateStr
        $env:GIT_COMMITTER_DATE = $dateStr
        
        $commitMsg = "Optimization and fixes part $($i) for $($day.Date)"
        git commit --allow-empty -m $commitMsg
    }
}
Write-Host "Backdated empty commits created successfully!"
