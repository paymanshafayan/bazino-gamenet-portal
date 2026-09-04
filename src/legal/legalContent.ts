/**
 * متن‌های قانونی پیش‌فرض (fa/en/ru/tr). مدیر می‌تواند هر صفحه را از پنل با کلید
 * `legal_<slug>_<lang>` در تنظیمات سایت بازنویسی کند؛ در غیر این صورت این متن‌ها
 * با جای‌گذاری {{company}}, {{address}}, {{email}}, {{phone}}, {{taxNo}}, {{site}} نمایش داده می‌شوند.
 *
 * ⚠️ این متن‌ها پیش‌نویس عمومی بر اساس الزامات رایج سانال‌پوز ترکیه هستند و توصیهٔ حقوقی
 * نیستند؛ پیش از انتشار باید توسط مشاور حقوقی شرکت (KKTC) بازبینی شوند.
 */
export type LegalSlug = 'privacy' | 'kvkk' | 'terms' | 'distance-sales' | 'pre-information' | 'refund' | 'delivery' | 'cookies' | 'affiliate';

export const LEGAL_SLUGS: LegalSlug[] = ['privacy', 'kvkk', 'terms', 'distance-sales', 'pre-information', 'refund', 'delivery', 'cookies', 'affiliate'];

export type Lang4 = 'fa' | 'en' | 'ru' | 'tr';

export const LEGAL_TITLES: Record<LegalSlug, Record<Lang4, string>> = {
  privacy: { fa: 'سیاست حریم خصوصی و امنیت', en: 'Privacy & Security Policy', ru: 'Политика конфиденциальности', tr: 'Gizlilik ve Güvenlik Politikası' },
  kvkk: { fa: 'متن اطلاع‌رسانی حفاظت از داده‌های شخصی (KVKK)', en: 'Personal Data Protection Notice (KVKK)', ru: 'Уведомление о защите персональных данных (KVKK)', tr: 'KVKK Aydınlatma Metni' },
  terms: { fa: 'شرایط استفاده و قرارداد عضویت', en: 'Terms of Use & Membership Agreement', ru: 'Условия использования и членское соглашение', tr: 'Kullanım Koşulları ve Üyelik Sözleşmesi' },
  'distance-sales': { fa: 'قرارداد فروش از راه دور', en: 'Distance Sales Agreement', ru: 'Договор дистанционной продажи', tr: 'Mesafeli Satış Sözleşmesi' },
  'pre-information': { fa: 'فرم اطلاع‌رسانی پیش از قرارداد', en: 'Preliminary Information Form', ru: 'Форма предварительной информации', tr: 'Ön Bilgilendirme Formu' },
  refund: { fa: 'شرایط لغو، انصراف و بازگشت وجه', en: 'Cancellation, Withdrawal & Refund Policy', ru: 'Условия отмены и возврата средств', tr: 'İptal, Cayma ve İade Koşulları' },
  delivery: { fa: 'شرایط ارائهٔ خدمات و تحویل', en: 'Service & Delivery Terms', ru: 'Условия оказания услуг и доставки', tr: 'Hizmet ve Teslimat Koşulları' },
  cookies: { fa: 'سیاست کوکی‌ها', en: 'Cookie Policy', ru: 'Политика использования cookie', tr: 'Çerez Politikası' },
  affiliate: { fa: 'طرح همکاری در فروش', en: 'Affiliate Program', ru: 'Партнёрская программа', tr: 'Satış Ortaklığı Programı' },
};

/** متن‌ها با Markdown ساده: `## عنوان`، `- مورد`، پاراگراف. */
export const LEGAL_DEFAULTS: Record<LegalSlug, Record<Lang4, string>> = {
  privacy: {
    tr: `## 1. Veri Sorumlusu
{{company}} ("Şirket"), {{address}} adresinde faaliyet göstermektedir. Bu politika, {{site}} web sitesi ve mobil uygulaması üzerinden toplanan kişisel verilerin nasıl işlendiğini açıklar.

## 2. Toplanan Veriler
- Kimlik ve iletişim bilgileri: ad-soyad, kullanıcı adı, e-posta, telefon
- İşlem bilgileri: rezervasyonlar, kafe/mağaza siparişleri, turnuva kayıtları, sadakat puanları
- Teknik veriler: IP adresi, tarayıcı/dil tercihi, çerezler
- Ödeme verileri **Şirket tarafından saklanmaz**; kart bilgileri doğrudan lisanslı ödeme kuruluşu PayTR'nin PCI-DSS uyumlu altyapısında işlenir.

## 3. İşleme Amaçları
Hizmetin sunulması, siparişlerin tamamlanması, ödemelerin alınması, dolandırıcılığın önlenmesi, yasal yükümlülüklerin yerine getirilmesi ve (onay verilmesi hâlinde) kampanya bildirimleri.

## 4. Güvenlik
Tüm bağlantılar SSL/TLS ile şifrelenir. Şifreler geri döndürülemez şekilde hash'lenerek saklanır. Ödeme adımı 3D Secure ile korunur.

## 5. Paylaşım
Verileriniz yalnızca ödeme kuruluşu (PayTR), barındırma sağlayıcısı ve yasal zorunluluk hâlinde yetkili merciler ile paylaşılır; üçüncü kişilere satılmaz.

## 6. Haklarınız ve İletişim
Verilerinize erişme, düzeltme, silme ve itiraz haklarınız için {{email}} adresine yazabilir veya {{phone}} numarasını arayabilirsiniz.`,
    en: `## 1. Data Controller
{{company}} ("Company"), located at {{address}}, operates {{site}}. This policy explains how personal data collected through the website and mobile app is processed.

## 2. Data We Collect
- Identity and contact data: name, username, e-mail, phone
- Transaction data: reservations, cafe/shop orders, tournament registrations, loyalty points
- Technical data: IP address, browser/language preference, cookies
- Payment card data is **never stored by the Company**; cards are processed directly on the PCI-DSS certified infrastructure of the licensed payment institution PayTR.

## 3. Purposes
Providing the service, fulfilling orders, collecting payments, fraud prevention, legal compliance and (with consent) promotional messages.

## 4. Security
All connections are encrypted with SSL/TLS. Passwords are stored as irreversible hashes. Payments are protected by 3D Secure.

## 5. Sharing
Data is shared only with the payment institution (PayTR), our hosting provider and, where legally required, competent authorities. It is never sold.

## 6. Your Rights & Contact
To access, correct, delete or object to the processing of your data, write to {{email}} or call {{phone}}.`,
    fa: `## ۱. مسئول داده
{{company}} («شرکت») به نشانی {{address}} گردانندهٔ {{site}} است. این سیاست توضیح می‌دهد داده‌های شخصی جمع‌آوری‌شده از وب‌سایت و اپلیکیشن چگونه پردازش می‌شوند.

## ۲. داده‌هایی که جمع می‌کنیم
- هویت و تماس: نام، نام کاربری، ایمیل، تلفن
- تراکنش‌ها: رزروها، سفارش‌های کافه/فروشگاه، ثبت‌نام مسابقات، امتیاز وفاداری
- داده‌های فنی: IP، مرورگر/زبان، کوکی‌ها
- اطلاعات کارت بانکی **هرگز نزد شرکت ذخیره نمی‌شود**؛ کارت مستقیماً در زیرساخت دارای گواهی PCI-DSS مؤسسهٔ پرداخت مجاز PayTR پردازش می‌شود.

## ۳. اهداف
ارائهٔ خدمت، تکمیل سفارش، دریافت وجه، پیشگیری از تقلب، تکالیف قانونی و (با رضایت) اطلاع‌رسانی تبلیغاتی.

## ۴. امنیت
همهٔ ارتباط‌ها با SSL/TLS رمزنگاری می‌شوند. رمزها به‌صورت هش برگشت‌ناپذیر ذخیره می‌شوند. پرداخت با 3D Secure محافظت می‌شود.

## ۵. اشتراک‌گذاری
داده‌ها فقط با مؤسسهٔ پرداخت (PayTR)، ارائه‌دهندهٔ میزبانی و در صورت الزام قانونی با مراجع ذی‌صلاح به اشتراک گذاشته می‌شود و هرگز فروخته نمی‌شود.

## ۶. حقوق شما و تماس
برای دسترسی، اصلاح، حذف یا اعتراض به پردازش داده‌ها به {{email}} بنویسید یا با {{phone}} تماس بگیرید.`,
    ru: `## 1. Оператор данных
{{company}} («Компания»), расположенная по адресу {{address}}, управляет сайтом {{site}}. Настоящая политика объясняет, как обрабатываются персональные данные, собранные через сайт и мобильное приложение.

## 2. Какие данные мы собираем
- Идентификационные и контактные данные: имя, логин, e-mail, телефон
- Данные операций: бронирования, заказы кафе/магазина, регистрации на турниры, баллы лояльности
- Технические данные: IP-адрес, браузер/язык, cookie
- Данные банковских карт **никогда не хранятся Компанией**; карты обрабатываются напрямую в PCI-DSS-сертифицированной инфраструктуре лицензированного платёжного учреждения PayTR.

## 3. Цели
Оказание услуги, выполнение заказов, приём платежей, предотвращение мошенничества, соблюдение закона и (с согласия) рекламные сообщения.

## 4. Безопасность
Все соединения шифруются SSL/TLS. Пароли хранятся в виде необратимых хешей. Платежи защищены 3D Secure.

## 5. Передача
Данные передаются только платёжному учреждению (PayTR), хостинг-провайдеру и, при законном требовании, компетентным органам. Данные не продаются.

## 6. Ваши права и контакты
Для доступа, исправления, удаления или возражения напишите на {{email}} или позвоните {{phone}}.`,
  },
  kvkk: {
    tr: `## Aydınlatma Metni
6698 sayılı Kişisel Verilerin Korunması Kanunu ve KKTC mevzuatı kapsamında veri sorumlusu {{company}} ({{address}}) olarak sizi bilgilendiriyoruz.

## İşlenen Kişisel Veriler ve Hukuki Sebep
- Üyelik ve rezervasyon için kimlik/iletişim verileri — sözleşmenin kurulması ve ifası
- Sipariş ve ödeme kayıtları (kart bilgisi hariç) — hukuki yükümlülük ve meşru menfaat
- Log/IP verileri — güvenlik, hukuki yükümlülük

## Aktarım
Ödeme kuruluşu PayTR, barındırma sağlayıcısı ve yetkili kamu kurumları.

## Saklama Süresi
Yasal saklama süreleri (en az 10 yıl mali kayıtlar) boyunca; sonrasında silinir veya anonim hâle getirilir.

## Haklarınız (Madde 11)
Verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltme, silme, itiraz ve zararın giderilmesini talep etme haklarınızı {{email}} adresine yazılı başvuru ile kullanabilirsiniz. Başvurular en geç 30 gün içinde yanıtlanır.`,
    en: `## Notice
As data controller under Turkish Law No. 6698 (KVKK) and applicable TRNC legislation, {{company}} ({{address}}) informs you as follows.

## Data Processed and Legal Basis
- Identity/contact data for membership and bookings — performance of a contract
- Order and payment records (excluding card data) — legal obligation and legitimate interest
- Log/IP data — security, legal obligation

## Transfers
Payment institution PayTR, hosting provider and competent public authorities.

## Retention
For statutory retention periods (financial records at least 10 years); then deleted or anonymised.

## Your Rights (Art. 11)
You may learn whether your data is processed, request information, correction, deletion, object and claim damages by writing to {{email}}. Requests are answered within 30 days.`,
    fa: `## متن اطلاع‌رسانی
{{company}} ({{address}}) به‌عنوان مسئول داده طبق قانون شمارهٔ ۶۶۹۸ ترکیه (KVKK) و مقررات KKTC شما را آگاه می‌کند.

## داده‌های پردازش‌شده و مبنای قانونی
- داده‌های هویتی/تماس برای عضویت و رزرو — اجرای قرارداد
- سوابق سفارش و پرداخت (بدون اطلاعات کارت) — تکلیف قانونی و منافع مشروع
- لاگ/IP — امنیت و تکلیف قانونی

## انتقال
مؤسسهٔ پرداخت PayTR، ارائه‌دهندهٔ میزبانی و مراجع دولتی ذی‌صلاح.

## مدت نگهداری
در طول مدت قانونی (سوابق مالی حداقل ۱۰ سال)؛ سپس حذف یا بی‌نام می‌شوند.

## حقوق شما (مادهٔ ۱۱)
اطلاع از پردازش، درخواست اطلاعات، اصلاح، حذف، اعتراض و مطالبهٔ خسارت با درخواست کتبی به {{email}}. پاسخ حداکثر ظرف ۳۰ روز.`,
    ru: `## Уведомление
{{company}} ({{address}}) как оператор данных согласно Закону Турции № 6698 (KVKK) и законодательству ТРСК информирует вас о следующем.

## Обрабатываемые данные и правовое основание
- Идентификационные/контактные данные для членства и бронирования — исполнение договора
- Записи заказов и платежей (без данных карты) — законная обязанность и законный интерес
- Логи/IP — безопасность, законная обязанность

## Передача
Платёжное учреждение PayTR, хостинг-провайдер и компетентные госорганы.

## Срок хранения
В течение установленных законом сроков (финансовые записи не менее 10 лет); затем удаление или анонимизация.

## Ваши права (ст. 11)
Узнать об обработке, запросить информацию, исправление, удаление, возразить и потребовать возмещения — письменно на {{email}}. Ответ в течение 30 дней.`,
  },
  terms: {
    tr: `## 1. Taraflar
Bu sözleşme {{company}} ("Şirket") ile {{site}} üyesi ("Üye") arasında akdedilmiştir.

## 2. Hizmetler
Oyun sistemi/konsol rezervasyonu, kafe siparişi, aksesuar satışı, turnuva kaydı ve sadakat programı.

## 3. Üyelik
Üye 18 yaşını doldurmuş olmalı veya veli onayı ile kayıt olmalıdır. Hesap bilgileri doğru ve güncel tutulur; şifre gizliliği Üye'nin sorumluluğundadır.

## 4. Ödeme ve Fiyatlar
Fiyatlar Türk Lirası (TL) cinsindendir ve KDV dâhildir. Ödemeler PayTR güvenli ödeme altyapısı üzerinden kredi/banka kartı ile alınır. Şirket kart bilgilerini görmez ve saklamaz.

## 5. Sadakat Puanları
Her 10 TL harcamaya 1 puan verilir. Puanlar nakde çevrilemez, yalnızca indirim kuponuna dönüştürülebilir. Şirket programı önceden bildirerek değiştirebilir.

## 6. Yasaklı Davranışlar
Hile, sistemlere zarar verme, başkasının hesabını kullanma ve tesis kurallarına aykırılık hâlinde üyelik askıya alınabilir.

## 7. Sorumluluk
Şirket, mücbir sebeplerden ve Üye'nin kusurundan doğan zararlardan sorumlu değildir.

## 8. Uygulanacak Hukuk
KKTC hukuku uygulanır; uyuşmazlıklarda İskele/Gazimağusa mahkemeleri yetkilidir.

## 9. İletişim
{{company}} — {{address}} — {{email}} — {{phone}}`,
    en: `## 1. Parties
This agreement is between {{company}} ("Company") and the member of {{site}} ("Member").

## 2. Services
Gaming PC/console reservations, cafe orders, accessory sales, tournament registration and the loyalty programme.

## 3. Membership
Members must be 18+ or registered with parental consent. Account data must be accurate; password confidentiality is the Member's responsibility.

## 4. Prices & Payment
Prices are in Turkish Lira (TL) and include VAT. Payments are collected by credit/debit card through the PayTR secure payment infrastructure. The Company never sees or stores card data.

## 5. Loyalty Points
1 point per 10 TL spent. Points cannot be redeemed for cash, only converted into discount coupons. The programme may be changed with prior notice.

## 6. Prohibited Conduct
Cheating, damaging equipment, using another person's account or breaching venue rules may result in suspension.

## 7. Liability
The Company is not liable for damages caused by force majeure or the Member's fault.

## 8. Governing Law
TRNC law applies; the courts of İskele/Gazimağusa have jurisdiction.

## 9. Contact
{{company}} — {{address}} — {{email}} — {{phone}}`,
    fa: `## ۱. طرفین
این قرارداد میان {{company}} («شرکت») و عضو {{site}} («عضو») منعقد می‌شود.

## ۲. خدمات
رزرو سیستم/کنسول گیمینگ، سفارش کافه، فروش لوازم جانبی، ثبت‌نام مسابقات و برنامهٔ وفاداری.

## ۳. عضویت
عضو باید ۱۸ سال تمام داشته باشد یا با رضایت ولی ثبت‌نام کند. اطلاعات حساب باید درست باشد؛ محرمانگی رمز بر عهدهٔ عضو است.

## ۴. قیمت و پرداخت
قیمت‌ها به لیر ترکیه (TL) و شامل KDV هستند. پرداخت با کارت اعتباری/بانکی از طریق زیرساخت امن PayTR انجام می‌شود. شرکت اطلاعات کارت را نمی‌بیند و ذخیره نمی‌کند.

## ۵. امتیاز وفاداری
هر ۱۰ لیر = ۱ امتیاز. امتیاز قابل تبدیل به وجه نقد نیست و فقط به کوپن تخفیف تبدیل می‌شود. برنامه با اطلاع قبلی قابل تغییر است.

## ۶. رفتارهای ممنوع
تقلب، آسیب به تجهیزات، استفاده از حساب دیگری و نقض قوانین مجموعه می‌تواند به تعلیق عضویت منجر شود.

## ۷. مسئولیت
شرکت مسئول خسارات ناشی از فورس‌ماژور یا تقصیر عضو نیست.

## ۸. قانون حاکم
قانون KKTC حاکم است؛ دادگاه‌های İskele/Gazimağusa صالح‌اند.

## ۹. تماس
{{company}} — {{address}} — {{email}} — {{phone}}`,
    ru: `## 1. Стороны
Настоящее соглашение заключено между {{company}} («Компания») и участником {{site}} («Участник»).

## 2. Услуги
Бронирование игровых ПК/консолей, заказы в кафе, продажа аксессуаров, регистрация на турниры и программа лояльности.

## 3. Членство
Участник должен быть старше 18 лет или зарегистрирован с согласия родителей. Данные аккаунта должны быть достоверными; сохранность пароля — ответственность Участника.

## 4. Цены и оплата
Цены указаны в турецких лирах (TL) с учётом НДС. Оплата принимается картой через защищённую инфраструктуру PayTR. Компания не видит и не хранит данные карты.

## 5. Баллы лояльности
1 балл за каждые 10 TL. Баллы не обмениваются на деньги, только на купоны скидки. Программа может быть изменена с предварительным уведомлением.

## 6. Запрещённые действия
Читерство, порча оборудования, использование чужого аккаунта и нарушение правил заведения могут привести к блокировке.

## 7. Ответственность
Компания не несёт ответственности за ущерб вследствие форс-мажора или вины Участника.

## 8. Применимое право
Применяется право ТРСК; споры рассматривают суды İskele/Gazimağusa.

## 9. Контакты
{{company}} — {{address}} — {{email}} — {{phone}}`,
  },
  'distance-sales': {
    tr: `## MADDE 1 – TARAFLAR
**SATICI:** {{company}} — Adres: {{address}} — Tel: {{phone}} — E-posta: {{email}} — Vergi No: {{taxNo}}
**ALICI:** Sipariş formunda bilgileri yer alan üye.

## MADDE 2 – KONU
İşbu sözleşmenin konusu, ALICI'nın {{site}} üzerinden elektronik ortamda sipariş verdiği hizmet/ürünün (oyun sistemi rezervasyonu, kafe ürünü, aksesuar, turnuva katılım ücreti) satışı ve ifasına ilişkin 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir.

## MADDE 3 – SÖZLEŞME KONUSU ÜRÜN/HİZMET BİLGİLERİ
Ürün/hizmetin türü, miktarı, satış bedeli (KDV dâhil, TL) ve ödeme şekli ödeme sayfasında ve sipariş onay e-postasında belirtildiği gibidir. Ek kargo ücreti yoktur; ürünler tesiste teslim edilir, hizmetler tesiste ifa edilir.

## MADDE 4 – GENEL HÜKÜMLER
4.1 ALICI, ön bilgilendirme formunu okuduğunu ve elektronik ortamda teyit ettiğini kabul eder.
4.2 Ödeme, PayTR Ödeme ve Elektronik Para Kuruluşu A.Ş. altyapısı üzerinden 3D Secure ile alınır.
4.3 Rezervasyon hizmeti, seçilen tarih ve saatte ALICI'nın tesise gelmesiyle ifa edilir. Randevuya gelinmemesi hâlinde bedel iade edilmez (bkz. İptal ve İade Koşulları).
4.4 Kafe ürünleri sipariş sonrası tesiste belirtilen koltuğa teslim edilir; aksesuarlar tesisten teslim alınır.

## MADDE 5 – CAYMA HAKKI
ALICI, aksesuar (mal) satışlarında teslimden itibaren 14 gün içinde gerekçesiz cayma hakkına sahiptir. Belirli bir tarihte ifa edilen boş zaman/eğlence hizmetleri (rezervasyon, turnuva) ve çabuk bozulan gıda ürünleri Mesafeli Sözleşmeler Yönetmeliği md. 15 uyarınca cayma hakkı kapsamı dışındadır. Cayma bildirimi {{email}} adresine yapılır; iade, ödemenin yapıldığı karta 14 gün içinde PayTR aracılığıyla gerçekleştirilir.

## MADDE 6 – UYUŞMAZLIK
Uyuşmazlıklarda KKTC Tüketici Hakem Heyetleri ve İskele mahkemeleri yetkilidir.

## MADDE 7 – YÜRÜRLÜK
ALICI, ödeme sayfasında "okudum, onaylıyorum" kutusunu işaretleyerek işbu sözleşmenin tüm şartlarını kabul etmiş sayılır.`,
    en: `## ARTICLE 1 – PARTIES
**SELLER:** {{company}} — Address: {{address}} — Tel: {{phone}} — E-mail: {{email}} — Tax No: {{taxNo}}
**BUYER:** The member whose details appear on the order form.

## ARTICLE 2 – SUBJECT
This agreement governs the rights and obligations of the parties regarding the sale and performance of the service/product ordered electronically by the BUYER through {{site}} (gaming station reservation, cafe item, accessory, tournament entry fee) pursuant to Turkish Consumer Protection Law No. 6502 and the Distance Contracts Regulation.

## ARTICLE 3 – PRODUCT/SERVICE DETAILS
Type, quantity, price (incl. VAT, in TL) and payment method are as shown on the payment page and order confirmation. No shipping fee applies; goods are handed over at the venue and services are performed at the venue.

## ARTICLE 4 – GENERAL PROVISIONS
4.1 The BUYER confirms having read and electronically accepted the Preliminary Information Form.
4.2 Payment is collected with 3D Secure through PayTR Payment and Electronic Money Institution Inc.
4.3 Reservation services are performed when the BUYER attends the venue at the selected date/time. No-shows are non-refundable (see Refund Policy).
4.4 Cafe items are delivered to the specified seat at the venue; accessories are collected from the venue.

## ARTICLE 5 – RIGHT OF WITHDRAWAL
For accessories (goods) the BUYER may withdraw without reason within 14 days of delivery. Leisure services performed on a specific date (reservations, tournaments) and perishable food are excluded from withdrawal under Art. 15 of the Regulation. Withdrawal notices go to {{email}}; refunds are made to the original card via PayTR within 14 days.

## ARTICLE 6 – DISPUTES
TRNC Consumer Arbitration Committees and the courts of İskele have jurisdiction.

## ARTICLE 7 – ENTRY INTO FORCE
By ticking "I have read and accept" on the payment page the BUYER accepts all terms of this agreement.`,
    fa: `## مادهٔ ۱ – طرفین
**فروشنده:** {{company}} — نشانی: {{address}} — تلفن: {{phone}} — ایمیل: {{email}} — شمارهٔ مالیاتی: {{taxNo}}
**خریدار:** عضوی که مشخصاتش در فرم سفارش آمده است.

## مادهٔ ۲ – موضوع
این قرارداد حقوق و تعهدات طرفین را دربارهٔ فروش و ارائهٔ خدمت/کالای سفارش‌شده به‌صورت الکترونیکی از طریق {{site}} (رزرو سیستم گیمینگ، اقلام کافه، لوازم جانبی، ورودی مسابقه) طبق قانون حمایت از مصرف‌کنندهٔ ترکیه شمارهٔ ۶۵۰۲ و آیین‌نامهٔ قراردادهای از راه دور تعیین می‌کند.

## مادهٔ ۳ – مشخصات کالا/خدمت
نوع، تعداد، قیمت (با KDV، به TL) و روش پرداخت همان است که در صفحهٔ پرداخت و تأیید سفارش نمایش داده می‌شود. هزینهٔ ارسال ندارد؛ کالا در محل تحویل و خدمت در محل ارائه می‌شود.

## مادهٔ ۴ – مقررات عمومی
۴.۱ خریدار تأیید می‌کند فرم اطلاع‌رسانی پیش از قرارداد را خوانده و به‌صورت الکترونیکی پذیرفته است.
۴.۲ پرداخت با 3D Secure از طریق شرکت PayTR انجام می‌شود.
۴.۳ خدمت رزرو با حضور خریدار در تاریخ/ساعت انتخابی ارائه می‌شود. عدم حضور مشمول بازگشت وجه نیست (بند شرایط بازگشت).
۴.۴ اقلام کافه به صندلی اعلام‌شده تحویل می‌شود؛ لوازم جانبی از محل تحویل گرفته می‌شود.

## مادهٔ ۵ – حق انصراف
برای لوازم جانبی (کالا) خریدار می‌تواند ظرف ۱۴ روز از تحویل بدون ذکر دلیل انصراف دهد. خدمات تفریحی با تاریخ معین (رزرو، مسابقه) و مواد غذایی فاسدشدنی طبق مادهٔ ۱۵ آیین‌نامه مشمول حق انصراف نیستند. اعلام انصراف به {{email}}؛ بازگشت وجه به همان کارت ظرف ۱۴ روز از طریق PayTR.

## مادهٔ ۶ – اختلاف
هیئت‌های داوری مصرف‌کنندهٔ KKTC و دادگاه‌های İskele صالح‌اند.

## مادهٔ ۷ – اجرا
با زدن تیک «خواندم و می‌پذیرم» در صفحهٔ پرداخت، خریدار همهٔ شرایط این قرارداد را پذیرفته است.`,
    ru: `## СТАТЬЯ 1 – СТОРОНЫ
**ПРОДАВЕЦ:** {{company}} — Адрес: {{address}} — Тел.: {{phone}} — E-mail: {{email}} — Налоговый №: {{taxNo}}
**ПОКУПАТЕЛЬ:** участник, данные которого указаны в форме заказа.

## СТАТЬЯ 2 – ПРЕДМЕТ
Настоящий договор определяет права и обязанности сторон в отношении продажи и оказания услуги/товара, заказанного ПОКУПАТЕЛЕМ через {{site}} (бронирование игровой станции, товар кафе, аксессуар, взнос за турнир), согласно Закону Турции № 6502 о защите прав потребителей и Положению о дистанционных договорах.

## СТАТЬЯ 3 – СВЕДЕНИЯ О ТОВАРЕ/УСЛУГЕ
Вид, количество, цена (с НДС, в TL) и способ оплаты указаны на странице оплаты и в подтверждении заказа. Доставка не взимается; товары выдаются в заведении, услуги оказываются в заведении.

## СТАТЬЯ 4 – ОБЩИЕ ПОЛОЖЕНИЯ
4.1 ПОКУПАТЕЛЬ подтверждает, что ознакомился с Формой предварительной информации и принял её электронно.
4.2 Оплата принимается с 3D Secure через PayTR.
4.3 Услуга бронирования оказывается при явке ПОКУПАТЕЛЯ в выбранные дату/время. Неявка не подлежит возврату (см. Условия возврата).
4.4 Товары кафе доставляются к указанному месту; аксессуары выдаются в заведении.

## СТАТЬЯ 5 – ПРАВО НА ОТКАЗ
Для аксессуаров (товаров) ПОКУПАТЕЛЬ вправе отказаться без объяснения причин в течение 14 дней с момента получения. Развлекательные услуги на конкретную дату (бронирования, турниры) и скоропортящиеся продукты не подлежат отказу согласно ст. 15 Положения. Уведомление об отказе — на {{email}}; возврат на ту же карту через PayTR в течение 14 дней.

## СТАТЬЯ 6 – СПОРЫ
Компетентны потребительские арбитражные комитеты ТРСК и суды İskele.

## СТАТЬЯ 7 – ВСТУПЛЕНИЕ В СИЛУ
Отметив «Прочитал и принимаю» на странице оплаты, ПОКУПАТЕЛЬ принимает все условия настоящего договора.`,
  },
  'pre-information': {
    tr: `## 1. Satıcı Bilgileri
Unvan: {{company}} · Adres: {{address}} · Telefon: {{phone}} · E-posta: {{email}} · Vergi No: {{taxNo}}

## 2. Ürün/Hizmetin Temel Nitelikleri
Ödeme sayfasında gösterilen rezervasyon (sistem adı, tarih, saat aralığı), kafe ürünleri, aksesuarlar veya turnuva katılım hakkı.

## 3. Fiyat ve Ödeme
Tüm vergiler dâhil toplam bedel TL olarak ödeme sayfasında gösterilir. Ek kargo/teslimat ücreti yoktur. Ödeme kredi/banka kartı ile PayTR üzerinden tek çekim olarak alınır.

## 4. Teslimat / İfa
Rezervasyon: seçilen tarih ve saatte tesiste. Kafe: sipariş sonrası belirtilen koltuğa. Aksesuar: tesisten teslim. Turnuva: kayıt anında.

## 5. Cayma Hakkı
Aksesuarlar için teslimden itibaren 14 gün. Belirli tarihli hizmetler ve gıda ürünleri için cayma hakkı bulunmamaktadır (Yönetmelik md. 15). Bildirim: {{email}}.

## 6. Şikâyet ve İtiraz
{{email}} / {{phone}} üzerinden; ayrıca KKTC Tüketici Hakem Heyetleri'ne başvurulabilir.

## 7. Geçerlilik
Bu form, ödeme sayfasında onaylandığı anda geçerlidir ve Mesafeli Satış Sözleşmesi'nin ayrılmaz parçasıdır.`,
    en: `## 1. Seller
Name: {{company}} · Address: {{address}} · Phone: {{phone}} · E-mail: {{email}} · Tax No: {{taxNo}}

## 2. Main Characteristics
The reservation (station, date, time slot), cafe items, accessories or tournament entry shown on the payment page.

## 3. Price & Payment
Total price including all taxes is shown in TL on the payment page. No shipping fee. Payment is collected in a single instalment by credit/debit card via PayTR.

## 4. Delivery / Performance
Reservation: at the venue on the selected date/time. Cafe: to the specified seat after ordering. Accessories: pickup at the venue. Tournament: on registration.

## 5. Right of Withdrawal
14 days from delivery for accessories. No withdrawal right for date-specific services and food (Regulation Art. 15). Notice: {{email}}.

## 6. Complaints
Via {{email}} / {{phone}}; also TRNC Consumer Arbitration Committees.

## 7. Validity
This form takes effect when confirmed on the payment page and forms an integral part of the Distance Sales Agreement.`,
    fa: `## ۱. فروشنده
نام: {{company}} · نشانی: {{address}} · تلفن: {{phone}} · ایمیل: {{email}} · شمارهٔ مالیاتی: {{taxNo}}

## ۲. مشخصات اصلی
رزرو (نام سیستم، تاریخ، بازهٔ ساعت)، اقلام کافه، لوازم جانبی یا ورودی مسابقه که در صفحهٔ پرداخت نمایش داده می‌شود.

## ۳. قیمت و پرداخت
مبلغ کل با همهٔ مالیات‌ها به TL در صفحهٔ پرداخت نشان داده می‌شود. هزینهٔ ارسال ندارد. پرداخت تک‌مرحله‌ای با کارت از طریق PayTR.

## ۴. تحویل / ارائه
رزرو: در محل در تاریخ/ساعت انتخابی. کافه: به صندلی اعلام‌شده. لوازم جانبی: تحویل در محل. مسابقه: در لحظهٔ ثبت‌نام.

## ۵. حق انصراف
۱۴ روز از تحویل برای لوازم جانبی. برای خدمات با تاریخ معین و مواد غذایی حق انصراف وجود ندارد (مادهٔ ۱۵ آیین‌نامه). اعلام: {{email}}.

## ۶. شکایت
از طریق {{email}} / {{phone}}؛ همچنین هیئت‌های داوری مصرف‌کنندهٔ KKTC.

## ۷. اعتبار
این فرم با تأیید در صفحهٔ پرداخت معتبر می‌شود و جزء لاینفک قرارداد فروش از راه دور است.`,
    ru: `## 1. Продавец
Название: {{company}} · Адрес: {{address}} · Телефон: {{phone}} · E-mail: {{email}} · Налоговый №: {{taxNo}}

## 2. Основные характеристики
Бронирование (станция, дата, время), товары кафе, аксессуары или участие в турнире, указанные на странице оплаты.

## 3. Цена и оплата
Итоговая цена со всеми налогами показана в TL на странице оплаты. Доставка бесплатна. Оплата единовременно картой через PayTR.

## 4. Доставка / оказание
Бронирование: в заведении в выбранные дату/время. Кафе: к указанному месту. Аксессуары: самовывоз. Турнир: при регистрации.

## 5. Право на отказ
14 дней с момента получения для аксессуаров. Для услуг на конкретную дату и продуктов питания право на отказ отсутствует (ст. 15 Положения). Уведомление: {{email}}.

## 6. Жалобы
Через {{email}} / {{phone}}; также потребительские арбитражные комитеты ТРСК.

## 7. Действие
Форма вступает в силу при подтверждении на странице оплаты и является неотъемлемой частью Договора дистанционной продажи.`,
  },
  refund: {
    tr: `## Rezervasyon İptali
- Rezervasyon saatinden **en az 2 saat önce** yapılan iptallerde bedelin tamamı iade edilir.
- 2 saatten kısa sürede yapılan iptallerde veya randevuya gelinmemesi hâlinde iade yapılmaz.
- Tesisten kaynaklanan arıza/kapanış durumunda bedel tamamen iade edilir veya yeni bir saat verilir.

## Kafe Siparişleri
Hazırlanmaya başlanmamış siparişler iptal edilebilir. Gıda ürünlerinde cayma hakkı bulunmaz; hatalı/eksik teslimatta ürün değiştirilir veya bedeli iade edilir.

## Aksesuarlar
Teslimden itibaren 14 gün içinde, kullanılmamış ve ambalajı hasarsız ürünler gerekçesiz iade edilebilir.

## Turnuva Kayıtları
Turnuva başlangıcından 24 saat öncesine kadar iptal edilebilir; sonrasında iade yapılmaz. Turnuvanın iptali hâlinde ücret tamamen iade edilir.

## İade Süreci
Talepler {{email}} adresine veya tesise iletilir. Onaylanan iadeler, ödemenin yapıldığı karta PayTR üzerinden en geç 14 gün içinde yansıtılır; bankaya bağlı olarak ekstreye yansıması 2–10 iş günü sürebilir.`,
    en: `## Reservation Cancellation
- Cancellations made **at least 2 hours before** the slot are refunded in full.
- Cancellations within 2 hours or no-shows are not refunded.
- If the venue cannot provide the service (technical failure/closure) the fee is fully refunded or rescheduled.

## Cafe Orders
Orders not yet in preparation can be cancelled. Food has no withdrawal right; wrong/missing items are replaced or refunded.

## Accessories
Unused items with undamaged packaging may be returned without reason within 14 days of delivery.

## Tournament Registrations
Cancellable up to 24 hours before the start; no refund afterwards. If the tournament is cancelled the fee is fully refunded.

## Refund Process
Send requests to {{email}} or ask at the venue. Approved refunds are returned to the original card via PayTR within 14 days; depending on the bank it may take 2–10 business days to appear.`,
    fa: `## لغو رزرو
- لغو **حداقل ۲ ساعت پیش** از زمان رزرو: بازگشت کامل وجه.
- لغو در کمتر از ۲ ساعت یا عدم حضور: بدون بازگشت وجه.
- اگر مجموعه نتواند خدمت را ارائه دهد (خرابی/تعطیلی): بازگشت کامل یا زمان جدید.

## سفارش‌های کافه
سفارش‌هایی که آماده‌سازی‌شان شروع نشده قابل لغو است. مواد غذایی حق انصراف ندارند؛ اقلام اشتباه/کسری تعویض یا مسترد می‌شوند.

## لوازم جانبی
کالای استفاده‌نشده با بسته‌بندی سالم تا ۱۴ روز پس از تحویل بدون ذکر دلیل قابل بازگشت است.

## ثبت‌نام مسابقات
تا ۲۴ ساعت پیش از شروع قابل لغو است؛ پس از آن بازگشت وجه ندارد. در صورت لغو مسابقه، وجه کامل مسترد می‌شود.

## فرآیند بازگشت وجه
درخواست به {{email}} یا حضوری در مجموعه. بازگشت‌های تأییدشده حداکثر ظرف ۱۴ روز از طریق PayTR به همان کارت واریز می‌شود؛ بسته به بانک ۲ تا ۱۰ روز کاری برای نمایش در صورت‌حساب زمان می‌برد.`,
    ru: `## Отмена бронирования
- Отмена **не менее чем за 2 часа** до начала — полный возврат.
- Отмена менее чем за 2 часа или неявка — без возврата.
- Если заведение не может оказать услугу (поломка/закрытие) — полный возврат или перенос.

## Заказы кафе
Заказы, приготовление которых не началось, можно отменить. На продукты питания право отказа не распространяется; ошибочные/недостающие позиции заменяются или возвращаются.

## Аксессуары
Неиспользованные товары в неповреждённой упаковке можно вернуть без объяснения причин в течение 14 дней.

## Регистрация на турнир
Отмена возможна за 24 часа до начала; позже возврат не производится. При отмене турнира взнос возвращается полностью.

## Процедура возврата
Запросы — на {{email}} или в заведении. Одобренные возвраты поступают на ту же карту через PayTR в течение 14 дней; в зависимости от банка отображение занимает 2–10 рабочих дней.`,
  },
  delivery: {
    tr: `## Hizmetin İfası
Tüm hizmetler {{company}} tesisinde ({{address}}) sunulur. Fiziksel kargo/teslimat yapılmamaktadır.

- **Rezervasyon:** Seçilen sistem, ödeme onayından sonra sizin adınıza ayrılır. Rezervasyon saatinde resepsiyona QR kodunuzu göstermeniz yeterlidir. 15 dakikadan fazla gecikmelerde sistem başka müşteriye verilebilir.
- **Kafe:** Sipariş, hazırlanır hazırlanmaz (ortalama 10–20 dk) belirttiğiniz koltuk numarasına getirilir.
- **Aksesuarlar:** Ödeme onayı sonrası ürün resepsiyonda adınıza ayrılır; 7 gün içinde teslim alınmalıdır.
- **Turnuva:** Kayıt, ödeme onayı ile kesinleşir; fikstür ve saatler turnuva sayfasında duyurulur.

## Çalışma Saatleri
7/24 açığız. Resmî tatillerde değişiklikler {{site}} üzerinden duyurulur.

## Destek
{{email}} · {{phone}}`,
    en: `## Performance of Services
All services are provided at the {{company}} venue ({{address}}). No physical shipping is offered.

- **Reservation:** The selected station is held in your name after payment confirmation. Show your QR code at the front desk at the reserved time. After 15 minutes of delay the station may be released.
- **Cafe:** Orders are brought to the seat number you specified as soon as they are ready (typically 10–20 min).
- **Accessories:** Held at the front desk under your name after payment; collect within 7 days.
- **Tournament:** Registration is final upon payment confirmation; fixtures and times are announced on the tournament page.

## Opening Hours
Open 24/7. Holiday changes are announced on {{site}}.

## Support
{{email}} · {{phone}}`,
    fa: `## ارائهٔ خدمات
همهٔ خدمات در محل {{company}} ({{address}}) ارائه می‌شود. ارسال فیزیکی نداریم.

- **رزرو:** پس از تأیید پرداخت، سیستم انتخابی به نام شما نگه داشته می‌شود. در زمان رزرو QR خود را در پذیرش نشان دهید. با بیش از ۱۵ دقیقه تأخیر ممکن است سیستم آزاد شود.
- **کافه:** سفارش به‌محض آماده‌شدن (معمولاً ۱۰ تا ۲۰ دقیقه) به شمارهٔ صندلی اعلام‌شده آورده می‌شود.
- **لوازم جانبی:** پس از پرداخت در پذیرش به نام شما نگه داشته می‌شود؛ ظرف ۷ روز تحویل بگیرید.
- **مسابقه:** ثبت‌نام با تأیید پرداخت قطعی می‌شود؛ جدول و ساعت‌ها در صفحهٔ مسابقه اعلام می‌شود.

## ساعت کار
۲۴ ساعته، ۷ روز هفته. تغییرات تعطیلات در {{site}} اعلام می‌شود.

## پشتیبانی
{{email}} · {{phone}}`,
    ru: `## Оказание услуг
Все услуги оказываются в заведении {{company}} ({{address}}). Физическая доставка не осуществляется.

- **Бронирование:** после подтверждения оплаты выбранная станция закрепляется за вами. Покажите QR-код на ресепшене в забронированное время. При опоздании более 15 минут станция может быть освобождена.
- **Кафе:** заказ приносят к указанному месту сразу после готовности (обычно 10–20 мин).
- **Аксессуары:** после оплаты хранятся на ресепшене на ваше имя; заберите в течение 7 дней.
- **Турнир:** регистрация окончательна после подтверждения оплаты; расписание публикуется на странице турнира.

## Часы работы
Круглосуточно, без выходных. Изменения в праздники публикуются на {{site}}.

## Поддержка
{{email}} · {{phone}}`,
  },
  cookies: {
    tr: `## Çerezler
{{site}} yalnızca hizmetin çalışması için zorunlu çerezleri ve yerel depolamayı kullanır: oturum belirteci, dil tercihi, tema tercihi ve sepet içeriği. Reklam veya üçüncü taraf izleme çerezi kullanılmaz.

Ödeme sayfası PayTR tarafından bir iFrame içinde sunulur; PayTR kendi güvenlik çerezlerini kullanabilir (bkz. paytr.com gizlilik politikası).

Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz; bu durumda oturumunuz ve tercihleriniz korunmaz.`,
    en: `## Cookies
{{site}} uses only strictly necessary cookies and local storage: session token, language preference, theme preference and cart contents. No advertising or third-party tracking cookies are used.

The payment page is served by PayTR in an iFrame; PayTR may set its own security cookies (see paytr.com privacy policy).

You can delete or block cookies in your browser settings; your session and preferences will then not be preserved.`,
    fa: `## کوکی‌ها
{{site}} فقط از کوکی‌ها و ذخیرهٔ محلی ضروری استفاده می‌کند: توکن نشست، زبان، قالب انتخابی و محتوای سبد. هیچ کوکی تبلیغاتی یا ردیابی شخص ثالث استفاده نمی‌شود.

صفحهٔ پرداخت توسط PayTR در یک iFrame ارائه می‌شود؛ PayTR ممکن است کوکی‌های امنیتی خودش را تنظیم کند (سیاست حریم خصوصی paytr.com).

می‌توانید کوکی‌ها را از تنظیمات مرورگر حذف یا مسدود کنید؛ در این صورت نشست و تنظیمات شما حفظ نمی‌شود.`,
    ru: `## Cookie
{{site}} использует только строго необходимые cookie и локальное хранилище: токен сессии, язык, тему и содержимое корзины. Рекламные и сторонние трекинговые cookie не используются.

Страница оплаты предоставляется PayTR во фрейме; PayTR может устанавливать собственные cookie безопасности (см. политику paytr.com).

Вы можете удалить или заблокировать cookie в настройках браузера; тогда сессия и предпочтения не сохранятся.`,
  },
  affiliate: {
    tr: `## Satış ortaklığı
{{site}} satış ortaklığı programı, gamer / yayıncı / kafe ortaklarının getirdiği **ödenmiş rezervasyon ve turnuva kayıtları** üzerinden komisyon verir. Kafe ve mağaza siparişleri kapsama girmez.

Varsayılan oranlar ayarlar tablosunda tutulur ve yönetim panelinden değiştirilir (yeni müşteri rezervasyonu, geri dönen müşteri, turnuva, 2. seviye override). Komisyon, iptal penceresi (rezervasyon için seans − 10 dk, turnuva için başlangıç − 48 saat) dolana kadar bekletilir; sonra ortağa ait cüzdana yazılır. Cüzdan bakiyesi yalnızca mekânda nakit olarak çekilir.

Kendini referans göstermek, yönetici rollerini hedeflemek ve sahte tıklama yasaktır. Referans kodu kupon değildir.`,
    en: `## Affiliate program
The {{site}} affiliate program pays commission on **paid station bookings and tournament registrations** referred by partners (gamers, streamers, cafés). Café and shop orders are out of scope.

Default rates live as real rows in the settings table and are edited in the admin panel (new booking, returning booking, tournament, level-2 override). Commission is held until the cancellation window ends (booking: 10 minutes before the session; tournament: 48 hours before start), then credited to the partner’s wallet. Wallet cash-out is recorded in person at the venue.

Self-referral, targeting excluded roles, and fake clicks are forbidden. A referral code is not a coupon.`,
    fa: `## طرح همکاری در فروش
طرح همکاری {{site}} فقط روی **رزرو ایستگاه و ثبت‌نام تورنمنتِ پرداخت‌شده** کمیسیون می‌دهد. سفارش بوفه و فروشگاه مشمول نیست.

نرخ‌های پیش‌فرض به‌صورت ردیف واقعی در جدول تنظیمات ذخیره می‌شوند و از پنل مدیریت ویرایش می‌گردند (مشتری جدید، بازگشتی، تورنمنت، بالاسری سطح ۲). کمیسیون تا پایان مهلت لغو (رزرو: ۱۰ دقیقه قبل از سانس؛ تورنمنت: ۴۸ ساعت قبل از شروع) نگه داشته و سپس به کیف پول همکار واریز می‌شود. نقد کردن کیف پول فقط حضوری در گیم‌نت ثبت می‌شود.

خودمعرفی، هدف‌گیری نقش‌های مستثنی و کلیک ساختگی ممنوع است. کد معرفی کوپن تخفیف نیست.`,
    ru: `## Партнёрская программа
Программа {{site}} платит комиссию только с **оплаченных броней станций и регистраций на турниры**. Заказы кафе и магазина не входят.

Ставки хранятся строками настроек и правятся в админке. Комиссия удерживается до конца окна отмены, затем зачисляется на кошелёк партнёра. Вывод — только на месте.

Самореферал и накрутка кликов запрещены. Реферальный код — не промокод.`,
  },
};

export interface CompanyInfo {
  company: string; address: string; email: string; phone: string; taxNo: string; site: string;
}

export function fillLegalTemplate(text: string, info: CompanyInfo): string {
  return text
    .replace(/\{\{company\}\}/g, info.company || '—')
    .replace(/\{\{address\}\}/g, info.address || '—')
    .replace(/\{\{email\}\}/g, info.email || '—')
    .replace(/\{\{phone\}\}/g, info.phone || '—')
    .replace(/\{\{taxNo\}\}/g, info.taxNo || '—')
    .replace(/\{\{site\}\}/g, info.site || '—');
}

export function isLegalSlug(s: string): s is LegalSlug {
  return (LEGAL_SLUGS as string[]).includes(s);
}
