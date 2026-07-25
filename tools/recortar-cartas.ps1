<#
    Recorta cartas do Pro Clubs a partir dos prints do menu Club Squad.

    Uso normal: dê dois cliques em "Recortar cartas.bat" dentro da pasta do jogador.
    Ele acha os prints soltos na pasta, recorta a moldura da carta, pergunta os dados
    e já cadastra em data/players.json.

    Também dá pra rodar de todas as pastas de uma vez:
        tools\Recortar TODAS as cartas.bat
#>
param(
    [string]$Pasta,
    [switch]$Todas,
    [switch]$SemPerguntar   # não pergunta nada — usado em teste
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# Moldura da carta em % da imagem. Medido no print 4K: x=249, y=290, 720x995.
# Em % funciona para qualquer resolução 16:9.
$BOX    = @{ X = 6.484375; Y = 13.425926; W = 18.75; H = 46.064815 }
$OUT_W  = 480
$JPEG_Q = 92

$RAIZ = Split-Path $PSScriptRoot -Parent
$JSON = Join-Path $RAIZ 'data\players.json'

function Write-Passo($msg, $cor = 'Gray') { Write-Host "  $msg" -ForegroundColor $cor }

function Get-Slug($texto) {
    ($texto -replace '[^a-zA-Z0-9]', '').ToLower()
}

# É um print do jogo (16:9 grande) e não uma carta já recortada?
function Test-EhPrint($img) {
    if ($img.Width -lt 1280) { return $false }
    $ratio = $img.Width / $img.Height
    return [math]::Abs($ratio - (16 / 9)) -lt 0.03
}

function Get-JpegEncoder {
    [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
        Where-Object { $_.MimeType -eq 'image/jpeg' }
}

function Invoke-Recorte($arquivo, $destino) {
    $img = [System.Drawing.Bitmap]::FromFile($arquivo)
    try {
        if (-not (Test-EhPrint $img)) { return $null }

        $sx = [int][math]::Round($BOX.X / 100 * $img.Width)
        $sy = [int][math]::Round($BOX.Y / 100 * $img.Height)
        $sw = [int][math]::Round($BOX.W / 100 * $img.Width)
        $sh = [int][math]::Round($BOX.H / 100 * $img.Height)

        $rect = New-Object System.Drawing.Rectangle $sx, $sy, $sw, $sh
        $crop = $img.Clone($rect, $img.PixelFormat)

        $outH = [int][math]::Round($OUT_W * $sh / $sw)
        $bmp  = New-Object System.Drawing.Bitmap $OUT_W, $outH
        $g    = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = 'HighQualityBicubic'
        $g.PixelOffsetMode   = 'HighQuality'
        $g.SmoothingMode     = 'HighQuality'
        $g.DrawImage($crop, 0, 0, $OUT_W, $outH)

        $prm = New-Object System.Drawing.Imaging.EncoderParameters 1
        $prm.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter (
            [System.Drawing.Imaging.Encoder]::Quality), $JPEG_Q
        $bmp.Save($destino, (Get-JpegEncoder), $prm)

        $g.Dispose(); $bmp.Dispose(); $crop.Dispose()
        return @{ W = $OUT_W; H = $outH }
    }
    finally { $img.Dispose() }
}

function Read-Campo($rotulo, $exemplo) {
    if ($SemPerguntar) { return '' }
    (Read-Host "    $rotulo (ex.: $exemplo)").Trim()
}

# --------------------------------------------------------------------- pastas

$CARDS = Join-Path $RAIZ 'cards'

$pastas = @()
if ($Todas) {
    $pastas = Get-ChildItem $CARDS -Directory | ForEach-Object { $_.FullName }
} elseif ($Pasta) {
    $pastas = @((Resolve-Path $Pasta).Path)
} else {
    $pastas = @((Get-Location).Path)
}

Write-Host ''
Write-Host '  HOJE TEM AQUELA F.C. - recortador de cartas' -ForegroundColor Green
Write-Host '  ------------------------------------------' -ForegroundColor DarkGray

# ------------------------------------------------- print largado na raiz
# Jogar o print direto em cards/ e nao dentro da pasta do jogador e o que
# qualquer um faz. Antes esses arquivos ficavam invisiveis, porque o script
# so olhava dentro das pastas. Agora ele pergunta de quem e e move pra la.

function Invoke-PrintsSoltos {
    $soltos = Get-ChildItem $CARDS -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Extension -match '^\.(jpg|jpeg|png|bmp)$' }

    $paraMover = @()
    foreach ($p in $soltos) {
        $img = [System.Drawing.Bitmap]::FromFile($p.FullName)
        $eh = Test-EhPrint $img
        $img.Dispose()
        if ($eh) { $paraMover += $p }
    }
    if ($paraMover.Count -eq 0) { return @() }

    Write-Host ''
    Write-Host "  $($paraMover.Count) print(s) solto(s) em cards/ - de quem sao?" -ForegroundColor Yellow

    $jogadores = @(Get-ChildItem $CARDS -Directory | Sort-Object Name)
    $destinos = @()

    foreach ($p in $paraMover) {
        Write-Host ''
        Write-Host "    $($p.Name)" -ForegroundColor Cyan
        for ($i = 0; $i -lt $jogadores.Count; $i++) {
            Write-Host ("      {0,2}) {1}" -f ($i + 1), $jogadores[$i].Name) -ForegroundColor DarkGray
        }
        Write-Host '       0) outro jogador (digitar o gamertag)' -ForegroundColor DarkGray

        if ($SemPerguntar) { Write-Passo 'pulando: nao da pra adivinhar de quem e' Yellow; continue }

        $escolha = (Read-Host '      numero').Trim()
        $destino = $null

        if ($escolha -eq '0') {
            $tag = (Read-Host '      gamertag').Trim()
            if (-not $tag) { Write-Passo 'sem gamertag, pulando' Yellow; continue }
            $destino = Join-Path $CARDS (Get-Slug $tag)
            New-Item -ItemType Directory -Force -Path $destino | Out-Null
            Copy-Item (Join-Path $CARDS 'Recortar cartas.bat') $destino -ErrorAction SilentlyContinue
        }
        elseif ($escolha -match '^\d+$' -and [int]$escolha -ge 1 -and [int]$escolha -le $jogadores.Count) {
            $destino = $jogadores[[int]$escolha - 1].FullName
        }
        else { Write-Passo 'escolha invalida, pulando' Yellow; continue }

        Move-Item $p.FullName (Join-Path $destino $p.Name) -Force
        Write-Passo "-> $(Split-Path $destino -Leaf)" Green
        if ($destinos -notcontains $destino) { $destinos += $destino }
    }
    return $destinos
}

# roda quando a pessoa deu dois cliques na raiz de cards/ ou pediu -Todas
$naRaiz = ($pastas.Count -eq 1 -and (Resolve-Path $pastas[0]).Path -eq (Resolve-Path $CARDS).Path)
if ($Todas -or $naRaiz) {
    $extras = Invoke-PrintsSoltos
    foreach ($d in $extras) { if ($pastas -notcontains $d) { $pastas += $d } }
    if ($naRaiz) { $pastas = @($pastas | Where-Object { (Resolve-Path $_).Path -ne (Resolve-Path $CARDS).Path }) }
}

$novas = @()

foreach ($pasta in $pastas) {
    $id = Split-Path $pasta -Leaf

    $prints = Get-ChildItem $pasta -File |
        Where-Object { $_.Extension -match '^\.(jpg|jpeg|png|bmp)$' } |
        Sort-Object Name

    $achou = @()
    foreach ($p in $prints) {
        $img = [System.Drawing.Bitmap]::FromFile($p.FullName)
        $ehPrint = Test-EhPrint $img
        $img.Dispose()
        if ($ehPrint) { $achou += $p }
    }

    if ($achou.Count -eq 0) {
        if (-not $Todas) { Write-Passo "Nenhum print novo em $id. Jogue o print aqui dentro e rode de novo." Yellow }
        continue
    }

    Write-Host ''
    Write-Host "  $id" -ForegroundColor Cyan

    $guardar = Join-Path $pasta 'prints'
    New-Item -ItemType Directory -Force -Path $guardar | Out-Null

    foreach ($p in $achou) {
        $arquetipo = Read-Campo 'Arquetipo' 'JOKER'
        $posicao   = Read-Campo 'Posicao'   'CAM'
        $overall   = Read-Campo 'Overall'   '86'

        # nome do arquivo: id do jogador, mais o arquetipo quando ja existe outra carta
        $base = $id
        if (Get-ChildItem $pasta -Filter "$id.jpg" -File -ErrorAction SilentlyContinue) {
            $sufixo = Get-Slug $arquetipo
            if (-not $sufixo) { $sufixo = 'carta' }
            $base = "$id-$sufixo"
        }
        $nome = "$base.jpg"
        $n = 2
        while (Test-Path (Join-Path $pasta $nome)) { $nome = "$base-$n.jpg"; $n++ }

        $destino = Join-Path $pasta $nome
        $dim = Invoke-Recorte $p.FullName $destino
        if (-not $dim) { continue }

        Move-Item $p.FullName (Join-Path $guardar $p.Name) -Force
        Write-Passo "$($p.Name)  ->  $nome  ($($dim.W)x$($dim.H))" Green

        $novas += [PSCustomObject]@{
            PlayerId  = $id
            CardId    = "$id-" + $(if (Get-Slug $arquetipo) { Get-Slug $arquetipo } else { 'carta' })
            Archetype = $arquetipo
            Position  = $posicao
            Rating    = $(if ($overall -match '^\d+$') { [int]$overall } else { $null })
            Path      = "cards/$id/$nome"
        }
    }
}

if ($novas.Count -eq 0) {
    Write-Host ''
    Write-Host '  Nada novo pra recortar.' -ForegroundColor DarkGray
    Write-Host ''
    return
}

# ------------------------------------------------------------- data/players.json

Write-Host ''
Write-Host '  Cadastrando em data/players.json' -ForegroundColor Green

$dados = Get-Content $JSON -Raw -Encoding UTF8 | ConvertFrom-Json
Copy-Item $JSON "$JSON.bak" -Force

foreach ($nova in $novas) {
    $jogador = $dados.players | Where-Object { $_.id -eq $nova.PlayerId } | Select-Object -First 1

    if (-not $jogador) {
        $jogador = [PSCustomObject]@{
            id = $nova.PlayerId; name = $nova.PlayerId; gamertag = $nova.PlayerId; cards = @()
        }
        $dados.players = @($dados.players) + $jogador
        Write-Passo "jogador novo: $($nova.PlayerId)" Cyan
    }

    # id de carta unico em todo o elenco
    $usados = @($dados.players | ForEach-Object { $_.cards } | ForEach-Object { $_.id })
    $vid = $nova.CardId
    $n = 2
    while ($usados -contains $vid) { $vid = "$($nova.CardId)-$n"; $n++ }

    $jogador.cards = @($jogador.cards) + ([PSCustomObject]@{
        id        = $vid
        archetype = $nova.Archetype
        position  = $nova.Position
        rating    = $nova.Rating
        card      = $nova.Path
    })
    Write-Passo "$($nova.PlayerId): $vid -> $($nova.Path)" Gray
}

$saida = $dados | ConvertTo-Json -Depth 12
# ConvertTo-Json escapa acentos como \uXXXX; devolve os caracteres de verdade
$saida = [regex]::Replace($saida, '\\u([0-9a-fA-F]{4})', {
    param($m) [string][char][int]('0x' + $m.Groups[1].Value)
})
[System.IO.File]::WriteAllText($JSON, $saida, (New-Object System.Text.UTF8Encoding $false))

Write-Host ''
Write-Host "  Pronto: $($novas.Count) carta(s) recortada(s) e cadastrada(s)." -ForegroundColor Green
Write-Host '  Os prints originais foram para a subpasta prints/.' -ForegroundColor DarkGray
Write-Host '  Falta so o commit:  git add -A  &&  git commit  &&  git push' -ForegroundColor DarkGray
Write-Host ''
