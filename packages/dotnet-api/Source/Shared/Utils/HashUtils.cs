using System.Security.Cryptography;
using System.Text;

namespace Source.Shared.Utils;

public static class HashUtils
{
    public static string ComputeSHA256Hash(string input)
    {
        if (string.IsNullOrEmpty(input))
        {
            return string.Empty;
        }

        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(input);
        var hashBytes = sha256.ComputeHash(bytes);
        
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}

