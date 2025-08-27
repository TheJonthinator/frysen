import React, { useState } from "react";
import {
  Box,
  Typography,
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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import type { ShoppingItem } from "../types";

interface ShoppingListProps {
  items: ShoppingItem[];
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (id: string, name: string) => void;
  onClearCompleted: () => void;
}

export const ShoppingList: React.FC<ShoppingListProps> = ({
  items,
  onToggleItem,
  onDeleteItem,
  onEditItem,
  onClearCompleted,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

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

      {/* Clear completed items button */}
      {completedItems.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            startIcon={<ClearAllIcon />}
            onClick={onClearCompleted}
            sx={{
              fontSize: "0.75rem",
            }}
          >
            Rensa klara ({completedItems.length})
          </Button>
        </Box>
      )}

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
