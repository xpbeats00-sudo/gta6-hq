# Samples CPU, memory, threads, handles and GPU for one process and everything it started
# (the app and its own WebView2 processes), about every two seconds, until that process exits.
#
#   powershell -File scripts\perf\sample.ps1 -RootPid 1234 -OutCsv run.csv -LabelFile label.txt
#
# cpu_pct is percent of ONE logical CPU (it can exceed 100 on a multi-core machine).
# gpu_pct is the sum of the GPU engine counters for those processes; gpu_decode_pct is the
# video-decode engines alone. Both are blank where Windows does not offer the counters.
param([int]$RootPid, [string]$OutCsv, [string]$LabelFile)

'time,label,processes,cpu_pct,private_mb,working_set_mb,threads,handles,gpu_pct,gpu_decode_pct' | Set-Content -Path $OutCsv -Encoding ascii
$lastCpu = $null; $lastAt = $null
while (Get-Process -Id $RootPid -ErrorAction SilentlyContinue) {
    $all = Get-CimInstance Win32_Process -Property ProcessId, ParentProcessId, KernelModeTime, UserModeTime, WorkingSetSize, ThreadCount, HandleCount, PrivatePageCount
    $byParent = @{}
    foreach ($p in $all) { if (-not $byParent.ContainsKey([int]$p.ParentProcessId)) { $byParent[[int]$p.ParentProcessId] = @() }; $byParent[[int]$p.ParentProcessId] += $p }
    $tree = @(); $queue = @($all | Where-Object { $_.ProcessId -eq $RootPid })
    while ($queue.Count) {
        $p = $queue[0]; $queue = @($queue | Select-Object -Skip 1); $tree += $p
        if ($byParent.ContainsKey([int]$p.ProcessId)) { $queue += $byParent[[int]$p.ProcessId] }
    }
    if (-not $tree.Count) { break }
    $now = Get-Date
    $cpu = ($tree | ForEach-Object { [double]$_.KernelModeTime + [double]$_.UserModeTime } | Measure-Object -Sum).Sum
    $cpuPct = ''
    if ($null -ne $lastCpu) { $cpuPct = [math]::Round((($cpu - $lastCpu) / 1e7) / ($now - $lastAt).TotalSeconds * 100, 1) }
    $lastCpu = $cpu; $lastAt = $now
    $gpu = ''; $decode = ''
    try {
        $pids = $tree | ForEach-Object { 'pid_' + $_.ProcessId + '_' }
        $samples = (Get-Counter '\GPU Engine(*)\Utilization Percentage' -ErrorAction Stop).CounterSamples | Where-Object { $name = $_.InstanceName; $pids | Where-Object { $name.StartsWith($_) } }
        $gpu = [math]::Round(($samples | Measure-Object -Property CookedValue -Sum).Sum, 1)
        $decode = [math]::Round(($samples | Where-Object { $_.InstanceName -match 'engtype_VideoDecode' } | Measure-Object -Property CookedValue -Sum).Sum, 1)
    } catch { }
    $label = ''; if (Test-Path $LabelFile) { $label = (Get-Content $LabelFile -Raw).Trim() -replace ',', ';' }
    $line = '{0},{1},{2},{3},{4},{5},{6},{7},{8},{9}' -f $now.ToString('HH:mm:ss'), $label, $tree.Count, $cpuPct,
        [math]::Round(($tree | Measure-Object -Property PrivatePageCount -Sum).Sum / 1MB, 1),
        [math]::Round(($tree | Measure-Object -Property WorkingSetSize -Sum).Sum / 1MB, 1),
        ($tree | Measure-Object -Property ThreadCount -Sum).Sum, ($tree | Measure-Object -Property HandleCount -Sum).Sum, $gpu, $decode
    Add-Content -Path $OutCsv -Value $line -Encoding ascii
    Start-Sleep -Milliseconds 700
}
