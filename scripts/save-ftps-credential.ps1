$ErrorActionPreference = 'Stop'
$credentialDirectory = Join-Path $PSScriptRoot '..\.local'
New-Item -ItemType Directory -Path $credentialDirectory -Force | Out-Null
if ([Console]::IsInputRedirected) {
    $plainPassword = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($plainPassword)) { throw 'No password supplied.' }
    $securePassword = ConvertTo-SecureString $plainPassword -AsPlainText -Force
    $plainPassword = $null
} else {
    $securePassword = Read-Host 'Dedicated Car Wash FTPS password' -AsSecureString
}
$securePassword | ConvertFrom-SecureString | Set-Content -LiteralPath (Join-Path $credentialDirectory 'ftps-password.dpapi') -Encoding ASCII
Write-Output 'FTPS password saved using Windows user-bound encryption. No password was printed.'
