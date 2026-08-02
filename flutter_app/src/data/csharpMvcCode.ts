// ASP.NET Core MVC Source Codes for Client side presentation

export const csharpMvcStructureCode = `========================================================================
PROJECT STRUCTURE: GameNet.MVC (ASP.NET Core 9.0 MVC Web App)
========================================================================

GameNet/
├── GameNet.sln
├── GameNet.Core/                      <-- Shared domain entities, repository interfaces
├── GameNet.Infrastructure/            <-- Database Context (EF Core In-Memory/SQL), service layers
├── GameNet.WebAPI/                    <-- Backend Controllers serving RESTful endpoints
└── GameNet.MVC/                       <-- MVC Client application replacing React frontend (NEW)
    ├── GameNet.MVC.csproj
    ├── appsettings.json
    ├── Program.cs                     <-- MVC application setup, middleware and routing configuration
    ├── Controllers/                   <-- Page request controllers mapping action methods to views
    │   ├── HomeController.cs          <-- Main dashboard, recent events and announcements
    │   ├── ReservationController.cs   <-- Booking game systems with custom sliders and promo verification
    │   ├── CafeController.cs          <-- Interactive buffet menu with session cart and checkout
    │   ├── ShopController.cs          <-- Accessories shop catalog, cart and orders placement
    │   ├── LoyaltyController.cs       <-- Customer loyalty center, transactional logs, point exchange
    │   └── BlogController.cs          <-- Gaming blog posts, custom comments section
    ├── Models/
    │   └── ViewModels.cs              <-- Clean Data Transfer ViewModels passed directly into Razor views
    ├── Views/
    │   ├── _ViewImports.cshtml        <-- Imports standard ASP.NET Tag Helpers & models namespace
    │   ├── _ViewStart.cshtml          <-- Sets default Layout path to _Layout.cshtml
    │   ├── Shared/
    │   │   └── _Layout.cshtml         <-- Master cyberpunk dark-themed layout with Tailwind CSS CDN
    │   ├── Home/
    │   │   └── Index.cshtml           <-- Homepage with overview cards, hero banner, quick navigate
    │   ├── Reservation/
    │   │   └── Index.cshtml           <-- Interactive booking page with duration slider & bill calculator
    │   ├── Cafe/
    │   │   └── Index.cshtml           <-- Buffet interface with menu filter, cart sidebar, checkout
    │   ├── Shop/
    │   │   └── Index.cshtml           <-- Accessories shop catalog with item cards & checkout
    │   ├── Loyalty/
    │   │   └── Index.cshtml           <-- User customer profile card, transactional history, exchange offers
    │   └── Blog/
    │       ├── Index.cshtml           <-- Blog list view (Cards list with category filtering)
    │       └── Details.cshtml         <-- Article reader view with comments thread & submit box
    └── wwwroot/                       <-- Static web files (favicon, system images, custom JS/CSS)`;

export const csharpMvcProgramCode = `using Microsoft.EntityFrameworkCore;
using GameNet.Infrastructure.Data;
using GameNet.Core.Interfaces;
using GameNet.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Add MVC Controllers & Razor Views services to container
builder.Services.AddControllersWithViews();

// 2. Register In-Memory DbContext (allows complete offline system execution in VS Code)
builder.Services.AddDbContext<GameNetDbContext>(options =>
    options.UseInMemoryDatabase("GameNetDb"));

// 3. Register Business Domain Services (Dependency Injection)
builder.Services.AddScoped<ICafeService, CafeService>();
builder.Services.AddScoped<IShopService, ShopService>();
builder.Services.AddScoped<IReservationService, ReservationService>();
builder.Services.AddScoped<ILoyaltyService, LoyaltyService>();
builder.Services.AddScoped<IDiscountService, DiscountService>();

// 4. Enable Session state for shopping carts (Cafe and Shop Carts)
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.HttpOnly = true;
    options.IsEssential = true;
});

var app = builder.Build();

// 5. Run Database Seeding initializer
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<GameNetDbContext>();
    GameNetDbInitializer.Initialize(context);
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

// 6. Use Session state middleware
app.UseSession();
app.UseAuthorization();

// 7. Map default MVC path routing pattern (HomeController -> Index action)
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();`;

export const csharpMvcViewModelsCode = `using System.Collections.Generic;
using GameNet.Core.Entities;

namespace GameNet.MVC.Models
{
    // Home Dashboard ViewModel
    public class HomeViewModel
    {
        public List<Tournament> ActiveTournaments { get; set; } = new();
        public List<Article> RecentArticles { get; set; } = new();
        public int TotalActiveSystemsCount { get; set; }
        public int AvailableSystemsCount { get; set; }
        public string Username { get; set; } = "Sina_ProGamer";
        public int UserPoints { get; set; } = 320;
    }

    // Reservation View Model
    public class ReservationViewModel
    {
        public List<GameSystem> Systems { get; set; } = new();
        public List<DiscountCode> ActiveCoupons { get; set; } = new();
        public int SelectedSystemId { get; set; }
        public int ReservationHours { get; set; } = 2;
        public string? AppliedCouponCode { get; set; }
        public decimal DiscountPercent { get; set; }
        public string GamerTag { get; set; } = "Sina_ProGamer";
    }

    // Cafe View Model
    public class CafeViewModel
    {
        public List<CafeItem> CafeItems { get; set; } = new();
        public string SelectedCategory { get; set; } = "All";
        public List<CafeCartItem> Cart { get; set; } = new();
        public List<DiscountCode> ActiveCoupons { get; set; } = new();
        public string? AppliedCouponCode { get; set; }
        public decimal DiscountPercent { get; set; }
        public int SystemOrTableNumber { get; set; } = 5;
    }

    public class CafeCartItem
    {
        public CafeItem Item { get; set; } = null!;
        public int Quantity { get; set; }
    }

    // Shop View Model
    public class ShopViewModel
    {
        public List<Accessory> Accessories { get; set; } = new();
        public string SelectedCategory { get; set; } = "All";
        public List<ShopCartItem> Cart { get; set; } = new();
        public string? AppliedCouponCode { get; set; }
        public decimal DiscountPercent { get; set; }
    }

    public class ShopCartItem
    {
        public Accessory Accessory { get; set; } = null!;
        public int Quantity { get; set; }
    }

    // Loyalty Profile View Model
    public class LoyaltyViewModel
    {
        public string Username { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public int LoyaltyPoints { get; set; }
        public List<LoyaltyTransaction> Transactions { get; set; } = new();
        public List<DiscountCode> ActiveCoupons { get; set; } = new();
        public List<LoyaltyOffer> AvailableOffers { get; set; } = new();
    }

    public class LoyaltyOffer
    {
        public int CostInPoints { get; set; }
        public string Title { get; set; } = null!;
        public string CouponCode { get; set; } = null!;
        public int ValueAmount { get; set; }
    }

    // Blog View Model
    public class BlogViewModel
    {
        public List<Article> Articles { get; set; } = new();
        public string SelectedCategory { get; set; } = "All";
        public Article? CurrentArticle { get; set; }
    }
}`;

export const csharpMvcControllersCode = `using Microsoft.AspNetCore.Mvc;
using GameNet.MVC.Models;
using GameNet.Core.Interfaces;
using GameNet.Core.Entities;
using System.Text.Json;

namespace GameNet.MVC.Controllers
{
    // ==========================================
    // 1. HOME CONTROLLER
    // ==========================================
    public class HomeController : Controller
    {
        private readonly IReservationService _reservationService;

        public HomeController(IReservationService reservationService)
        {
            _reservationService = reservationService;
        }

        public IActionResult Index()
        {
            var systems = _reservationService.GetAllSystems();
            var model = new HomeViewModel
            {
                TotalActiveSystemsCount = systems.Count,
                AvailableSystemsCount = systems.Count(s => !s.IsReserved)
            };
            return View(model);
        }
    }

    // ==========================================
    // 2. RESERVATION CONTROLLER
    // ==========================================
    public class ReservationController : Controller
    {
        private readonly IReservationService _reservationService;
        private readonly IDiscountService _discountService;
        private readonly ILoyaltyService _loyaltyService;

        public ReservationController(IReservationService r, IDiscountService d, ILoyaltyService l)
        {
            _reservationService = r;
            _discountService = d;
            _loyaltyService = l;
        }

        [HttpGet]
        public IActionResult Index(string? couponCode = null)
        {
            var systems = _reservationService.GetAllSystems();
            var model = new ReservationViewModel { Systems = systems, AppliedCouponCode = couponCode };

            if (!string.IsNullOrEmpty(couponCode))
            {
                var promo = _discountService.GetDiscountByCode(couponCode);
                if (promo != null && promo.IsActive)
                {
                    model.DiscountPercent = promo.Type == "Percent" ? promo.Value : 15;
                    TempData["SuccessMessage"] = "کد تخفیف با موفقیت بررسی شد.";
                }
                else TempData["ErrorMessage"] = "کد تخفیف معتبر نیست.";
            }
            return View(model);
        }

        [HttpPost]
        public IActionResult Book(int systemId, int hours, string? couponCode)
        {
            var system = _reservationService.GetSystemById(systemId);
            if (system == null || system.IsReserved)
            {
                TempData["ErrorMessage"] = "سیستم مشغول است یا یافت نشد.";
                return RedirectToAction(nameof(Index));
            }

            decimal cost = system.HourlyRate * hours;
            if (!string.IsNullOrEmpty(couponCode))
            {
                var discount = _discountService.GetDiscountByCode(couponCode);
                if (discount != null) cost -= (cost * (discount.Value / 100));
            }

            var res = _reservationService.CreateReservation(new Reservation {
                SystemId = systemId, GamerTag = "Sina_ProGamer", DurationHours = hours,
                OriginalAmount = system.HourlyRate * hours, FinalAmount = cost, StartTime = DateTime.Now
            });

            if (res != null) {
                _loyaltyService.AddTransaction(new LoyaltyTransaction {
                    Points = (int)(cost / 1000), Description = $"رزرو سیستم {system.Name}", Type = "Earned", Date = DateTime.Now.ToString()
                });
                TempData["SuccessMessage"] = $"سیستم رزرو شد! مبلغ نهایی: {cost:N0} تومان.";
            }
            return RedirectToAction(nameof(Index));
        }
    }

    // ==========================================
    // 3. CAFE CONTROLLER
    // ==========================================
    public class CafeController : Controller
    {
        private readonly ICafeService _cafeService;
        private readonly IDiscountService _discountService;
        private readonly ILoyaltyService _loyaltyService;

        public CafeController(ICafeService c, IDiscountService d, ILoyaltyService l)
        {
            _cafeService = c; _discountService = d; _loyaltyService = l;
        }

        private List<CafeCartItem> GetCart() {
            var js = HttpContext.Session.GetString("CafeCart");
            return string.IsNullOrEmpty(js) ? new() : JsonSerializer.Deserialize<List<CafeCartItem>>(js)!;
        }

        public IActionResult Index(string category = "All", string? couponCode = null)
        {
            var items = _cafeService.GetAvailableItems();
            if (category != "All") items = items.Where(i => i.Category == category).ToList();

            var model = new CafeViewModel { CafeItems = items, SelectedCategory = category, Cart = GetCart(), AppliedCouponCode = couponCode };
            if (!string.IsNullOrEmpty(couponCode)) {
                var promo = _discountService.GetDiscountByCode(couponCode);
                if (promo != null) model.DiscountPercent = promo.Value;
            }
            return View(model);
        }

        [HttpPost]
        public IActionResult AddToCart(int itemId, string category) {
            var item = _cafeService.GetItemById(itemId);
            if (item != null) {
                var cart = GetCart();
                var match = cart.FirstOrDefault(c => c.Item.Id == itemId);
                if (match != null) match.Quantity++;
                else cart.Add(new CafeCartItem { Item = item, Quantity = 1 });
                HttpContext.Session.SetString("CafeCart", JsonSerializer.Serialize(cart));
            }
            return RedirectToAction(nameof(Index), new { category });
        }
    }
}`;

export const csharpMvcLayoutCode = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>@ViewData["Title"] - BAZINO</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: { primary: '#06B6D4', accentPurp: '#A855F7', darkBg: '#0B0C10', darkCard: '#12141C' }
                }
            }
        }
    </script>
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="min-h-screen bg-darkBg text-gray-100 flex flex-col font-sans">
    
    <!-- Navbar -->
    <header class="border-b border-white/10 bg-darkBg/90 backdrop-blur sticky top-0 z-40 px-6 py-4 flex justify-between items-center">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-black">
                <i data-lucide="monitor" class="w-5 h-5"></i>
            </div>
            <div>
                <h1 class="text-xl font-black text-white tracking-tight">BAZINO MVC</h1>
                <p class="text-[10px] text-gray-400">کلاینت بومی طراحی شده با معماری MVC دات‌نت</p>
            </div>
        </div>
        <div class="flex items-center gap-2 bg-white/5 p-2 rounded-xl">
            <span class="text-xs text-primary font-bold">@("@")Sina_ProGamer (320 امتیاز)</span>
        </div>
    </header>

    <!-- Navigation Tabs -->
    <nav class="bg-[#0a0e21] border-b border-white/5 px-6 py-3 flex gap-2 overflow-x-auto">
        <a asp-controller="Home" asp-action="Index" class="px-4 py-2 rounded-lg text-xs font-bold bg-primary text-black">داشبورد</a>
        <a asp-controller="Reservation" asp-action="Index" class="px-4 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-white">رزرو سیستم</a>
        <a asp-controller="Cafe" asp-action="Index" class="px-4 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-white">کافه بوفه</a>
        <a asp-controller="Shop" asp-action="Index" class="px-4 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-white">فروشگاه</a>
        <a asp-controller="Loyalty" asp-action="Index" class="px-4 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-white">باشگاه مشتریان</a>
    </nav>

    <!-- Content Stage -->
    <main class="flex-1 p-6 md:p-8">
        <div class="max-w-7xl mx-auto">
            @RenderBody()
        </div>
    </main>

    <footer class="border-t border-white/10 py-6 text-center text-xs text-gray-500">
        <p>© ۱۴۰۵ پلتفرم یکپارچه گیم‌نت BAZINO MVC. طراحی شده بر پایه Razor Engine.</p>
    </footer>

    <script>lucide.createIcons();</script>
</body>
</html>`;

export const csharpMvcViewsCode = `@model CafeViewModel
@{
    ViewData["Title"] = "کافه و بوفه آنلاین";
    decimal total = Model.Cart.Sum(c => c.Item.Price * c.Quantity);
    decimal discount = total * (Model.DiscountPercent / 100);
}

<div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
    
    <!-- Foods & Drinks Catalog Grid -->
    <div class="lg:col-span-8 space-y-6">
        <h3 class="text-lg font-black text-white">منوی خوراکی‌ها و نوشیدنی‌های بوفه</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            @foreach (var item in Model.CafeItems) {
                <div class="bg-darkCard border border-white/5 rounded-2xl overflow-hidden flex flex-col justify-between">
                    <img src="@item.ImageUrl" class="h-40 w-full object-cover" />
                    <div class="p-4 space-y-2">
                        <h4 class="text-sm font-bold text-white">@item.Name</h4>
                        <span class="text-xs text-primary font-bold">@item.Price.ToString("N0") تومان</span>
                    </div>
                    <div class="p-4 border-t border-white/5">
                        <form asp-action="AddToCart" method="post">
                            <input type="hidden" name="itemId" value="@item.Id" />
                            <input type="hidden" name="category" value="@Model.SelectedCategory" />
                            <button type="submit" class="w-full py-2 bg-primary hover:bg-cyan-400 text-black rounded-lg text-xs font-bold">افزودن به سبد سفارش</button>
                        </form>
                    </div>
                </div>
            }
        </div>
    </div>

    <!-- Live Checkout Shopping Cart -->
    <div class="lg:col-span-4 bg-darkCard border border-white/5 p-6 rounded-2xl space-y-4 h-fit">
        <h3 class="text-sm font-black text-white border-b border-white/5 pb-2">فاکتور سفارشات جاری</h3>
        
        @if(!Model.Cart.Any()) {
            <p class="text-xs text-gray-500 text-center py-6">سبد سفارشات بوفه در حال حاضر خالی است.</p>
        } else {
            @foreach(var c in Model.Cart) {
                <div class="flex justify-between text-xs py-2 border-b border-white/5">
                    <span class="text-gray-300">@c.Item.Name (x@c.Quantity)</span>
                    <span class="text-white font-bold">@((c.Item.Price * c.Quantity).ToString("N0")) ت</span>
                </div>
            }
            <div class="bg-black/30 p-3 rounded-lg text-xs space-y-1">
                <div class="flex justify-between"><span>جمع فاکتور:</span><span>@total.ToString("N0") ت</span></div>
                <div class="flex justify-between text-accentPurp"><span>تخفیف:</span><span>@Model.DiscountPercent٪</span></div>
                <hr class="border-white/5 my-1" />
                <div class="flex justify-between text-primary font-bold"><span>قابل پرداخت:</span><span>@((total - discount).ToString("N0")) ت</span></div>
            </div>
            
            <form asp-action="Checkout" method="post" class="space-y-3">
                <input type="number" name="tableNumber" required value="5" class="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white" placeholder="شماره میز/سیستم" />
                <button type="submit" class="w-full py-2.5 bg-primary text-black font-bold text-xs rounded-lg">ثبت نهایی سفارش بوفه</button>
            </form>
        }
    </div>
</div>`;
