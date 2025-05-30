// constants.js

export const posMap = {
  1: "Stay Topmost",
  0: "Normal",
};

export const posReverseMap = {
  "Stay Topmost": 1,
  Normal: 0,
};

export const iniOptionMap = {
  "Click Through": {
    iniKey: "ClickThrough",
    getter: window.deskflex.getWidgetClickThrough,
  },
  Draggable: {
    iniKey: "Draggable",
    getter: window.deskflex.getWidgetDraggable,
  },
  "Snap Edges": {
    iniKey: "SnapEdges",
    getter: window.deskflex.getWidgetSnapEdges,
  },
  "Keep On Screen": {
    iniKey: "KeepOnScreen",
    getter: window.deskflex.getWidgetKeepOnScreen,
  },
  "Save Position": {
    iniKey: "SavePosition",
    getter: window.deskflex.getWidgetSavePosition,
  },
  Favorite: { iniKey: "Favorite", getter: window.deskflex.getWidgetFavorite },
};

export const iniSetterMap = {
  "Click Through": window.deskflex.setClickThrough,
  Draggable: window.deskflex.setDraggable,
  "Snap Edges": window.deskflex.setSnapEdges,
  "Keep On Screen": window.deskflex.setKeepOnScreen,
  "Save Position": window.deskflex.setSavePosition,
  Favorite: window.deskflex.setFavorite,
};

export const hoverMap = {
  0: "Do Nothing",
  1: "Hide",
  2: "Fade in",
  3: "Fade out",
};
