import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  TextField,
  Divider,
} from "@mui/material";
import {
  QrCodeScanner as QrCodeScannerIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import jsQR from "jsqr";
import { supabaseSync } from "../services/supabaseSync";

interface QRCodeManagerProps {
  onFamilyJoined?: (familyId: string) => void;
  onClose?: () => void;
  showScanner?: boolean;
}

export const QRCodeManager: React.FC<QRCodeManagerProps> = ({
  onFamilyJoined,
  onClose,
  showScanner = true,
}) => {
  const [showScannerDialog, setShowScannerDialog] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string>("");
  const [manualFamilyId, setManualFamilyId] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera for QR scanning
  const startCamera = async () => {
    try {
      console.log("🎥 Starting camera...");
      setScanning(true);
      setScanError("");

      console.log("📱 Checking mediaDevices support...");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MediaDevices API not supported");
      }

      console.log("🔐 Requesting camera permission...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        console.log("📹 Camera started successfully");
      }
    } catch (error) {
      console.error("Failed to start camera:", error);
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          setScanError(
            "Camera permission denied. Please allow camera access and try again."
          );
        } else if (error.name === "NotFoundError") {
          setScanError("No camera found on this device.");
        } else {
          setScanError(`Camera error: ${error.message}`);
        }
      } else {
        setScanError("Failed to access camera. Please check permissions.");
      }
      setScanning(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  // Process scanned QR code
  const processQRCode = async (qrText: string) => {
    try {
      // Validate family ID format (assuming it's a UUID or similar)
      if (!qrText || qrText.length < 10) {
        setScanError("Invalid QR code format");
        return;
      }

      // Try to join the family
      await supabaseSync.setFamilyId(qrText);

      // If we get here, the family ID was set successfully
      setScanError("");
      setShowScannerDialog(false);
      stopCamera();
      onFamilyJoined?.(qrText);
      onClose?.();
    } catch (error) {
      console.error("Failed to process QR code:", error);
      setScanError("Failed to join family. Please try again.");
    }
  };

  // Handle manual family ID join
  const handleManualJoin = async () => {
    if (!manualFamilyId.trim()) {
      setScanError("Ange ett familj-ID");
      return;
    }

    setIsJoining(true);
    setScanError("");

    try {
      const success = await supabaseSync.joinFamily(manualFamilyId.trim());
      if (success) {
        setShowScannerDialog(false);
        setManualFamilyId("");
        onFamilyJoined?.(manualFamilyId.trim());
        onClose?.();
      } else {
        setScanError("Kunde inte ansluta till familj");
      }
    } catch (err) {
      setScanError("Ogiltigt familj-ID eller familj hittades inte");
    } finally {
      setIsJoining(false);
    }
  };

  // Scan for QR codes in video stream
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for QR code detection
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Use jsQR to detect QR codes
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        console.log("QR Code detected:", code.data);
        processQRCode(code.data);
        return; // Stop scanning once we find a QR code
      }

      // Continue scanning
      if (scanning) {
        requestAnimationFrame(scanQRCode);
      }
    } catch (error) {
      console.error("QR scan error:", error);
      // Continue scanning even if there's an error
      if (scanning) {
        requestAnimationFrame(scanQRCode);
      }
    }
  };

  // Handle scanner dialog open
  const handleScannerDialogOpen = async () => {
    console.log("🔍 Scanner dialog opening...");
    setShowScannerDialog(true);
    // Small delay to ensure dialog is rendered before requesting camera
    setTimeout(async () => {
      console.log("📹 Requesting camera permission...");
      await startCamera();
    }, 100);
  };

  // Auto-open dialog when showScanner is true
  useEffect(() => {
    if (showScanner) {
      handleScannerDialogOpen();
    }
  }, [showScanner]);

  // Handle scanner dialog close
  const handleScannerDialogClose = () => {
    setShowScannerDialog(false);
    stopCamera();
    setScanError("");
    setManualFamilyId("");
    onClose?.();
  };

  // Start scanning when camera is ready
  useEffect(() => {
    if (videoRef.current && scanning) {
      videoRef.current.onloadedmetadata = () => {
        scanQRCode();
      };
    }
  }, [scanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <>
      {/* QR Code Scanner Dialog */}
      <Dialog
        open={showScannerDialog}
        onClose={handleScannerDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h6">Anslut till familj</Typography>
            <IconButton onClick={handleScannerDialogClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap={2}
          >
            {/* QR Code Scanning Section */}
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
            >
              Skanna QR-kod eller ange familj-ID manuellt
            </Typography>

            {!scanning && !scanError && (
              <Button
                variant="outlined"
                onClick={startCamera}
                startIcon={<QrCodeScannerIcon />}
              >
                Start Camera
              </Button>
            )}

            {scanError && (
              <Alert severity="error" sx={{ width: "100%" }}>
                {scanError}
                <Button size="small" onClick={startCamera} sx={{ ml: 1 }}>
                  Retry
                </Button>
              </Alert>
            )}

            <Box
              sx={{
                position: "relative",
                width: "300px",
                height: "300px",
                border: "2px solid #e0e0e0",
                borderRadius: 1,
                overflow: "hidden",
                bgcolor: "#f5f5f5",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />

              {!scanning && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(0, 0, 0, 0.5)",
                  }}
                >
                  <CircularProgress />
                </Box>
              )}
            </Box>

            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* Divider */}
            <Divider sx={{ width: "100%", my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                ELLER
              </Typography>
            </Divider>

            <TextField
              fullWidth
              label="Familj-ID"
              value={manualFamilyId}
              onChange={(e) => setManualFamilyId(e.target.value)}
              placeholder="Ange familj-ID här"
              disabled={isJoining}
            />

            <Button
              variant="contained"
              onClick={handleManualJoin}
              disabled={isJoining || !manualFamilyId.trim()}
              fullWidth
            >
              {isJoining ? "Ansluter..." : "Anslut till familj"}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleScannerDialogClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
