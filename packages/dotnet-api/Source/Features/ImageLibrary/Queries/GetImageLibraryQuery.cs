using Microsoft.EntityFrameworkCore;
using Source.Features.ImageLibrary.Models;
using Source.Infrastructure;
using Source.Shared.CQRS;
using Source.Shared.Results;

namespace Source.Features.ImageLibrary.Queries;

public record GetImageLibraryQuery(
    string? Search,
    int Page = 1,
    int PageSize = 20
) : IQuery<Result<GetImageLibraryResponse>>;

public record ImageLibraryItemDto(
    Guid Id,
    string FileName,
    string Description,
    string FileUrl,
    long FileSize,
    DateTime CreatedAt
);

public record GetImageLibraryResponse(
    List<ImageLibraryItemDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

public class GetImageLibraryQueryHandler : IQueryHandler<GetImageLibraryQuery, Result<GetImageLibraryResponse>>
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GetImageLibraryQueryHandler> _logger;

    public GetImageLibraryQueryHandler(ApplicationDbContext context, ILogger<GetImageLibraryQueryHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<GetImageLibraryResponse>> Handle(GetImageLibraryQuery request, CancellationToken cancellationToken)
    {
        var query = _context.ImageLibrary.AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var searchTerm = request.Search.ToLower();
            query = query.Where(i => 
                EF.Functions.ILike(i.Description, $"%{searchTerm}%") ||
                EF.Functions.ILike(i.FileName, $"%{searchTerm}%")
            );
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(i => new ImageLibraryItemDto(
                i.Id,
                i.FileName,
                i.Description,
                i.FileUrl,
                i.FileSize,
                i.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling((double)totalCount / request.PageSize);

        var response = new GetImageLibraryResponse(
            items,
            totalCount,
            request.Page,
            request.PageSize,
            totalPages
        );

        return Result.Success(response);
    }
}

