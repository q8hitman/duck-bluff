# Crops the club ducks out of the team sheet into card portraits (no install needed).
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$boxes = @{
  zahraa=@(600,5,280,262); camel=@(122,292,185,250); abdullah=@(355,308,190,240); ahmad=@(562,322,185,222);
  rawan=@(838,322,172,222); shouq=@(1075,325,190,222); loujain=@(1315,312,178,232); fayzah=@(135,605,178,196);
  bassam=@(385,607,180,194); ali=@(662,607,178,194); ruaa=@(950,622,168,184); motivator=@(1218,602,186,198)
}
function Save-Crop($src, $box, $out) {
  $w = 400; $h = [int](400 * $box[3] / $box[2])
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0,0,$w,$h), (New-Object System.Drawing.Rectangle $box[0],$box[1],$box[2],$box[3]), 'Pixel')
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
$sheet = [System.Drawing.Image]::FromFile("$root\assets\ref\bsc_reference.png")
"sheet $($sheet.Width)x$($sheet.Height)"
foreach ($id in $boxes.Keys) { Save-Crop $sheet $boxes[$id] "$root\assets\ducks\$id.png" }
$sheet.Dispose()
$r = [System.Drawing.Image]::FromFile("$root\assets\ref\ritaj.png")
"ritaj $($r.Width)x$($r.Height)"
Save-Crop $r @(8,175,225,300) "$root\assets\ducks\ritaj.png"
$r.Dispose()
