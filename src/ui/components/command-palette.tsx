import { FileEntry, filterFileEntries } from "../../utils/file-utils";
import { useMemo } from "react";
import { Box, Text } from "ink";

interface CommandPaletteProps {
  files: FileEntry[];
  query: string;
  selectedIndex: number;
  isVisible: boolean;
}

export function CommandPalette({
  files,
  query,
  selectedIndex,
  isVisible,
}: CommandPaletteProps) {
  if (!isVisible) {
    return null;
  }

  const filteredFiles = useMemo(
    () => filterFileEntries(files, query),
    [files, query],
  );

  const displayedFiles = filteredFiles.slice(0, 10);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="magenta"
      paddingX={1}
      width={
        process.stdout.columns ? Math.min(80, process.stdout.columns - 4) : 80
      }
    >
      <Box marginBottom={1} justifyContent="space-between">
        <Text color="cyan" bold>
          🔍 Command Palette / File Search
        </Text>
        <Text color="gray">{filteredFiles.length} files found</Text>
      </Box>
      <Box
        marginBottom={1}
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
      >
        <Text color="gray">Query: </Text>
        <Text color="white" bold>
          {query || "Search files..."}
        </Text>
      </Box>
      <Box flexDirection="column">
        {displayedFiles.map((file, index) => (
          <Box key={index} paddingLeft={1}>
            <Box width={3}>
              <Text>{index === selectedIndex ? "❯" : " "}</Text>
            </Box>
            <Text
              color={
                index === selectedIndex
                  ? "white"
                  : file.isDirectory
                    ? "blue"
                    : "white"
              }
              backgroundColor={index === selectedIndex ? "magenta" : undefined}
              bold={index === selectedIndex}
            >
              {file.isDirectory ? "📁" : "📄"} {file.path}
            </Text>
          </Box>
        ))}
      </Box>
      {filteredFiles.length === 0 && (
        <Box padding={1}>
          <Text color="gray" italic>
            No files found matching "{query}"
          </Text>
        </Box>
      )}

      <Box
        marginTop={1}
        borderStyle="single"
        borderTop={true}
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
      >
        <Text color="gray" dimColor>
          ↑↓ navigate • Enter select • Esc cancel
        </Text>
      </Box>
    </Box>
  );
}
