param(
  [string]$Voice = "Microsoft Zira Desktop",
  [int]$Rate = 1
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech

$projectRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $projectRoot "public\narration.txt"
$outputPath = Join-Path $projectRoot "public\narration.wav"
$text = Get-Content -Raw $scriptPath
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

try {
  $voiceNames = @($synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name })
  if ($voiceNames -contains $Voice) {
    $synth.SelectVoice($Voice)
  } elseif ($voiceNames.Count -gt 0) {
    $synth.SelectVoice($voiceNames[0])
  }
  $synth.Rate = $Rate
  $synth.Volume = 100
  $synth.SetOutputToWaveFile($outputPath)
  $synth.Speak($text)
  Write-Output "Narration generated: $outputPath"
} finally {
  $synth.Dispose()
}
