$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$jupyterRoot = Join-Path $root ".jupyter"
$python = "C:\Users\Administrator\Documents\Codex\2026-08-22\new-chat\v2\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $python)) {
  throw "Python environment not found: $python"
}

New-Item -ItemType Directory -Force `
  -Path (Join-Path $jupyterRoot "config"), `
        (Join-Path $jupyterRoot "data"), `
        (Join-Path $jupyterRoot "runtime"), `
        (Join-Path $jupyterRoot "ipython") | Out-Null

$env:JUPYTER_CONFIG_DIR = Join-Path $jupyterRoot "config"
$env:JUPYTER_DATA_DIR = Join-Path $jupyterRoot "data"
$env:JUPYTER_RUNTIME_DIR = Join-Path $jupyterRoot "runtime"
$env:IPYTHONDIR = Join-Path $jupyterRoot "ipython"

& $python -m jupyterlab `
  --no-browser `
  --ServerApp.ip=127.0.0.1 `
  --ServerApp.port=8899 `
  --IdentityProvider.token= `
  --ServerApp.password= `
  --ServerApp.root_dir=$root
