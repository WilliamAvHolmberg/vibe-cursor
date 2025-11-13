using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Source.Features.Users.Events;
using Source.Features.Users.Models;
using Source.Infrastructure;
using Source.Infrastructure.Services.Email;
using Source.Shared.Events;

namespace Source.Features.Users.EventHandlers;

public class SendWelcomeEmailHandler : IEventHandler<UserCreated>
{
    private readonly IEmailService _emailService;
    private readonly UserManager<User> _userManager;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SendWelcomeEmailHandler> _logger;

    public SendWelcomeEmailHandler(
        IEmailService emailService,
        UserManager<User> userManager,
        ApplicationDbContext context,
        ILogger<SendWelcomeEmailHandler> logger)
    {
        _emailService = emailService;
        _userManager = userManager;
        _context = context;
        _logger = logger;
    }

    public async Task Handle(UserCreated notification, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Sending welcome email to user {UserId} at {Email}", 
            notification.UserId, notification.Email);

        var user = await _userManager.FindByIdAsync(notification.UserId);
        if (user == null)
        {
            _logger.LogWarning("User {UserId} not found, cannot send welcome email", notification.UserId);
            return;
        }

        string emailTitle;
        string bodyContent;

        emailTitle = "Welcome! 🎉";
        bodyContent = "We're excited to have you on board.";

        var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
</head>
<body style=""margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;"">
    <div style=""max-width: 600px; margin: 0 auto; background-color: #ffffff;"">
        <!-- Header -->
        <div style=""background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;"">
            <h1 style=""color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;"">
                {emailTitle}
            </h1>
        </div>
        
        <!-- Content -->
        <div style=""padding: 40px 30px;"">
            <p style=""font-size: 16px; color: #212529; line-height: 1.6; margin-bottom: 24px;"">
                Hi {user.FullName ?? user.Email}!
            </p>
            
            <p style=""font-size: 16px; color: #212529; line-height: 1.6; margin-bottom: 24px; white-space: pre-line;"">
                {bodyContent}
            </p>
        </div>
        
        <!-- Footer -->
        <div style=""background-color: #f8f9fa; padding: 24px 30px; text-align: center; border-top: 1px solid #e9ecef;"">
            <p style=""color: #6c757d; font-size: 14px; margin: 0; line-height: 1.6;"">
                If you have any questions, please contact support.
            </p>
            <p style=""color: #adb5bd; font-size: 12px; margin: 12px 0 0 0;"">
                © {DateTime.UtcNow.Year} All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>";

        var textBody = $@"
{emailTitle}

Hi {user.FullName ?? user.Email}!

{bodyContent}

---
If you have any questions, please contact support.

© {DateTime.UtcNow.Year} All rights reserved.
";

        var emailMessage = new EmailMessage(
            To: notification.Email,
            Subject: emailTitle,
            HtmlBody: htmlBody,
            TextBody: textBody
        );

        await _emailService.SendEmailAsync(emailMessage, cancellationToken);

        _logger.LogInformation("✅ Welcome email sent successfully to {Email}", notification.Email);
    }
} 