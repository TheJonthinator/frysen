import { useEffect, useMemo, useState } from "react";
import { StatusBar, Style } from "@capacitor/status-bar";
import {
  Box,
  Container,
  Typography,
  Stack,
  Card,
  CardContent,
  IconButton,
  Button,
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  TextField,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
} from "@mui/material";

import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import UpdateIcon from "@mui/icons-material/Update";
import SyncIcon from "@mui/icons-material/Sync";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useStore } from "./store";
import {
  ItemCard,
  DroppableDrawer,
  ShoppingList,
  UpdateIndicator,
  SupabaseManager,
} from "./components";
import type { Item, TabType } from "./types";
import { DRAWER_COUNT, KOKSBANKEN_DRAWER } from "./types";
import { createAppTheme } from "./theme";
import { supabaseSync } from "./services/supabaseSync";

export default function App() {
  const {
    drawers,
    dateDisplayMode,
    shoppingList,
    updateStatus,
    updateInfo,
    load,
    addItem,
    editItem,
    removeItem,
    deleteAndAddToShoppingList,
    increaseQuantity,
    decreaseQuantity,
    replaceAll,
    toggleDateDisplay,
    moveItem,
    getDurationText,
    getSuggestions,
    addShoppingItem,
    toggleShoppingItem,
    removeShoppingItem,
    editShoppingItem,
    clearCompletedShoppingItems,
    checkForUpdates,
  } = useStore();

  useEffect(() => {
    load();
    // Don't auto-check for updates on launch to avoid rate limiting
    // Users can manually check via the update indicator or settings

    // Initialize StatusBar
    const initStatusBar = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#1565c0" });
      } catch (error) {
        console.log("StatusBar not available (web environment)");
      }
    };

    initStatusBar();

    // Subscribe to sync events globally
    const unsubscribe = supabaseSync.subscribe((data) => {
      console.log(
        "📱 [APP] Received sync notification:",
        data ? "with data" : "without data"
      );
      if (data) {
        console.log("📱 [APP] Processing sync data...");
        handleRealTimeUpdate(data);
      }
    });

    console.log("🌐 App component mounted, observer subscription set up");

    return () => {
      unsubscribe();
    };
  }, []); // Only run once on mount

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("inventory");

  const options = useMemo(
    () => Array.from({ length: DRAWER_COUNT }, (_, i) => i + 1),
    []
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const theme = createTheme(createAppTheme());

  const handleAddItem = async () => {
    const trimmedName = newItemName.trim();
    if (trimmedName) {
      await addItem(KOKSBANKEN_DRAWER, trimmedName);
      setNewItemName("");
    }
  };

  const handleItemSelect = (itemId: string) => {
    if (isSelectionMode) {
      const newSelected = new Set(selectedItems);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      setSelectedItems(newSelected);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    if (confirm(`Ta bort ${selectedItems.size} valda varor?`)) {
      // Find and remove all selected items
      const newDrawers = { ...drawers };
      Object.keys(newDrawers).forEach((drawerKey) => {
        const drawer = parseInt(drawerKey);
        newDrawers[drawer] = newDrawers[drawer].filter(
          (item: any) => !selectedItems.has(item.id)
        );
      });

      await replaceAll(newDrawers);
      setSelectedItems(new Set());
      setIsSelectionMode(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const itemId = active.id as string;

    // Find the item in drawers
    for (const drawerKey of Object.keys(drawers)) {
      const drawer = parseInt(drawerKey);
      const item = drawers[drawer].find((item: any) => item.id === itemId);
      if (item) {
        setActiveItem(item);
        break;
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const itemId = active.id as string;
    const targetDrawerId = over.id as string;

    // Find source drawer and index
    let sourceDrawer = -1;
    let sourceIndex = -1;
    for (const drawerKey of Object.keys(drawers)) {
      const drawer = parseInt(drawerKey);
      const index = drawers[drawer].findIndex(
        (item: any) => item.id === itemId
      );
      if (index !== -1) {
        sourceDrawer = drawer;
        sourceIndex = index;
        break;
      }
    }

    if (sourceDrawer === -1) return;

    // Parse target drawer number
    const targetDrawerMatch = targetDrawerId.match(/^drawer-(\d+)$/);
    if (!targetDrawerMatch) return;

    const targetDrawer = parseInt(targetDrawerMatch[1]);

    // Move the item
    await moveItem(sourceDrawer, sourceIndex, targetDrawer);
  };

  const resetAll = () => {
    if (confirm("Nollställa alla lådor?")) {
      const fresh: any = {};
      options.forEach((d) => (fresh[d] = []));
      replaceAll(fresh);
    }
  };

  const handleRealTimeUpdate = async (data: any) => {
    console.log("📱 [APP] Processing real-time update with data:", {
      hasDrawers: !!data.drawers,
      hasShoppingList: !!data.shoppingList,
      drawerCount: Object.keys(data.drawers || {}).length,
      shoppingListCount: (data.shoppingList || []).length,
    });

    // Skip if this update came from the same device (to avoid feedback loops)
    const currentDeviceId = localStorage.getItem("frysen_device_id");
    if (data.device_id && data.device_id === currentDeviceId) {
      console.log("📱 [APP] Skipping update from same device:", data.device_id);
      return;
    }

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

      console.log("📱 [APP] Applying sync snapshot to store...");
      await useStore.getState().applySyncSnapshot({
        drawers: processedData.drawers,
        shoppingList:
          processedData.shoppingList ?? useStore.getState().shoppingList,
      });

      // Also update shopping list if it exists in the data
      if (processedData.shoppingList) {
        const { shoppingList } = useStore.getState();

        // More robust comparison - check if arrays have different lengths or different items
        const currentLength = shoppingList.length;
        const newLength = processedData.shoppingList.length;
        const hasDifferentLength = currentLength !== newLength;

        // Check if any items are different (comparing by id and name)
        const hasDifferentItems =
          hasDifferentLength ||
          processedData.shoppingList.some((newItem: any, index: number) => {
            const currentItem = shoppingList[index];
            return (
              !currentItem ||
              currentItem.id !== newItem.id ||
              currentItem.name !== newItem.name ||
              currentItem.completed !== newItem.completed
            );
          });

        if (hasDifferentItems) {
          console.log("📱 [APP] Shopping list changed, updating...");
          useStore.setState({ shoppingList: processedData.shoppingList });
        } else {
          console.log("📱 [APP] Shopping list unchanged, skipping update");
        }
      }

      console.log("✅ [APP] Real-time update processed successfully");
    } catch (error) {
      console.error("App failed to process real-time update:", error);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar
        position="static"
        elevation={0}
        sx={{
          paddingTop: "24px", // Cheeky status bar padding 😄
        }}
      >
        <Toolbar sx={{ flexWrap: "wrap", gap: 1 }}>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, minWidth: 0 }}
          >
            FRYSEN
          </Typography>

          {activeTab === "inventory" && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                mr: { xs: 0, sm: 2 },
                width: { xs: "100%", sm: "auto" },
                order: { xs: 3, sm: 1 },
              }}
            >
              <Autocomplete
                freeSolo
                options={getSuggestions(newItemName)}
                value={newItemName}
                onChange={(_, newValue) => {
                  setNewItemName(newValue || "");
                }}
                onInputChange={(_, newInputValue) => {
                  setNewItemName(newInputValue);
                }}
                sx={{
                  width: { xs: "100%", sm: 200 },
                  minWidth: { xs: "auto", sm: 200 },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Lägg till vara..."
                    size="small"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddItem();
                      }
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: "rgba(255, 255, 255, 0.1)",
                        "&:hover": {
                          bgcolor: "rgba(255, 255, 255, 0.15)",
                        },
                        "&.Mui-focused": {
                          bgcolor: "rgba(255, 255, 255, 0.2)",
                        },
                      },
                      "& .MuiInputBase-input": {
                        color: "#ffffff",
                        "&::placeholder": {
                          color: "rgba(255, 255, 255, 0.6)",
                          opacity: 1,
                        },
                      },
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Typography variant="body2">{option}</Typography>
                  </Box>
                )}
              />
              <IconButton
                onClick={handleAddItem}
                disabled={!newItemName.trim()}
                color="inherit"
                size="small"
              >
                <AddIcon />
              </IconButton>
            </Stack>
          )}

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              order: { xs: 2, sm: 2 },
              flexWrap: "wrap",
            }}
          >
            {activeTab === "inventory" && (
              <Button
                onClick={toggleDateDisplay}
                variant={dateDisplayMode === "date" ? "contained" : "outlined"}
                size="small"
                startIcon={<CalendarTodayIcon />}
                sx={{
                  minWidth: { xs: "auto", sm: 120 },
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                {dateDisplayMode === "date" ? "2024-01-15" : "2 veckor"}
              </Button>
            )}
            <UpdateIndicator
              status={updateStatus}
              onCheckUpdate={checkForUpdates}
              isChecking={updateStatus === "checking"}
            />
            <IconButton
              onClick={() => setSettingsOpen(true)}
              color="inherit"
              size="small"
            >
              <SettingsIcon />
            </IconButton>
          </Stack>
        </Toolbar>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.05)",
            "& .MuiTab-root": {
              color: "rgba(255, 255, 255, 0.7)",
              "&.Mui-selected": {
                color: "#ffffff",
              },
            },
          }}
        >
          <Tab label="Lådor" value="inventory" />
          <Tab label="Inköpslista" value="shopping" />
        </Tabs>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 2 }}>
        {activeTab === "inventory" ? (
          <>
            <Box
              sx={{
                height: isSelectionMode ? "auto" : 0,
                overflow: "hidden",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                mb: isSelectionMode ? 2 : 0,
              }}
            >
              <Card
                sx={{
                  bgcolor: "warning.light",
                  transform: isSelectionMode
                    ? "translateY(0)"
                    : "translateY(-20px)",
                  opacity: isSelectionMode ? 1 : 0,
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <CardContent sx={{ py: 1.5 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="body2">
                      {selectedItems.size} varor valda
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setSelectedItems(new Set());
                          setIsSelectionMode(false);
                        }}
                      >
                        Avbryt
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={handleBulkDelete}
                        disabled={selectedItems.size === 0}
                      >
                        Ta bort valda
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: 1,
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {options.map((drawerNum) => (
                  <DroppableDrawer
                    key={drawerNum}
                    drawerNumber={drawerNum}
                    items={drawers[drawerNum] || []}
                    onEdit={editItem}
                    onDelete={removeItem}
                    onDeleteAndAddToShoppingList={deleteAndAddToShoppingList}
                    onIncreaseQuantity={increaseQuantity}
                    onDecreaseQuantity={decreaseQuantity}
                    selectedItems={selectedItems}
                    onItemSelect={handleItemSelect}
                    dateDisplayMode={dateDisplayMode}
                    getDurationText={getDurationText}
                  />
                ))}
              </Box>

              <DragOverlay>
                {activeItem ? (
                  <ItemCard
                    item={activeItem}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onDeleteAndAddToShoppingList={() => {}}
                    onIncreaseQuantity={() => {}}
                    onDecreaseQuantity={() => {}}
                    isDragging={true}
                    dateDisplayMode={dateDisplayMode}
                    getDurationText={getDurationText}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>

            <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              sx={{ mt: 2 }}
            >
              <Button
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                variant="outlined"
                size="small"
              >
                {isSelectionMode ? "Avsluta val" : "Välj varor"}
              </Button>
            </Stack>

            <Typography
              align="center"
              sx={{ mt: 1 }}
              color="text.secondary"
              variant="caption"
            >
              Tips: Lägg till varor i header, sedan dra dem till rätt låda.
            </Typography>
          </>
        ) : (
          <ShoppingList
            items={shoppingList}
            onAddItem={addShoppingItem}
            onToggleItem={toggleShoppingItem}
            onDeleteItem={removeShoppingItem}
            onEditItem={editShoppingItem}
            onClearCompleted={clearCompletedShoppingItems}
            getSuggestions={getSuggestions}
          />
        )}
      </Container>

      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Inställningar</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ py: 1 }}>
            <Button
              variant="outlined"
              startIcon={<SyncIcon />}
              onClick={() => {
                setSettingsOpen(false);
                setSyncOpen(true);
              }}
              fullWidth
            >
              Synkronisering
            </Button>

            <Button
              variant="outlined"
              startIcon={<UpdateIcon />}
              onClick={checkForUpdates}
              fullWidth
            >
              Kontrollera uppdateringar
            </Button>

            {updateInfo && (
              <Button
                variant="contained"
                startIcon={<UpdateIcon />}
                onClick={() => {
                  window.open(updateInfo.updateUrl, "_blank");
                }}
                fullWidth
                sx={{
                  backgroundColor: updateInfo.isCritical
                    ? "error.main"
                    : "primary.main",
                  "&:hover": {
                    backgroundColor: updateInfo.isCritical
                      ? "error.dark"
                      : "primary.dark",
                  },
                }}
              >
                Uppdatera till version {updateInfo.latestVersion}
              </Button>
            )}

            <Button
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={() => {
                if (
                  confirm(
                    "Är du säker på att du vill nollställa alla lådor? Detta går inte att ångra."
                  )
                ) {
                  resetAll();
                  setSettingsOpen(false);
                }
              }}
              fullWidth
              color="warning"
            >
              Nollställ alla lådor
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Stäng</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Synkronisering</DialogTitle>
        <DialogContent>
          <SupabaseManager />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncOpen(false)}>Stäng</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
