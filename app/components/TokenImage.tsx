import React, { useState } from "react";

interface TokenImageProps {
  iconUrl: string | null | undefined;
  symbol: string;
  width?: number;
  height?: number;
  className?: string;
}

const TokenImage: React.FC<TokenImageProps> = ({
  iconUrl,
  symbol,
  width = 25,
  height = 25,
  className = "",
}) => {
  // State untuk melacak apakah gambar gagal dimuat
  const [imageError, setImageError] = useState(false);

  // Default color palette for token icons when no image is available
  // Using a hash of the token symbol to consistently generate the same color
  const getColorFromSymbol = (symbol: string): string => {
    const colors = [
      "#7367F0", // Purple/Blue
      "#00CFE8", // Cyan
      "#FF9F43", // Orange
      "#EA5455", // Red
      "#28C76F", // Green - Pastikan T hijau tetap ada
      "#9C8DF0", // Light Purple
      "#1E9FF2", // Blue
      "#FF8ED4", // Pink
      "#2DCEE3", // Light Cyan
      "#FF5C93", // Deep Pink
      "#333333", // Abu-abu kehitaman seperti yang diminta
    ];

    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Use the hash to pick a color from the palette
    return colors[Math.abs(hash) % colors.length];
  };

  // Get first letter from the symbol
  const symbolLetter = symbol ? symbol.charAt(0).toUpperCase() : "?";

  // Get color based on symbol
  const backgroundColor = getColorFromSymbol(symbol);

  // Style for the container
  const containerStyle: React.CSSProperties = {
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  };

  // Render component
  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        ...containerStyle,
        backgroundColor:
          !iconUrl || imageError ? backgroundColor : "transparent",
      }}
      className={`token-image ${className}`}
      title={symbol}
    >
      {iconUrl && !imageError ? (
        <img
          src={iconUrl}
          alt={symbol}
          width={width}
          height={height}
          style={{ objectFit: "cover" }}
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
            fontWeight: "bold",
            color: "#FFFFFF",
            textShadow: "0px 1px 2px rgba(0,0,0,0.2)",
            fontSize: `${Math.round(height * 0.5)}px`,
          }}
        >
          {symbolLetter}
        </div>
      )}
    </div>
  );
};

export default React.memo(TokenImage);
