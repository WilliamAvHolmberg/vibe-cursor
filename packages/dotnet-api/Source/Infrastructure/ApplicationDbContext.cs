using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Source.Features.Users.Models;
using Source.Features.ImageLibrary.Models;
using Source.Features.Orchestration.Models;

namespace Source.Infrastructure;

public class ApplicationDbContext : IdentityDbContext<User>
{

    public DbSet<ImageLibraryItem> ImageLibrary { get; set; }
    public DbSet<Orchestration> Orchestrations { get; set; }
    public DbSet<Agent> Agents { get; set; }
    public DbSet<FollowUpMessage> FollowUpMessages { get; set; }
    public DbSet<AgentStatusUpdate> AgentStatusUpdates { get; set; }
    public DbSet<OrchestrationEvent> OrchestrationEvents { get; set; }

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Orchestration>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);
        });

        builder.Entity<Agent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Orchestration)
                .WithMany(o => o.Agents)
                .HasForeignKey(e => e.OrchestrationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.ParentAgent)
                .WithMany(a => a.SubAgents)
                .HasForeignKey(e => e.ParentAgentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => e.OrchestrationId);
            entity.HasIndex(e => e.CursorAgentId);
        });

        builder.Entity<FollowUpMessage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Orchestration)
                .WithMany(o => o.FollowUpMessages)
                .HasForeignKey(e => e.OrchestrationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.OrchestrationId);
            entity.HasIndex(e => e.CreatedAt);
        });

        builder.Entity<AgentStatusUpdate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Agent)
                .WithMany(a => a.StatusUpdates)
                .HasForeignKey(e => e.AgentId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.AgentId);
            entity.HasIndex(e => e.CreatedAt);
        });

        builder.Entity<OrchestrationEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Orchestration)
                .WithMany(o => o.Events)
                .HasForeignKey(e => e.OrchestrationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.OrchestrationId);
            entity.HasIndex(e => e.CreatedAt);
        });
    }
}