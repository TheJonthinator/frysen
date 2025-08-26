import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  IconButton,
  TextField,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Button,
  Autocomplete,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import type { ShoppingItem } from "../types";

interface ShoppingListProps {
  items: ShoppingItem[];
  onAddItem: (name: string) => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (id: string, name: string) => void;
  onClearCompleted: () => void;
  getSuggestions: (query: string) => string[];
}

export const ShoppingList: React.FC<ShoppingListProps> = ({
  items,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onEditItem,
  onClearCompleted,
  getSuggestions,
}) => {
  const [newItemName, setNewItemName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAddItem = () => {
    const trimmedName = newItemName.trim();
    if (trimmedName) {
      onAddItem(trimmedName);
      setNewItemName("");
    }
  };

  const handleStartEdit = (item: ShoppingItem) => {
    setEditingId(item.id);
    setEditName(item.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      onEditItem(editingId, editName.trim());
      setEditingId(null);
      setEditName("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const completedItems = items.filter((item) => item.completed);
  const activeItems = items.filter((item) => !item.completed);

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Inköpslista
      </Typography>

      {/* Add new item */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center">
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
                  placeholder="Lägg till vara i inköpslista..."
                  size="small"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddItem();
                    }
                  }}
                  sx={{ flexGrow: 1, minWidth: 300 }}
                />
              )}
            />
            <IconButton
              onClick={handleAddItem}
              disabled={!newItemName.trim()}
              color="primary"
            >
              <AddIcon />
            </IconButton>
          </Stack>
        </CardContent>
      </Card>

      {/* Active items */}
      {activeItems.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Att köpa ({activeItems.length})
            </Typography>
            <List dense>
              {activeItems.map((item) => (
                <ListItem key={item.id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    <Checkbox
                      checked={item.completed}
                      onChange={() => onToggleItem(item.id)}
                      color="primary"
                    />
                  </ListItemIcon>
                  {editingId === item.id ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        flexGrow: 1,
                        gap: 1,
                      }}
                    >
                      <TextField
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        size="small"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleSaveEdit();
                          } else if (e.key === "Escape") {
                            handleCancelEdit();
                          }
                        }}
                        autoFocus
                        sx={{ flexGrow: 1 }}
                      />
                      <Button size="small" onClick={handleSaveEdit}>
                        Spara
                      </Button>
                      <Button size="small" onClick={handleCancelEdit}>
                        Avbryt
                      </Button>
                    </Box>
                  ) : (
                    <ListItemText
                      primary={item.name}
                      onClick={() => handleStartEdit(item)}
                      sx={{ cursor: "pointer" }}
                    />
                  )}
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => onDeleteItem(item.id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Completed items */}
      {completedItems.length > 0 && (
        <Card>
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Typography variant="h6">
                Klar ({completedItems.length})
              </Typography>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={<ClearAllIcon />}
                onClick={onClearCompleted}
                sx={{ fontSize: "0.75rem" }}
              >
                Rensa klara
              </Button>
            </Stack>
            <List dense>
              {completedItems.map((item) => (
                <ListItem key={item.id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    <Checkbox
                      checked={item.completed}
                      onChange={() => onToggleItem(item.id)}
                      color="primary"
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.name}
                    sx={{
                      textDecoration: "line-through",
                      color: "text.secondary",
                    }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => onDeleteItem(item.id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {items.length === 0 && (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center">
              Inga varor i inköpslistan. Lägg till några varor för att komma
              igång!
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
