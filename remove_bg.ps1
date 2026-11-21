Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\fredo\.gemini\antigravity\brain\8898fc97-e091-4f8d-bc2f-d9568c4eb8a5\.user_uploaded\media_1793700843720_931c46a4.jpg"
if (-not (Test-Path $srcPath)) {
    $srcPath = "d:\Herbo India\frontend\assets\logo.jpg"
}

$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $bmp.Width
$h = $bmp.Height

Write-Host "Processing $w x $h image..."

# Create a 32-bit ARGB bitmap for transparency
$outBmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Lock bits for high-speed pixel manipulation
$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$srcData = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$outData = $outBmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$bytes = [Math]::Abs($srcData.Stride) * $h
$srcBuffer = New-Object byte[] $bytes
$outBuffer = New-Object byte[] $bytes

[System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $srcBuffer, 0, $bytes)

# Bounding box calculation for tight crop
$minX = $w
$maxX = 0
$minY = $h
$maxY = 0

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $idx = ($y * $srcData.Stride) + ($x * 4)
        $b = [int]$srcBuffer[$idx]
        $g = [int]$srcBuffer[$idx + 1]
        $r = [int]$srcBuffer[$idx + 2]

        # Detect gold metallic vs blue wall:
        # Blue wall has high blue, low red (b > 130 and r < 80 and (b - r) > 60)
        # Gold metallic has high red and green (r > 100, g > 80, and r >= b)
        
        $isBlue = ($b - $r) -gt 45 -and ($b - $g) -gt 30 -and ($r -lt 110)
        
        if ($isBlue) {
            # Fully transparent
            $outBuffer[$idx] = 0
            $outBuffer[$idx + 1] = 0
            $outBuffer[$idx + 2] = 0
            $outBuffer[$idx + 3] = 0
        } else {
            # Gold artwork pixel
            # Check edge smoothness: if slight blue tint in shadow, clean it
            $alpha = 255
            if (($b - $r) -gt 20 -and $r -lt 140) {
                $alpha = [byte][Math]::Max(0, [Math]::Min(255, (255 - (($b - $r) * 4))))
            }
            
            $outBuffer[$idx] = [byte]$b
            $outBuffer[$idx + 1] = [byte]$g
            $outBuffer[$idx + 2] = [byte]$r
            $outBuffer[$idx + 3] = [byte]$alpha

            if ($alpha -gt 50) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
}

[System.Runtime.InteropServices.Marshal]::Copy($outBuffer, 0, $outData.Scan0, $bytes)
$bmp.UnlockBits($srcData)
$outBmp.UnlockBits($outData)
$bmp.Dispose()

Write-Host "Artwork bounding box: X: $minX to $maxX, Y: $minY to $maxY"

# Add padding around tight bounding box
$pad = 12
$cropX = [Math]::Max(0, $minX - $pad)
$cropY = [Math]::Max(0, $minY - $pad)
$cropW = [Math]::Min($w - $cropX, ($maxX - $minX) + ($pad * 2))
$cropH = [Math]::Min($h - $cropY, ($maxY - $minY) + ($pad * 2))

Write-Host "Cropping to: $cropW x $cropH"

$tightBmp = New-Object System.Drawing.Bitmap($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($tightBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$srcCropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$destCropRect = New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)
$g.DrawImage($outBmp, $destCropRect, $srcCropRect, [System.Drawing.GraphicsUnit]::Pixel)

# Save transparent PNG
$tightBmp.Save("d:\Herbo India\frontend\assets\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$tightBmp.Save("d:\Herbo India\frontend\assets\logo-transparent.png", [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$tightBmp.Dispose()
$outBmp.Dispose()

Write-Host "Successfully saved transparent logo to frontend\assets\logo.png!"
