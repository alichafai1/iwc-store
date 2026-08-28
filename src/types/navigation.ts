export interface NavLink {
  href: string;
  label: string;
}

export interface FooterNav {
  shop: NavLink[];
  collections: NavLink[];
  customerCare: NavLink[];
  legal: NavLink[];
}
