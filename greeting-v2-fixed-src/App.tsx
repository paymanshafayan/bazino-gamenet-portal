import Header from "./components/Header";
import Footer from "./components/Footer";
import LeftPanel from "./components/LeftPanel";
import RightPanel from "./components/RightPanel";
import CenterStage from "./components/CenterStage";

export default function App() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#05030d] text-white select-none">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/bg-city.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

      {/* Ambient neon glows */}
      <div className="pointer-events-none absolute left-10 top-1/3 h-64 w-64 rounded-full bg-purple-600/20 blur-[100px]" />
      <div className="pointer-events-none absolute right-10 top-1/2 h-64 w-64 rounded-full bg-amber-400/10 blur-[100px]" />

      <Header />

      {/* Main dashboard content */}
      <main className="relative z-10 flex h-full w-full items-center justify-center gap-6 px-6 pb-20 pt-16 sm:px-10 sm:pb-24 sm:pt-20 lg:gap-10 xl:gap-16">
        <LeftPanel />
        <div className="flex h-full w-full max-w-md flex-1 items-stretch justify-center sm:max-w-lg lg:max-w-xl">
          <CenterStage />
        </div>
        <RightPanel />
      </main>

      <Footer />
    </div>
  );
}
