import type { CampaignPolicy } from './types';
/** New flow: partner comments keyword -> PR guide -> follow button -> DM private invite link for partner. Friend flow via comment is retired. */
export const CAMPAIGN_MESSAGES: CampaignPolicy['messages'] = {
  "fa": {
    "partner1": "پیج را فالو کن و بر روی دکمه «فالو دارم» بزن تا لینک دعوت اختصاصی خودت برات ارسال بشه. بعد این لینک را برای دوستات بفرست. دوستانت با ثبت‌نام از طریق این لینک، کوپن تخفیف دریافت می‌کنند و تو هم از این به بعد از هر بار پرداخت آن‌ها در Bazino کمیسیون دریافت می‌کنی.",
    "partner2": "لینک دعوت اختصاصی تو:\n{{invite_url}}\nاین لینک را برای دوستانت بفرست. هر دوستی که با این لینک ثبت‌نام کند، کوپن تخفیف می‌گیرد و تو از هر پرداخت موفق او کمیسیون دریافت می‌کنی.",
    "friend": "مسیر دعوت دوست از طریق کامنت کد بازنشسته شد. لطفاً از لینک دعوت اختصاصی همکار استفاده کن و در سایت ثبت‌نام کن تا کوپن فعال شود.",
    "invite": "لینک دعوت خصوصی شما:\n{{invite_url}}\nبرای مشاهدهٔ شرایط و فعال‌سازی کوپن، وارد سایت شوید و رضایت و شرط‌های نمایش‌داده‌شده را تکمیل کنید.",
    "button": "فالو دارم"
  },
  "tr": {
    "partner1": "Sayfayı takip et ve özel davet bağlantını almak için «Takip ettim» düğmesine bas. Sonra bu bağlantıyı arkadaşlarına gönder. Arkadaşların bu bağlantıyla kayıt olarak indirim kuponu alır ve sen de bundan sonra Bazino'daki her ödemelerinden komisyon kazanırsın.",
    "partner2": "Özel davet bağlantın:\n{{invite_url}}\nBu bağlantıyı arkadaşlarına gönder. Bu bağlantıyla kayıt olan her arkadaşın indirim kuponu alır ve sen her başarılı ödemesinden komisyon kazanırsın.",
    "friend": "Yorumla kod ile arkadaş daveti akışı emekli edildi. Lütfen iş ortağının özel davet bağlantısını kullan ve kuponu etkinleştirmek için sitede kaydol.",
    "invite": "Özel davet bağlantın:\n{{invite_url}}\nKoşulları görmek ve kuponu etkinleştirmek için giriş yapıp onay adımlarını tamamla.",
    "button": "Takip ettim"
  },
  "en": {
    "partner1": "Follow the page and tap the «I followed» button to receive your private invitation link. Then send this link to your friends. Your friends will get a discount coupon by registering via this link, and you will earn commission on every payment they make at Bazino from now on.",
    "partner2": "Your private invitation link:\n{{invite_url}}\nSend this link to your friends. Each friend who registers via this link gets a discount coupon and you earn commission on every successful payment they make at Bazino.",
    "friend": "Friend invite via comment code is retired. Please use the partner's private invitation link and register on the site to activate your coupon.",
    "invite": "Your private invitation:\n{{invite_url}}\nSign in and complete the displayed consent and conditions to activate an eligible coupon.",
    "button": "I followed"
  },
  "ru": {
    "partner1": "Подпишись на страницу и нажми кнопку «Я подписался», чтобы получить свою личную пригласительную ссылку. Затем отправь эту ссылку друзьям. Твои друзья получат купон на скидку, зарегистрировавшись по этой ссылке, а ты будешь получать комиссию с каждой их оплаты в Bazino.",
    "partner2": "Твоя личная пригласительная ссылка:\n{{invite_url}}\nОтправь эту ссылку друзьям. Каждый друг, зарегистрировавшийся по этой ссылке, получает купон на скидку, а ты получаешь комиссию с каждой его успешной оплаты в Bazino.",
    "friend": "Поток приглашения друга через комментарий с кодом выведен из эксплуатации. Пожалуйста, используй личную ссылку партнера и зарегистрируйся на сайте, чтобы активировать купон.",
    "invite": "Ваша личная ссылка:\n{{invite_url}}\nВойдите и выполните условия согласия для активации доступного купона.",
    "button": "Я подписался"
  }
};
