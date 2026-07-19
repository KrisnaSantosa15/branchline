param(
  [int]$Seconds = 75,
  [int]$SampleRate = 44100
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $projectRoot "public\bed.wav"

$source = @'
using System;
using System.IO;

public static class BranchlinePulseBed
{
  public static void Create(string path, int seconds, int sampleRate)
  {
    int totalSamples = seconds * sampleRate;
    using (var stream = File.Create(path))
    using (var writer = new BinaryWriter(stream))
    {
      writer.Write(System.Text.Encoding.ASCII.GetBytes("RIFF"));
      writer.Write(36 + totalSamples * 2);
      writer.Write(System.Text.Encoding.ASCII.GetBytes("WAVEfmt "));
      writer.Write(16); writer.Write((short)1); writer.Write((short)1);
      writer.Write(sampleRate); writer.Write(sampleRate * 2); writer.Write((short)2); writer.Write((short)16);
      writer.Write(System.Text.Encoding.ASCII.GetBytes("data")); writer.Write(totalSamples * 2);
      double[] chord = { 110.0, 138.59, 164.81, 207.65, 220.0, 277.18, 329.63, 415.30 };
      for (int i = 0; i < totalSamples; i++)
      {
        double t = (double)i / sampleRate;
        double beat = t % 0.5;
        double bar = t % 2.0;
        int note = ((int)(t * 4.0)) % chord.Length;
        double bass = Math.Sin(2 * Math.PI * (chord[(note / 2) * 2] / 2.0) * t) * 0.10;
        double pad = Math.Sin(2 * Math.PI * chord[0] * t) * 0.026 + Math.Sin(2 * Math.PI * chord[2] * t) * 0.020 + Math.Sin(2 * Math.PI * chord[4] * t) * 0.015;
        double arpEnvelope = Math.Exp(-(t % 0.25) * 9.0);
        double arp = Math.Sin(2 * Math.PI * chord[note] * 2.0 * t) * 0.085 * arpEnvelope;
        double kickEnvelope = Math.Exp(-beat * 15.0);
        double kick = Math.Sin(2 * Math.PI * (126.0 - beat * 88.0) * beat) * 0.21 * kickEnvelope;
        double tickPhase = t % 0.25;
        double tick = (Math.Sin(2 * Math.PI * 4200 * t) + Math.Sin(2 * Math.PI * 5700 * t)) * 0.011 * Math.Exp(-tickPhase * 48.0);
        double lift = (bar > 1.6 ? Math.Sin(2 * Math.PI * 440 * t) * 0.016 : 0.0);
        double sample = Math.Max(-0.78, Math.Min(0.78, bass + pad + arp + kick + tick + lift));
        writer.Write((short)(sample * short.MaxValue));
      }
    }
  }
}
'@

Add-Type -TypeDefinition $source
[BranchlinePulseBed]::Create($outputPath, $Seconds, $SampleRate)
Write-Output "Pulse bed generated: $outputPath"
