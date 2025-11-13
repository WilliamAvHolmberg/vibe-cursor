using System.ComponentModel.DataAnnotations;

namespace Source.Features.ImageLibrary.Models;

public class ImageLibraryItem
{
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(1000)]
    public string FileUrl { get; set; } = string.Empty;
    
    public long FileSize { get; set; }
    
    [MaxLength(450)]
    public string? UploadedByUserId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

