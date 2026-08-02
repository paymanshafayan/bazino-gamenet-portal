import React, { useState } from 'react';
import { 
  csharpModelsCode, 
  csharpDbContextCode, 
  csharpServiceCode, 
  csharpControllersCode,
  csharpSolutionStructureCode,
  csharpProgramCode
} from '../data/csharpCode';
import {
  csharpMvcStructureCode,
  csharpMvcProgramCode,
  csharpMvcViewModelsCode,
  csharpMvcControllersCode,
  csharpMvcLayoutCode,
  csharpMvcViewsCode
} from '../data/csharpMvcCode';
import { Copy, Check, Code, Database, Cpu, FileJson, FolderTree, Settings, Eye, LayoutGrid } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function CsharpCodeViewer({ addNotification }: Props) {
  const { dir, language } = useLanguage();
  const [architecture, setArchitecture] = useState<'api' | 'mvc'>('mvc'); // Default to MVC to emphasize the requested architecture
  const [activeApiTab, setActiveApiTab] = useState<'structure' | 'models' | 'dbcontext' | 'services' | 'controllers' | 'program'>('structure');
  const [activeMvcTab, setActiveMvcTab] = useState<'mvcStructure' | 'viewmodels' | 'mvcControllers' | 'layout' | 'views' | 'mvcProgram'>('mvcStructure');
  const [copied, setCopied] = useState(false);

  const getActiveCode = () => {
    if (architecture === 'api') {
      switch (activeApiTab) {
        case 'structure': return csharpSolutionStructureCode;
        case 'models': return csharpModelsCode;
        case 'dbcontext': return csharpDbContextCode;
        case 'services': return csharpServiceCode;
        case 'controllers': return csharpControllersCode;
        case 'program': return csharpProgramCode;
      }
    } else {
      switch (activeMvcTab) {
        case 'mvcStructure': return csharpMvcStructureCode;
        case 'viewmodels': return csharpMvcViewModelsCode;
        case 'mvcControllers': return csharpMvcControllersCode;
        case 'layout': return csharpMvcLayoutCode;
        case 'views': return csharpMvcViewsCode;
        case 'mvcProgram': return csharpMvcProgramCode;
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    const successMsg = language === 'fa'
      ? 'کد سی‌شارپ با موفقیت در کلیپ‌بورد کپی شد!'
      : language === 'en'
      ? 'C# source code copied to clipboard successfully!'
      : language === 'ru'
      ? 'C# исходный код успешно скопирован в буфер обмена!'
      : 'C# kaynak kodu başarıyla panoya kopyalandı!';
    addNotification(successMsg, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 animate-fade-in" dir={dir}>
      
      {/* Top Section with Architecture Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 mb-6 border-b border-white/10 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-6 bg-primary rounded-full"></span>
            <h2 className="text-xl font-black text-white">
              {language === 'fa' && 'کدهای معماری کلاینت و سرور دات‌نت'}
              {language === 'en' && '.NET Client & Server Architecture Code'}
              {language === 'ru' && 'Исходный код клиента и сервера .NET'}
              {language === 'tr' && '.NET İstemci ve Sunucu Mimarisi Kodları'}
            </h2>
          </div>
          <p className="text-gray-400 text-xs font-medium leading-relaxed max-w-3xl">
            {language === 'fa' && 'بخش کلاینت بجای React با استفاده از معماری ASP.NET Core MVC (کدهای تمیز و الگوهای Razor Views) و کدهای سمت سرور (WebAPI و لایه تجاری) پیاده‌سازی شده است.'}
            {language === 'en' && 'The client layer is fully designed using ASP.NET Core MVC (clean controllers and Razor Views) instead of React, accompanied by the WebAPI business tier.'}
            {language === 'ru' && 'Клиентский слой разработан с использованием ASP.NET Core MVC (Razor Views) вместо React, вместе с бэкендом WebAPI.'}
            {language === 'tr' && 'İstemci katmanı, React yerine ASP.NET Core MVC (Razor Views) mimarisi kullanılarak temiz kontrolcülerle tasarlanmıştır.'}
          </p>
        </div>

        {/* Dynamic Architectural Toggle Button Group */}
        <div className="flex bg-black/40 border border-white/10 p-1 rounded-2xl self-start xl:self-auto shrink-0">
          <button
            onClick={() => setArchitecture('mvc')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              architecture === 'mvc'
                ? 'bg-primary text-black font-extrabold shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>
              {language === 'fa' && 'طراحی کلاینت (MVC)'}
              {language === 'en' && 'Client Side (MVC)'}
            </span>
          </button>
          <button
            onClick={() => setArchitecture('api')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              architecture === 'api'
                ? 'bg-primary text-black font-extrabold shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>
              {language === 'fa' && 'سمت سرور (Web API)'}
              {language === 'en' && 'Server Side (Web API)'}
            </span>
          </button>
        </div>
      </div>

      {/* Copy active code and Tip Header */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
          {architecture === 'mvc' ? (
            language === 'fa' ? 'فریم‌ورک کلاینت: ASP.NET Core 9.0 Razor Views' : 'Client-side Framework: Razor Pages/MVC'
          ) : (
            language === 'fa' ? 'فریم‌ورک سرور: .NET 9.0 RESTful Web API' : 'Server-side Framework: .NET 9.0 Web API'
          )}
        </span>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/20 text-xs text-white font-bold transition-all cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-primary" />}
          <span>{copied ? (language === 'fa' ? 'کپی شد!' : 'Copied!') : (language === 'fa' ? 'کپی کد این بخش' : 'Copy code')}</span>
        </button>
      </div>

      {/* Tabs navigation based on active Architecture */}
      {architecture === 'mvc' ? (
        // MVC Client Tabs
        <div className="flex flex-wrap gap-2 mb-4 bg-white/5 p-1.5 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveMvcTab('mvcStructure')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
              activeMvcTab === 'mvcStructure'
                ? 'bg-accentPurp text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'ساختار پروژه MVC' : 'Project Structure'}</span>
          </button>
          <button
            onClick={() => setActiveMvcTab('viewmodels')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
              activeMvcTab === 'viewmodels'
                ? 'bg-accentPurp text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'مدل‌های نمایش (ViewModels)' : 'ViewModels'}</span>
          </button>
          <button
            onClick={() => setActiveMvcTab('mvcControllers')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
              activeMvcTab === 'mvcControllers'
                ? 'bg-accentPurp text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'کنترلرهای MVC' : 'MVC Controllers'}</span>
          </button>
          <button
            onClick={() => setActiveMvcTab('layout')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
              activeMvcTab === 'layout'
                ? 'bg-accentPurp text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'قالب کلی (Layout)' : 'Layout Template'}</span>
          </button>
          <button
            onClick={() => setActiveMvcTab('views')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
              activeMvcTab === 'views'
                ? 'bg-accentPurp text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'صفحات نمایش (Razor Views)' : 'Razor Views'}</span>
          </button>
          <button
            onClick={() => setActiveMvcTab('mvcProgram')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
              activeMvcTab === 'mvcProgram'
                ? 'bg-accentPurp text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'پیکربندی (Program.cs)' : 'Program.cs'}</span>
          </button>
        </div>
      ) : (
        // API Backend Tabs
        <div className="flex flex-wrap gap-2 mb-4 bg-white/5 p-1.5 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveApiTab('structure')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
              activeApiTab === 'structure'
                ? 'bg-accentPurp text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'ساختار پروژه (.sln)' : 'Project Structure'}</span>
          </button>
          <button
            onClick={() => setActiveApiTab('models')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
              activeApiTab === 'models'
                ? 'bg-accentPurp text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'کلاس‌های مدل (Entities)' : 'Domain Entities'}</span>
          </button>
          <button
            onClick={() => setActiveApiTab('dbcontext')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
              activeApiTab === 'dbcontext'
                ? 'bg-accentPurp text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'دیتابیس (DbContext)' : 'DbContext'}</span>
          </button>
          <button
            onClick={() => setActiveApiTab('services')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
              activeApiTab === 'services'
                ? 'bg-accentPurp text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'سرویس‌ها (Services)' : 'Domain Services'}</span>
          </button>
          <button
            onClick={() => setActiveApiTab('controllers')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
              activeApiTab === 'controllers'
                ? 'bg-accentPurp text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'کنترلرهای API' : 'WebAPI Controllers'}</span>
          </button>
          <button
            onClick={() => setActiveApiTab('program')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer ${
              activeApiTab === 'program'
                ? 'bg-accentPurp text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'تنظیمات استارتاپ' : 'Startup.cs'}</span>
          </button>
        </div>
      )}

      {/* Code panel with syntax highlight look */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#0d122b] p-5 font-mono text-xs leading-relaxed text-slate-300 ltr-code text-left" style={{ direction: 'ltr' }}>
        <div className="absolute top-3 right-3 text-slate-500 select-none text-[9px] bg-black/40 px-2.5 py-1 rounded-full border border-white/5 font-bold uppercase tracking-wider">
          {architecture === 'mvc' ? 'C# / Razor engine' : 'C# / Entity Framework'}
        </div>
        <pre className="overflow-x-auto max-h-[500px] whitespace-pre p-2 scrollbar-thin scrollbar-thumb-slate-800">
          <code className="text-emerald-400 font-semibold block mb-2">
            {architecture === 'mvc' 
              ? `// Module: GameNet.MVC Client Page - ${activeMvcTab.toUpperCase()}`
              : `// Module: GameNet Backend Web API - ${activeApiTab.toUpperCase()}`}
          </code>
          <code>{getActiveCode()}</code>
        </pre>
      </div>

      {/* Tip Box */}
      <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/20 text-xs leading-relaxed text-cyan-300">
        <p className="font-bold mb-1 flex items-center gap-2 text-white">
          <span>{language === 'fa' ? '💡 راهنمای اجرای کلاینت MVC در VS Code:' : '💡 Running the MVC App in VS Code:'}</span>
        </p>
        <p className="text-xs text-gray-300 font-medium">
          {language === 'fa' 
            ? 'برای اجرای پروژه کلاینت MVC طراحی شده، به فولدر پروژه بروید و دستور زیر را اجرا کنید. این دستور کلاینت را در پورت پیش‌فرض وب باز خواهد کرد:' 
            : 'To execute the MVC client-side web application, navigate to the MVC project folder in your terminal and run:'}
        </p>
        <pre className="bg-black/60 p-3 rounded-xl mt-2.5 text-xs font-mono text-[#06B6D4] text-left" style={{ direction: 'ltr' }}>
          dotnet run --project server/GameNet.MVC/GameNet.MVC.csproj
        </pre>
      </div>
    </div>
  );
}
