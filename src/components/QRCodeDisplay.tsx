import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Box, CircularProgress } from "@mui/material";

interface QRCodeDisplayProps {
  familyId: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ familyId }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Generate QR code for family ID
  const generateQRCode = async () => {
    if (!familyId) return;

    try {
      setIsLoading(true);
      // Generate a high-resolution QR code that we can scale down
      const qrDataUrl = await QRCode.toDataURL(familyId, {
        width: 512,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateQRCode();
  }, [familyId]);

  if (isLoading) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          minHeight: "120px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "rgba(255, 255, 255, 0.1)",
          borderRadius: 1,
        }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!qrCodeDataUrl) {
    return null;
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 1,
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: 1,
        bgcolor: "white",
      }}
    >
      <img
        src={qrCodeDataUrl}
        alt="Family QR Code"
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
          objectFit: "contain",
        }}
      />
    </Box>
  );
};
