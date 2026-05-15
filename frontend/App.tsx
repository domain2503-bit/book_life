import "react-native-gesture-handler";
import React from "react";
import { Platform } from "react-native";
import AppNavigator from "./src/navigation";

if (Platform.OS === "web" && typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    body {
      overflow: auto !important;
    }
  `;
  document.head.appendChild(style);
}

export default function App() {
  return <AppNavigator />;
}
