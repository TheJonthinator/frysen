import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { sv } from "date-fns/locale";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import type { ItemCardProps } from "../types";

const formatDate = (date: Date | string) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("sv-SE");
};

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  onDeleteAndAddToShoppingList,
  onIncreaseQuantity,
  onDecreaseQuantity,
  isSelected = false,
  onSelect,
  isDragging = false,
  dateDisplayMode,
  getDurationText,
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    name: item.name,
    addedDate: item.addedDate,
  });

  const handleSave = () => {
    onEdit({
      name: editData.name,
      addedDate: editData.addedDate,
    });
    setEditDialogOpen(false);
  };

  const displayDate =
    dateDisplayMode === "date"
      ? formatDate(item.addedDate)
      : getDurationText(item.addedDate);

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{
          background: isSelected
            ? "linear-gradient(180deg, rgba(57, 160, 237, 0.25) 0%, rgba(57, 160, 237, 0.15) 100%)"
            : "linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
          p: { xs: 0.6, sm: 0.8 },
          borderRadius: 8,
          border: "1px solid",
          borderColor: isSelected ? "primary.main" : "rgba(255, 255, 255, 0.1)",
          cursor: "pointer",
          ...(isDragging && { backdropFilter: "blur(10px)" }), // Only apply blur when dragging
          "&:hover": {
            background: isSelected
              ? "linear-gradient(180deg, rgba(57, 160, 237, 0.3) 0%, rgba(57, 160, 237, 0.2) 100%)"
              : "linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%)",
            borderColor: isSelected
              ? "primary.main"
              : "rgba(255, 255, 255, 0.15)",
            transform: "translateY(-1px)",
            transition: "all 0.2s ease",
          },
        }}
        onClick={onSelect}
        onDoubleClick={() => setEditDialogOpen(true)}
      >
        <Box flex={1} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box flex={1}>
            <Typography
              variant="body2"
              fontWeight="medium"
              sx={{ fontSize: { xs: "0.670rem", sm: "0.875rem" }, pl: 0.5 }}
            >
              {item.name}
            </Typography>
          </Box>

          {/* Date */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" }, ml: 0.5 }}
          >
            {displayDate}
          </Typography>

          {/* Quantity Controls */}
          <Stack direction="row" alignItems="center" spacing={0.1}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDecreaseQuantity();
              }}
              disabled={item.quantity <= 1}
              sx={{ p: 0.25, minWidth: 10, height: 24 }}
            >
              <RemoveIcon fontSize="small" sx={{ fontSize: "0.75rem" }} />
            </IconButton>

            <Typography
              variant="body2"
              sx={{
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                fontWeight: "bold",
                minWidth: 20,
                textAlign: "center",
              }}
            >
              {item.quantity}
            </Typography>

            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onIncreaseQuantity();
              }}
              sx={{ p: 0.25, minWidth: 10, height: 24 }}
            >
              <AddIcon fontSize="small" sx={{ fontSize: "0.75rem" }} />
            </IconButton>
          </Stack>
        </Box>

        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setEditDialogOpen(true);
          }}
          sx={{ p: 0.5 }}
        >
          <EditIcon
            fontSize="small"
            sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
          />
        </IconButton>

        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteDialogOpen(true);
          }}
          sx={{ p: 0.5 }}
        >
          <DeleteIcon
            color="error"
            fontSize="small"
            sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
          />
        </IconButton>
      </Stack>

      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Redigera vara</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={sv}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Namn"
                value={editData.name}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
                fullWidth
              />
              <DatePicker
                label="Tillagd datum"
                value={editData.addedDate}
                onChange={(newDate) => {
                  if (newDate) {
                    setEditData({ ...editData, addedDate: newDate });
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
            </Stack>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Avbryt</Button>
          <Button onClick={handleSave} variant="contained">
            Spara
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ta bort vara</DialogTitle>
        <DialogContent>
          <Typography>Vad vill du göra med "{item.name}"?</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">
            Avbryt
          </Button>
          <Button
            onClick={() => {
              onDeleteAndAddToShoppingList();
              setDeleteDialogOpen(false);
            }}
            variant="contained"
            color="primary"
            startIcon={<ShoppingCartIcon />}
          >
            Ta bort och lägg till i inköpslista
          </Button>
          <Button
            onClick={() => {
              onDelete();
              setDeleteDialogOpen(false);
            }}
            variant="contained"
            color="error"
          >
            Ta bort
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
