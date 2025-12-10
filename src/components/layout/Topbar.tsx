type Props = {
  onToggleSidebar: () => void;
};

export default function Topbar({ onToggleSidebar }: Props) {
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-white/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
        >
          {/* hamburger icon */}
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden sm:block">
          <h1 className="text-lg font-semibold">Sistema Cursilho</h1>
          <p className="text-sm text-slate-500">Painel administrativo</p>
        </div>
      </div>

      <div className="flex-1 mx-4">
        <div className="relative max-w-lg">
          <input
            type="search"
            placeholder="Pesquisar inscritos, decúria, quartos..."
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 rounded text-sm">Ir</button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="px-3 py-2 rounded-md hidden md:inline-flex items-center bg-blue-600 text-white text-sm">
          Novo inscrito
        </button>

        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-full hover:bg-gray-100 focus:ring-2 focus:ring-blue-400"
            aria-label="Notificações"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.437L4 17h5" />
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <img
              src={`https://ui-avatars.com/api/?name=Rony+E&background=2563eb&color=fff&rounded=true`}
              alt="avatar"
              className="w-9 h-9 rounded-full border"
            />
            <div className="hidden sm:block text-sm">
              <div className="font-medium">Rony Emerson</div>
              <div className="text-xs text-slate-500">Administrador</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
