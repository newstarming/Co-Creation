# Test target for the desktop end-to-end tests. Prints JSON lines on stdout:
#   {"event":"ready", ...control rectangles in physical screen pixels...}
#   {"event":"submit","text":"..."}           when the button is clicked or Enter pressed
#   {"event":"scroll","top":N}                when the list's top item changes
# The form is topmost, has a solid magenta block for screenshot checks, and closes after 90 s.
param([string]$Title = 'CUA Target')
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class Dpi { [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr v); }
"@
[Dpi]::SetProcessDpiAwarenessContext([IntPtr](-4)) | Out-Null
[System.Windows.Forms.Application]::EnableVisualStyles()

function Emit($obj) { [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress)); [Console]::Out.Flush() }
function ScreenRect($c) {
  $p = $c.PointToScreen([System.Drawing.Point]::Empty)
  @{ x = $p.X; y = $p.Y; width = $c.Width; height = $c.Height }
}

$form = New-Object System.Windows.Forms.Form
$form.Text = $Title
$form.TopMost = $true
$form.StartPosition = 'Manual'
$form.Location = New-Object System.Drawing.Point 120, 120
$form.ClientSize = New-Object System.Drawing.Size 640, 420
$form.Font = New-Object System.Drawing.Font 'Microsoft YaHei UI', 12

$box = New-Object System.Windows.Forms.TextBox
$box.Location = New-Object System.Drawing.Point 20, 20
$box.Size = New-Object System.Drawing.Size 380, 36
$form.Controls.Add($box)

$btn = New-Object System.Windows.Forms.Button
$btn.Text = 'Submit'
$btn.Location = New-Object System.Drawing.Point 420, 18
$btn.Size = New-Object System.Drawing.Size 180, 42
$form.Controls.Add($btn)
$form.AcceptButton = $btn

$list = New-Object System.Windows.Forms.ListBox
$list.Location = New-Object System.Drawing.Point 20, 80
$list.Size = New-Object System.Drawing.Size 380, 300
$list.IntegralHeight = $false
1..200 | ForEach-Object { [void]$list.Items.Add("item $_") }
$form.Controls.Add($list)

$swatch = New-Object System.Windows.Forms.Panel
$swatch.Location = New-Object System.Drawing.Point 420, 80
$swatch.Size = New-Object System.Drawing.Size 180, 300
$swatch.BackColor = [System.Drawing.Color]::FromArgb(255, 0, 255)
$form.Controls.Add($swatch)

$btn.Add_Click({ Emit @{ event = 'submit'; text = $box.Text } })
$script:top = 0
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 100
$timer.Add_Tick({ if ($list.TopIndex -ne $script:top) { $script:top = $list.TopIndex; Emit @{ event = 'scroll'; top = $script:top } } })
$timer.Start()
$quit = New-Object System.Windows.Forms.Timer
$quit.Interval = 90000
$quit.Add_Tick({ $form.Close() })
$quit.Start()

$form.Add_Shown({
  $form.Activate()
  Emit @{ event = 'ready'; form = (ScreenRect $form); box = (ScreenRect $box); button = (ScreenRect $btn); list = (ScreenRect $list); swatch = (ScreenRect $swatch); title = $form.Text }
})
[System.Windows.Forms.Application]::Run($form)
