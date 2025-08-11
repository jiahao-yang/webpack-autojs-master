## Edge Bookmarks Auditing (Windows Security 4663) 指南

This guide shows how to audit writes to Edge `Bookmarks` only (plus `Bookmarks.bak`), keep logs compact, find historical evidence, and cleanly stop afterward.

### TL;DR
- **Scope narrowly**: audit only `Bookmarks` and `Bookmarks.bak` to avoid noise.
- **100 MB log is fine** for this scope; optionally enable auto-archive for longer history.
- **Where to look**: Event Viewer → Windows Logs → Security; archived logs live in `%SystemRoot%\System32\winevt\Logs`.
- **Clean exit**: remove file SACLs and (optionally) disable auditing when done.

---

## 1) Enable auditing policy (Success only)
Run PowerShell as Administrator.

First, find the exact subcategory name on your system (it may be localized, e.g., "File System" or "文件系统"):

```powershell
auditpol /list /subcategory:*
# Alternatively, show current settings for all categories (localized names appear inline):
# auditpol /get /category:*
```

Enable Success-only auditing using the exact name you see:

```powershell
# auditpol /set /subcategory:"File System" /success:enable /failure:disable
# If localized (example):
auditpol /set /subcategory:"文件系统" /success:enable /failure:disable
```

(Optional) Ensure subcategory auditing overrides legacy settings:

```powershell
auditpol /set /option:SCENoApplyLegacy /value:Enable
```

## 2) Add SACL to the two files (Bookmarks and Bookmarks.bak)
Adjust the profile path if not `Default`. Run elevated PowerShell:

```powershell
$edge = Join-Path $env:LOCALAPPDATA "Microsoft\Edge\User Data\Default"
$bookmarks    = Join-Path $edge "Bookmarks"
$bookmarksBak = Join-Path $edge "Bookmarks.bak"

# Everyone SID
$sid = New-Object System.Security.Principal.SecurityIdentifier 'S-1-1-0'

# Write-related rights
$rights = [System.Security.AccessControl.FileSystemRights]::Write,
          [System.Security.AccessControl.FileSystemRights]::WriteData,
          [System.Security.AccessControl.FileSystemRights]::AppendData,
          [System.Security.AccessControl.FileSystemRights]::WriteAttributes,
          [System.Security.AccessControl.FileSystemRights]::WriteExtendedAttributes

# Success-only audit rule
$rule = New-Object System.Security.AccessControl.FileSystemAuditRule(
    $sid, $rights, 'None', 'None', 'Success'
)

foreach ($p in @($bookmarks, $bookmarksBak)) {
    if (Test-Path $p) {
        $acl = Get-Acl $p
        $null = $acl.AddAuditRule($rule)
        Set-Acl -Path $p -AclObject $acl
        Write-Host "Audit rule applied to $p"
    } else {
        Write-Host "Not found (skipped): $p"
    }
}
```

## 3) Keep logs long enough (retention)
100 MB is typically enough for these two files. Enable auto-archive so older logs are preserved:

```powershell
wevtutil sl Security /ms:104857600     # 100 MB
wevtutil gl Security                   # verify
```

## 4) Query historical writes (when you notice later)
Event Viewer (图形界面): Event Viewer → Windows Logs → Security → Filter by Event ID 4663, then search for Object Name containing `\\Bookmarks` or `\\Bookmarks.bak`, Accesses including `WriteData/AppendData/WriteAttributes`.

PowerShell query:

```powershell
$since = (Get-Date).AddDays(-30)
$edge = Join-Path $env:LOCALAPPDATA "Microsoft\Edge\User Data\Default"

Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4663; StartTime=$since} |
  Where-Object {
    ($_.Message -like "*$edge*Bookmarks*" ) -and
    ($_.Message -match "WriteData|AppendData|WriteAttributes")
  } |
  Select-Object TimeCreated,
    @{n='Process';e={($_.Message -split "`n" | ? {$_ -match '^Process Name:'}) -replace '^.*?:\s*',''}},
    @{n='User';e={($_.Message -split "`n" | ? {$_ -match 'Account Name:\s+'}) -replace '^.*Account Name:\s+',''}},
    @{n='Path';e={($_.Message -split "`n" | ? {$_ -match '^Object Name:'}) -replace '^.*?:\s*',''}},
    @{n='Access';e={($_.Message -split "`n" | ? {$_ -match '^Accesses:'}) -replace '^.*?:\s*',''}} |
  Sort-Object TimeCreated |
  Format-Table -Auto
```

## 5) Where are archived logs?
- Current: Event Viewer → Windows Logs → Security (`%SystemRoot%\System32\winevt\Logs\Security.evtx`)
- Archived (when auto-archive enabled): `%SystemRoot%\System32\winevt\Logs\Archive-*Security*.evtx`

Open archived `.evtx` in Event Viewer, or query via:

```powershell
wevtutil qe "C:\Windows\System32\winevt\Logs\Archive-Security-*.evtx" /q:"*[System[(EventID=4663)]]" /f:text
```

## 6) Optional: periodic export (防止滚动覆盖)

```powershell
$xpath = "*[System[(EventID=4663)]] and *[EventData[Data[@Name='ObjectName'] and (contains(.,'\\Microsoft\\Edge\\User Data\\') and contains(.,'Bookmarks'))]]"
$dest  = Join-Path $env:USERPROFILE ("EdgeBookmarksAudit_{0:yyyyMMdd}.evtx" -f (Get-Date))
wevtutil epl Security $dest /q:$xpath
```

## 7) Stop auditing and clean up (抓到元凶后关闭)
Remove SACLs from both files and optionally disable the policy and revert log settings.

```powershell
$edge = Join-Path $env:LOCALAPPDATA "Microsoft\Edge\User Data\Default"
$bookmarks    = Join-Path $edge "Bookmarks"
$bookmarksBak = Join-Path $edge "Bookmarks.bak"

foreach ($p in @($bookmarks, $bookmarksBak)) {
  if (Test-Path $p) {
    $acl = Get-Acl $p
    foreach ($r in @($acl.Audit)) { $null = $acl.RemoveAuditRule($r) }
    Set-Acl -Path $p -AclObject $acl
    Write-Host "Audit rules removed from $p"
  }
}

# Optionally disable auditing and shrink log
# auditpol /set /subcategory:"File System" /success:disable /failure:disable
# If localized (example):
auditpol /set /subcategory:"文件系统" /success:disable /failure:disable
wevtutil sl Security /ms:20971520   # 20 MB
```

## FAQ
- **Will there be too many logs?** Auditing only `Bookmarks`/`Bookmarks.bak` with Success-only keeps volume low.
- **Is 100 MB enough?** Yes for this narrow scope. Enable auto-archive or export periodically if you need longer history.
- **Where do I see the logs?** Event Viewer → Windows Logs → Security. Archived logs are under `%SystemRoot%\System32\winevt\Logs`.


