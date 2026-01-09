import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    category: 'General',
    items: [
      { keys: ['Cmd', 'K'], description: 'Open global search' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close dialog/modal' },
      { keys: ['Cmd', 'S'], description: 'Save changes' },
    ],
  },
  {
    category: 'Navigation',
    items: [
      { keys: ['G', 'H'], description: 'Go to home/dashboard' },
      { keys: ['G', 'P'], description: 'Go to properties' },
      { keys: ['G', 'T'], description: 'Go to tenants' },
      { keys: ['G', 'R'], description: 'Go to rent collection' },
      { keys: ['G', 'M'], description: 'Go to maintenance' },
      { keys: ['G', 'S'], description: 'Go to settings' },
    ],
  },
  {
    category: 'Actions',
    items: [
      { keys: ['N'], description: 'Create new (context-dependent)' },
      { keys: ['E'], description: 'Edit selected item' },
      { keys: ['D'], description: 'Delete selected item' },
      { keys: ['P'], description: 'Make payment' },
    ],
  },
  {
    category: 'Lists & Tables',
    items: [
      { keys: ['↑', '↓'], description: 'Navigate items' },
      { keys: ['Enter'], description: 'Select/Open item' },
      { keys: ['Space'], description: 'Toggle selection' },
      { keys: ['/', 'F'], description: 'Filter/Search in list' },
    ],
  },
];

export const KeyboardShortcutsDialog = ({ open, onOpenChange }: KeyboardShortcutsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Master these shortcuts to navigate RentFlow like a pro
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="font-semibold text-foreground mb-3">{section.category}</h3>
              <div className="space-y-2">
                {section.items.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-1">
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-mono bg-secondary border border-border rounded">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          <p>
            <kbd className="px-2 py-1 bg-secondary rounded border border-border">Cmd</kbd> on Mac,{' '}
            <kbd className="px-2 py-1 bg-secondary rounded border border-border">Ctrl</kbd> on Windows/Linux
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Hook for keyboard shortcuts
 */
export const useKeyboardShortcuts = (shortcuts: Record<string, () => void>) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Build shortcut key
      const modifiers = [];
      if (e.ctrlKey) modifiers.push('ctrl');
      if (e.metaKey) modifiers.push('cmd');
      if (e.altKey) modifiers.push('alt');
      if (e.shiftKey) modifiers.push('shift');
      
      const key = e.key.toLowerCase();
      const shortcutKey = [...modifiers, key].join('+');

      // Execute handler if exists
      const handler = shortcuts[shortcutKey];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

/**
 * Hook for showing keyboard shortcuts dialog
 */
export const useKeyboardShortcutsDialog = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show shortcuts on ?
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        // Don't trigger if in input field
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return;
        }
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen };
};

// Import useState
import { useState } from 'react';
