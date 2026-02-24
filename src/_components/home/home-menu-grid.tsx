import Link from "next/link";

type MenuItem = {
  href: string;
  title: string;
  description: string;
};

type Props = {
  menus: MenuItem[];
};

export function HomeMenuGrid({ menus }: Props) {
  return (
    <section className="grid gap-4 sm:gap-5 md:grid-cols-2">
      {menus.map((menu) => (
        <Link
          key={menu.href}
          href={menu.href}
          className="panel group flex min-h-48 flex-col p-5 transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl sm:p-6"
        >
          <p className="mb-2 text-xs font-mono text-sky-800 sm:text-sm">Route</p>
          <h2 className="mb-3 text-xl font-semibold text-slate-900 sm:text-2xl">
            {menu.title}
          </h2>
          <p className="text-sm text-slate-700">{menu.description}</p>
          <p className="mt-auto pt-6 text-sm font-semibold text-sky-800 group-hover:text-sky-900">
            Open {menu.href}
          </p>
        </Link>
      ))}
    </section>
  );
}
