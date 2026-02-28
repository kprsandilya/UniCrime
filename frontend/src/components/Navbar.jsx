import { Database, MessageSquare } from "lucide-react";

export default function Navbar({ activeScreen, setActiveScreen }) {
  const navItems = [
    { id: "query", label: "Data Query", icon: Database },
    { id: "chat", label: "Chat", icon: MessageSquare },
  ];

  return (
    <nav className="w-20 flex-shrink-0 bg-white border-r border-neutral-200 h-screen flex flex-col items-center py-6">
      
      {/* Logo / Header */}
      <div className="mb-10 text-neutral-800 font-semibold text-lg">
        ⚡
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className="group relative flex items-center justify-center"
            >
              {/* Active Indicator */}
              {isActive && (
                <span className="absolute -left-3 w-1.5 h-8 bg-neutral-900 rounded-r-md" />
              )}

              {/* Icon Button */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200
                  ${
                    isActive
                      ? "bg-neutral-900 text-white shadow-md"
                      : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                  }
                `}
              >
                <Icon size={20} />
              </div>

              {/* Tooltip */}
              <span className="absolute left-16 whitespace-nowrap px-3 py-1.5 rounded-md text-sm bg-neutral-900 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}