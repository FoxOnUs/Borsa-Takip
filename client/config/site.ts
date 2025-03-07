export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "BSTakip",
  description: "...",
  navItems: [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "Stock Chart",
      href: "/stock_chart",
    },
  ],
  navMenuItems: [
    {
      label: "Profile",
      href: "/profile",
    },
    {
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      label: "Projects",
      href: "/projects",
    },
    {
      label: "Team",
      href: "/team",
    },
    {
      label: "Calendar",
      href: "/calendar",
    },
    {
      label: "Settings",
      href: "/settings",
    },
    {
      label: "Help & Feedback",
      href: "/help-feedback",
    },
    {
      label: "Logout",
      href: "/logout",
    },
  ],
};
