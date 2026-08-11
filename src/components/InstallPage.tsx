import React, { useState } from 'react';
import { 
  Database, Server, Shield, Sparkles, Layout, Globe, Check, AlertCircle, ChevronRight, Terminal, User
} from 'lucide-react';
import bazinoLogo from '../assets/images/bazino_logo_user.webp';

interface InstallPageProps {
  onInstallationComplete: () => void;
}

export default function InstallPage({ onInstallationComplete }: InstallPageProps) {
  const [lang, setLang] = useState<'fa' | 'en'>('fa');
  const [storeName, setStoreName] = useState('گیم‌نت فوق پیشرفته بازینو');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminEmail, setAdminEmail] = useState('admin@gamenet.com');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [confirmPassword, setConfirmPassword] = useState('admin123');
  
  // Database State
  const [dbType, setDbType] = useState<'sqlite' | 'sqlserver' | 'mongodb'>('sqlite');
  const [useConnectionString, setUseConnectionString] = useState(false);
  const [connectionString, setConnectionString] = useState('');
  
  // Db Config Fields
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('1433');
  const [dbName, setDbName] = useState('BazinoDb');
  const [dbUsername, setDbUsername] = useState('sa');
  const [dbPassword, setDbPassword] = useState('');
  
  const [createDbIfNotExist, setCreateDbIfNotExist] = useState(true);
  const [installSampleData, setInstallSampleData] = useState(true);

  // Install process states
  const [isInstalling, setIsInstalling] = useState(false);
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [installSuccess, setInstallSuccess] = useState(false);

  const t = {
    fa: {
      title: 'سیستم نصب خودکار بازینو',
      subtitle: 'خوش آمدید! برای شروع به کار سالن، لطفاً اطلاعات اولیه دیتابیس و مدیریت را تنظیم کنید.',
      storeInfo: '۱. اطلاعات عمومی سالن',
      storeName: 'نام سالن گیم‌نت',
      adminInfo: '۲. حساب کاربری مدیر کل (Administrator)',
      adminUser: 'نام کاربری مدیر',
      adminEmail: 'ایمیل مدیر کل',
      password: 'کلمه عبور',
      confirmPass: 'تکرار کلمه عبور',
      dbConfig: '۳. پیکربندی پایگاه داده',
      dbType: 'انتخاب نوع موتور پایگاه داده',
      useConnStr: 'استفاده از کانکشن استرینگ سفارشی (Connection String)',
      connStr: 'متن کانکشن استرینگ دیتابیس',
      host: 'آدرس سرور دیتابیس (Host / Server)',
      port: 'پورت ارتباطی (Port)',
      dbNameLabel: 'نام پایگاه داده (Database Name)',
      dbUser: 'نام کاربری دیتابیس',
      dbPass: 'کلمه عبور دیتابیس',
      createDb: 'در صورت عدم وجود دیتابیس، آن را بسازد',
      seedSample: 'افزودن اطلاعات و داده‌های نمونه اولیه (تورنمنت‌ها، کافه بوفه، پکیج‌ها و اسلایدرها)',
      installBtn: 'نصب و راه‌اندازی سالن بازینو',
      installing: 'در حال نصب و پیکربندی...',
      successTitle: 'راه‌اندازی با موفقیت انجام شد!',
      successDesc: 'سایت با پایگاه داده مورد نظر متصل و حساب مدیر کل ایجاد گردید. اکنون آماده استفاده هستید.',
      enterSite: 'ورود به پنل کاربری سالن',
      passMismatch: 'تکرار کلمه عبور با کلمه عبور همخوانی ندارد.',
      sqliteDesc: 'پایگاه داده سبک و محلی بدون نیاز به سرور جانبی (مناسب دمو و فایل‌های محلی)',
      sqlserverDesc: 'موتور دیتابیس قدرتمند مایکروسافت (Enterprise SQL Server) برای داده‌های سنگین',
      mongodbDesc: 'پایگاه داده سندگرا و مقیاس‌پذیر NoSQL (MongoDB) برای سیستم‌های توزیع شده'
    },
    en: {
      title: 'Bazino Installer Wizard',
      subtitle: 'Welcome! Please configure the database and administrator account to bootstrap your gaming lounge.',
      storeInfo: '1. Store Information',
      storeName: 'Gaming Center Name',
      adminInfo: '2. Administrator Account',
      adminUser: 'Admin Username',
      adminEmail: 'Admin Email',
      password: 'Password',
      confirmPass: 'Confirm Password',
      dbConfig: '3. Database Configuration',
      dbType: 'Database Engine Type',
      useConnStr: 'Use custom connection string (Overrides fields)',
      connStr: 'Connection String',
      host: 'Database Host / Server Address',
      port: 'Database Port',
      dbNameLabel: 'Database Name',
      dbUser: 'Database Username',
      dbPass: 'Database Password',
      createDb: 'Create database if it does not exist',
      seedSample: 'Install sample default data (CS2 Tournaments, Cafe Items, Accessories, Sliders)',
      installBtn: 'Install Bazino System',
      installing: 'Installing and configuring...',
      successTitle: 'Installation Completed Successfully!',
      successDesc: 'The system has been configured with the database and your administrator account is ready.',
      enterSite: 'Go to Lounge Dashboard',
      passMismatch: 'Passwords do not match.',
      sqliteDesc: 'Local lightweight database engine. Fast and zero-configuration required.',
      sqlserverDesc: 'Microsoft SQL Server enterprise engine for high concurrency and relational integrity.',
      mongodbDesc: 'NoSQL Document-oriented scalable database (MongoDB) for flexible schemas.'
    }
  }[lang];

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword !== confirmPassword) {
      setErrorMessage(lang === 'fa' ? t.passMismatch : t.passMismatch);
      return;
    }

    setErrorMessage('');
    setIsInstalling(true);
    setInstallLogs([]);

    const addLog = (msg: string) => {
      setInstallLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      addLog(lang === 'fa' ? 'آغاز فرآیند راه‌اندازی سالن...' : 'Beginning installation process...');
      await new Promise(resolve => setTimeout(resolve, 600));

      addLog(lang === 'fa' ? `انتخاب پایگاه داده: ${dbType.toUpperCase()}` : `Database selected: ${dbType.toUpperCase()}`);
      await new Promise(resolve => setTimeout(resolve, 500));

      if (useConnectionString) {
        addLog(lang === 'fa' ? 'اعتبارسنجی کانکشن استرینگ سفارشی...' : 'Validating custom connection string...');
      } else {
        addLog(lang === 'fa' ? `برقراری ارتباط با ${dbHost}:${dbPort}...` : `Connecting to ${dbHost}:${dbPort}...`);
      }
      await new Promise(resolve => setTimeout(resolve, 800));

      if (createDbIfNotExist) {
        addLog(lang === 'fa' ? `بررسی وجود دیتابیس [${dbName}]...` : `Checking database [${dbName}]...`);
        await new Promise(resolve => setTimeout(resolve, 600));
        addLog(lang === 'fa' ? `دیتابیس [${dbName}] با موفقیت آماده‌سازی شد.` : `Database [${dbName}] verified/created.`);
      }

      addLog(lang === 'fa' ? 'در حال ایجاد جداول و اسکیماهای سیستمی...' : 'Generating database schemas and system tables...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      addLog(lang === 'fa' ? `در حال ثبت حساب کاربری مدیر کل [${adminUsername}]...` : `Registering administrator [${adminUsername}]...`);
      await new Promise(resolve => setTimeout(resolve, 700));

      if (installSampleData) {
        addLog(lang === 'fa' ? 'در حال تزریق داده‌های نمونه سالن (بوفه، تورنمنت‌ها، سیستم‌ها)...' : 'Seeding rich default gaming lounge products and events...');
        await new Promise(resolve => setTimeout(resolve, 1200));
      }

      addLog(lang === 'fa' ? 'ذخیره‌سازی اطلاعات پیکربندی در فایل سیستم...' : 'Saving installation properties...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Make actual API call
      const res = await fetch('/api/install/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName,
          adminEmail,
          adminUsername,
          adminPassword,
          dbType,
          useConnectionString,
          connectionString: useConnectionString ? connectionString : `Server=${dbHost}:${dbPort};Database=${dbName};`,
          dbConfig: {
            host: dbHost,
            port: dbPort,
            dbName,
            username: dbUsername,
            password: dbPassword
          },
          createDbIfNotExist,
          installSampleData
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'API installation error');
      }

      addLog(lang === 'fa' ? 'پیکربندی با موفقیت به پایان رسید!' : 'Installation finalized! Database locked.');
      setInstallSuccess(true);
    } catch (err: any) {
      addLog(`[ERROR] ${err.message}`);
      setErrorMessage(err.message);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="min-h-[100dvh] pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] w-full bg-[#050714] text-white flex flex-col justify-center items-center py-12 px-4 selection:bg-emerald-500/30 font-sans" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Decorative Blur Backgrounds */}
      <div className="fixed top-[-20%] left-[-20%] w-[60vw] h-[60vw] bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-20%] w-[60vw] h-[60vw] bg-blue-500/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="w-full max-w-4xl z-10">
        {/* Language Switcher */}
        <div className="flex justify-end gap-2 mb-6">
          <button 
            onClick={() => setLang('fa')}
            className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${lang === 'fa' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>فارسی</span>
          </button>
          <button 
            onClick={() => setLang('en')}
            className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${lang === 'en' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>English</span>
          </button>
        </div>

        {/* Header card */}
        <div className="bg-[#0b0e24]/80 border border-white/10 rounded-3xl p-6 md:p-8 mb-6 text-center backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse" />
          <div className="flex items-center justify-center gap-4 mb-4">
            <img loading="lazy" src={bazinoLogo} alt="Bazino Pro" width="64" height="64" className="h-16 w-auto" />
            <div className="h-12 w-[1px] bg-white/10" />
            <h1 className="text-3xl font-display font-black tracking-wider text-white">
              BAZINO <span className="text-emerald-500">PRO</span>
            </h1>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-gray-100 mb-2">{t.title}</h2>
          <p className="text-xs md:text-sm text-gray-400 max-w-2xl mx-auto leading-relaxed">{t.subtitle}</p>
        </div>

        {installSuccess ? (
          /* SUCCESS SCREEN */
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-8 text-center backdrop-blur-xl animate-fade-in">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-emerald-500 animate-bounce" />
            </div>
            <h3 className="text-2xl font-black text-white mb-3">{t.successTitle}</h3>
            <p className="text-sm text-gray-300 mb-8 max-w-md mx-auto leading-relaxed">{t.successDesc}</p>
            
            {/* Terminal output summary */}
            <div className="bg-black/80 border border-white/5 rounded-2xl p-4 text-left font-mono text-xs text-emerald-400/80 mb-8 max-w-lg mx-auto overflow-y-auto max-h-48" dir="ltr">
              <div className="flex items-center gap-1.5 text-gray-500 border-b border-white/5 pb-2 mb-2">
                <Terminal className="w-3.5 h-3.5" />
                <span>Installation Log Terminal</span>
              </div>
              {installLogs.map((log, index) => (
                <div key={index} className="leading-5">{log}</div>
              ))}
            </div>

            <button
              onClick={onInstallationComplete}
              className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-black font-black text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 mx-auto cursor-pointer"
            >
              <span>{t.enterSite}</span>
              <ChevronRight className={`w-4 h-4 ${lang === 'fa' ? 'rotate-180' : ''}`} />
            </button>
          </div>
        ) : (
          /* FORM / INSTALL WIZARD */
          <form onSubmit={handleInstall} className="space-y-6">
            
            {/* 1. General Info */}
            <div className="bg-[#0b0e24]/80 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Layout className="w-4 h-4 text-emerald-500" />
                <span>{t.storeInfo}</span>
              </h3>
              <div>
                <label className="text-xs text-gray-400 block mb-2 font-bold">{t.storeName}</label>
                <input 
                  type="text" 
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                  placeholder="e.g. Bazino Premium GameNet"
                />
              </div>
            </div>

            {/* 2. Admin User account */}
            <div className="bg-[#0b0e24]/80 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>{t.adminInfo}</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-2 font-bold">{t.adminUser}</label>
                  <input 
                    type="text" 
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-2 font-bold">{t.adminEmail}</label>
                  <input 
                    type="email" 
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-2 font-bold">{t.password}</label>
                  <input 
                    type="password" 
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-2 font-bold">{t.confirmPass}</label>
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* 3. Database Engine Config */}
            <div className="bg-[#0b0e24]/80 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-6">
              <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                <span>{t.dbConfig}</span>
              </h3>

              {/* Database type selection cards */}
              <div>
                <label className="text-xs text-gray-400 block mb-3 font-bold">{t.dbType}</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: 'sqlite', name: 'SQLite', icon: FileSystemIcon, desc: t.sqliteDesc, color: 'from-emerald-500/10 to-teal-500/5 border-emerald-500/20 text-emerald-400' },
                    { id: 'sqlserver', name: 'SQL Server', icon: Server, desc: t.sqlserverDesc, color: 'from-blue-500/10 to-indigo-500/5 border-blue-500/20 text-blue-400' },
                    { id: 'mongodb', name: 'MongoDB', icon: LeafIcon, desc: t.mongodbDesc, color: 'from-green-500/10 to-emerald-500/5 border-green-500/20 text-green-400' }
                  ].map(item => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        setDbType(item.id as any);
                        if (item.id === 'sqlite') {
                          setUseConnectionString(false);
                        }
                      }}
                      className={`p-4 rounded-xl border text-right cursor-pointer transition-all flex flex-col gap-2 relative overflow-hidden ${
                        dbType === item.id 
                          ? 'bg-gradient-to-br ' + item.color + ' border-emerald-500 shadow-lg shadow-emerald-500/5' 
                          : 'bg-black/30 border-white/5 hover:border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-display font-black text-lg text-white">{item.name}</span>
                        <item.icon className={`w-6 h-6 ${dbType === item.id ? 'text-emerald-500' : 'text-gray-500'}`} />
                      </div>
                      <p className="text-[10px] leading-relaxed text-gray-400">{item.desc}</p>
                      {dbType === item.id && (
                        <div className="absolute bottom-1.5 left-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Connection String selection (only for non-sqlite) */}
              {dbType !== 'sqlite' && (
                <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
                  <input 
                    type="checkbox" 
                    id="useConnStr" 
                    checked={useConnectionString}
                    onChange={(e) => setUseConnectionString(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-black/40 text-emerald-500 focus:ring-emerald-500/20"
                  />
                  <label htmlFor="useConnStr" className="text-xs text-gray-300 font-bold cursor-pointer select-none">
                    {t.useConnStr}
                  </label>
                </div>
              )}

              {/* Render either Connection String input OR modular fields */}
              {useConnectionString ? (
                /* Custom Connection String view */
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs text-gray-400 block font-bold">{t.connStr}</label>
                  <textarea
                    rows={2}
                    required
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    placeholder={
                      dbType === 'sqlserver' 
                        ? 'Server=myServerAddress;Database=myDataBase;User Id=myUsername;Password=myPassword;'
                        : 'mongodb+srv://username:password@cluster.mongodb.net/database'
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              ) : (
                /* Standard modular connection inputs (hidden if useConnectionString is true) */
                dbType !== 'sqlite' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-black/20 border border-white/5 animate-fade-in">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{t.host}</label>
                      <input 
                        type="text" 
                        required
                        value={dbHost}
                        onChange={(e) => setDbHost(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        placeholder="localhost"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{t.port}</label>
                      <input 
                        type="text" 
                        required
                        value={dbPort}
                        onChange={(e) => setDbPort(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        placeholder={dbType === 'sqlserver' ? '1433' : '27017'}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{t.dbNameLabel}</label>
                      <input 
                        type="text" 
                        required
                        value={dbName}
                        onChange={(e) => setDbName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        placeholder="BazinoDb"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{t.dbUser}</label>
                      <input 
                        type="text" 
                        value={dbUsername}
                        onChange={(e) => setDbUsername(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        placeholder="sa"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{t.dbPass}</label>
                      <input 
                        type="password" 
                        value={dbPassword}
                        onChange={(e) => setDbPassword(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )
              )}

              {/* Database Creation Checkbox */}
              <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
                <input 
                  type="checkbox" 
                  id="createDbIfNotExist" 
                  checked={createDbIfNotExist}
                  onChange={(e) => setCreateDbIfNotExist(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-black/40 text-emerald-500 focus:ring-emerald-500/20"
                />
                <label htmlFor="createDbIfNotExist" className="text-xs text-gray-300 font-bold cursor-pointer select-none">
                  {t.createDb}
                </label>
              </div>

              {/* Seed Sample Data Checkbox */}
              <div className="flex items-center gap-2 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                <input 
                  type="checkbox" 
                  id="installSampleData" 
                  checked={installSampleData}
                  onChange={(e) => setInstallSampleData(e.target.checked)}
                  className="w-4 h-4 rounded border-emerald-500/20 bg-black/40 text-emerald-500 focus:ring-emerald-500/20"
                />
                <label htmlFor="installSampleData" className="text-xs text-emerald-400 font-bold cursor-pointer select-none">
                  {t.seedSample}
                </label>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 bg-rose-950/50 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold animate-shake">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Installation Log Box while installing */}
            {isInstalling && (
              <div className="bg-black/90 border border-white/5 rounded-2xl p-4 font-mono text-[10px] text-emerald-400 leading-relaxed max-h-40 overflow-y-auto">
                <div className="flex items-center gap-1.5 text-gray-500 border-b border-white/5 pb-2 mb-2">
                  <Terminal className="w-3 h-3 animate-pulse text-emerald-500" />
                  <span>Terminal - Installation Progress...</span>
                </div>
                {installLogs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            )}

            {/* Submit btn */}
            <button
              type="submit"
              disabled={isInstalling}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-950 text-black font-black text-sm rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-wait"
            >
              {isInstalling ? (
                <>
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                  <span>{t.installing}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t.installBtn}</span>
                </>
              )}
            </button>

          </form>
        )}
      </div>
    </div>
  );
}

// Minimal icons for selection UI
function FileSystemIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function LeafIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 2 5.5a7 7 0 0 1-7 7h-3" />
      <path d="M19 2c-2.07 1.15-4.5 3-5 5" />
    </svg>
  );
}
