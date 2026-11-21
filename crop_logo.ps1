Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\fredo\.gemini\antigravity\brain\8898fc97-e091-4f8d-bc2f-d9568c4eb8a5\.user_uploaded\media_1793700843720_931c46a4.jpg"
if (-not (Test-Path $srcPath)) {
    $srcPath = "d:\Herbo India\public\assets\logo.jpg"
}

$orig = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Original dimensions: $($orig.Width) x $($orig.Height)"

# Crop: Keep the golden emblem and the text with perfect balanced margins
# In a 1024x512 image:
# Golden circle is from x ~ 100 to 360, y ~ 125 to 385
# Text HERBO INDIA NATURAL WELLNESS is from x ~ 370 to 890, y ~ 170 to 340
# Perfect tight crop bounding box:
# X: 80, Width: 830 (from 80 to 910)
# Y: 110, Height: 292 (from 110 to 402)
# Aspect ratio: ~2.84 : 1, perfectly matching modern web navigation headers!

$cropX = [int]($orig.Width * 0.08)
$cropY = [int]($orig.Height * 0.21)
$cropW = [int]($orig.Width * 0.83)
$cropH = [int]($orig.Height * 0.58)

$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$targetBmp = New-Object System.Drawing.Bitmap($cropW, $cropH)
$g = [System.Drawing.Graphics]::FromImage($targetBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$destRect = New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)
$g.DrawImage($orig, $destRect, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)

$targetBmp.Save("d:\Herbo India\public\assets\logo.jpg", [System.Drawing.Imaging.ImageFormat]::Jpeg)
$targetBmp.Save("d:\Herbo India\public\assets\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$targetBmp.Save("d:\Herbo India\public\assets\logo-tight.jpg", [System.Drawing.Imaging.ImageFormat]::Jpeg)

$g.Dispose()
$targetBmp.Dispose()
$orig.Dispose()

Write-Host "Successfully cropped logo to $cropW x $cropH and saved to public\assets\logo.jpg!"
