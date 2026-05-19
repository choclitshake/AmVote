import { NavLink } from 'react-router-dom';

const links = [
  { to: '/',       label: 'Home' },
  { to: '/verify', label: 'Verify' },
  { to: '/about',  label: 'About' },
];

export function Navigation() {
  return (
    <nav className="flex gap-1 -mb-px">
      {links.map(link => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) =>
            `px-4 py-2.5 font-body font-medium text-sm transition-all duration-200 border-b-2 ${
              isActive
                ? 'text-violet-400 border-violet-400'
                : 'text-text-secondary border-transparent hover:text-text-primary hover:border-violet-500/30'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}