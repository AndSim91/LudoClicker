/** Simplified national flags for the tournament halls, drawn at (x, y), w × h. */
export function ArenaFlag({ nation, x, y, w, h }: { nation: string; x: number; y: number; w: number; h: number }) {
  const vertical = (colors: string[]) =>
    colors.map((fill, index) => (
      <rect key={index} x={(w / colors.length) * index} width={w / colors.length + 0.3} height={h} fill={fill} />
    ));
  const horizontal = (colors: string[], weights = colors.map(() => 1)) => {
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let top = 0;
    return colors.map((fill, index) => {
      const height = (h * weights[index]) / total;
      const rect = <rect key={index} y={top} width={w} height={height + 0.3} fill={fill} />;
      top += height;
      return rect;
    });
  };
  const cross = (field: string, color: string) => (
    <>
      <rect width={w} height={h} fill={field} />
      <rect x={w * 0.3} width={w * 0.14} height={h} fill={color} />
      <rect y={h * 0.42} width={w} height={h * 0.16} fill={color} />
    </>
  );

  let art;
  switch (nation) {
    case "Italia": art = vertical(["#009246", "#ffffff", "#ce2b37"]); break;
    case "Francia": art = vertical(["#0055a4", "#ffffff", "#ef4135"]); break;
    case "Irlanda": art = vertical(["#169b62", "#ffffff", "#ff883e"]); break;
    case "Germania": art = horizontal(["#000000", "#dd0000", "#ffce00"]); break;
    case "Paesi Bassi": art = horizontal(["#ae1c28", "#ffffff", "#21468b"]); break;
    case "Spagna": art = horizontal(["#aa151b", "#f1bf00", "#aa151b"], [1, 2, 1]); break;
    case "Svezia": art = cross("#006aa7", "#fecc00"); break;
    case "Giappone":
      art = <><rect width={w} height={h} fill="#ffffff" /><circle cx={w / 2} cy={h / 2} r={h * 0.28} fill="#bc002d" /></>;
      break;
    case "Canada":
      art = (
        <>
          {vertical(["#d52b1e", "#ffffff", "#ffffff", "#d52b1e"])}
          <path
            d={`M${w / 2} ${h * 0.2} L${w * 0.58} ${h * 0.45} L${w * 0.66} ${h * 0.4} L${w * 0.6} ${h * 0.62} L${w / 2} ${h * 0.8} L${w * 0.4} ${h * 0.62} L${w * 0.34} ${h * 0.4} L${w * 0.42} ${h * 0.45} Z`}
            fill="#d52b1e"
          />
        </>
      );
      break;
    case "Repubblica Ceca":
      art = <>{horizontal(["#ffffff", "#d7141a"])}<path d={`M0 0 L${w * 0.5} ${h / 2} L0 ${h} Z`} fill="#11457e" /></>;
      break;
    case "Regno Unito":
      art = (
        <>
          <rect width={w} height={h} fill="#012169" />
          <path d={`M0 0 L${w} ${h} M${w} 0 L0 ${h}`} stroke="#ffffff" strokeWidth={h * 0.2} />
          <path d={`M0 0 L${w} ${h} M${w} 0 L0 ${h}`} stroke="#c8102e" strokeWidth={h * 0.07} />
          <rect x={w * 0.42} width={w * 0.16} height={h} fill="#ffffff" />
          <rect y={h * 0.38} width={w} height={h * 0.24} fill="#ffffff" />
          <rect x={w * 0.45} width={w * 0.1} height={h} fill="#c8102e" />
          <rect y={h * 0.42} width={w} height={h * 0.16} fill="#c8102e" />
        </>
      );
      break;
    case "Stati Uniti":
      art = <>{horizontal(Array.from({ length: 7 }, (_, i) => (i % 2 ? "#ffffff" : "#b22234")))}<rect width={w * 0.42} height={h * 0.54} fill="#3c3b6e" /></>;
      break;
    default:
      art = <rect width={w} height={h} fill="#888888" />;
  }
  return (
    <g className="fd-flag" transform={`translate(${x} ${y})`}>
      {art}
      <rect width={w} height={h} fill="none" stroke="rgb(0 0 0 / 25%)" strokeWidth={0.6} />
    </g>
  );
}
