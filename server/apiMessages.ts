/**
 * پیام‌های خطا/موفقیت API به چهار زبان.
 *
 * چرا: کلاینت متن `error` را مستقیماً به کاربر نشان می‌دهد؛ تا پیش از این همهٔ
 * متن‌ها فارسی بودند و کاربر روسی/ترکی/انگلیسی یک پیام ناخوانا می‌دید.
 * زبان درخواست از هدر `X-Lang` (که اینترسپتور fetch کلاینت از انتخاب کاربر
 * می‌فرستد) و در نبود آن از `Accept-Language` خوانده می‌شود. پاسخ‌ها علاوه بر
 * متن ترجمه‌شده، `code` هم برمی‌گردانند تا کلاینت‌های دیگر (اپ فلاتر) بتوانند
 * خودشان ترجمه کنند.
 */
import type { Request } from 'express';

export type ApiLang = 'fa' | 'en' | 'ru' | 'tr';
type Msg = Record<ApiLang, string>;

export function requestLang(req: Request): ApiLang {
  const x = String(req.headers['x-lang'] || '').toLowerCase();
  if (x === 'fa' || x === 'en' || x === 'ru' || x === 'tr') return x;
  const accept = String(req.headers['accept-language'] || '').toLowerCase();
  const first = accept.split(',')[0]?.trim().slice(0, 2);
  if (first === 'en' || first === 'ru' || first === 'tr') return first;
  return 'fa';
}

export const M = {
  AUTH_REQUIRED: { fa: 'برای این عملیات باید وارد حساب کاربری خود شوید.', en: 'You must be signed in to do this.', ru: 'Для этого действия нужно войти в аккаунт.', tr: 'Bu işlem için giriş yapmalısınız.' },
  ADMIN_LOGIN_REQUIRED: { fa: 'برای دسترسی به این بخش باید با حساب مدیر وارد شوید.', en: 'Sign in with an admin account to access this section.', ru: 'Для доступа к этому разделу войдите как администратор.', tr: 'Bu bölüme erişmek için yönetici hesabıyla giriş yapın.' },
  ADMIN_ONLY: { fa: 'این عملیات فقط برای مدیر سیستم مجاز است.', en: 'Only the system administrator may perform this action.', ru: 'Это действие доступно только администратору.', tr: 'Bu işlem yalnızca sistem yöneticisine açıktır.' },
  FILL_REQUIRED_FIELDS: { fa: 'لطفاً تمامی فیلدهای ضروری را پر کنید.', en: 'Please fill in all required fields.', ru: 'Заполните все обязательные поля.', tr: 'Lütfen tüm zorunlu alanları doldurun.' },
  USERNAME_TAKEN: { fa: 'این نام کاربری قبلاً توسط گیمر دیگری ثبت شده است.', en: 'This username is already taken by another gamer.', ru: 'Это имя пользователя уже занято другим игроком.', tr: 'Bu kullanıcı adı başka bir oyuncu tarafından alınmış.' },
  ENTER_CREDENTIALS: { fa: 'لطفاً نام کاربری و کلمه عبور را وارد کنید.', en: 'Please enter your username and password.', ru: 'Введите имя пользователя и пароль.', tr: 'Lütfen kullanıcı adı ve şifrenizi girin.' },
  BAD_CREDENTIALS: { fa: 'نام کاربری یا کلمه عبور اشتباه است.', en: 'Incorrect username or password.', ru: 'Неверное имя пользователя или пароль.', tr: 'Kullanıcı adı veya şifre hatalı.' },
  TOKEN_INVALID: { fa: 'توکن نامعتبر یا منقضی شده است.', en: 'Invalid or expired token.', ru: 'Недействительный или просроченный токен.', tr: 'Geçersiz veya süresi dolmuş oturum.' },
  USER_NOT_FOUND: { fa: 'کاربر یافت نشد.', en: 'User not found.', ru: 'Пользователь не найден.', tr: 'Kullanıcı bulunamadı.' },
  ROOM_NAME_REQUIRED: { fa: 'نام اتاق گفتگو الزامی است.', en: 'Chat room name is required.', ru: 'Укажите название чат-комнаты.', tr: 'Sohbet odası adı zorunludur.' },
  MESSAGE_INCOMPLETE: { fa: 'اطلاعات پیام ناقص است.', en: 'Message data is incomplete.', ru: 'Данные сообщения неполные.', tr: 'Mesaj bilgileri eksik.' },
  MIN_REDEEM_POINTS: { fa: 'حداقل امتیاز قابل تبدیل {min} امتیاز است.', en: 'The minimum redeemable amount is {min} points.', ru: 'Минимум для обмена — {min} баллов.', tr: 'Dönüştürülebilecek en az puan {min} puandır.' },
  NOT_ENOUGH_POINTS: { fa: 'امتیاز کافی ندارید', en: 'You do not have enough points.', ru: 'Недостаточно баллов.', tr: 'Yeterli puanınız yok.' },
  COUPON_GENERATION_FAILED: { fa: 'تولید کد تخفیف ناموفق بود. دوباره تلاش کنید.', en: 'Failed to generate the discount code. Please try again.', ru: 'Не удалось создать промокод. Попробуйте ещё раз.', tr: 'İndirim kodu oluşturulamadı. Lütfen tekrar deneyin.' },
  SLOT_TAKEN: { fa: 'این سیستم در بازه زمانی انتخابی شما قبلاً رزرو شده است. لطفاً بازه دیگری انتخاب کنید.', en: 'This system is already booked for the selected time. Please choose another slot.', ru: 'Эта система уже забронирована на выбранное время. Выберите другой интервал.', tr: 'Bu sistem seçtiğiniz saat aralığında zaten rezerve edilmiş. Lütfen başka bir aralık seçin.' },
  COUPON_RACE: { fa: 'این کد تخفیف هم‌زمان توسط درخواست دیگری مصرف شد. لطفاً دوباره تلاش کنید.', en: 'This discount code was just used by another request. Please try again.', ru: 'Этот промокод только что использован другим запросом. Попробуйте ещё раз.', tr: 'Bu indirim kodu az önce başka bir istekte kullanıldı. Lütfen tekrar deneyin.' },
  EXTEND_LOGIN_REQUIRED: { fa: 'برای تمدید رزرو باید وارد حساب کاربری خود شوید.', en: 'Sign in to extend your reservation.', ru: 'Войдите, чтобы продлить бронь.', tr: 'Rezervasyonu uzatmak için giriş yapın.' },
  NO_ACTIVE_RESERVATION: { fa: 'در حال حاضر هیچ رزرو فعالی برای شما یافت نشد.', en: 'You have no active reservation right now.', ru: 'Сейчас у вас нет активной брони.', tr: 'Şu anda aktif bir rezervasyonunuz yok.' },
  EXTEND_NOT_ENOUGH_POINTS: { fa: 'امتیاز باشگاه کافی نیست. تمدید {hours} ساعت به {points} امتیاز نیاز دارد.', en: 'Not enough club points. Extending {hours} hour(s) requires {points} points.', ru: 'Недостаточно баллов клуба. Продление на {hours} ч требует {points} баллов.', tr: 'Kulüp puanı yetersiz. {hours} saat uzatma için {points} puan gerekir.' },
  EXTEND_SLOT_TAKEN: { fa: 'بلافاصله بعد از پایان رزرو فعلی شما، این سیستم برای کاربر دیگری رزرو شده است.', en: 'This system is booked by another user right after your current reservation ends.', ru: 'Сразу после вашей брони эта система занята другим пользователем.', tr: 'Mevcut rezervasyonunuz biter bitmez bu sistem başka bir kullanıcı için ayrılmış.' },
  PROMPT_EMPTY: { fa: 'متن درخواست نمی‌تواند خالی باشد.', en: 'The request text cannot be empty.', ru: 'Текст запроса не может быть пустым.', tr: 'İstek metni boş olamaz.' },
  COMMAND_EMPTY: { fa: 'دستور نمی‌تواند خالی باشد.', en: 'The command cannot be empty.', ru: 'Команда не может быть пустой.', tr: 'Komut boş olamaz.' },
  RESERVATION_FINALIZED: { fa: 'رزرو {id} در سایت ثبت نهایی شد.', en: 'Reservation {id} has been finalized on the site.', ru: 'Бронь {id} окончательно подтверждена на сайте.', tr: '{id} rezervasyonu sitede kesinleştirildi.' },
  INVALID_STATUS: { fa: 'وضعیت نامعتبر', en: 'Invalid status', ru: 'Недопустимый статус', tr: 'Geçersiz durum' },
  CART_EMPTY: { fa: 'سبد خرید خالی است.', en: 'Your cart is empty.', ru: 'Корзина пуста.', tr: 'Sepetiniz boş.' },
  MENU_ITEM_NOT_FOUND: { fa: 'آیتم منو یافت نشد: {id}', en: 'Menu item not found: {id}', ru: 'Позиция меню не найдена: {id}', tr: 'Menü öğesi bulunamadı: {id}' },
  PRODUCT_NOT_FOUND: { fa: 'کالا یافت نشد: {id}', en: 'Product not found: {id}', ru: 'Товар не найден: {id}', tr: 'Ürün bulunamadı: {id}' },
  OUT_OF_STOCK: { fa: 'موجودی «{name}» کافی نیست.', en: 'Not enough stock for “{name}”.', ru: 'Недостаточно «{name}» на складе.', tr: '“{name}” için yeterli stok yok.' },
  DUPLICATE_RECORD: { fa: 'رکوردی با همین شناسه از قبل وجود دارد. دوباره تلاش کنید.', en: 'A record with this ID already exists. Please try again.', ru: 'Запись с таким ID уже существует. Попробуйте ещё раз.', tr: 'Bu kimliğe sahip bir kayıt zaten var. Lütfen tekrar deneyin.' },
  REQUIRED_FIELD_EMPTY: { fa: 'یکی از فیلدهای الزامی خالی است.', en: 'One of the required fields is empty.', ru: 'Одно из обязательных полей не заполнено.', tr: 'Zorunlu alanlardan biri boş.' },
  DB_WRITE_FAILED: { fa: 'ثبت اطلاعات در پایگاه داده انجام نشد. جزئیات در لاگ سرور ثبت شد.', en: 'Could not save to the database. Details were written to the server log.', ru: 'Не удалось сохранить в базу данных. Подробности в логе сервера.', tr: 'Veritabanına kaydedilemedi. Ayrıntılar sunucu günlüğüne yazıldı.' },
  ZIP_MISSING: { fa: 'فایل ZIP ارسال نشده است', en: 'No ZIP file was uploaded.', ru: 'ZIP-файл не загружен.', tr: 'ZIP dosyası gönderilmedi.' },
  THEME_INCOMPLETE: { fa: 'اطلاعات تم ناقص است.', en: 'Theme data is incomplete.', ru: 'Данные темы неполные.', tr: 'Tema bilgileri eksik.' },
  THEME_NOT_FOUND: { fa: 'تم یافت نشد.', en: 'Theme not found.', ru: 'Тема не найдена.', tr: 'Tema bulunamadı.' },
  SLIDE_FIELDS_REQUIRED: { fa: 'آدرس تصویر و بخش هدف الزامی هستند.', en: 'Image URL and target section are required.', ru: 'Укажите URL изображения и целевой раздел.', tr: 'Görsel adresi ve hedef bölüm zorunludur.' },
  SLIDE_NOT_FOUND: { fa: 'اسلاید پیدا نشد.', en: 'Slide not found.', ru: 'Слайд не найден.', tr: 'Slayt bulunamadı.' },
  APK_NOT_UPLOADED: { fa: 'فایل APK هنوز توسط مدیر آپلود نشده است.', en: 'The APK file has not been uploaded by the admin yet.', ru: 'Администратор ещё не загрузил APK-файл.', tr: 'APK dosyası henüz yönetici tarafından yüklenmedi.' },
  APK_DOWNLOAD_FAILED: { fa: 'خطا در دانلود فایل APK', en: 'Failed to download the APK file.', ru: 'Ошибка загрузки APK-файла.', tr: 'APK dosyası indirilemedi.' },
  QR_FAILED: { fa: 'خطا در ساخت QR Code دانلود اپلیکیشن', en: 'Failed to generate the app download QR code.', ru: 'Не удалось создать QR-код для загрузки приложения.', tr: 'Uygulama indirme QR kodu oluşturulamadı.' },
  SAMPLE_LOADED: { fa: 'دیتای نمونه با موفقیت بارگذاری شد.', en: 'Sample data loaded successfully.', ru: 'Образцы данных успешно загружены.', tr: 'Örnek veriler başarıyla yüklendi.' },
  SAMPLE_REMOVED: { fa: 'دیتای نمونه با موفقیت حذف شد.', en: 'Sample data removed successfully.', ru: 'Образцы данных успешно удалены.', tr: 'Örnek veriler başarıyla silindi.' },
  ADMIN_ACCOUNT_REQUIRED: { fa: 'اطلاعات حساب مدیر کل الزامی است.', en: 'Super-admin account details are required.', ru: 'Укажите данные учётной записи главного администратора.', tr: 'Baş yönetici hesap bilgileri zorunludur.' },
  INSTALL_OK: { fa: 'نصب با موفقیت انجام شد.', en: 'Installation completed successfully.', ru: 'Установка успешно завершена.', tr: 'Kurulum başarıyla tamamlandı.' },
  INSTALL_FAILED: { fa: 'خطا در فرآیند نصب: {detail}', en: 'Installation failed: {detail}', ru: 'Ошибка установки: {detail}', tr: 'Kurulum hatası: {detail}' },
  INVALID_PLATFORM: { fa: 'پلتفرم نامعتبر است', en: 'Invalid platform.', ru: 'Недопустимая платформа.', tr: 'Geçersiz platform.' },
  DESKTOP_NOT_BUILT: { fa: 'نسخه‌ی دسکتاپ برای {platform} هنوز build نشده است.', en: 'The desktop build for {platform} has not been produced yet.', ru: 'Десктоп-сборка для {platform} ещё не собрана.', tr: '{platform} için masaüstü sürümü henüz derlenmedi.' },
  DESKTOP_FILE_NOT_FOUND: { fa: 'فایلی برای {platform} پیدا نشد.', en: 'No file found for {platform}.', ru: 'Файл для {platform} не найден.', tr: '{platform} için dosya bulunamadı.' },
  FILE_DOWNLOAD_FAILED: { fa: 'خطا در دانلود فایل', en: 'Failed to download the file.', ru: 'Ошибка загрузки файла.', tr: 'Dosya indirilemedi.' },
} satisfies Record<string, Msg>;

export type ApiMessageKey = keyof typeof M;

export function apiMessage(lang: ApiLang, key: ApiMessageKey, vars: Record<string, string | number> = {}): string {
  let s: string = M[key][lang] ?? M[key].fa;
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** متن ترجمه‌شده برای همین درخواست. */
export function t(req: Request, key: ApiMessageKey, vars?: Record<string, string | number>): string {
  return apiMessage(requestLang(req), key, vars);
}

/** بدنهٔ خطای استاندارد: متن ترجمه‌شده + کد ماشین‌خوان. */
export function apiError(req: Request, key: ApiMessageKey, vars?: Record<string, string | number>) {
  return { error: t(req, key, vars), code: key };
}
