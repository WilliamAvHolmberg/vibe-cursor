using System.Globalization;

namespace Source.Shared.Utils;

public static class WeekUtils
{
    public static DateOnly GetCurrentWeekStart()
    {
        return GetWeekStart(DateOnly.FromDateTime(DateTime.UtcNow));
    }

    public static DateOnly GetWeekStart(DateOnly date)
    {
        var daysSinceMonday = (int)date.DayOfWeek - (int)DayOfWeek.Monday;
        if (daysSinceMonday < 0) daysSinceMonday += 7;
        return date.AddDays(-daysSinceMonday);
    }

    public static List<DateOnly> GenerateWeekDates(DateOnly fromWeek, int count)
    {
        var weeks = new List<DateOnly>();
        for (int i = 0; i < count; i++)
        {
            weeks.Add(fromWeek.AddDays(i * 7));
        }
        return weeks;
    }

    public static int GetWeekNumber(DateOnly date)
    {
        var culture = new CultureInfo("sv-SE");
        var calendar = culture.Calendar;
        var calendarWeekRule = culture.DateTimeFormat.CalendarWeekRule;
        var firstDayOfWeek = culture.DateTimeFormat.FirstDayOfWeek;
        
        var dateTime = date.ToDateTime(TimeOnly.MinValue);
        return calendar.GetWeekOfYear(dateTime, calendarWeekRule, firstDayOfWeek);
    }

    public static DateOnly AddWeeks(DateOnly date, int weeks)
    {
        return date.AddDays(weeks * 7);
    }
}
