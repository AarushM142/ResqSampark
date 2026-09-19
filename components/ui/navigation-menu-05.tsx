"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  Boxes,
  type LucideIcon,
} from "lucide-react";
import { TransitionLink } from "@/app/components/TransitionLink";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  isActive?: boolean;
};

export const RESQ_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/incidents", icon: LayoutDashboard },
  { title: "Incidents", href: "/incidents?view=incidents", icon: AlertTriangle },
  { title: "Response Teams", href: "/incidents?view=teams", icon: Users },
  { title: "Resources", href: "/incidents?view=resources", icon: Boxes },
];

interface NavigationMenuProps {
  items?: NavItem[];
  className?: string;
}

function getIsActive(
  item: NavItem,
  pathname: string,
  currentView: string | null
): boolean {
  if (item.isActive !== undefined) return item.isActive;

  if (pathname === "/incidents") {
    if (item.href === "/incidents") {
      // Dashboard is active when on /incidents with no view or view=dashboard
      return !currentView || currentView === "dashboard";
    }
    if (item.href.includes("view=")) {
      const targetView = new URLSearchParams(item.href.split("?")[1]).get("view");
      return currentView === targetView;
    }
    return false;
  }

  if (pathname.startsWith("/incidents/")) {
    // Incident detail view highlights Incidents tab
    return item.title === "Incidents";
  }

  // Exact match for other standalone pages
  return pathname === item.href;
}

function NavigationMenuContent({
  items = RESQ_NAV_ITEMS,
  className,
}: NavigationMenuProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams ? searchParams.get("view") : null;

  return (
    <NavigationMenu className={className}>
      <NavigationMenuList className="space-x-5 md:space-x-7">
        {items.map((item) => {
          const isActive = getIsActive(item, pathname, currentView);
          const Icon = item.icon;

          return (
            <NavigationMenuItem key={item.title}>
              <NavigationMenuLink
                active={isActive}
                asChild
                className={cn(
                  "group relative inline-flex h-9 w-max items-center justify-center px-1 py-2 font-bold text-[13.5px] transition-colors cursor-pointer",
                  "before:absolute before:inset-x-0 before:bottom-0 before:h-[2.5px] before:bg-zinc-950 before:rounded-full before:transition-transform before:duration-200 before:ease-out",
                  isActive
                    ? "text-zinc-950 before:scale-x-100"
                    : "text-zinc-600 before:scale-x-0 hover:text-zinc-950 hover:before:scale-x-100",
                  "focus:text-zinc-950 focus:outline-hidden focus:before:scale-x-100",
                  "disabled:pointer-events-none disabled:opacity-50",
                  "hover:bg-transparent focus:bg-transparent active:bg-transparent"
                )}
              >
                <TransitionLink
                  className="flex items-center gap-2 cursor-pointer"
                  href={item.href}
                  direction="forward"
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-zinc-950"
                        : "text-zinc-500 group-hover:text-zinc-950"
                    )}
                  />
                  <span>{item.title}</span>
                </TransitionLink>
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

export default function NavigationMenuWithActiveItem(props: NavigationMenuProps) {
  return (
    <Suspense fallback={null}>
      <NavigationMenuContent {...props} />
    </Suspense>
  );
}
