// Imagem do produto. Só aceita caminhos locais em /produtos/ (A05/A02): um valor
// estranho no banco nunca vira URL externa nem javascript:, e a CSP (img-src 'self') segue intacta.
const SAFE_PATH = /^\/produtos\/[a-z0-9-]+\.(svg|png|jpe?g|webp)$/;

export function ProductImage({ src, name, className = "" }: { src: string | null | undefined; name: string; className?: string }) {
  if (src && SAFE_PATH.test(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={`block w-full bg-white object-contain ${className}`} />;
  }
  return (
    <div className={`swatch ${className}`} aria-hidden="true">
      <span>{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}
