import type { Editor, Range } from '@tiptap/core';
import {
  TextTIcon, TextHOneIcon, TextHTwoIcon, TextHThreeIcon, ListBulletsIcon,
  ListNumbersIcon, ListChecksIcon, QuotesIcon, MinusIcon, CodeIcon, TableIcon,
} from '@phosphor-icons/react';

export interface SlashCommandArgs {
  editor: Editor;
  range: Range;
}

export interface SlashItem {
  titleKey: string;
  icon: React.ElementType;
  command: (args: SlashCommandArgs) => void;
}

export interface SlashGroup {
  labelKey: string;
  items: SlashItem[];
}

export function getSlashCommandGroups(): SlashGroup[] {
  return [
    {
      labelKey: 'slashMenu.groupBasic',
      items: [
        { titleKey: 'slashMenu.text', icon: TextTIcon, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run() },
        { titleKey: 'slashMenu.heading1', icon: TextHOneIcon, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run() },
        { titleKey: 'slashMenu.heading2', icon: TextHTwoIcon, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run() },
        { titleKey: 'slashMenu.heading3', icon: TextHThreeIcon, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run() },
      ],
    },
    {
      labelKey: 'slashMenu.groupLists',
      items: [
        { titleKey: 'slashMenu.bulletList', icon: ListBulletsIcon, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
        { titleKey: 'slashMenu.orderedList', icon: ListNumbersIcon, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
        { titleKey: 'slashMenu.taskList', icon: ListChecksIcon, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run() },
      ],
    },
    {
      labelKey: 'slashMenu.groupOther',
      items: [
        { titleKey: 'slashMenu.quote', icon: QuotesIcon, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
        { titleKey: 'slashMenu.divider', icon: MinusIcon, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run() },
        { titleKey: 'slashMenu.codeBlock', icon: CodeIcon, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
        { titleKey: 'slashMenu.table', icon: TableIcon, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
      ],
    },
  ];
}

export function getSlashCommandItems(): SlashItem[] {
  return getSlashCommandGroups().flatMap((g) => g.items);
}