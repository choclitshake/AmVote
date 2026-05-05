export function Navigation() {
  return (
    <nav className="flex gap-6">
      <a href="/" className="text-gray-600 hover:text-blue-600">Home</a>
      <a href="/history" className="text-gray-600 hover:text-blue-600">History</a>
      <a href="/about" className="text-gray-600 hover:text-blue-600">About</a>
    </nav>
  );
}