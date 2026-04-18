Add-Type -AssemblyName System.IO.Compression.FileSystem;
$zip = [System.IO.Compression.ZipFile]::OpenRead('WBSImportSample.xlsx');

# Read shared strings
$ss = @();
$ssEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' };
if ($ssEntry) {
    $stream = $ssEntry.Open();
    $xml = [xml](New-Object System.IO.StreamReader($stream)).ReadToEnd();
    $stream.Close();
    foreach ($si in $xml.sst.si) { 
        $t = $si.t;
        if ($t -ne $null) { $ss += $t.'#text' } 
        else {
            $parts = $si.r | ForEach-Object { $_.t.'#text' }
            $ss += ($parts -join '')
        }
    }
}
Write-Output "=== Shared Strings ($($ss.Count) entries) ==="
for ($i = 0; $i -lt [Math]::Min($ss.Count, 143); $i++) { Write-Output "[$i] $($ss[$i])" }

# Read sheet1
$sheetEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/worksheets/sheet1.xml' };
if ($sheetEntry) {
    $stream = $sheetEntry.Open();
    $xml = [xml](New-Object System.IO.StreamReader($stream)).ReadToEnd();
    $stream.Close();

    Write-Output "`n=== First 20 Non-Empty Rows ==="
    $count = 0;
    foreach ($row in $xml.worksheet.sheetData.row) {
        $cells = @();
        foreach ($c in $row.c) {
            $val = $c.v;
            if ($c.t -eq 's') { 
                $idx = [int]$val; 
                if ($idx -lt $ss.Count) { $val = $ss[$idx] }
            }
            if ($val -ne $null -and $val -ne '') {
                $cells += "$($c.r)=[$val]"
            }
        }
        if ($cells.Count -gt 0) {
            Write-Output "Row $($row.r): $($cells -join '  |  ')"
            $count++
            if ($count -ge 30) { break }
        }
    }
}
$zip.Dispose();
