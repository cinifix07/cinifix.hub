param([string]$PdfPath = 'output/pdf/narrative-layout-sample.pdf')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]
$null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType=WindowsRuntime]
$operationMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
$actionMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and -not $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' } | Select-Object -First 1
function Wait-Operation($Operation, [Type]$ResultType) {
  $task = $operationMethod.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
  $task.GetAwaiter().GetResult()
}
$absolutePdf = (Resolve-Path -LiteralPath $PdfPath).Path
$file = Wait-Operation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($absolutePdf)) ([Windows.Storage.StorageFile])
$pdf = Wait-Operation ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
$outputFolder = Join-Path (Get-Location) 'tmp/pdfs'
New-Item -ItemType Directory -Path $outputFolder -Force | Out-Null
for ($pageIndex = 0; $pageIndex -lt $pdf.PageCount; $pageIndex++) {
  $page = $pdf.GetPage($pageIndex)
  $stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
  $actionTask = $actionMethod.Invoke($null, @($page.RenderToStreamAsync($stream)))
  $null = $actionTask.GetAwaiter().GetResult()
  $inputStream = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream.GetInputStreamAt(0))
  $destination = Join-Path $outputFolder ('narrative-page-' + ($pageIndex + 1) + '.png')
  $outputStream = [System.IO.File]::Create($destination)
  try { $inputStream.CopyTo($outputStream) } finally { $outputStream.Dispose(); $inputStream.Dispose(); $stream.Dispose(); $page.Dispose() }
}
Write-Output ('Rendered ' + $pdf.PageCount + ' PDF pages to ' + $outputFolder)
