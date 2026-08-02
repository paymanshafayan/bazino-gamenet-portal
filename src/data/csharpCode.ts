export const csharpModelsCode = `using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace GameNet.Core.Entities
{
    /// <summary>
    /// ۱. مدل کاربر (گیمر) در باشگاه مشتریان
    /// </summary>
    public class User
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(100)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [MaxLength(15)]
        public string Phone { get; set; } = string.Empty;

        // امتیاز وفاداری فعلی کاربر در باشگاه مشتریان
        public int LoyaltyPoints { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Relationships
        public virtual ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
        public virtual ICollection<CafeOrder> CafeOrders { get; set; } = new List<CafeOrder>();
        public virtual ICollection<AccessoryOrder> AccessoryOrders { get; set; } = new List<AccessoryOrder>();
        public virtual ICollection<LoyaltyTransaction> LoyaltyTransactions { get; set; } = new List<LoyaltyTransaction>();
    }

    /// <summary>
    /// ۲. سیستم‌های بازی (PC, PS5, Xbox Series X)
    /// </summary>
    public class GameSystem
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty; // مثلاً "System #05 - VIP PS5"

        [Required]
        [MaxLength(50)]
        public string SystemType { get; set; } = "PC"; // PC, PS5, XBOX

        [Range(0, 10000000)]
        public decimal HourlyRate { get; set; } // هزینه هر ساعت رزرو به ریال/تومان

        public bool IsActive { get; set; } = true;

        public virtual ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
    }

    /// <summary>
    /// ۳. رزرو آنلاین سانس‌ها
    /// </summary>
    public class Reservation
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid UserId { get; set; }
        public virtual User User { get; set; } = null!;

        public Guid GameSystemId { get; set; }
        public virtual GameSystem GameSystem { get; set; } = null!;

        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }

        public decimal TotalPrice { get; set; }
        public decimal FinalPaidAmount { get; set; }

        public Guid? DiscountCodeId { get; set; }
        public virtual DiscountCode? DiscountCode { get; set; }

        public bool IsPaid { get; set; } = false;
        public string PaymentTransactionId { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// ۴. محصولات کافه و بوفه آنلاین
    /// </summary>
    public class CafeItem
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        public decimal Price { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public int InventoryCount { get; set; }
        public bool IsAvailable { get; set; } = true;
    }

    /// <summary>
    /// ۵. سفارش کافه داخل سالن
    /// </summary>
    public class CafeOrder
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid UserId { get; set; }
        public virtual User User { get; set; } = null!;

        // شماره سیستم یا میز که سفارش باید به آن تحویل داده شود
        [Required]
        [MaxLength(50)]
        public string SystemOrTableNumber { get; set; } = string.Empty;

        public decimal TotalPrice { get; set; }
        public decimal FinalPaidAmount { get; set; }

        public Guid? DiscountCodeId { get; set; }
        public virtual DiscountCode? DiscountCode { get; set; }

        public bool IsPaid { get; set; } = false;
        
        // وضعیت سفارش: در انتظار، در حال آماده‌سازی، تحویل داده شده
        public string Status { get; set; } = "Pending"; // Pending, Preparing, Delivered, Cancelled
        
        public DateTime OrderDate { get; set; } = DateTime.UtcNow;

        public virtual ICollection<CafeOrderItem> OrderItems { get; set; } = new List<CafeOrderItem>();
    }

    public class CafeOrderItem
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid CafeOrderId { get; set; }
        public virtual CafeOrder CafeOrder { get; set; } = null!;

        public Guid CafeItemId { get; set; }
        public virtual CafeItem CafeItem { get; set; } = null!;

        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
    }

    /// <summary>
    /// ۶. تورنمنت‌ها و مسابقات گیمینگ
    /// </summary>
    public class Tournament
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string GameName { get; set; } = string.Empty; // Dota 2, FIFA 24, CS2

        public string Description { get; set; } = string.Empty;
        public decimal RegistrationFee { get; set; } // هزینه ثبت‌نام تیم
        public DateTime StartDate { get; set; }
        public int MaxTeams { get; set; } = 16;
        
        // ساختار براکت به صورت داده متنی JSON ذخیره می‌شود
        public string BracketJson { get; set; } = "{}";

        public string Status { get; set; } = "Upcoming"; // Upcoming, Active, Completed

        public virtual ICollection<Team> Teams { get; set; } = new List<Team>();
    }

    /// <summary>
    /// ۷. تیم‌های ثبت‌نامی در تورنمنت
    /// </summary>
    public class Team
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid TournamentId { get; set; }
        public virtual Tournament Tournament { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string LeaderName { get; set; } = string.Empty;

        [Required]
        [MaxLength(15)]
        public string ContactPhone { get; set; } = string.Empty;

        public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
        public bool IsPaid { get; set; } = false;

        public virtual ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();
    }

    public class TeamMember
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid TeamId { get; set; }
        public virtual Team Team { get; set; } = null!;

        [Required]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(100)]
        public string GamerTag { get; set; } = string.Empty;
    }

    /// <summary>
    /// ۸. فروشگاه لوازم جانبی گیمینگ
    /// </summary>
    public class Accessory
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public int StockQuantity { get; set; }
        
        [MaxLength(100)]
        public string Category { get; set; } = string.Empty; // Keyboard, Mouse, Headset, Controller
    }

    /// <summary>
    /// ۹. فاکتور سفارش از فروشگاه
    /// </summary>
    public class AccessoryOrder
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid UserId { get; set; }
        public virtual User User { get; set; } = null!;

        public DateTime OrderDate { get; set; } = DateTime.UtcNow;
        public decimal TotalPrice { get; set; }
        public decimal FinalPaidAmount { get; set; }

        public Guid? DiscountCodeId { get; set; }
        public virtual DiscountCode? DiscountCode { get; set; }

        public bool IsPaid { get; set; } = false;
        public string Status { get; set; } = "Processing"; // Processing, Shipped, Delivered, Cancelled

        public virtual ICollection<AccessoryOrderItem> OrderItems { get; set; } = new List<AccessoryOrderItem>();
    }

    public class AccessoryOrderItem
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid AccessoryOrderId { get; set; }
        public virtual AccessoryOrder AccessoryOrder { get; set; } = null!;

        public Guid AccessoryId { get; set; }
        public virtual Accessory Accessory { get; set; } = null!;

        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
    }

    /// <summary>
    /// ۱۰. اخبار و بلاگ بازی‌ها
    /// </summary>
    public class Article
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(250)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        public string ImageUrl { get; set; } = string.Empty;

        [MaxLength(100)]
        public string Category { get; set; } = "Gaming";

        [MaxLength(100)]
        public string Author { get; set; } = "Admin";

        public DateTime PublishedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<Comment> Comments { get; set; } = new List<Comment>();
    }

    public class Comment
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid ArticleId { get; set; }
        public virtual Article Article { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        public string GamerTag { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        public string Content { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsApproved { get; set; } = true;
    }

    /// <summary>
    /// ۱۱. کدهای تخفیف با درگاه پرداخت آنلاین
    /// </summary>
    public class DiscountCode
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty; // مثلاً "GAMER2026"

        [Required]
        public string DiscountType { get; set; } = "Percent"; // Percent, Fixed

        public decimal Value { get; set; } // درصد یا مقدار ثابت ریالی/تومانی

        public decimal MinOrderAmount { get; set; } = 0; // حداقل مبلغ خرید جهت اعمال کد
        public DateTime ExpiryDate { get; set; }
        public int MaxUsageCount { get; set; } = 100;
        public int UsageCount { get; set; } = 0;
        public bool IsActive { get; set; } = true;
    }

    /// <summary>
    /// ۱۲. تراکنش‌های امتیاز باشگاه مشتریان
    /// </summary>
    public class LoyaltyTransaction
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid UserId { get; set; }
        public virtual User User { get; set; } = null!;

        public int Points { get; set; } // امتیاز دریافتی (مثلاً ۵۰+) یا کسر شده (مثلاً ۲۰۰-)
        
        [Required]
        [MaxLength(250)]
        public string Description { get; set; } = string.Empty; // مثلاً "امتیاز بابت سفارش از کافه" یا "تبدیل به کد تخفیف"

        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
        
        // وضعیت تراکنش: Earned (کسب شده)، Redeemed (خرج شده)
        public string Type { get; set; } = "Earned"; // Earned, Redeemed
    }
}
`;

export const csharpDbContextCode = `using Microsoft.EntityFrameworkCore;
using GameNet.Core.Entities;

namespace GameNet.Infrastructure.Data
{
    public class GameNetDbContext : DbContext
    {
        public GameNetDbContext(DbContextOptions<GameNetDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<GameSystem> GameSystems => Set<GameSystem>();
        public DbSet<Reservation> Reservations => Set<Reservation>();
        public DbSet<CafeItem> CafeItems => Set<CafeItem>();
        public DbSet<CafeOrder> CafeOrders => Set<CafeOrder>();
        public DbSet<CafeOrderItem> CafeOrderItems => Set<CafeOrderItem>();
        public DbSet<Tournament> Tournaments => Set<Tournament>();
        public DbSet<Team> Teams => Set<Team>();
        public DbSet<TeamMember> TeamMembers => Set<TeamMember>();
        public DbSet<Accessory> Accessories => Set<Accessory>();
        public DbSet<AccessoryOrder> AccessoryOrders => Set<AccessoryOrder>();
        public DbSet<AccessoryOrderItem> AccessoryOrderItems => Set<AccessoryOrderItem>();
        public DbSet<Article> Articles => Set<Article>();
        public DbSet<Comment> Comments => Set<Comment>();
        public DbSet<DiscountCode> DiscountCodes => Set<DiscountCode>();
        public DbSet<LoyaltyTransaction> LoyaltyTransactions => Set<LoyaltyTransaction>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ۱. تنظیمات جدول کاربران و ایندکس‌ها
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(u => u.Email).IsUnique();
                entity.HasIndex(u => u.Username).IsUnique();
            });

            // ۲. تنظیمات کدهای تخفیف
            modelBuilder.Entity<DiscountCode>(entity =>
            {
                entity.HasIndex(d => d.Code).IsUnique();
            });

            // ۳. رابطه یک به چند رزرو و کاربر
            modelBuilder.Entity<Reservation>()
                .HasOne(r => r.User)
                .WithMany(u => u.Reservations)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // ۴. رابطه یک به چند رزرو و سیستم بازی
            modelBuilder.Entity<Reservation>()
                .HasOne(r => r.GameSystem)
                .WithMany(s => s.Reservations)
                .HasForeignKey(r => r.GameSystemId)
                .OnDelete(DeleteBehavior.Restrict);

            // ۵. سفارشات کافه و جزئیات آن
            modelBuilder.Entity<CafeOrder>()
                .HasOne(o => o.User)
                .WithMany(u => u.CafeOrders)
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CafeOrderItem>()
                .HasOne(i => i.CafeOrder)
                .WithMany(o => o.OrderItems)
                .HasForeignKey(i => i.CafeOrderId)
                .OnDelete(DeleteBehavior.Cascade);

            // ۶. تورنمنت‌ها و تیم‌ها
            modelBuilder.Entity<Team>()
                .HasOne(t => t.Tournament)
                .WithMany(tr => tr.Teams)
                .HasForeignKey(t => t.TournamentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TeamMember>()
                .HasOne(m => m.Team)
                .WithMany(t => t.Members)
                .HasForeignKey(m => m.TeamId)
                .OnDelete(DeleteBehavior.Cascade);

            // ۷. سفارشات فروشگاه لوازم جانبی
            modelBuilder.Entity<AccessoryOrder>()
                .HasOne(o => o.User)
                .WithMany(u => u.AccessoryOrders)
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<AccessoryOrderItem>()
                .HasOne(i => i.AccessoryOrder)
                .WithMany(o => o.OrderItems)
                .HasForeignKey(i => i.AccessoryOrderId)
                .OnDelete(DeleteBehavior.Cascade);

            // ۸. تراکنش‌های امتیاز باشگاه مشتریان
            modelBuilder.Entity<LoyaltyTransaction>()
                .HasOne(t => t.User)
                .WithMany(u => u.LoyaltyTransactions)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // ۹. مقالات و کامنت‌ها
            modelBuilder.Entity<Comment>()
                .HasOne(c => c.Article)
                .WithMany(a => a.Comments)
                .HasForeignKey(c => c.ArticleId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
`;

export const csharpServiceCode = `using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GameNet.Core.Entities;
using GameNet.Infrastructure.Data;

namespace GameNet.Core.Services
{
    public interface IDiscountService
    {
        Task<(bool IsValid, string Message, decimal DiscountAmount)> ValidateAndCalculateDiscountAsync(string code, decimal totalAmount);
    }

    public interface ILoyaltyService
    {
        Task<int> AwardPointsAsync(Guid userId, decimal amountSpent, string transactionDescription);
        Task<(bool IsSuccess, string Message, DiscountCode? CreatedCode)> RedeemPointsForCouponAsync(Guid userId, int pointsToRedeem);
    }

    /// <summary>
    /// سرویس بررسی و اعمال کدهای تخفیف در پلتفرم گیمنت
    /// </summary>
    public class DiscountService : IDiscountService
    {
        private readonly GameNetDbContext _context;

        public DiscountService(GameNetDbContext context)
        {
            _context = context;
        }

        public async Task<(bool IsValid, string Message, decimal DiscountAmount)> ValidateAndCalculateDiscountAsync(string code, decimal totalAmount)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                return (false, "کد تخفیف معتبر نیست.", 0);
            }

            var discount = await _context.DiscountCodes
                .FirstOrDefaultAsync(d => d.Code.ToUpper() == code.ToUpper() && d.IsActive);

            if (discount == null)
            {
                return (false, "کد تخفیف پیدا نشد یا غیرفعال است.", 0);
            }

            if (discount.ExpiryDate < DateTime.UtcNow)
            {
                return (false, "تاریخ انقضای کد تخفیف به پایان رسیده است.", 0);
            }

            if (discount.UsageCount >= discount.MaxUsageCount)
            {
                return (false, "سقف دفعات استفاده از این کد تخفیف پر شده است.", 0);
            }

            if (totalAmount < discount.MinOrderAmount)
            {
                return (false, $"حداقل مبلغ سفارش برای استفاده از این کد {discount.MinOrderAmount:N0} تومان است.", 0);
            }

            decimal discountAmount = 0;
            if (discount.DiscountType.Equals("Percent", StringComparison.OrdinalIgnoreCase))
            {
                discountAmount = totalAmount * (discount.Value / 100);
            }
            else // Fixed
            {
                discountAmount = discount.Value;
            }

            // تخفیف نمی‌تواند بیشتر از مبلغ فاکتور باشد
            if (discountAmount > totalAmount)
            {
                discountAmount = totalAmount;
            }

            return (true, "کد تخفیف با موفقیت اعمال شد.", discountAmount);
        }
    }

    /// <summary>
    /// سرویس مدیریت امتیاز باشگاه مشتریان و وفاداری
    /// </summary>
    public class LoyaltyService : ILoyaltyService
    {
        private readonly GameNetDbContext _context;

        public LoyaltyService(GameNetDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// به ازای هر ۱۰۰۰ تومان خرید موفق، ۱ امتیاز به کاربر اضافه می‌شود. 
        /// نسبت امتیاز می‌تواند در پارامترها سفارشی‌سازی شود.
        /// </summary>
        public async Task<int> AwardPointsAsync(Guid userId, decimal amountSpent, string transactionDescription)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return 0;

            // فرمول محاسبه امتیاز: هر ۱۰,۰۰۰ تومان = ۱ امتیاز
            int pointsEarned = (int)(amountSpent / 10000);
            if (pointsEarned <= 0) return 0;

            user.LoyaltyPoints += pointsEarned;

            // ثبت تراکنش امتیاز
            var loyaltyTx = new LoyaltyTransaction
            {
                UserId = userId,
                Points = pointsEarned,
                Description = transactionDescription,
                Type = "Earned",
                TransactionDate = DateTime.UtcNow
            };

            _context.LoyaltyTransactions.Add(loyaltyTx);
            await _context.SaveChangesAsync();

            return pointsEarned;
        }

        /// <summary>
        /// تبدیل امتیاز کاربر به کد تخفیف یکبار مصرف.
        /// مثلاً به ازای هر ۱۰۰ امتیاز، یک کد تخفیف ۱۰,۰۰۰ تومانی ایجاد می‌شود.
        /// </summary>
        public async Task<(bool IsSuccess, string Message, DiscountCode? CreatedCode)> RedeemPointsForCouponAsync(Guid userId, int pointsToRedeem)
        {
            if (pointsToRedeem < 100)
            {
                return (false, "حداقل امتیاز برای تبدیل به کد تخفیف، ۱۰۰ امتیاز است.", null);
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return (false, "کاربر یافت نشد.", null);
            }

            if (user.LoyaltyPoints < pointsToRedeem)
            {
                return (false, $"امتیاز شما ({user.LoyaltyPoints}) برای این درخواست کافی نیست.", null);
            }

            // کسر امتیاز از کاربر
            user.LoyaltyPoints -= pointsToRedeem;

            // محاسبه ارزش کد تخفیف (مثلا هر امتیاز = ۱۰۰ تومان)
            decimal discountValue = pointsToRedeem * 100;

            // ایجاد کد تخفیف تصادفی
            string generatedCode = $"LOYAL-{Guid.NewGuid().ToString().Substring(0, 6).ToUpper()}";

            var discountCode = new DiscountCode
            {
                Code = generatedCode,
                DiscountType = "Fixed",
                Value = discountValue,
                MinOrderAmount = discountValue * 1.5m, // حداقل خرید ۱.۵ برابر ارزش تخفیف
                ExpiryDate = DateTime.UtcNow.AddDays(30), // اعتبار ۳۰ روزه
                MaxUsageCount = 1,
                UsageCount = 0,
                IsActive = true
            };

            // ثبت تراکنش در تاریخچه امتیازات
            var loyaltyTx = new LoyaltyTransaction
            {
                UserId = userId,
                Points = -pointsToRedeem,
                Description = $"تبدیل {pointsToRedeem} امتیاز به کد تخفیف {discountValue:N0} تومانی ({generatedCode})",
                Type = "Redeemed",
                TransactionDate = DateTime.UtcNow
            };

            _context.DiscountCodes.Add(discountCode);
            _context.LoyaltyTransactions.Add(loyaltyTx);
            await _context.SaveChangesAsync();

            return (true, $"تبریک! کد تخفیف شما با موفقیت صادر شد: {generatedCode}", discountCode);
        }
    }

    public interface ICafeService
    {
        Task<System.Collections.Generic.IEnumerable<CafeItem>> GetAvailableItemsAsync();
        Task<CafeOrder> PlaceOrderAsync(Guid userId, string tableNumber, System.Collections.Generic.List<(Guid ItemId, int Quantity)> items, string? couponCode);
        Task<bool> UpdateOrderStatusAsync(Guid orderId, string status);
    }

    public interface IShopService
    {
        Task<System.Collections.Generic.IEnumerable<Accessory>> GetInStockAccessoriesAsync();
        Task<AccessoryOrder> PlaceOrderAsync(Guid userId, System.Collections.Generic.List<(Guid AccessoryId, int Quantity)> items, string? couponCode);
        Task<bool> UpdateOrderStatusAsync(Guid orderId, string status);
    }

    public interface IReservationService
    {
        Task<System.Collections.Generic.IEnumerable<GameSystem>> GetSystemsAsync();
        Task<Reservation> CreateReservationAsync(Guid userId, Guid systemId, DateTime startTime, DateTime endTime, string? couponCode);
        Task<bool> CheckInReservationAsync(Guid reservationId);
    }

    /// <summary>
    /// سرویس مدیریت سفارشات بوفه کافه گیم‌نت
    /// </summary>
    public class CafeService : ICafeService
    {
        private readonly GameNetDbContext _context;
        private readonly ILoyaltyService _loyaltyService;
        private readonly IDiscountService _discountService;

        public CafeService(GameNetDbContext context, ILoyaltyService loyaltyService, IDiscountService discountService)
        {
            _context = context;
            _loyaltyService = loyaltyService;
            _discountService = discountService;
        }

        public async Task<System.Collections.Generic.IEnumerable<CafeItem>> GetAvailableItemsAsync()
        {
            return await _context.CafeItems.Where(c => c.IsAvailable && c.InventoryCount > 0).ToListAsync();
        }

        public async Task<CafeOrder> PlaceOrderAsync(Guid userId, string tableNumber, System.Collections.Generic.List<(Guid ItemId, int Quantity)> items, string? couponCode)
        {
            decimal totalPrice = 0;
            var orderItems = new System.Collections.Generic.List<CafeOrderItem>();

            foreach (var item in items)
            {
                var cafeItem = await _context.CafeItems.FindAsync(item.ItemId);
                if (cafeItem == null || cafeItem.InventoryCount < item.Quantity || !cafeItem.IsAvailable)
                {
                    throw new InvalidOperationException($"محصول با شناسه {item.ItemId} ناموجود است یا موجودی کافی ندارد.");
                }

                // کسر از موجودی انبار
                cafeItem.InventoryCount -= item.Quantity;
                totalPrice += cafeItem.Price * item.Quantity;

                orderItems.Add(new CafeOrderItem
                {
                    CafeItemId = item.ItemId,
                    Quantity = item.Quantity,
                    UnitPrice = cafeItem.Price
                });
            }

            decimal finalAmount = totalPrice;
            Guid? discountId = null;

            if (!string.IsNullOrWhiteSpace(couponCode))
            {
                var (isValid, _, discountAmount) = await _discountService.ValidateAndCalculateDiscountAsync(couponCode, totalPrice);
                if (isValid)
                {
                    finalAmount -= discountAmount;
                    var coupon = await _context.DiscountCodes.FirstOrDefaultAsync(d => d.Code == couponCode);
                    if (coupon != null)
                    {
                        discountId = coupon.Id;
                        coupon.UsageCount++;
                    }
                }
            }

            var order = new CafeOrder
            {
                UserId = userId,
                SystemOrTableNumber = tableNumber,
                TotalPrice = totalPrice,
                FinalPaidAmount = finalAmount,
                DiscountCodeId = discountId,
                IsPaid = true,
                Status = "Pending",
                OrderDate = DateTime.UtcNow,
                OrderItems = orderItems
            };

            _context.CafeOrders.Add(order);
            await _context.SaveChangesAsync();

            // تخصیص امتیاز باشگاه وفاداری (مثلاً به ازای هر ۱۰,۰۰۰ تومان خرید، ۱ امتیاز)
            await _loyaltyService.AwardPointsAsync(userId, finalAmount, $"امتیاز بابت سفارش بوفه به شماره میز/سیستم {tableNumber}");

            return order;
        }

        public async Task<bool> UpdateOrderStatusAsync(Guid orderId, string status)
        {
            var order = await _context.CafeOrders.FindAsync(orderId);
            if (order == null) return false;

            order.Status = status;
            await _context.SaveChangesAsync();
            return true;
        }
    }

    /// <summary>
    /// سرویس مدیریت فروشگاه لوازم جانبی گیمینگ
    /// </summary>
    public class ShopService : IShopService
    {
        private readonly GameNetDbContext _context;
        private readonly ILoyaltyService _loyaltyService;
        private readonly IDiscountService _discountService;

        public ShopService(GameNetDbContext context, ILoyaltyService loyaltyService, IDiscountService discountService)
        {
            _context = context;
            _loyaltyService = loyaltyService;
            _discountService = discountService;
        }

        public async Task<System.Collections.Generic.IEnumerable<Accessory>> GetInStockAccessoriesAsync()
        {
            return await _context.Accessories.Where(a => a.StockQuantity > 0).ToListAsync();
        }

        public async Task<AccessoryOrder> PlaceOrderAsync(Guid userId, System.Collections.Generic.List<(Guid AccessoryId, int Quantity)> items, string? couponCode)
        {
            decimal totalPrice = 0;
            var orderItems = new System.Collections.Generic.List<AccessoryOrderItem>();

            foreach (var item in items)
            {
                var acc = await _context.Accessories.FindAsync(item.AccessoryId);
                if (acc == null || acc.StockQuantity < item.Quantity)
                {
                    throw new InvalidOperationException($"کالای {item.AccessoryId} موجودی کافی ندارد.");
                }

                acc.StockQuantity -= item.Quantity;
                totalPrice += acc.Price * item.Quantity;

                orderItems.Add(new AccessoryOrderItem
                {
                    AccessoryId = item.AccessoryId,
                    Quantity = item.Quantity,
                    UnitPrice = acc.Price
                });
            }

            decimal finalAmount = totalPrice;
            Guid? discountId = null;

            if (!string.IsNullOrWhiteSpace(couponCode))
            {
                var (isValid, _, discountAmount) = await _discountService.ValidateAndCalculateDiscountAsync(couponCode, totalPrice);
                if (isValid)
                {
                    finalAmount -= discountAmount;
                    var coupon = await _context.DiscountCodes.FirstOrDefaultAsync(d => d.Code == couponCode);
                    if (coupon != null)
                    {
                        discountId = coupon.Id;
                        coupon.UsageCount++;
                    }
                }
            }

            var order = new AccessoryOrder
            {
                UserId = userId,
                TotalPrice = totalPrice,
                FinalPaidAmount = finalAmount,
                DiscountCodeId = discountId,
                IsPaid = true,
                Status = "Processing",
                OrderDate = DateTime.UtcNow,
                OrderItems = orderItems
            };

            _context.AccessoryOrders.Add(order);
            await _context.SaveChangesAsync();

            await _loyaltyService.AwardPointsAsync(userId, finalAmount, "امتیاز بابت خرید تجهیزات گیمینگ از فروشگاه");

            return order;
        }

        public async Task<bool> UpdateOrderStatusAsync(Guid orderId, string status)
        {
            var order = await _context.AccessoryOrders.FindAsync(orderId);
            if (order == null) return false;

            order.Status = status;
            await _context.SaveChangesAsync();
            return true;
        }
    }

    /// <summary>
    /// سرویس رزرو آنلاین سیستم‌ها و کنسول‌های گیم‌نت
    /// </summary>
    public class ReservationService : IReservationService
    {
        private readonly GameNetDbContext _context;
        private readonly ILoyaltyService _loyaltyService;
        private readonly IDiscountService _discountService;

        public ReservationService(GameNetDbContext context, ILoyaltyService loyaltyService, IDiscountService discountService)
        {
            _context = context;
            _loyaltyService = loyaltyService;
            _discountService = discountService;
        }

        public async Task<System.Collections.Generic.IEnumerable<GameSystem>> GetSystemsAsync()
        {
            return await _context.GameSystems.Where(s => s.IsActive).ToListAsync();
        }

        public async Task<Reservation> CreateReservationAsync(Guid userId, Guid systemId, DateTime startTime, DateTime endTime, string? couponCode)
        {
            var system = await _context.GameSystems.FindAsync(systemId);
            if (system == null || !system.IsActive)
            {
                throw new InvalidOperationException("سیستم انتخاب شده نامعتبر یا غیرفعال است.");
            }

            // بررسی هم‌پوشانی رزروهای قبلی
            var overlap = await _context.Reservations
                .AnyAsync(r => r.GameSystemId == systemId && r.IsPaid && 
                               r.StartTime < endTime && startTime < r.EndTime);

            if (overlap)
            {
                throw new InvalidOperationException("سیستم در زمان انتخاب شده قبلاً رزرو شده است.");
            }

            double hours = (endTime - startTime).TotalHours;
            if (hours <= 0)
            {
                throw new InvalidOperationException("بازه زمانی انتخاب شده نامعتبر است.");
            }

            decimal totalPrice = (decimal)hours * system.HourlyRate;
            decimal finalAmount = totalPrice;
            Guid? discountId = null;

            if (!string.IsNullOrWhiteSpace(couponCode))
            {
                var (isValid, _, discountAmount) = await _discountService.ValidateAndCalculateDiscountAsync(couponCode, totalPrice);
                if (isValid)
                {
                    finalAmount -= discountAmount;
                    var coupon = await _context.DiscountCodes.FirstOrDefaultAsync(d => d.Code == couponCode);
                    if (coupon != null)
                    {
                        discountId = coupon.Id;
                        coupon.UsageCount++;
                    }
                }
            }

            var reservation = new Reservation
            {
                UserId = userId,
                GameSystemId = systemId,
                StartTime = startTime,
                EndTime = endTime,
                TotalPrice = totalPrice,
                FinalPaidAmount = finalAmount,
                DiscountCodeId = discountId,
                IsPaid = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Reservations.Add(reservation);
            await _context.SaveChangesAsync();

            await _loyaltyService.AwardPointsAsync(userId, finalAmount, $"امتیاز بابت رزرو سانس سیستم {system.Name}");

            return reservation;
        }

        public async Task<bool> CheckInReservationAsync(Guid reservationId)
        {
            var res = await _context.Reservations.FindAsync(reservationId);
            if (res == null) return false;

            res.IsPaid = true;
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
`;

export const csharpControllersCode = `using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using GameNet.Core.Entities;
using GameNet.Core.Services;

namespace GameNet.WebAPI.Controllers
{
    /// <summary>
    /// کنترلر مدیریت بوفه و کافه آنلاین گیم‌نت
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class CafeController : ControllerBase
    {
        private readonly ICafeService _cafeService;

        public CafeController(ICafeService cafeService)
        {
            _cafeService = cafeService;
        }

        [HttpGet("items")]
        public async Task<ActionResult<IEnumerable<CafeItem>>> GetAvailableItems()
        {
            try
            {
                var items = await _cafeService.GetAvailableItemsAsync();
                return Ok(items);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = "خطا در دریافت لیست اقلام کافه", Detail = ex.Message });
            }
        }

        [HttpPost("order")]
        public async Task<ActionResult<CafeOrder>> PlaceOrder([FromBody] CafeOrderRequest request)
        {
            try
            {
                if (request == null || request.Items == null || request.Items.Count == 0)
                {
                    return BadRequest(new { Message = "سبد خرید سفارش کافه نمی‌تواند خالی باشد." });
                }

                var order = await _cafeService.PlaceOrderAsync(
                    request.UserId, 
                    request.SystemOrTableNumber, 
                    request.Items, 
                    request.CouponCode
                );

                return Ok(order);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "خطای سرور در ثبت سفارش کافه", Detail = ex.Message });
            }
        }
    }

    /// <summary>
    /// کنترلر مدیریت فروشگاه آنلاین تجهیزات گیمینگ
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class ShopController : ControllerBase
    {
        private readonly IShopService _shopService;

        public ShopController(IShopService shopService)
        {
            _shopService = shopService;
        }

        [HttpGet("accessories")]
        public async Task<ActionResult<IEnumerable<Accessory>>> GetInStockAccessories()
        {
            try
            {
                var items = await _shopService.GetInStockAccessoriesAsync();
                return Ok(items);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = "خطا در دریافت محصولات فروشگاه", Detail = ex.Message });
            }
        }

        [HttpPost("order")]
        public async Task<ActionResult<AccessoryOrder>> PlaceOrder([FromBody] ShopOrderRequest request)
        {
            try
            {
                if (request == null || request.Items == null || request.Items.Count == 0)
                {
                    return BadRequest(new { Message = "سبد خرید فروشگاه نمی‌تواند خالی باشد." });
                }

                var order = await _shopService.PlaceOrderAsync(
                    request.UserId, 
                    request.Items, 
                    request.CouponCode
                );

                return Ok(order);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "خطای سرور در ثبت سفارش فروشگاه", Detail = ex.Message });
            }
        }
    }

    /// <summary>
    /// کنترلر مدیریت رزرو آنلاین سیستم‌ها و کنسول‌ها
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class ReservationController : ControllerBase
    {
        private readonly IReservationService _reservationService;

        public ReservationController(IReservationService reservationService)
        {
            _reservationService = reservationService;
        }

        [HttpGet("systems")]
        public async Task<ActionResult<IEnumerable<GameSystem>>> GetSystems()
        {
            try
            {
                var systems = await _reservationService.GetSystemsAsync();
                return Ok(systems);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = "خطا در دریافت لیست سیستم‌ها", Detail = ex.Message });
            }
        }

        [HttpPost("reserve")]
        public async Task<ActionResult<Reservation>> CreateReservation([FromBody] ReservationRequest request)
        {
            try
            {
                var reservation = await _reservationService.CreateReservationAsync(
                    request.UserId,
                    request.GameSystemId,
                    request.StartTime,
                    request.EndTime,
                    request.CouponCode
                );

                return Ok(reservation);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "خطای سرور در ثبت رزرو", Detail = ex.Message });
            }
        }
    }

    /// <summary>
    /// کنترلر مدیریت باشگاه مشتریان و وفاداری کاربر
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class LoyaltyController : ControllerBase
    {
        private readonly ILoyaltyService _loyaltyService;
        private readonly GameNetDbContext _context;

        public LoyaltyController(ILoyaltyService loyaltyService, GameNetDbContext context)
        {
            _loyaltyService = loyaltyService;
            _context = context;
        }

        [HttpGet("profile/{userId}")]
        public async Task<ActionResult> GetUserProfile(Guid userId)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.LoyaltyTransactions)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    return NotFound(new { Message = "کاربر یافت نشد." });
                }

                return Ok(new
                {
                    user.Id,
                    user.Username,
                    user.Email,
                    user.FullName,
                    user.LoyaltyPoints,
                    user.GamerTag,
                    Transactions = user.LoyaltyTransactions
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "خطا در دریافت پروفایل کاربر", Detail = ex.Message });
            }
        }

        [HttpPost("redeem")]
        public async Task<ActionResult> RedeemPoints([FromBody] RedeemPointsRequest request)
        {
            try
            {
                var (isSuccess, message, createdCode) = await _loyaltyService.RedeemPointsForCouponAsync(request.UserId, request.PointsToRedeem);
                if (!isSuccess)
                {
                    return BadRequest(new { Message = message });
                }

                return Ok(new { Message = message, Coupon = createdCode });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "خطا در تبدیل امتیازات", Detail = ex.Message });
            }
        }
    }

    /// <summary>
    /// کنترلر مدیریت تورنمنت‌های گیم‌نت
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class TournamentController : ControllerBase
    {
        private readonly GameNetDbContext _context;

        public TournamentController(GameNetDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Tournament>>> GetTournaments()
        {
            try
            {
                var tournaments = await _context.Tournaments
                    .Include(t => t.Teams)
                    .ThenInclude(t => t.Members)
                    .ToListAsync();
                return Ok(tournaments);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = "خطا در دریافت لیست تورنمنت‌ها", Detail = ex.Message });
            }
        }

        [HttpPost("register")]
        public async Task<ActionResult> RegisterTeam([FromBody] TournamentRegisterRequest request)
        {
            try
            {
                var tournament = await _context.Tournaments.FindAsync(request.TournamentId);
                if (tournament == null)
                {
                    return NotFound(new { Message = "تورنمنت مورد نظر یافت نشد." });
                }

                var team = new Team
                {
                    TournamentId = request.TournamentId,
                    Name = request.TeamName,
                    LeaderName = request.LeaderName,
                    RegisteredAt = DateTime.UtcNow,
                    Members = new List<TeamMember>()
                };

                foreach (var memberName in request.MemberNames)
                {
                    team.Members.Add(new TeamMember { Name = memberName });
                }

                _context.Teams.Add(team);
                await _context.SaveChangesAsync();

                return Ok(new { Message = "ثبت‌نام تیم با موفقیت انجام شد.", Team = team });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "خطا در ثبت‌نام تورنمنت", Detail = ex.Message });
            }
        }
    }

    /// <summary>
    /// کنترلر اخبار و مقالات گیم‌نت به همراه نظرات کاربران
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class ArticleController : ControllerBase
    {
        private readonly GameNetDbContext _context;

        public ArticleController(GameNetDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Article>>> GetArticles()
        {
            try
            {
                var articles = await _context.Articles
                    .Include(a => a.Comments)
                    .ToListAsync();
                return Ok(articles);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = "خطا در دریافت مقالات", Detail = ex.Message });
            }
        }

        [HttpPost("{articleId}/comment")]
        public async Task<ActionResult> AddComment(Guid articleId, [FromBody] AddCommentRequest request)
        {
            try
            {
                var article = await _context.Articles.FindAsync(articleId);
                if (article == null)
                {
                    return NotFound(new { Message = "مقاله مورد نظر یافت نشد." });
                }

                var comment = new Comment
                {
                    ArticleId = articleId,
                    GamerTag = request.GamerTag,
                    Content = request.Content,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Comments.Add(comment);
                await _context.SaveChangesAsync();

                return Ok(new { Message = "نظر شما با موفقیت ثبت شد.", Comment = comment });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "خطا در ثبت نظر", Detail = ex.Message });
            }
        }
    }

    /// <summary>
    /// کنترلر مدیریت کدهای تخفیف و پروموشن
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class DiscountController : ControllerBase
    {
        private readonly IDiscountService _discountService;

        public DiscountController(IDiscountService discountService)
        {
            _discountService = discountService;
        }

        [HttpGet("validate")]
        public async Task<ActionResult> ValidateCoupon([FromQuery] string code, [FromQuery] decimal totalAmount)
        {
            try
            {
                var (isValid, message, discountAmount) = await _discountService.ValidateAndCalculateDiscountAsync(code, totalAmount);
                if (!isValid)
                {
                    return BadRequest(new { Message = message });
                }

                return Ok(new { IsValid = true, Message = message, DiscountAmount = discountAmount });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "خطا در بررسی کد تخفیف", Detail = ex.Message });
            }
        }
    }

    public class RedeemPointsRequest
    {
        public Guid UserId { get; set; }
        public int PointsToRedeem { get; set; }
    }

    public class TournamentRegisterRequest
    {
        public Guid TournamentId { get; set; }
        public string TeamName { get; set; } = string.Empty;
        public string LeaderName { get; set; } = string.Empty;
        public List<string> MemberNames { get; set; } = new List<string>();
    }

    public class AddCommentRequest
    {
        public string GamerTag { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }

    public class CafeOrderRequest
    {
        public Guid UserId { get; set; }
        public string SystemOrTableNumber { get; set; } = string.Empty;
        public List<(Guid ItemId, int Quantity)> Items { get; set; } = new List<(Guid, int)>();
        public string? CouponCode { get; set; }
    }

    public class ShopOrderRequest
    {
        public Guid UserId { get; set; }
        public List<(Guid AccessoryId, int Quantity)> Items { get; set; } = new List<(Guid, int)>();
        public string? CouponCode { get; set; }
    }

    public class ReservationRequest
    {
        public Guid UserId { get; set; }
        public Guid GameSystemId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string? CouponCode { get; set; }
    }
}
`;

export const csharpSolutionStructureCode = `# ۱. ساختار لایه‌ای پروژه دات‌نت ۹ (GameNet.sln)
# مسیر: /server/GameNet.sln

Microsoft Visual Studio Solution File, Format Version 12.00
# Visual Studio Version 17
VisualStudioVersion = 17.0.31903.59
MinimumVisualStudioVersion = 10.0.40219.1
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "GameNet.Core", "GameNet.Core\\GameNet.Core.csproj", "{E2A5D8A4-9F8C-497B-8BA0-00A9E7F6B0B1}"
EndProject
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "GameNet.Infrastructure", "GameNet.Infrastructure\\GameNet.Infrastructure.csproj", "{A3F9D112-D07E-449B-9830-79AC395A39E1}"
EndProject
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "GameNet.WebAPI", "GameNet.WebAPI\\GameNet.WebAPI.csproj", "{D4E8B560-39A7-4402-B83A-CD160E3A2FE1}"
EndProject
Global
	GlobalSection(SolutionConfigurationPlatforms) = preSolution
		Debug|Any CPU = Debug|Any CPU
		Release|Any CPU = Release|Any CPU
	EndGlobalSection
	GlobalSection(ProjectConfigurationPlatforms) = postSolution
		{E2A5D8A4-9F8C-497B-8BA0-00A9E7F6B0B1}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
		{E2A5D8A4-9F8C-497B-8BA0-00A9E7F6B0B1}.Debug|Any CPU.Build.0 = Debug|Any CPU
		{E2A5D8A4-9F8C-497B-8BA0-00A9E7F6B0B1}.Release|Any CPU.ActiveCfg = Release|Any CPU
		{E2A5D8A4-9F8C-497B-8BA0-00A9E7F6B0B1}.Release|Any CPU.Build.0 = Release|Any CPU
		{A3F9D112-D07E-449B-9830-79AC395A39E1}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
		{A3F9D112-D07E-449B-9830-79AC395A39E1}.Debug|Any CPU.Build.0 = Debug|Any CPU
		{A3F9D112-D07E-449B-9830-79AC395A39E1}.Release|Any CPU.ActiveCfg = Release|Any CPU
		{A3F9D112-D07E-449B-9830-79AC395A39E1}.Release|Any CPU.Build.0 = Release|Any CPU
		{D4E8B560-39A7-4402-B83A-CD160E3A2FE1}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
		{D4E8B560-39A7-4402-B83A-CD160E3A2FE1}.Debug|Any CPU.Build.0 = Debug|Any CPU
		{D4E8B560-39A7-4402-B83A-CD160E3A2FE1}.Release|Any CPU.ActiveCfg = Release|Any CPU
		{D4E8B560-39A7-4402-B83A-CD160E3A2FE1}.Release|Any CPU.Build.0 = Release|Any CPU
	EndGlobalSection
EndGlobal

# =========================================================================
# ۲. پروژه لایه هسته (GameNet.Core.csproj)
# مسیر: /server/GameNet.Core/GameNet.Core.csproj

<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="System.ComponentModel.Annotations" Version="9.0.0" />
  </ItemGroup>
</Project>

# =========================================================================
# ۳. پروژه لایه زیرساخت (GameNet.Infrastructure.csproj)
# مسیر: /server/GameNet.Infrastructure/GameNet.Infrastructure.csproj

<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="9.0.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.InMemory" Version="9.0.0" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\\GameNet.Core\\GameNet.Core.csproj" />
  </ItemGroup>
</Project>

# =========================================================================
# ۴. پروژه لایه وب‌آی‌پی‌آی (GameNet.WebAPI.csproj)
# مسیر: /server/GameNet.WebAPI/GameNet.WebAPI.csproj

<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
    <NoWarn>$(NoWarn);1591</NoWarn>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="9.0.0" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.0" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\\GameNet.Infrastructure\\GameNet.Infrastructure.csproj" />
  </ItemGroup>
</Project>
`;

export const csharpProgramCode = `// ۱. کلاس راه‌اندازی و تزریق وابستگی‌ها (Program.cs)
// مسیر: /server/GameNet.WebAPI/Program.cs

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using GameNet.Infrastructure.Data;
using GameNet.Core.Interfaces;
using GameNet.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// افزودن سرویس‌های کنترلر به کانتینر دات‌نت ۹
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // جلوگیری از چرخه بی‌پایان در روابط دیتابیس (Circular Reference Handling)
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// فعال‌سازی Swagger برای تولید مستندات API هوشمند
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// کانفیگ پایگاه داده (استفاده از دیتابیس درون‌حافظه‌ای برای سهولت اجرا)
builder.Services.AddDbContext<GameNetDbContext>(options =>
    options.UseInMemoryDatabase("GameNetInMemoryDb"));

// ثبت تمامی سرویس‌های مربوط به منطق بیزینس و کلوپ هواداران (Dependency Injection)
builder.Services.AddScoped<IDiscountService, DiscountService>();
builder.Services.AddScoped<ILoyaltyService, LoyaltyService>();
builder.Services.AddScoped<ICafeService, CafeService>();
builder.Services.AddScoped<IShopService, ShopService>();
builder.Services.AddScoped<IReservationService, ReservationService>();

// تنظیم سیاست دسترسی وب‌اپلیکیشن (CORS) برای کلاینت فرانت‌اند
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// تنظیم پایپ‌لاین درخواست‌های HTTP
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "GameNet API v1");
    });
}

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

// اجرای فرآیند سِید کردن داده‌های پیش‌فرض بوفه، سیستم‌ها، مقالات و تورنمنت‌ها
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<GameNetDbContext>();
    GameNetDbInitializer.Seed(context);
}

app.Run();


// =========================================================================
// ۲. فایل تنظیمات پروژه (appsettings.json)
// مسیر: /server/GameNet.WebAPI/appsettings.json

{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
`;

