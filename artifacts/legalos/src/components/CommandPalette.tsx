import { useEffect, type ReactNode } from "react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut,
} from "@/components/ui/command";

export interface PaletteItem {
  id: string;
  label: string;
  group: string;
  icon?: ReactNode;
  onSelect: () => void;
  /** Extra words that should also match this item (e.g. a tool's tag or a section's synonyms). */
  keywords?: string;
}

interface CommandPaletteProps {
  items: PaletteItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Cmd/Ctrl+K jump-to-anything, so a dense app with 5 sections + 4 sidebar
 * tools + 11 Workshop tools doesn't require clicking through the sidebar
 * every time. Groups mirror the sidebar's own grouping so the palette feels
 * like a search box over the same structure, not a separate mental model.
 * Controlled from the parent so a sidebar button can also open it, for
 * anyone who wouldn't otherwise discover the keyboard shortcut.
 */
const CommandPalette = ({ items, open, onOpenChange }: CommandPaletteProps) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const groups = Array.from(new Set(items.map((i) => i.group)));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to a section or tool…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group} heading={group}>
            {items
              .filter((i) => i.group === group)
              .map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.keywords ?? ""}`}
                  onSelect={() => {
                    item.onSelect();
                    onOpenChange(false);
                  }}
                  className="gap-2.5"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </CommandItem>
              ))}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="border-t px-3 py-2 flex items-center justify-end">
        <CommandShortcut className="ml-0">Esc to close</CommandShortcut>
      </div>
    </CommandDialog>
  );
};

export default CommandPalette;
