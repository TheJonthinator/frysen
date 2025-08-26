import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  Card,
  CardContent,
  IconButton,
  Button,
  Divider,
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
} from "@mui/material";

import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import UpdateIcon from "@mui/icons-material/Update";

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
  FamilyManager,
} from "./components";
import type { Item, TabType } from "./types";
import { DRAWER_COUNT, KOKSBANKEN_DRAWER } from "./types";
import { createAppTheme } from "./theme";

export default function App() {
  const {
    drawers,
    dateDisplayMode,
    shoppingList,
    updateStatus,
    updateInfo,
    currentFamily,
    syncStatus,
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
    checkForUpdates,
    getCurrentVersion,
    getLastCheckTime,
    setCurrentFamily,
    signInWithGoogle,
    signOutFromGoogle,
  } = useStore();

  useEffect(() => {
    load();
    // Don't auto-check for updates on launch to avoid rate limiting
    // Users can manually check via the update indicator or settings
  }, [load]);

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  const exportData = () => {
    const blob = new Blob([JSON.stringify(drawers, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "frysen.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = () => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "application/json";
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!options.every((d) => Array.isArray(data[d]))) throw new Error();
        await replaceAll(data);
      } catch {
        alert("Ogiltig fil.");
      }
    };
    inp.click();
  };

  const resetAll = () => {
    if (confirm("Nollställa alla lådor?")) {
      const fresh: any = {};
      options.forEach((d) => (fresh[d] = []));
      replaceAll(fresh);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            FRYSEN
          </Typography>

          {activeTab === "inventory" && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mr: 2 }}
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
                      width: 200,
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

          <Stack direction="row" spacing={1} alignItems="center">
            {activeTab === "inventory" && (
              <Button
                onClick={toggleDateDisplay}
                variant={dateDisplayMode === "date" ? "contained" : "outlined"}
                size="small"
                startIcon={<CalendarTodayIcon />}
                sx={{
                  minWidth: 120,
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
          <Tab label="Familj" value="family" />
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
        ) : activeTab === "shopping" ? (
          <ShoppingList
            items={shoppingList}
            onAddItem={addShoppingItem}
            onToggleItem={toggleShoppingItem}
            onDeleteItem={removeShoppingItem}
            onEditItem={editShoppingItem}
            getSuggestions={getSuggestions}
          />
        ) : (
          <FamilyManager
            currentFamily={currentFamily}
            onFamilyChange={setCurrentFamily}
            onSignOut={signOutFromGoogle}
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
          <List>
            <ListItem onClick={exportData}>
              <ListItemIcon>
                <FileDownloadIcon />
              </ListItemIcon>
              <ListItemText
                primary="Exportera data"
                secondary="Ladda ner alla lådor som JSON-fil"
              />
            </ListItem>
            <ListItem onClick={importData}>
              <ListItemIcon>
                <FileUploadIcon />
              </ListItemIcon>
              <ListItemText
                primary="Importera data"
                secondary="Läs in data från JSON-fil"
              />
            </ListItem>
            <Divider sx={{ my: 1 }} />
            <ListItem onClick={checkForUpdates}>
              <ListItemIcon>
                <UpdateIcon />
              </ListItemIcon>
              <ListItemText
                primary="Kontrollera uppdateringar"
                secondary={`Nuvarande version: ${getCurrentVersion()}`}
              />
            </ListItem>
            {updateInfo && (
              <ListItem
                onClick={() => {
                  window.open(updateInfo.updateUrl, "_blank");
                }}
                sx={{
                  color: updateInfo.isCritical ? "error.main" : "primary.main",
                  backgroundColor: updateInfo.isCritical
                    ? "rgba(244, 67, 54, 0.1)"
                    : "rgba(25, 118, 210, 0.1)",
                }}
              >
                <ListItemIcon sx={{ color: "inherit" }}>
                  <UpdateIcon />
                </ListItemIcon>
                <ListItemText
                  primary={`Uppdatera till version ${updateInfo.latestVersion}`}
                  secondary={
                    updateInfo.isCritical
                      ? "KRITISK UPPDATERING - Klicka för att ladda ner!"
                      : "Ny version tillgänglig"
                  }
                />
              </ListItem>
            )}
            <Divider sx={{ my: 1 }} />
            <ListItem
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
              sx={{ color: "warning.main" }}
            >
              <ListItemIcon sx={{ color: "warning.main" }}>
                <RestartAltIcon />
              </ListItemIcon>
              <ListItemText
                primary="Nollställ alla lådor"
                secondary="Ta bort alla varor från alla lådor"
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Stäng</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
