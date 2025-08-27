import { useState, useEffect, useCallback } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  Tabs,
  Tab,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Badge,
  Card,
  CardContent,
  Stack,
  CssBaseline,
  Autocomplete,
} from "@mui/material";
import {
  Add as AddIcon,
  Settings as SettingsIcon,
  Sync as SyncIcon,
  Update as UpdateIcon,
  RestartAlt as RestartAltIcon,
  CalendarToday as CalendarTodayIcon,
} from "@mui/icons-material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { StatusBar, Style } from "@capacitor/status-bar";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { useStore } from "./store";
import { ModularDrawerView } from "./components/ModularDrawerView";
import { ContainerManager } from "./components/ContainerManager";
import { ShoppingList } from "./components/ShoppingList";
import { UpdateIndicator } from "./components/UpdateIndicator";
import { SupabaseManager } from "./components/SupabaseManager";
import { createAppTheme } from "./theme";
import type { Item, TabType } from "./types";
import { supabaseSync } from "./services/supabaseSync";

export default function App() {
  // Selective store subscriptions to reduce re-renders
  const defaultDrawer = useStore((state) => state.defaultDrawer);
  const containers = useStore((state) => state.containers);
  const dateDisplayMode = useStore((state) => state.dateDisplayMode);
  const shoppingList = useStore((state) => state.shoppingList);
  const updateStatus = useStore((state) => state.updateStatus);
  const updateInfo = useStore((state) => state.updateInfo);

  // Store methods (these don't cause re-renders)
  const load = useStore((state) => state.load);
  const toggleDateDisplay = useStore((state) => state.toggleDateDisplay);
  const getDurationText = useStore((state) => state.getDurationText);
  const getSuggestions = useStore((state) => state.getSuggestions);
  const addShoppingItem = useStore((state) => state.addShoppingItem);
  const toggleShoppingItem = useStore((state) => state.toggleShoppingItem);
  const removeShoppingItem = useStore((state) => state.removeShoppingItem);
  const editShoppingItem = useStore((state) => state.editShoppingItem);
  const clearCompletedShoppingItems = useStore(
    (state) => state.clearCompletedShoppingItems
  );
  const checkForUpdates = useStore((state) => state.checkForUpdates);
  const addItemToDefaultDrawer = useStore(
    (state) => state.addItemToDefaultDrawer
  );
  const editItemInDrawer = useStore((state) => state.editItemInDrawer);
  const removeItemFromDrawer = useStore((state) => state.removeItemFromDrawer);
  const increaseQuantityInDrawer = useStore(
    (state) => state.increaseQuantityInDrawer
  );
  const decreaseQuantityInDrawer = useStore(
    (state) => state.decreaseQuantityInDrawer
  );
  const deleteAndAddToShoppingListFromDrawer = useStore(
    (state) => state.deleteAndAddToShoppingListFromDrawer
  );
  const moveItemBetweenDrawers = useStore(
    (state) => state.moveItemBetweenDrawers
  );
  const addContainer = useStore((state) => state.addContainer);
  const updateContainer = useStore((state) => state.updateContainer);
  const deleteContainer = useStore((state) => state.deleteContainer);
  const addDrawerToContainer = useStore((state) => state.addDrawerToContainer);
  const updateDrawerInContainer = useStore(
    (state) => state.updateDrawerInContainer
  );
  const deleteDrawerFromContainer = useStore(
    (state) => state.deleteDrawerFromContainer
  );
  const refetchFromLegacy = useStore((state) => state.refetchFromLegacy);

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [containerManagerOpen, setContainerManagerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("inventory");

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

  // Use real store data instead of mock data

  const theme = createTheme(createAppTheme());

  // Memoized handlers to prevent unnecessary re-renders
  const handleAddItem = useCallback(async () => {
    const trimmedName = newItemName.trim();
    if (trimmedName) {
      if (activeTab === "inventory") {
        // Add to default drawer (köksbänken)
        await addItemToDefaultDrawer(trimmedName);
      } else if (activeTab === "shopping") {
        addShoppingItem(trimmedName);
      }
      setNewItemName("");
    }
  }, [newItemName, activeTab, addItemToDefaultDrawer, addShoppingItem]);

  const handleItemSelect = useCallback(
    (itemId: string) => {
      if (isSelectionMode) {
        setSelectedItems((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(itemId)) {
            newSet.delete(itemId);
          } else {
            newSet.add(itemId);
          }
          return newSet;
        });
      }
    },
    [isSelectionMode]
  );

  const handleBulkDelete = useCallback(async () => {
    if (selectedItems.size === 0) return;

    if (confirm(`Ta bort ${selectedItems.size} valda varor?`)) {
      // Find and remove all selected items from default drawer and containers
      const newDefaultDrawer = {
        ...defaultDrawer,
        items: (defaultDrawer as any).items.filter(
          (item: any) => !selectedItems.has(item.id)
        ),
      };

      const newContainers = { ...containers };
      Object.keys(newContainers).forEach((containerId) => {
        const container = newContainers[containerId];
        Object.keys(container.drawers).forEach((drawerId) => {
          container.drawers[drawerId] = {
            ...container.drawers[drawerId],
            items: container.drawers[drawerId].items.filter(
              (item: any) => !selectedItems.has(item.id)
            ),
          };
        });
      });

      useStore.setState({
        defaultDrawer: newDefaultDrawer,
        containers: newContainers,
      });
      setSelectedItems(new Set());
      setIsSelectionMode(false);
    }
  }, [selectedItems, defaultDrawer, containers]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const itemId = active.id as string;

      // Find the item in the store
      let foundItem: Item | null = null;

      // Check default drawer first
      foundItem =
        (defaultDrawer as any).items.find((item: any) => item.id === itemId) ||
        null;

      // If not found, check containers
      if (!foundItem) {
        for (const container of Object.values(containers as any)) {
          for (const drawer of Object.values((container as any).drawers)) {
            foundItem =
              (drawer as any).items.find((item: any) => item.id === itemId) ||
              null;
            if (foundItem) break;
          }
          if (foundItem) break;
        }
      }

      setActiveItem(foundItem);
    },
    [defaultDrawer, containers]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveItem(null);

      if (!over) return;

      const itemId = active.id as string;
      const targetDrawerId = over.id as string;

      // Find source drawer and item
      let sourceDrawerId = "";
      let sourceIndex = -1;
      let sourceItem: Item | null = null;

      // Check default drawer first
      const defaultIndex = (defaultDrawer as any).items.findIndex(
        (item: any) => item.id === itemId
      );
      if (defaultIndex !== -1) {
        sourceDrawerId = (defaultDrawer as any).id;
        sourceIndex = defaultIndex;
        sourceItem = (defaultDrawer as any).items[defaultIndex];
      } else {
        // Check containers
        for (const container of Object.values(containers as any)) {
          for (const drawer of Object.values((container as any).drawers)) {
            const index = (drawer as any).items.findIndex(
              (item: any) => item.id === itemId
            );
            if (index !== -1) {
              sourceDrawerId = (drawer as any).id;
              sourceIndex = index;
              sourceItem = (drawer as any).items[index];
              break;
            }
          }
          if (sourceItem) break;
        }
      }

      if (!sourceItem) return;

      // Parse target drawer ID
      let targetDrawerIdParsed: string;

      if (targetDrawerId === "default") {
        // Target is the default drawer
        targetDrawerIdParsed = "default";
      } else {
        // Target is a container drawer
        const targetDrawerMatch = targetDrawerId.match(/^drawer-(.+)$/);
        if (!targetDrawerMatch) return;
        targetDrawerIdParsed = targetDrawerMatch[1];
      }

      // Don't move if same drawer
      if (sourceDrawerId === targetDrawerIdParsed) return;

      console.log("Drag operation:", {
        itemId,
        sourceDrawerId,
        targetDrawerIdParsed,
        targetDrawerId,
      });

      // Move item between drawers using store method
      await moveItemBetweenDrawers(
        sourceDrawerId,
        sourceIndex,
        targetDrawerId // Use the full drawer ID, not the parsed one
      );
    },
    [defaultDrawer, containers, moveItemBetweenDrawers]
  );

  const resetAll = useCallback(() => {
    if (confirm("Nollställa alla lådor?")) {
      // Reset to empty modular structure
      const emptyDefaultDrawer = {
        id: "default",
        name: "Köksbänken",
        items: [],
      };
      useStore.setState({ defaultDrawer: emptyDefaultDrawer, containers: {} });
    }
  }, []);

  // Modular Drawer View handlers - memoized
  const handleModularEdit = useCallback(
    async (drawerId: string, idx: number, updates: Partial<Item>) => {
      await editItemInDrawer(drawerId, idx, updates);
    },
    [editItemInDrawer]
  );

  const handleModularDelete = useCallback(
    async (drawerId: string, idx: number) => {
      await removeItemFromDrawer(drawerId, idx);
    },
    [removeItemFromDrawer]
  );

  const handleModularDeleteAndAddToShoppingList = useCallback(
    async (drawerId: string, idx: number) => {
      await deleteAndAddToShoppingListFromDrawer(drawerId, idx);
    },
    [deleteAndAddToShoppingListFromDrawer]
  );

  const handleModularIncreaseQuantity = useCallback(
    async (drawerId: string, idx: number) => {
      await increaseQuantityInDrawer(drawerId, idx);
    },
    [increaseQuantityInDrawer]
  );

  const handleModularDecreaseQuantity = useCallback(
    async (drawerId: string, idx: number) => {
      await decreaseQuantityInDrawer(drawerId, idx);
    },
    [decreaseQuantityInDrawer]
  );

  const handleRealTimeUpdate = useCallback(async (data: any) => {
    console.log("📱 [APP] Processing real-time update with data:", {
      hasDrawers: !!data.drawers,
      hasShoppingList: !!data.shoppingList,
      hasModularData: !!(
        data.drawers &&
        typeof data.drawers === "object" &&
        "schemaVersion" in data.drawers
      ),
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
      // Check if this is modular data stored in drawers as JSON
      if (
        data.drawers &&
        typeof data.drawers === "object" &&
        "schemaVersion" in data.drawers
      ) {
        console.log("📱 [APP] Processing modular data update...");

        // Extract modular data from drawers JSON
        const modularData = data.drawers;

        // Convert dates in default drawer
        const processedDefaultDrawer = {
          ...modularData.defaultDrawer,
          items: (modularData.defaultDrawer.items || []).map((item: any) => ({
            ...item,
            addedDate: new Date(item.addedDate),
          })),
        };

        // Convert dates in containers
        const processedContainers = Object.fromEntries(
          Object.entries(modularData.containers || {}).map(
            ([containerId, container]: [string, any]) => [
              containerId,
              {
                ...container,
                drawers: Object.fromEntries(
                  Object.entries(container.drawers || {}).map(
                    ([drawerId, drawer]: [string, any]) => [
                      drawerId,
                      {
                        ...drawer,
                        items: (drawer.items || []).map((item: any) => ({
                          ...item,
                          addedDate: new Date(item.addedDate),
                        })),
                      },
                    ]
                  )
                ),
              },
            ]
          )
        );

        // Update the store with modular data
        useStore.setState({
          defaultDrawer: processedDefaultDrawer,
          containers: processedContainers,
          shoppingList: (data.shoppingList || []).map((item: any) => ({
            ...item,
            addedDate: new Date(item.addedDate),
          })),
        });

        console.log("✅ [APP] Modular data update processed successfully");
        return;
      }

      // Legacy data handling (fallback)
      console.log("📱 [APP] Processing legacy data update...");
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

      console.log("✅ [APP] Legacy data update processed successfully");
    } catch (error) {
      console.error("App failed to process real-time update:", error);
    }
  }, []);

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
                  placeholder={
                    activeTab === "inventory"
                      ? "Lägg till vara..."
                      : "Lägg till vara i inköpslista..."
                  }
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
            overflow: "visible !important",
            "& .MuiTab-root": {
              color: "rgba(255, 255, 255, 0.7)",
              "&.Mui-selected": {
                color: "#ffffff",
              },
            },
            "& .MuiTabs-flexContainer": {
              overflow: "visible !important",
            },
            "& .MuiTabs-scroller": {
              overflow: "visible !important",
            },
            "& .MuiTabs-indicator": {
              overflow: "visible !important",
            },
          }}
        >
          <Tab label="Lådor" value="inventory" />
          <Tab
            label={
              <Badge
                badgeContent={
                  activeTab === "shopping"
                    ? 0
                    : (shoppingList as any[]).filter(
                        (item: any) => !item.completed
                      ).length
                }
                color="error"
                sx={{
                  "& .MuiBadge-badge": {
                    top: -4,
                    right: -6,
                    fontSize: "0.65rem",
                    minWidth: "16px",
                    height: "16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    zIndex: 9999,
                  },
                }}
              >
                <span>Inköpslista</span>
              </Badge>
            }
            value="shopping"
          />
        </Tabs>
      </AppBar>

      <Container
        maxWidth="xl"
        sx={{ py: { xs: 1, sm: 2 }, px: { xs: 1, sm: 2 } }}
      >
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

            {/* Debug logging */}
            {console.log("🔄 [APP] Rendering ModularDrawerView with:", {
              defaultDrawer,
              containers,
            })}

            <ModularDrawerView
              defaultDrawer={defaultDrawer}
              containers={containers}
              onEdit={handleModularEdit}
              onDelete={handleModularDelete}
              onDeleteAndAddToShoppingList={
                handleModularDeleteAndAddToShoppingList
              }
              onIncreaseQuantity={handleModularIncreaseQuantity}
              onDecreaseQuantity={handleModularDecreaseQuantity}
              selectedItems={selectedItems}
              onItemSelect={handleItemSelect}
              dateDisplayMode={dateDisplayMode}
              getDurationText={getDurationText}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              activeItem={activeItem}
            />

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
            onToggleItem={toggleShoppingItem}
            onDeleteItem={removeShoppingItem}
            onEditItem={editShoppingItem}
            onClearCompleted={clearCompletedShoppingItems}
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

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => {
                setSettingsOpen(false);
                setContainerManagerOpen(true);
              }}
              fullWidth
            >
              Test Modular Containers
            </Button>

            <Button
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={async () => {
                if (
                  confirm(
                    "Är du säker på att du vill hämta data från legacy format? Detta kommer att återställa dina lådor från backup."
                  )
                ) {
                  await refetchFromLegacy();
                  setSettingsOpen(false);
                }
              }}
              fullWidth
              color="info"
            >
              Hämta från Legacy Data
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

      <Dialog
        open={containerManagerOpen}
        onClose={() => setContainerManagerOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Modular Container Manager</DialogTitle>
        <DialogContent>
          <ContainerManager
            containers={containers}
            onAddContainer={addContainer}
            onUpdateContainer={updateContainer}
            onDeleteContainer={deleteContainer}
            onAddDrawer={addDrawerToContainer}
            onUpdateDrawer={updateDrawerInContainer}
            onDeleteDrawer={deleteDrawerFromContainer}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContainerManagerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
