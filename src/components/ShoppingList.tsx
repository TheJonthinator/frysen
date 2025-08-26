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
  ListItemSecondaryAction,
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

  // Sort items: active first, then completed, maintaining original order within each group
  const sortedItems = [...items].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1; // Active items first
    }
    return items.indexOf(a) - items.indexOf(b); // Maintain original order
  });

  const completedItems = items.filter((item) => item.completed);

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Inköpslista
      </Typography>

      {/* Add new item and actions */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent={{ xs: "flex-start", sm: "space-between" }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ width: { xs: "100%", sm: "auto" } }}
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
                sx={{ width: { xs: "100%", sm: 250 } }}
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
                    sx={{ width: "100%" }}
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

            {completedItems.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={<ClearAllIcon />}
                onClick={onClearCompleted}
                sx={{
                  fontSize: "0.75rem",
                  alignSelf: { xs: "flex-end", sm: "auto" },
                }}
              >
                Rensa klara ({completedItems.length})
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Shopping list items */}
      {sortedItems.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Inköpslista ({items.length})
            </Typography>
            <List dense>
              {sortedItems.map((item) => (
                <ListItem key={item.id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    <Checkbox
                      checked={item.completed}
                      onChange={() => onToggleItem(item.id)}
                      color="primary"
                    />
                  </ListItemIcon>
                  <TextField
                    value={editingId === item.id ? editName : item.name}
                    onChange={(e) => {
                      // Only update local state, don't trigger auto-save
                      if (editingId === item.id) {
                        setEditName(e.target.value);
                      } else {
                        setEditingId(item.id);
                        setEditName(e.target.value);
                      }
                    }}
                    onBlur={() => {
                      // Save only when user finishes editing
                      if (
                        editingId === item.id &&
                        editName.trim() &&
                        editName !== item.name
                      ) {
                        onEditItem(item.id, editName.trim());
                      }
                      setEditingId(null);
                      setEditName("");
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        // Save only when user presses Enter
                        if (
                          editingId === item.id &&
                          editName.trim() &&
                          editName !== item.name
                        ) {
                          onEditItem(item.id, editName.trim());
                        }
                        setEditingId(null);
                        setEditName("");
                      } else if (e.key === "Escape") {
                        setEditingId(null);
                        setEditName("");
                      }
                    }}
                    size="small"
                    variant="standard"
                    sx={{
                      flexGrow: 1,
                      "& .MuiInput-root": {
                        ...(item.completed && {
                          textDecoration: "line-through",
                          color: "text.secondary",
                        }),
                      },
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
