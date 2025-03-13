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
      label: "Stock Charts",
      href: "/stock_charts",
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
