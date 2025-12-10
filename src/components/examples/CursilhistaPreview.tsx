export default function CursilhistaPreview() {
  const items = [
    { nome: "Gabriel Gonçalves", decuria: "Marcos", wh: "11976973424" },
    { nome: "Diego Vaillé", decuria: "Marcos", wh: "11948917480" },
    { nome: "Adans Giannetti", decuria: "Mateus", wh: "11992023821" },
  ];

  return (
    <ul className="divide-y">
      {items.map((it) => (
        <li key={it.wh} className="py-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{it.nome}</div>
              <div className="text-xs text-slate-500">Decúria: {it.decuria}</div>
            </div>
            <div className="text-sm text-slate-600">{it.wh}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
