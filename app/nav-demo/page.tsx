import NavigationMenu05Demo from "@/components/ui/navigation-menu-05-demo";

export const metadata = {
  title: "Navigation Menu 05 Demo — ResQSampark",
};

export default function NavDemoPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-md">
        <h2 className="text-base font-bold text-zinc-950 mb-6 text-center">
          Navigation Menu 05 Demo
        </h2>
        <NavigationMenu05Demo />
      </div>
    </div>
  );
}
