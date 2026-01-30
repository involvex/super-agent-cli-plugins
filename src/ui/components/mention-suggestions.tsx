import { FileEntry, filterFileEntries } from "../../utils/file-utils";
import { useMemo } from "react";
import { Box, Text } from "ink";

interface MentionSuggestionsProps {
  suggestions: FileEntry[];
  query: string;
  selectedIndex: number;
  isVisible: boolean;
}

export function MentionSuggestions({
  suggestions,
  query,
  selectedIndex,
  isVisible,
}: MentionSuggestionsProps) {
  if (!isVisible) {
    return null;
  }

  const filteredSuggestions = useMemo(
    () => filterFileEntries(suggestions, query),
    [suggestions, query],
  );

  const displayedSuggestions = filteredSuggestions.slice(0, 8);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      width={
        process.stdout.columns ? Math.min(100, process.stdout.columns - 4) : 100
      }
    >
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          Mention file or folder (@):
        </Text>
      </Box>

      {displayedSuggestions.map((suggestion, index) => (
        <Box key={index} paddingLeft={1}>
          <Box width={3}>
            <Text>{index === selectedIndex ? "❯" : " "}</Text>
          </Box>
          <Text
            color={
              index === selectedIndex
                ? "black"
                : suggestion.isDirectory
                  ? "blue"
                  : "white"
            }
            backgroundColor={index === selectedIndex ? "cyan" : undefined}
          >
            {suggestion.isDirectory ? "📁" : "📄"} {suggestion.path}
          </Text>
        </Box>
      ))}
      {filteredSuggestions.length > 8 && (
        <Box paddingLeft={1}>
          <Text color="gray">
            ... and {filteredSuggestions.length - 8} more
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          ↑↓ navigate • Enter/Tab select • Esc cancel
        </Text>
      </Box>
    </Box>
  );
}
