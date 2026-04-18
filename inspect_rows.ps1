Add-Type -AssemblyName System.IO.Compression.FileSystem;
$zip = [System.IO.Compression.ZipFile]::OpenRead('WBSImportSample.xlsx');

$ssEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' };
$ss = @();
if ($ssEntry) {
    $stream = $ssEntry.Open();
    $xml = [xml](New-Object System.IO.StreamReader($stream)).ReadToEnd();
    $stream.Close();
    foreach ($si in $xml.sst.si) { 
        if ($si.t) { $ss += $si.t.'#text' } else { $ss += "" }
    }
}

$sheetEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/worksheets/sheet1.xml' };
if ($sheetEntry) {
    $stream = $sheetEntry.Open();
    $xml = [xml](New-Object System.IO.StreamReader($stream)).ReadToEnd();
    $stream.Close();
    
    $rows = $xml.worksheet.sheetData.row
    foreach ($row in $rows) {
        $rowData = @();
        foreach ($c in $row.c) {
            $val = $c.v;
            if ($c.t -eq 's') { 
                $idx = [int]$val;
                if ($idx -lt $ss.Count) { $val = $ss[$idx] }
            }
            $rowData += "$($c.r): $val";
        }
        Write-Output ($rowData -join ' | ')
    }
}
$zip.Dispose();
