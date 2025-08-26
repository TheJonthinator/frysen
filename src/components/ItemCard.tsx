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
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import type { ItemCardProps } from "../types";

const formatDate = (date: Date) => {
  return date.toLocaleDateString("sv-SE");
};

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  isSelected = false,
  onSelect,
  isDragging = false,
  dateDisplayMode,
  getDurationText,
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
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
          p: 0.8,
          borderRadius: 8,
          border: "1px solid",
          borderColor: isSelected ? "primary.main" : "rgba(255, 255, 255, 0.1)",
          cursor: "pointer",
          ...(isDragging && { backdropFilter: "blur(10px)" }), // Only apply blur when dragging
          "&:hover": {
            background:
              "linear-gradient(180deg, rgba(57, 160, 237, 0.15) 0%, rgba(57, 160, 237, 0.05) 100%)",
            borderColor: "primary.main",
            boxShadow: "0 4px 16px rgba(57, 160, 237, 0.3)",
          },
        }}
        onClick={onSelect}
        onDoubleClick={() => setEditDialogOpen(true)}
      >
        <DragIndicatorIcon
          fontSize="small"
          color="action"
          sx={{ fontSize: "0.875rem", cursor: "grab" }}
        />

        <Box flex={1} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <EditIcon
            fontSize="small"
            color="primary"
            sx={{ fontSize: "0.875rem" }}
          />
          <Box>
            <Typography
              variant="body2"
              fontWeight="medium"
              sx={{ fontSize: "0.875rem" }}
            >
              {item.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.75rem" }}
            >
              {displayDate}
            </Typography>
          </Box>
        </Box>

        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setEditDialogOpen(true);
          }}
          sx={{ p: 0.5 }}
        >
          <EditIcon fontSize="small" sx={{ fontSize: "0.875rem" }} />
        </IconButton>

        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          sx={{ p: 0.5 }}
        >
          <DeleteIcon
            color="error"
            fontSize="small"
            sx={{ fontSize: "0.875rem" }}
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
    </>
  );
};
