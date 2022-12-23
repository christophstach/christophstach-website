export interface NavbarLink {
  href: string
  text: string
  exact?: boolean
}

const navbarLinks: NavbarLink[] = [
  {
    href: "/",
    text: "Home",
    exact: true,
  },
  {
    href: "/about-me",
    text: "About me",
  },
  {
    href: "/curriculum",
    text: "Curriculum",
  },
  {
    href: "/projects",
    text: "Projects",
  },
  // {
  //   href: "/contact",
  //   text: "Contact",
  // },
]

export default navbarLinks
