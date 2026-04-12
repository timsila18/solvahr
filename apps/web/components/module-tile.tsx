type ModuleTileProps = {
  title: string;
  value: string;
  hint: string;
};

export function ModuleTile({ title, value, hint }: ModuleTileProps) {
  return (
    <article className="moduleTile">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}
