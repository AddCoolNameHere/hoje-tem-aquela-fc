<#
    Publica o montador no site do Cloudflare (fusslabs.com).

        fusslabs.com/realtismo       -> o montador
        fusslabs.com/realtismo-adm   -> o painel de admin

    O site do Cloudflare vem do repositório FussLabs, que faz deploy sozinho a cada push.
    Este script copia os arquivos para lá e ajusta os links, que mudam de lugar:

      - no GitHub Pages    o admin é  admin.html  ao lado do index
      - no fusslabs.com    o admin é  /realtismo-adm/  numa pasta separada

    Uso:
        tools\publicar-fusslabs.ps1              # copia e mostra o que mudou
        tools\publicar-fusslabs.ps1 -Enviar      # copia, commita e faz push (publica)
#>
param(
    [string]$RepoSite = "$PSScriptRoot\..\..\FussLabs",
    [switch]$Enviar
)

$ErrorActionPreference = 'Stop'

$ORIGEM = Resolve-Path "$PSScriptRoot\.."
$SUB    = 'realtismo'
$SUBADM = 'realtismo-adm'

if (-not (Test-Path $RepoSite)) {
    throw "Não achei o repositório do site em $RepoSite. Clone com: git clone https://github.com/AddCoolNameHere/FussLabs.git"
}
$RepoSite = (Resolve-Path $RepoSite).Path

Write-Host ''
Write-Host '  Publicando no fusslabs.com' -ForegroundColor Green
Write-Host "  origem: $ORIGEM" -ForegroundColor DarkGray
Write-Host "  destino: $RepoSite" -ForegroundColor DarkGray
Write-Host ''

$utf8 = New-Object System.Text.UTF8Encoding $false

# ------------------------------------------------------------------ /realtismo

$destino = Join-Path $RepoSite $SUB
if (Test-Path $destino) { Remove-Item $destino -Recurse -Force }
New-Item -ItemType Directory -Force -Path $destino | Out-Null

Copy-Item (Join-Path $ORIGEM 'index.html') $destino
Copy-Item (Join-Path $ORIGEM 'assets') $destino -Recurse
Copy-Item (Join-Path $ORIGEM 'data')   $destino -Recurse
Copy-Item (Join-Path $ORIGEM 'cards')  $destino -Recurse

# o .bat e os prints originais são do fluxo local, não vão para a web
Get-ChildItem (Join-Path $destino 'cards') -Recurse -Include *.bat -File | Remove-Item -Force
Get-ChildItem (Join-Path $destino 'cards') -Recurse -Directory |
    Where-Object { $_.Name -eq 'prints' } | Remove-Item -Recurse -Force

# o link do admin passa a apontar para a outra pasta
$idx = Join-Path $destino 'index.html'
$html = [System.IO.File]::ReadAllText($idx, [System.Text.Encoding]::UTF8)
$html = $html.Replace('href="admin.html"', "href=`"/$SUBADM/`"")
[System.IO.File]::WriteAllText($idx, $html, $utf8)

$n = (Get-ChildItem $destino -Recurse -File).Count
Write-Host "  /$SUB            $n arquivos" -ForegroundColor Gray

# -------------------------------------------------------------- /realtismo-adm

$destinoAdm = Join-Path $RepoSite $SUBADM
if (Test-Path $destinoAdm) { Remove-Item $destinoAdm -Recurse -Force }
New-Item -ItemType Directory -Force -Path $destinoAdm | Out-Null

$adm = [System.IO.File]::ReadAllText((Join-Path $ORIGEM 'admin.html'), [System.Text.Encoding]::UTF8)

# <base> faz css, json e cartas serem buscados em /realtismo/, sem duplicar arquivo;
# o link "voltar pro campo" (index.html) também cai certo por causa dele
if ($adm -notmatch '<base ') {
    $adm = $adm.Replace('<meta charset="utf-8">', "<meta charset=`"utf-8`">`r`n<base href=`"/$SUB/`">")
}
[System.IO.File]::WriteAllText((Join-Path $destinoAdm 'index.html'), $adm, $utf8)
Write-Host "  /$SUBADM        1 arquivo (usa os assets de /$SUB)" -ForegroundColor Gray

# ------------------------------------------------------------------- API (/api)

# As Pages Functions ficam na raiz do projeto. O _routes.json limita a execucao
# a /api/*, entao o resto do fusslabs.com continua servido como arquivo estatico.
$fnOrigem = Join-Path $ORIGEM 'cloudflare\functions'
if (Test-Path $fnOrigem) {
    $fnDestino = Join-Path $RepoSite 'functions'
    if (Test-Path $fnDestino) { Remove-Item $fnDestino -Recurse -Force }
    Copy-Item $fnOrigem $fnDestino -Recurse
    Copy-Item (Join-Path $ORIGEM 'cloudflare\_routes.json') $RepoSite -Force
    $nf = (Get-ChildItem $fnDestino -Recurse -File).Count
    Write-Host "  /api                 $nf function(s) + _routes.json" -ForegroundColor Gray
}

# ------------------------------------------------------------------- git

Write-Host ''
$status = git -C $RepoSite status --porcelain
if (-not $status) {
    Write-Host '  Nada mudou desde a última publicação.' -ForegroundColor DarkGray
    Write-Host ''
    return
}

Write-Host '  Mudanças:' -ForegroundColor Green
git -C $RepoSite status --short | Select-Object -First 15 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

if (-not $Enviar) {
    Write-Host ''
    Write-Host '  Confira e rode de novo com -Enviar para publicar.' -ForegroundColor Yellow
    Write-Host ''
    return
}

# o git escreve avisos (CRLF etc.) na saída de erro; sem isso o PowerShell aborta
$ErrorActionPreference = 'Continue'

git -C $RepoSite add -A 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "git add falhou" }

git -C $RepoSite commit -q -m "Publica o montador do HOJE TEM AQUELA F.C. em /$SUB e /$SUBADM" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "git commit falhou" }

git -C $RepoSite push -q origin main 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "git push falhou" }

Write-Host ''
Write-Host '  Publicado. O Cloudflare Pages leva cerca de um minuto para trocar.' -ForegroundColor Green
Write-Host "    https://fusslabs.com/$SUB" -ForegroundColor Green
Write-Host "    https://fusslabs.com/$SUBADM" -ForegroundColor Green
Write-Host ''
