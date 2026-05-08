param(
  [string]$SubscriptionId,
  [string]$Location = "eastus",
  [string]$ResourceGroup = "pinkmedicine-rg",
  [string]$AppServicePlan = "pinkmedicine-plan",
  [string]$ApiAppName = "",
  [string]$StaticWebAppName = "",
  [string]$WixOrigin = "",
  [string]$OpenFdaApiKey = "",
  [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$env:AZURE_CORE_ONLY_SHOW_ERRORS = "True"

function Write-Step {
  param([string]$Message)
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Ensure-AzCli {
  if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "Azure CLI is required. Install from https://aka.ms/installazurecliwindows"
  }
}

function Ensure-Node {
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "Node.js and npm are required. Install Node.js 20+ before deploying."
  }
}

function Ensure-SwaCli {
  if (-not (Get-Command swa -ErrorAction SilentlyContinue)) {
    Write-Step "Installing Azure Static Web Apps CLI"
    npm install -g @azure/static-web-apps-cli
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to install @azure/static-web-apps-cli globally"
    }
  }
}

function Invoke-Az {
  param([string[]]$AzArgs)
  $output = az @AzArgs 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Azure CLI command failed: az $($AzArgs -join ' ')`n$output"
  }
  return $output
}

Ensure-AzCli
Ensure-Node
Ensure-SwaCli

Write-Step "Checking Azure login"
$null = az account show 2>$null
if ($LASTEXITCODE -ne 0) {
  az login | Out-Null
}

if ($SubscriptionId) {
  Write-Step "Setting subscription $SubscriptionId"
  Invoke-Az -AzArgs @('account', 'set', '--subscription', $SubscriptionId) | Out-Null
}

$activeSubscription = (Invoke-Az -AzArgs @('account', 'show', '--query', 'id', '--output', 'tsv')).Trim()
$activeSubscriptionName = (Invoke-Az -AzArgs @('account', 'show', '--query', 'name', '--output', 'tsv')).Trim()

Write-Step "Deployment context"
Write-Host "Subscription: $activeSubscriptionName ($activeSubscription)"
Write-Host "Location:     $Location"
Write-Host "ResourceGroup:$ResourceGroup"
Write-Host "Plan:         $AppServicePlan"

$isLinuxPlan = $false
$webAppRuntimeWindows = "NODE:20LTS"
$planSku = "B1"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

if ([string]::IsNullOrWhiteSpace($ApiAppName)) {
  $ApiAppName = "pinkmedicine-api-$((Get-Random -Minimum 10000 -Maximum 99999))"
}

if ([string]::IsNullOrWhiteSpace($StaticWebAppName)) {
  $StaticWebAppName = "pinkmedicine-web-$((Get-Random -Minimum 10000 -Maximum 99999))"
}

if ([string]::IsNullOrWhiteSpace($OpenFdaApiKey)) {
  $OpenFdaApiKey = $env:OPENFDA_API_KEY
}

if ([string]::IsNullOrWhiteSpace($OpenFdaApiKey)) {
  $envFilePath = Join-Path $repoRoot ".env"
  if (Test-Path $envFilePath) {
    $openFdaLine = Get-Content $envFilePath |
      Where-Object { $_ -match '^\s*OPENFDA_API_KEY\s*=' } |
      Select-Object -First 1

    if ($openFdaLine) {
      $keyValue = ($openFdaLine -split '=', 2)[1].Trim().Trim('"').Trim("'")
      if (-not [string]::IsNullOrWhiteSpace($keyValue)) {
        $OpenFdaApiKey = $keyValue
      }
    }
  }
}

if ([string]::IsNullOrWhiteSpace($OpenFdaApiKey)) {
  Write-Host "Warning: OPENFDA_API_KEY is not set. FAERS endpoints will return empty/fallback results until configured." -ForegroundColor Yellow
}

if (-not $SkipBuild) {
  Write-Step "Installing dependencies"
  npm install
  if ($LASTEXITCODE -ne 0) {
    throw "npm install failed"
  }

  Write-Step "Building backend"
  npm run build:backend
  if ($LASTEXITCODE -ne 0) {
    throw "npm run build:backend failed"
  }
}

Write-Step "Creating or updating resource group"
Invoke-Az -AzArgs @('group', 'create', '--name', $ResourceGroup, '--location', $Location, '--output', 'none') | Out-Null

$rgExists = (Invoke-Az -AzArgs @('group', 'exists', '--name', $ResourceGroup)).Trim().ToLower()
if ($rgExists -ne 'true') {
  throw "Resource group '$ResourceGroup' was not found after create attempt in subscription '$activeSubscription'."
}

Write-Step "Creating or updating App Service plan"
$planExists = $true
$null = az appservice plan show --name $AppServicePlan --resource-group $ResourceGroup 2>$null
if ($LASTEXITCODE -ne 0) {
  $planExists = $false
}

if (-not $planExists) {
  try {
    Invoke-Az -AzArgs @('appservice', 'plan', 'create', '--name', $AppServicePlan, '--resource-group', $ResourceGroup, '--location', $Location, '--sku', 'B1', '--output', 'none') | Out-Null
    $isLinuxPlan = $false
    $planSku = "B1"
  } catch {
    Write-Host "Warning: Windows B1 plan creation failed. Trying Windows F1." -ForegroundColor Yellow
    try {
      Invoke-Az -AzArgs @('appservice', 'plan', 'create', '--name', $AppServicePlan, '--resource-group', $ResourceGroup, '--location', $Location, '--sku', 'F1', '--output', 'none') | Out-Null
      $isLinuxPlan = $false
      $planSku = "F1"
    } catch {
      Write-Host "Warning: Windows F1 plan creation failed. Trying Linux B1 as final fallback." -ForegroundColor Yellow
      Invoke-Az -AzArgs @('appservice', 'plan', 'create', '--name', $AppServicePlan, '--resource-group', $ResourceGroup, '--location', $Location, '--sku', 'B1', '--is-linux', '--output', 'none') | Out-Null
      $isLinuxPlan = $true
      $planSku = "B1"
    }
  }
} else {
  $planJsonRaw = az appservice plan show --name $AppServicePlan --resource-group $ResourceGroup --output json 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($planJsonRaw)) {
    throw "Unable to inspect existing App Service plan '$AppServicePlan' in '$ResourceGroup'."
  }

  $planJson = $planJsonRaw | ConvertFrom-Json
  $isLinuxPlan = $false
  if ($planJson.properties -and ($null -ne $planJson.properties.reserved)) {
    $isLinuxPlan = [bool]$planJson.properties.reserved
  } elseif ($planJson.kind) {
    $isLinuxPlan = ("$($planJson.kind)".ToLower().Contains('linux'))
  }

  $resolvedPlanSku = ''
  if ($planJson.sku -and $planJson.sku.name) {
    $resolvedPlanSku = "$($planJson.sku.name)".Trim()
  }

  $planSku = if ([string]::IsNullOrWhiteSpace($resolvedPlanSku)) { 'B1' } else { $resolvedPlanSku }
}

Write-Step "Creating or updating API App Service"
$webAppExists = $true
$null = az webapp show --name $ApiAppName --resource-group $ResourceGroup 2>$null
if ($LASTEXITCODE -ne 0) {
  $webAppExists = $false
}

if (-not $webAppExists) {
  $createArgs = @('webapp', 'create', '--name', $ApiAppName, '--resource-group', $ResourceGroup, '--plan', $AppServicePlan, '--output', 'none')
  if (-not $isLinuxPlan) {
    $createArgs += @('--runtime', $webAppRuntimeWindows)
  }
  Invoke-Az -AzArgs $createArgs | Out-Null
}

$apiUrl = "https://$ApiAppName.azurewebsites.net"

$corsOrigins = @($apiUrl)
if (-not [string]::IsNullOrWhiteSpace($WixOrigin)) {
  $corsOrigins += $WixOrigin.Trim()
}

Write-Step "Configuring API app settings"
$appSettings = @(
  "NODE_ENV=production",
  "CORS_ORIGINS=$($corsOrigins -join ',')",
  "SCM_DO_BUILD_DURING_DEPLOYMENT=true"
)

if (-not [string]::IsNullOrWhiteSpace($OpenFdaApiKey)) {
  $appSettings += "OPENFDA_API_KEY=$OpenFdaApiKey"
}

$appSettingsArgs = @('webapp', 'config', 'appsettings', 'set', '--name', $ApiAppName, '--resource-group', $ResourceGroup, '--settings')
$appSettingsArgs += $appSettings
$appSettingsArgs += @('--output', 'none')
Invoke-Az -AzArgs $appSettingsArgs | Out-Null

Write-Step "Deploying API app"
$webappUpArgs = @('webapp', 'up', '--name', $ApiAppName, '--resource-group', $ResourceGroup, '--plan', $AppServicePlan, '--location', $Location, '--sku', $planSku)
Invoke-Az -AzArgs $webappUpArgs | Out-Null

Write-Step "Creating or updating Static Web App"
$staticAppExists = $true
$null = az staticwebapp show --name $StaticWebAppName --resource-group $ResourceGroup 2>$null
if ($LASTEXITCODE -ne 0) {
  $staticAppExists = $false
}

if (-not $staticAppExists) {
  Invoke-Az -AzArgs @('staticwebapp', 'create', '--name', $StaticWebAppName, '--resource-group', $ResourceGroup, '--location', $Location, '--sku', 'Free', '--login-with-github', 'false', '--output', 'none') | Out-Null
}

$staticHost = (Invoke-Az -AzArgs @('staticwebapp', 'show', '--name', $StaticWebAppName, '--resource-group', $ResourceGroup, '--query', 'defaultHostname', '--output', 'tsv')).Trim()
$staticHost = ($staticHost -split "`r?`n" | Where-Object { $_ -match '\.azurestaticapps\.net$' } | Select-Object -First 1)

if ([string]::IsNullOrWhiteSpace($staticHost)) {
  throw "Unable to resolve Static Web App hostname for '$StaticWebAppName'."
}

$frontendUrl = "https://$staticHost"

# Update API CORS to include frontend host now that we know it
if (-not $corsOrigins.Contains($frontendUrl)) {
  $corsOrigins += $frontendUrl
}

$appSettings = @(
  "NODE_ENV=production",
  "CORS_ORIGINS=$($corsOrigins -join ',')",
  "SCM_DO_BUILD_DURING_DEPLOYMENT=true"
)

if (-not [string]::IsNullOrWhiteSpace($OpenFdaApiKey)) {
  $appSettings += "OPENFDA_API_KEY=$OpenFdaApiKey"
}

Write-Step "Updating API CORS with frontend host"
$appSettingsArgs = @('webapp', 'config', 'appsettings', 'set', '--name', $ApiAppName, '--resource-group', $ResourceGroup, '--settings')
$appSettingsArgs += $appSettings
$appSettingsArgs += @('--output', 'none')
Invoke-Az -AzArgs $appSettingsArgs | Out-Null

if (-not $SkipBuild) {
  Write-Step "Building frontend with deployed API URL"
  $env:VITE_API_URL = $apiUrl
  npm run build:frontend
  if ($LASTEXITCODE -ne 0) {
    throw "npm run build:frontend failed"
  }
}

Write-Step "Deploying frontend to Static Web Apps"
$deploymentToken = (Invoke-Az -AzArgs @('staticwebapp', 'secrets', 'list', '--name', $StaticWebAppName, '--resource-group', $ResourceGroup, '--query', 'properties.apiKey', '--output', 'tsv')).Trim()
if ([string]::IsNullOrWhiteSpace($deploymentToken)) {
  throw "Unable to get Static Web App deployment token"
}

$frontendDeployedToSwa = $true
swa deploy ./dist/frontend --deployment-token $deploymentToken --env production
if ($LASTEXITCODE -ne 0) {
  $frontendDeployedToSwa = $false
  Write-Host "Warning: Static Web Apps deploy failed. Falling back to hosting frontend from App Service." -ForegroundColor Yellow

  Write-Step "Redeploying App Service with frontend assets"
  $webappUpArgs = @('webapp', 'up', '--name', $ApiAppName, '--resource-group', $ResourceGroup, '--plan', $AppServicePlan, '--location', $Location, '--sku', $planSku)
  Invoke-Az -AzArgs $webappUpArgs | Out-Null
  $frontendUrl = $apiUrl
}

Write-Host "`nDeployment complete." -ForegroundColor Green
Write-Host "API URL:      $apiUrl"
Write-Host "Frontend URL: $frontendUrl"
if (-not $frontendDeployedToSwa) {
  Write-Host "Frontend host mode: App Service fallback (single URL)" -ForegroundColor Yellow
}
Write-Host "`nFor Wix button, use: $frontendUrl"
Write-Host "If Wix calls the API directly, set Wix origin in -WixOrigin or CORS_ORIGINS app setting."
