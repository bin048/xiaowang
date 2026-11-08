# 重开悬浮球：清掉本安装目录下残留的 electron 进程，再重新拉起悬浮入口。
# 不删除任何待投递资料，不停止本地服务。
$ErrorActionPreference = 'SilentlyContinue'
$root = $PSScriptRoot
$data = Join-Path $env:LOCALAPPDATA '小王M1.1运行数据'

$killed = 0
Get-CimInstance Win32_Process -Filter "Name='electron.exe'" | ForEach-Object {
    $exe = $_.ExecutablePath
    if ($exe -and $exe.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        Stop-Process -Id $_.ProcessId -Force
        $killed++
    }
}
Write-Host ("已清理残留悬浮进程：{0} 个" -f $killed)

Remove-Item (Join-Path $data '停止悬浮.flag') -Force
Start-Sleep -Milliseconds 600
Set-Location $root
& python (Join-Path $root '启动联动.py') --no-browser
