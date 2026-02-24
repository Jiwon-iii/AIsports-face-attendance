type Props = {
  tone: "loading" | "error";
  message: string;
};

export function StateBanner({ tone, message }: Props) {
  const className =
    tone === "loading"
      ? "rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
      : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700";

  return <div className={className}>{message}</div>;
}
