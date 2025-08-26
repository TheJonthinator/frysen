import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Box,
  Chip,
  Divider,
  IconButton,
} from "@mui/material";
import {
  CloudSync as SyncIcon,
  CloudDownload as DownloadIcon,
  Group as GroupIcon,
  Add as AddIcon,
  Login as LoginIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";
import { supabaseSync } from "../services/supabaseSync";
import { useStore } from "../store";
import localforage from "localforage";

export const SupabaseManager: React.FC = () => {
  const [familyName, setFamilyName] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState(supabaseSync.getSyncStatus());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);

  const { replaceAll } = useStore();

  // Copy family ID to clipboard
  const copyFamilyId = async () => {
    if (syncStatus.familyId) {
      try {
        await navigator.clipboard.writeText(syncStatus.familyId);
        setSuccess("Familj-ID kopierat till urklipp!");
        setTimeout(() => setSuccess(null), 3000);
      } catch (error) {
        console.error("Failed to copy:", error);
        setError("Kunde inte kopiera familj-ID");
        setTimeout(() => setError(null), 3000);
      }
    }
  };

  useEffect(() => {
    // Load current family ID
    const currentFamilyId = supabaseSync.getFamilyId();
    if (currentFamilyId) {
      setFamilyId(currentFamilyId);
    }

    // Auto-fetch initial data if family is configured
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

      setSuccess("Data synkroniserad automatiskt från annan enhet!");
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
        setFamilyId(newFamilyId);
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

  const handleJoinFamily = async () => {
    if (!familyId.trim()) {
      setError("Ange ett familj-ID");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const success = await supabaseSync.joinFamily(familyId.trim());
      if (success) {
        setSuccess("Du har anslutit till familjen!");
        setShowJoinForm(false);
        setSyncStatus(supabaseSync.getSyncStatus());
      } else {
        setError("Kunde inte ansluta till familj");
      }
    } catch (err) {
      setError("Ogiltigt familj-ID eller familj hittades inte");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRead = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const remoteData = await supabaseSync.readFromDatabase();
      if (remoteData) {
        // Convert dates back to Date objects
        const processedData = {
          ...remoteData,
          drawers: Object.fromEntries(
            Object.entries(remoteData.drawers).map(([key, items]) => [
              key,
              items.map((item: any) => ({
                ...item,
                addedDate: new Date(item.addedDate),
              })),
            ])
          ),
          shoppingList: remoteData.shoppingList.map((item: any) => ({
            ...item,
            addedDate: new Date(item.addedDate),
          })),
        };

        await replaceAll(processedData.drawers);
        setSuccess("Data läst från databas!");
        setSyncStatus(supabaseSync.getSyncStatus());
      } else {
        setError("Kunde inte läsa från databas");
      }
    } catch (err) {
      setError("Ett fel uppstod vid läsning");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveFamily = () => {
    if (confirm("Är du säker på att du vill lämna familjen?")) {
      supabaseSync.clearSync();
      setFamilyId("");
      setSyncStatus(supabaseSync.getSyncStatus());
      setSuccess("Du har lämnat familjen");
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Cloud synkronisering
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Synkronisera med en gratis Supabase-databas. Skapa en familj eller
          anslut till en befintlig.
        </Typography>

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

        {syncStatus.isConfigured && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<GroupIcon />}
                label={`Familj: ${syncStatus.familyId?.substring(0, 8)}...`}
                color="primary"
                variant="outlined"
              />
              {syncStatus.isRealtimeActive && (
                <Chip
                  icon={<SyncIcon />}
                  label="Live-sync aktiv"
                  color="success"
                  size="small"
                />
              )}
            </Stack>
            {syncStatus.lastSync && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Senast synkroniserad: {syncStatus.lastSync.toLocaleString()}
              </Typography>
            )}
          </Box>
        )}

        {!syncStatus.isConfigured ? (
          <Stack spacing={2}>
            <Typography variant="subtitle2">Välj ett alternativ:</Typography>

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
              onClick={() => setShowJoinForm(true)}
              disabled={isLoading}
            >
              Anslut till familj
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleRead}
                disabled={isLoading}
              >
                Läs från molnet
              </Button>

              <Button
                variant="outlined"
                color="error"
                onClick={handleLeaveFamily}
                disabled={isLoading}
              >
                Lämna familj
              </Button>
            </Stack>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Smart auto-save aktiv!</strong> Alla ändringar
                synkroniseras automatiskt till molnet med 1 sekunds fördröjning
                för bättre prestanda. Shopping list-redigering sparas endast när
                du avslutar redigeringen.
              </Typography>
            </Alert>
          </Stack>
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

        {showJoinForm && (
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
              Anslut till familj
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                size="small"
                label="Familj-ID"
                value={familyId}
                onChange={(e) => setFamilyId(e.target.value)}
                disabled={isLoading}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  onClick={handleJoinFamily}
                  disabled={isLoading || !familyId.trim()}
                >
                  Anslut
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setShowJoinForm(false)}
                  disabled={isLoading}
                >
                  Avbryt
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        <Box>
          {!syncStatus.isConfigured ? (
            <>
              <Typography variant="h6" color="primary" gutterBottom>
                🏠 För Familjevärd (Teknisk Setup)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                <strong>
                  Endast DU behöver göra detta - familjemedlemmar behöver inte
                  detta!
                </strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                1. Skapa ett gratis Supabase-konto på supabase.com
                <br />
                2. Skapa ett nytt projekt
                <br />
                3. Lägg till miljövariabler i .env-filen
                <br />
                4. Skapa tabellerna i Supabase (se SUPABASE_SETUP.md)
                <br />
                5. Skapa en familj här ovan
                <br />
                6. Dela familj-ID:t med familjemedlemmar
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="h6" color="success.main" gutterBottom>
                👥 För Familjemedlemmar (Enkel Setup)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                <strong>
                  Din fru/fiancée behöver bara detta - inget tekniskt!
                </strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                1. Öppna Frysen-appen på sin enhet
                <br />
                2. Gå till "Synkronisering" fliken
                <br />
                3. Klicka "Anslut till familj"
                <br />
                4. Ange familj-ID:t:{" "}
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <strong>{syncStatus.familyId}</strong>
                  <IconButton
                    size="small"
                    onClick={copyFamilyId}
                    sx={{
                      color: "text.secondary",
                      p: 0.5,
                      "&:hover": { bgcolor: "rgba(0,0,0,0.1)" },
                    }}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Box>
                <br />
                5. Klicka "Anslut"
                <br />
                6. Allt synkroniseras automatiskt!
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: "info.light", borderRadius: 1 }}>
                <Typography variant="body2" color="info.contrastText">
                  <strong>Dela detta med familjemedlemmar:</strong>
                  <br />
                  "Öppna Frysen → Synkronisering → Anslut till familj → Ange:{" "}
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <strong>{syncStatus.familyId}</strong>
                    <IconButton
                      size="small"
                      onClick={copyFamilyId}
                      sx={{
                        color: "info.contrastText",
                        p: 0.5,
                        "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                      }}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>{" "}
                  → Allt synkroniseras automatiskt!"
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
