import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <Navbar variant="app" />
      <main className="app-main">{children}</main>
    </div>
  );
}
