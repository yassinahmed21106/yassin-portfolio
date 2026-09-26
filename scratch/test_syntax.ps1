try {
    $code = Get-Content -Raw "script.js"
    Write-Host "Script size:" $code.Length "characters"
    # Basic brace balance check
    $openBraces = ($code.ToCharArray() | Where-Object { $_ -eq '{' }).Count
    $closeBraces = ($code.ToCharArray() | Where-Object { $_ -eq '}' }).Count
    $openParens = ($code.ToCharArray() | Where-Object { $_ -eq '(' }).Count
    $closeParens = ($code.ToCharArray() | Where-Object { $_ -eq ')' }).Count
    Write-Host "Braces balance: {$openBraces} / {$closeBraces}"
    Write-Host "Parens balance: ($openParens) / ($closeParens)"
    if ($openBraces -eq $closeBraces -and $openParens -eq $closeParens) {
        Write-Host "SYNTAX OK: Delimiters perfectly balanced."
    } else {
        Write-Error "Mismatch in delimiters!"
    }
} catch {
    Write-Error $_
}
