$projectRoot = Split-Path -Parent $PSScriptRoot
$distRoot = Join-Path $projectRoot 'dist'
$serverRoot = Join-Path $distRoot 'server'
$manifestRoot = Join-Path $distRoot '.openai'
$contentRoot = Join-Path $distRoot 'content'

if (Test-Path -LiteralPath $distRoot) {
  Remove-Item -LiteralPath $distRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $serverRoot, $manifestRoot, $contentRoot | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'worker/index.js') -Destination (Join-Path $serverRoot 'index.js')
Copy-Item -LiteralPath (Join-Path $projectRoot '.openai/hosting.json') -Destination (Join-Path $manifestRoot 'hosting.json')
Copy-Item -LiteralPath (Join-Path $projectRoot 'content/pages-data.js') -Destination (Join-Path $contentRoot 'pages-data.js')

Write-Host "Built $distRoot"
