import React from "react";
import { Badge, IconButton, Tooltip, CircularProgress } from "@mui/material";
import UpdateIcon from "@mui/icons-material/Update";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import type { UpdateStatus } from "../types";

interface UpdateIndicatorProps {
  status: UpdateStatus;
  onCheckUpdate: () => void;
  isChecking?: boolean;
}

export const UpdateIndicator: React.FC<UpdateIndicatorProps> = ({
  status,
  onCheckUpdate,
  isChecking = false,
}) => {
  const getIcon = () => {
    if (isChecking) {
      return <CircularProgress size={20} />;
    }

    switch (status) {
      case "update_available":
        return <UpdateIcon />;
      case "critical_update":
        return <WarningIcon color="error" />;
      case "error":
        return <ErrorIcon color="error" />;
      default:
        return <UpdateIcon />;
    }
  };

  const getTooltipText = () => {
    if (isChecking) return "Kontrollerar uppdateringar...";

    switch (status) {
      case "update_available":
        return "Ny version tillgänglig - Klicka för att uppdatera";
      case "critical_update":
        return "KRITISK UPPDATERING - Klicka för att uppdatera nu!";
      case "error":
        return "Kunde inte kontrollera uppdateringar";
      case "up_to_date":
        return "Appen är uppdaterad";
      default:
        return "Kontrollera uppdateringar";
    }
  };

  const getBadgeColor = () => {
    switch (status) {
      case "critical_update":
        return "error";
      case "update_available":
        return "warning";
      case "error":
        return "error";
      default:
        return "default";
    }
  };

  const shouldShowBadge =
    status === "update_available" ||
    status === "critical_update" ||
    status === "error";

  return (
    <Tooltip title={getTooltipText()} arrow>
      <IconButton
        onClick={onCheckUpdate}
        disabled={isChecking}
        color="inherit"
        size="small"
        sx={{
          position: "relative",
          "&:hover": {
            backgroundColor:
              status === "critical_update"
                ? "rgba(244, 67, 54, 0.1)"
                : "rgba(255, 255, 255, 0.1)",
          },
        }}
      >
        <Badge
          variant={shouldShowBadge ? "dot" : "standard"}
          color={getBadgeColor() as any}
          sx={{
            "& .MuiBadge-dot": {
              backgroundColor:
                status === "critical_update" ? "#f44336" : "#ff9800",
              animation:
                status === "critical_update" ? "pulse 2s infinite" : "none",
            },
          }}
        >
          {getIcon()}
        </Badge>
      </IconButton>
    </Tooltip>
  );
};
