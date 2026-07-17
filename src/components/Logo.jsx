// Brand mark — the NIXXY wordmark image (/nixxy-ai.png).
//
// The source art is a light/white wordmark intended for dark backgrounds, so
// on the app's light surfaces we render it as a crisp dark silhouette. Pass
// `white` on a dark/colored panel to show it in its original light form.
//
// Props kept identical to the previous logo so existing call-sites still work.
// `size` accepts 'sm' | 'md' | 'lg' or a literal pixel height; the image is
// width-capped to its container so it never overflows narrow areas (sidebar).
export default function Logo({ size = 'md', white = false, showWordmark = true }) {
  const h = typeof size === 'number'
    ? size
    : size === 'lg' ? 52 : size === 'sm' ? 30 : 40;

  return (
    <div className="flex items-center select-none max-w-full" style={{ height: h }}>
      <img
        src="/nixxy-ai.png"
        alt="NIXXY"
        draggable={false}
        style={{
          height: 'auto',
          width: 'auto',
          maxHeight: h,
          maxWidth: '100%',
          objectFit: 'contain',
          // Light surfaces: turn the white art into a legible dark mark.
          filter: white ? 'none' : 'brightness(0)',
        }}
      />
    </div>
  );
}
