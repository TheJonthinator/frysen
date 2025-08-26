import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Stack,
  TextField,
  Button,
  Typography,
  IconButton,
  Autocomplete,
  Collapse,
  CardActions,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import type { AddItemFormProps, ItemToAdd } from "../types";
import { useStore } from "../store";

export const AddItemForm: React.FC<AddItemFormProps> = ({ onAddItems }) => {
  const { getSuggestions } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [items, setItems] = useState<ItemToAdd[]>([{ id: "1", name: "" }]);

  const updateItem = (id: string, field: keyof ItemToAdd, value: string) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAdd = () => {
    const validItems = items
      .filter((item) => item.name.trim())
      .map((item) => ({
        name: item.name.trim(),
      }));

    if (validItems.length > 0) {
      onAddItems(validItems);
      setItems([{ id: Date.now().toString(), name: "" }]);
      setIsExpanded(false);
    }
  };

  const hasValidItems = items.some((item) => item.name.trim());

  return (
    <Card sx={{ mb: 2 }}>
      <CardActions sx={{ px: 2, py: 1 }}>
        <Button
          startIcon={<AddIcon />}
          onClick={() => setIsExpanded(!isExpanded)}
          variant="outlined"
          size="small"
          sx={{ flexGrow: 1, justifyContent: "flex-start" }}
        >
          Lägg till varor
        </Button>
        <IconButton onClick={() => setIsExpanded(!isExpanded)} size="small">
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </CardActions>

      <Collapse in={isExpanded}>
        <CardContent sx={{ pt: 0 }}>
          <Stack spacing={2}>
            {items.map((item) => (
              <Stack
                key={item.id}
                direction="row"
                spacing={1}
                alignItems="flex-start"
              >
                <Autocomplete
                  freeSolo
                  options={getSuggestions(item.name)}
                  value={item.name}
                  onChange={(_, newValue) => {
                    updateItem(item.id, "name", newValue || "");
                  }}
                  onInputChange={(_, newInputValue) => {
                    updateItem(item.id, "name", newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Vara"
                      placeholder="Köttbullar"
                      size="small"
                      sx={{ flex: 1, minWidth: 300 }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Typography variant="body2">{option}</Typography>
                    </Box>
                  )}
                />
              </Stack>
            ))}

            <Button
              onClick={handleAdd}
              variant="contained"
              size="small"
              disabled={!hasValidItems}
              startIcon={<AddIcon />}
              fullWidth
            >
              Lägg till {items.filter((item) => item.name.trim()).length} varor
            </Button>
          </Stack>
        </CardContent>
      </Collapse>
    </Card>
  );
};
