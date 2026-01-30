import { Text, Box } from "ink";
import React from "react";

export const colorizeCode = (
  content: string,
  language: string | null,
  availableTerminalHeight?: number,
  terminalWidth?: number,
): React.ReactNode => {
  // Simple plain text rendering - could be enhanced with syntax highlighting later
  return (
    <Box flexDirection="column">
      {content.split("\n").map((line, index) => (
        <Text key={index} wrap="wrap">
          {line}
        </Text>
      ))}
    </Box>
  );
};
