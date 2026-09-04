import React, { useState } from 'react';
import { pubspecCode, themeCode, modelsCode, homeScreenCode, mainCode, messagesScreenCode, jarvisCode } from '../data/flutterCode';
import { Copy, Check, Smartphone, Layers, Terminal, Server, HelpCircle, Code2, Play, Cpu } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';

interface Props {
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function FlutterCodeViewer({ addNotification }: Props) {
  const { dir, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'pubspec' | 'main' | 'theme' | 'models' | 'screens' | 'messages_screen' | 'jarvis_assistant'>('main');
  const [copied, setCopied] = useState(false);

  const getCode = () => {
    switch (activeTab) {
      case 'pubspec': return pubspecCode;
      case 'main': return mainCode;
      case 'theme': return themeCode;
      case 'models': return modelsCode;
      case 'screens': return homeScreenCode;
      case 'messages_screen': return messagesScreenCode;
      case 'jarvis_assistant': return jarvisCode;
      default: return mainCode;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    const msg = L(language, { fa: 'کد فلاتر با موفقیت کپی شد!', en: 'Flutter source code successfully copied to clipboard!', ru: 'Исходный код Flutter скопирован!', tr: 'Flutter kaynak kodu panoya kopyalandı!' });
    addNotification(msg, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 animate-fade-in" dir={dir}>
      
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 mb-6 border-b border-white/10 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-6 bg-primary rounded-full"></span>
            <h2 className="text-xl font-black text-white">
              {L(language, { fa: 'سورس‌کد اپلیکیشن فلاتر (Android, iOS, Web)', en: 'Flutter Mobile & Web Application Source Code', ru: 'Исходный код Flutter-приложения (Android, iOS, Web)', tr: 'Flutter Uygulaması Kaynak Kodu (Android, iOS, Web)' })}
            </h2>
          </div>
          <p className="text-gray-400 text-xs font-medium leading-relaxed max-w-3xl">
            {L(language, { fa: 'کدهای کامل کلاینت فلاتر طراحی شده برای همین پروژه، با قابلیت پشتیبانی از پلتفرم‌های اندروید، آی‌او‌اس و وب بدون پنل مدیریت و هماهنگ با تم تیره-طلایی.', en: 'Full client-side Flutter application matching this project theme. Complete with cross-platform responsive layouts for Android, iOS, and Web.', ru: 'Полный клиент Flutter, разработанный для этого проекта: кроссплатформенные адаптивные макеты для Android, iOS и Web в тёмно-золотой теме.', tr: 'Bu proje için tasarlanan tam Flutter istemcisi: Android, iOS ve Web için koyu-altın temayla uyumlu, çapraz platform duyarlı düzenler.' })}
          </p>
        </div>

        {/* Export Badge */}
        <div className="flex bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl self-start xl:self-auto shrink-0">
          <span className="text-[10px] font-black text-primary uppercase tracking-wider flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5 animate-pulse" />
            {L(language, { fa: 'فولدر خروجی: /flutter_app', en: 'Export Path: /flutter_app', ru: 'Папка вывода: /flutter_app', tr: 'Çıktı klasörü: /flutter_app' })}
          </span>
        </div>
      </div>

      {/* Controller Buttons */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
          {L(language, { fa: 'زبان برنامه نویسی: Dart / Flutter SDK', en: 'Programming Language: Dart / Flutter', ru: 'Язык программирования: Dart / Flutter SDK', tr: 'Programlama dili: Dart / Flutter SDK' })}
        </span>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/20 text-xs text-white font-bold transition-all cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-primary" />}
          <span>{copied ? (L(language, { fa: 'کپی شد!', en: 'Copied!', ru: 'Скопировано!', tr: 'Kopyalandı!' })) : (L(language, { fa: 'کپی کدهای Dart', en: 'Copy code', ru: 'Копировать Dart-код', tr: 'Dart kodunu kopyala' }))}</span>
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="flex flex-wrap gap-2 mb-4 bg-white/5 p-1.5 rounded-2xl border border-white/5">
        <button
          onClick={() => setActiveTab('main')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
            activeTab === 'main'
              ? 'bg-primary text-black shadow-[0_0_10px_rgba(255,184,0,0.3)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>main.dart</span>
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
            activeTab === 'theme'
              ? 'bg-primary text-black shadow-[0_0_10px_rgba(255,184,0,0.3)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>theme.dart</span>
        </button>
        <button
          onClick={() => setActiveTab('models')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
            activeTab === 'models'
              ? 'bg-primary text-black shadow-[0_0_10px_rgba(255,184,0,0.3)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>models.dart</span>
        </button>
        <button
          onClick={() => setActiveTab('screens')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
            activeTab === 'screens'
              ? 'bg-primary text-black shadow-[0_0_10px_rgba(255,184,0,0.3)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>home_screen.dart</span>
        </button>
        <button
          onClick={() => setActiveTab('messages_screen')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
            activeTab === 'messages_screen'
              ? 'bg-primary text-black shadow-[0_0_10px_rgba(255,184,0,0.3)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>messages_screen.dart</span>
        </button>
        <button
          onClick={() => setActiveTab('jarvis_assistant')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
            activeTab === 'jarvis_assistant'
              ? 'bg-primary text-black shadow-[0_0_10px_rgba(255,184,0,0.3)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>jarvis_assistant.dart</span>
        </button>
        <button
          onClick={() => setActiveTab('pubspec')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
            activeTab === 'pubspec'
              ? 'bg-primary text-black shadow-[0_0_10px_rgba(255,184,0,0.3)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>pubspec.yaml</span>
        </button>
      </div>

      {/* Code panel with syntax highlight look */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#07080a] p-5 font-mono text-xs leading-relaxed text-slate-300 ltr-code text-left animate-fade-in" style={{ direction: 'ltr' }}>
        <div className="absolute top-3 right-3 text-slate-500 select-none text-[10px] bg-black/40 px-2.5 py-1 rounded-full border border-white/5 font-bold uppercase tracking-wider">
          Dart / Flutter
        </div>
        <pre className="overflow-x-auto max-h-[500px] whitespace-pre p-2 scrollbar-thin scrollbar-thumb-slate-800">
          <code className="text-amber-400 font-semibold block mb-2">
            {`// Flutter Module: /flutter_app/lib/${activeTab === 'pubspec' ? 'pubspec.yaml' : activeTab === 'screens' ? 'screens/home_screen.dart' : activeTab === 'messages_screen' ? 'screens/messages_screen.dart' : activeTab === 'jarvis_assistant' ? 'screens/jarvis_assistant.dart' : activeTab + '.dart'}`}
          </code>
          <code>{getCode()}</code>
        </pre>
      </div>

      {/* Quick Launch Card */}
      <div className="mt-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs leading-relaxed text-amber-300">
        <p className="font-bold mb-1 flex items-center gap-2 text-white">
          <Play className="w-4 h-4 text-primary" />
          <span>{L(language, { fa: '💡 راهنمای اجرای اپلیکیشن فلاتر در محیط کلاینت:', en: '💡 Running the Flutter App:', ru: '💡 Запуск Flutter-приложения:', tr: '💡 Flutter uygulamasını çalıştırma:' })}</span>
        </p>
        <p className="text-xs text-gray-300 font-medium">
          {L(language, { fa: 'سورس‌کد کامل فلاتر به صورت کاملا ساختاریافته در فولدر /flutter_app دایرکتوری اصلی ذخیره شده است. برای اجرا دستورات زیر را وارد کنید:', en: 'The complete code is fully structured inside the /flutter_app folder. To run the app on Android, iOS or Web, execute the following commands:', ru: 'Полный структурированный код находится в папке /flutter_app корневого каталога. Для запуска на Android, iOS или Web выполните команды:', tr: 'Tam ve yapılandırılmış kaynak kod ana dizindeki /flutter_app klasöründedir. Android, iOS veya Web’de çalıştırmak için aşağıdaki komutları girin:' })}
        </p>
        <pre className="bg-black/60 p-3 rounded-xl mt-2.5 text-xs font-mono text-primary text-left" style={{ direction: 'ltr' }}>
          cd flutter_app<br />
          flutter pub get<br />
          flutter run -d chrome  # (یا -d android / -d ios برای موبایل)
        </pre>
      </div>
    </div>
  );
}
