Add-Type -AssemblyName System.IO.Compression.FileSystem;
$zip = [System.IO.Compression.ZipFile]::OpenRead('WBSImportSample.xlsx');
$sharedStrings = $zip.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' };
if ($sharedStrings) {
    $stream = $sharedStrings.Open();
    $reader = New-Object System.IO.StreamReader($stream);
    $xml = $reader.ReadToEnd();
    $reader.Close();
    $stream.Close();
    $xml;
} else {
    'No sharedStrings.xml';
}
$zip.Dispose();
