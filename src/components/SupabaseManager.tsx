import React, { useState, useEffect } from "react";
import {
  Typography,
  Button,
  Stack,
  Alert,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import {
  Group as GroupIcon,
  Add as AddIcon,
  Login as LoginIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { supabaseSync } from "../services/supabaseSync";
import { useStore } from "../store";
import localforage from "localforage";
import { QRCodeManager } from "./QRCodeManager";
import { QRCodeDisplay } from "./QRCodeDisplay";

export const SupabaseManager: React.FC = () => {
  const [familyName, setFamilyName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState(supabaseSync.getSyncStatus());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showManualJoinDialog, setShowManualJoinDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const { replaceAll } = useStore();

  // Copy family ID to clipboard
  const copyFamilyId = async () => {
    if (syncStatus.familyId) {
      try {
        await navigator.clipboard.writeText(syncStatus.familyId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
        setError("Kunde inte kopiera familj-ID");
        setTimeout(() => setError(null), 3000);
      }
    }
  };

  useEffect(() => {
    // Auto-fetch initial data if family is configured
    const currentFamilyId = supabaseSync.getFamilyId();
    const autoFetchInitialData = async () => {
      if (currentFamilyId) {
        console.log("Auto-fetching initial data for family:", currentFamilyId);
        const data = await supabaseSync.readFromDatabase();
        if (data) {
          console.log("Initial data fetched, updating app...");
          handleRealTimeUpdate(data);
        }
      }
    };

    autoFetchInitialData();
  }, []);

  const handleRealTimeUpdate = async (data: any) => {
    console.log("🔄 Processing real-time update with data:", {
      hasDrawers: !!data.drawers,
      hasShoppingList: !!data.shoppingList,
      drawerCount: Object.keys(data.drawers || {}).length,
      shoppingListCount: (data.shoppingList || []).length,
    });

    try {
      // Convert dates back to Date objects
      const processedData = {
        ...data,
        drawers: Object.fromEntries(
          Object.entries(data.drawers || {}).map(([key, items]) => [
            key,
            (items as any[]).map((item: any) => ({
              ...item,
              addedDate: new Date(item.addedDate),
            })),
          ])
        ),
        shoppingList: (data.shoppingList || []).map((item: any) => ({
          ...item,
          addedDate: new Date(item.addedDate),
        })),
      };

      console.log("📝 Updating drawers with processed data");
      await replaceAll(processedData.drawers);

      // Also update shopping list if it exists in the data
      if (processedData.shoppingList) {
        const { shoppingList } = useStore.getState();
        // Only update if the data is different to avoid loops
        if (
          JSON.stringify(shoppingList) !==
          JSON.stringify(processedData.shoppingList)
        ) {
          console.log("🛒 Updating shopping list with new data");
          useStore.setState({ shoppingList: processedData.shoppingList });
          await localforage.setItem(
            "frysen_shopping_list",
            processedData.shoppingList
          );
        } else {
          console.log("🛒 Shopping list unchanged, skipping update");
        }
      }

      console.log("✅ Real-time update processed successfully");
    } catch (error) {
      console.error("Failed to process real-time update:", error);
      setError("Kunde inte synkronisera automatiskt");
    }
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      setError("Ange ett familjenamn");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const newFamilyId = await supabaseSync.createFamily(familyName.trim());
      if (newFamilyId) {
        setSuccess(`Familj "${familyName}" skapad!`);
        setShowCreateForm(false);
        setFamilyName("");
        setSyncStatus(supabaseSync.getSyncStatus());
      } else {
        setError("Kunde inte skapa familj");
      }
    } catch (err) {
      setError("Ett fel uppstod vid skapande av familj");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveFamily = () => {
    if (confirm("Är du säker på att du vill lämna familjen?")) {
      supabaseSync.clearSync();
      setSyncStatus(supabaseSync.getSyncStatus());
      setSuccess("Du har lämnat familjen");
    }
  };

  const handleFamilyJoined = () => {
    setSyncStatus(supabaseSync.getSyncStatus());
    setSuccess("Du har anslutit till familjen via QR-kod!");
  };

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {!syncStatus.isConfigured ? (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Skapa en familj eller anslut till en befintlig.
          </Typography>

          <Stack spacing={2}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setShowCreateForm(true)}
              disabled={isLoading}
            >
              Skapa ny familj
            </Button>

            <Button
              variant="outlined"
              startIcon={<LoginIcon />}
              onClick={() => setShowQRScanner(true)}
              disabled={isLoading}
            >
              Anslut till familj
            </Button>

            <QRCodeManager
              onFamilyJoined={handleFamilyJoined}
              onClose={() => setShowQRScanner(false)}
              showScanner={showQRScanner}
            />
          </Stack>
        </>
      ) : (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" color="primary" gutterBottom>
              <GroupIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              {familyName || "Min Familj"}
            </Typography>

            {syncStatus.lastSync && (
              <Typography variant="body2" color="text.secondary">
                Senast synkroniserad: {syncStatus.lastSync.toLocaleString()}
              </Typography>
            )}
          </Box>

          <Stack spacing={2}>
            <Box
              sx={{
                width: "100%",
                height: "200px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <QRCodeDisplay familyId={syncStatus.familyId || ""} />
            </Box>

            <Button
              variant="outlined"
              color="error"
              onClick={handleLeaveFamily}
              disabled={isLoading}
            >
              Lämna familj
            </Button>

            <Button
              variant="text"
              size="small"
              onClick={() => setShowManualJoinDialog(true)}
              sx={{ alignSelf: "flex-start" }}
            >
              Kan inte ansluta?
            </Button>
          </Stack>
        </>
      )}

      {showCreateForm && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Skapa ny familj
          </Typography>
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              label="Familjenamn"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              disabled={isLoading}
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={handleCreateFamily}
                disabled={isLoading || !familyName.trim()}
              >
                Skapa
              </Button>
              <Button
                variant="outlined"
                onClick={() => setShowCreateForm(false)}
                disabled={isLoading}
              >
                Avbryt
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* Manual Join Dialog - Only for sharing family ID when connected */}
      <Dialog
        open={showManualJoinDialog}
        onClose={() => setShowManualJoinDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h6">Dela familj-ID</Typography>
            <IconButton onClick={() => setShowManualJoinDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Dela detta familj-ID med familjemedlemmar som vill ansluta:
            </Typography>

            <Box
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "background.paper",
              }}
            >
              <Typography
                variant="h6"
                fontFamily="monospace"
                textAlign="center"
              >
                {syncStatus.familyId}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              startIcon={<CopyIcon />}
              onClick={copyFamilyId}
              disabled={copied}
              fullWidth
            >
              {copied ? "Kopierat!" : "Kopiera familj-ID"}
            </Button>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              <strong>Instruktioner för familjemedlemmar:</strong>
              <br />
              1. Öppna Frysen-appen
              <br />
              2. Gå till "Synkronisering"
              <br />
              3. Klicka "Anslut till familj"
              <br />
              4. Ange familj-ID:t ovan
              <br />
              5. Klicka "Anslut"
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowManualJoinDialog(false)}>Stäng</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
