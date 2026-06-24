export default function Loading() {
  return (
    <div className="animate-pulse space-y-5 pt-2">
      <div className="h-9 w-2/3 rounded-full bg-skeleton" />
      <div className="h-5 w-full max-w-sm rounded-lg bg-skeleton" />
      <div className="grid gap-4">
        <div className="h-14 rounded-2xl bg-skeleton" />
        <div className="h-14 rounded-2xl bg-skeleton" />
        <div className="h-14 rounded-2xl bg-skeleton" />
      </div>
      <div className="h-52 rounded-2xl bg-skeleton" />
    </div>
  );
}
